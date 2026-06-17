from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from api.models import RecommendationRequest, RecommendationResponse, SignalRequest
from api.services.supabase_service import (
    get_user_profile, 
    get_engagement_logs, 
    get_linked_loyalty_mappings, 
    get_candidate_deals,
    insert_user_signal
)
from api.services.agents import run_cold_start_agent, run_recommendation_agent
from uuid import UUID

app = FastAPI(
    title="Tripzy.travel Layer 2 Brain API",
    description="Autonomous Agent Recommendation Engine",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Tripzy.travel Autonomous Recommendation Engine",
        "version": "1.0.0"
    }

@app.post("/api/v1/recommendations", response_model=RecommendationResponse)
def get_recommendations(req: RecommendationRequest):
    # 1. Fetch User Profile
    profile = get_user_profile(req.user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User profile with ID {req.user_id} not found"
        )
        
    # 2. Fetch User Logs & Linked Mappings
    logs = get_engagement_logs(req.user_id)
    mappings = get_linked_loyalty_mappings(req.user_id)
    
    # 3. Run Cold-Start Agent (to get lifestyle preferences)
    inferred_preferences = run_cold_start_agent(profile, mappings)
    
    # 4. Fetch Candidate Deals for user tier
    tier = profile.get("tier") or "FREE"
    candidates = get_candidate_deals(tier)
    
    # 5. Run Recommendation Agent (hybrid score + Gemini explanations)
    agent_output = run_recommendation_agent(
        user_profile=profile,
        history_logs=logs,
        candidate_deals=candidates,
        inferred_preferences=inferred_preferences
    )
    
    # 6. Build response
    recs = agent_output.get("recommendations") or []
    # Crop to limit
    recs = recs[:req.limit]
    
    return RecommendationResponse(
        user_id=req.user_id,
        recommendations=recs,
        explanation=agent_output.get("general_summary", "")
    )

@app.post("/api/v1/signals")
def post_signal(req: SignalRequest):
    result = insert_user_signal(
        user_id=req.user_id,
        session_id=req.session_id,
        signal_type=req.signal_type,
        target_id=req.target_id,
        metadata=req.metadata
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record signal"
        )
    return {"success": True, "message": "Signal recorded successfully"}

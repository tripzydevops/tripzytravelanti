import os
import time
import jwt
from collections import defaultdict
from fastapi import FastAPI, HTTPException, status, Header, Depends, Request
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
from api.config import SUPABASE_JWT_SECRET
from uuid import UUID

app = FastAPI(
    title="Tripzy.travel Layer 2 Brain API",
    description="Autonomous Agent Recommendation Engine",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down to specific domains in prod config
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory rate limiter
rate_limit_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30  # requests per minute

def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Filter out expired timestamps
    rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    rate_limit_store[client_ip].append(now)

# JWT Authentication validation helper
def verify_jwt_token(authorization: str = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header"
        )
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization header format. Must be 'Bearer <token>'"
            )
        token = parts[1]
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Tripzy.travel Autonomous Recommendation Engine",
        "version": "1.0.0"
    }

@app.post("/api/v1/recommendations", response_model=RecommendationResponse, dependencies=[Depends(check_rate_limit)])
def get_recommendations(req: RecommendationRequest, token_payload: dict = Depends(verify_jwt_token)):
    # Verify user ID matches subject of the validated token
    token_user_id = token_payload.get("sub")
    if token_user_id != str(req.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Token subject does not match requested user ID"
        )

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

@app.post("/api/v1/signals", dependencies=[Depends(check_rate_limit)])
def post_signal(req: SignalRequest, token_payload: dict = Depends(verify_jwt_token)):
    # Verify user ID matches subject of the validated token
    token_user_id = token_payload.get("sub")
    if token_user_id != str(req.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Token subject does not match requested user ID"
        )

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

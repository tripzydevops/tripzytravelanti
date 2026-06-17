from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID
from api.config import GEMINI_API_KEY
from api.services.supabase_service import get_user_profile, get_engagement_logs, get_linked_loyalty_mappings

# Initialize Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

# =====================================================
# PYDANTIC SCHEMAS FOR STRUCTURED GEMINI OUTPUTS
# =====================================================

class InferredPreference(BaseModel):
    category: str = Field(description="The travel/lifestyle category (e.g. 'Dining', 'Travel', 'Relaxation', 'Adventure', 'Culture')")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    reasoning: str = Field(description="Explanation of why this preference was inferred")

class ColdStartAnalysis(BaseModel):
    preferences: List[InferredPreference]

class RecommendedDealExplanation(BaseModel):
    deal_id: str = Field(description="The UUID string of the recommended deal")
    reason_tr: str = Field(description="Reasoning of why this deal is recommended, written in Turkish. Must sound highly personalized and reference specific profile attributes.")
    reason_en: str = Field(description="Reasoning of why this deal is recommended, written in English. Must sound highly personalized.")

class AgentRecommendationOutput(BaseModel):
    selected_deal_ids: List[str] = Field(description="The top 3 selected deal UUID strings")
    recommendation_explanations: List[RecommendedDealExplanation]
    general_summary: str = Field(description="A general welcoming summary of the recommendations in Turkish")

# =====================================================
# AGENT WORKFLOWS
# =====================================================

def run_cold_start_agent(user_profile: Dict[str, Any], linked_mappings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Cold-Start Agent: Infers travel and lifestyle categories for users with zero history
    using demographic and contextual signals (City, Tier, Loyalty status, Linked Accounts).
    """
    city = user_profile.get("city") or "Unknown"
    tier = user_profile.get("tier") or "FREE"
    points = user_profile.get("points") or 0
    
    accounts_summary = []
    for m in linked_mappings:
        accounts_summary.append(f"Platform: {m.get('external_platform')}, ID: {m.get('external_user_id')}")
    linked_accounts_str = ", ".join(accounts_summary) if accounts_summary else "None"
    
    prompt = f"""
    You are the Tripzy.travel Cold-Start Agent. Your job is to analyze the profile of a user with ZERO travel/deal history and infer their lifestyle and travel category preferences.
    
    User Profile:
    - City: {city}
    - Subscription Tier: {tier}
    - Loyalty Points Balance: {points}
    - Linked External Accounts: {linked_accounts_str}
    
    Rules for inference:
    1. If the user has a linked account (like 'qr_menu_saas'), boost 'Dining' category heavily.
    2. If the user is in Istanbul, boost 'Travel' (Airport Lounge) and 'Dining' (Geleneksel Türk Akşam Yemeği) due to local lifestyle and key hubs.
    3. If the user is in resort areas (Antalya, Bodrum) boost 'Relaxation' and 'Adventure'.
    4. If subscription tier is VIP or PREMIUM, boost 'Travel' and luxury/premium services. If tier is FREE, boost budget/free categories.
    
    Provide your inferences with confidence scores.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ColdStartAnalysis,
                system_instruction="You are a professional lifestyle and psychographic profiling agent for a travel tech startup."
            ),
        )
        
        # Parse output
        data = json_safe_parse(response.text)
        if data and "preferences" in data:
            return data["preferences"]
        return []
    except Exception as e:
        print(f"[Cold-Start Agent] Error: {e}")
        # Return fallback inferences
        return [
            {"category": "Dining", "confidence": 0.6, "reasoning": "Standard default dining preference"},
            {"category": "Travel", "confidence": 0.5, "reasoning": "Standard default travel preference"}
        ]

def run_recommendation_agent(
    user_profile: Dict[str, Any],
    history_logs: List[Dict[str, Any]],
    candidate_deals: List[Dict[str, Any]],
    inferred_preferences: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Recommendation Agent: Computes a hybrid score for each deal, ranks candidates,
    and uses Gemini to select the top 3 and generate personalized reasonings.
    """
    if not candidate_deals:
        return {"selected_deal_ids": [], "recommendation_explanations": [], "general_summary": "No active deals found."}

    # 1. Compute Hybrid Score for each candidate deal
    scored_candidates = []
    
    # User interaction history mapping
    saved_deal_ids = set()
    redeemed_deal_ids = set()
    category_interaction_counts = {}
    
    for log in history_logs:
        event = log.get("event_type")
        item_id = log.get("item_id")
        
        # We need to find corresponding deal categories
        # Let's count category frequencies
        deal_ref = next((d for d in candidate_deals if str(d["id"]) == item_id), None)
        if deal_ref:
            cat = deal_ref.get("category")
            if cat:
                category_interaction_counts[cat] = category_interaction_counts.get(cat, 0) + 1
                
        if event in ("save", "favorite"):
            saved_deal_ids.add(item_id)
        elif event in ("claim", "redeem"):
            redeemed_deal_ids.add(item_id)
            
    # Inferred preferences mapping
    inferred_weights = {p["category"]: p["confidence"] for p in inferred_preferences if "category" in p}
    
    for deal in candidate_deals:
        deal_id_str = str(deal["id"])
        category = deal.get("category")
        
        score = 0.0
        
        # A. History interactions
        if deal_id_str in saved_deal_ids:
            score += 5.0
        if deal_id_str in redeemed_deal_ids:
            score += 10.0
            
        # B. Category interactions
        cat_count = category_interaction_counts.get(category, 0)
        score += min(cat_count * 1.5, 6.0)
        
        # C. Cold-start / Inferred preferences boost
        inferred_conf = inferred_weights.get(category, 0.0)
        score += inferred_conf * 5.0
        
        # D. Rating boost
        rating = float(deal.get("rating") or 0.0)
        score += (rating / 5.0) * 2.0
        
        scored_candidates.append({
            "deal": deal,
            "score": round(score, 2)
        })
        
    # Sort by score descending
    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    
    # Take top 6 candidates to pass to Gemini
    top_candidates = scored_candidates[:6]
    
    # 2. Build Gemini prompt for selection & explanation
    deals_data_prompt = []
    for c in top_candidates:
        d = c["deal"]
        deals_data_prompt.append(
            f"- ID: {d['id']}, Title: {d['title']} ({d['title_tr']}), Vendor: {d['vendor']}, Category: {d['category']}, Price: {d['discounted_price']}, Rating: {d['rating']}, Required Tier: {d['required_tier']}"
        )
    deals_str = "\n".join(deals_data_prompt)
    
    user_summary = f"""
    - User ID: {user_profile.get('id')}
    - Name: {user_profile.get('name')}
    - City: {user_profile.get('city')}
    - Tier: {user_profile.get('tier')}
    - Linked accounts: {'Yes' if len(inferred_preferences) > 2 else 'No'}
    - History: {len(history_logs)} interactions.
    """
    
    prompt = f"""
    You are the Tripzy.travel Autonomous Recommendation Agent.
    Based on the user's profile and inferred lifestyle preferences, select the top 3 best-fitting deals from the candidates below, and generate personalized explanations of why they are recommended.
    
    User Profile:
    {user_summary}
    
    Candidate Deals (ranked by hybrid algorithm):
    {deals_str}
    
    Instructions:
    1. Select EXACTLY 3 deals.
    2. Write a Turkish explanation (reason_tr) and an English explanation (reason_en) for each.
    3. The explanation MUST reference user details (e.g. name, tier, city, or external linked accounts) to feel genuine. For example: "Since you are in Istanbul, this airport lounge access will elevate your next flight..." or "Merhaba {user_profile.get('name')}, Premium üyeliğiniz sayesinde bu..."
    4. Provide a general summary explanation (general_summary) introducing the recommendations.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AgentRecommendationOutput,
                system_instruction="You are an expert recommendation engine writer that excels at generating highly engaging, personalized travel explanations."
            ),
        )
        
        data = json_safe_parse(response.text)
        if data:
            # Add hybrid scores to the explanations if matching
            results = data.get("recommendation_explanations") or []
            selected_ids = data.get("selected_deal_ids") or []
            
            # Map selected deals back with their score
            final_recs = []
            for item in results:
                deal_id = item.get("deal_id")
                matched_c = next((c for c in top_candidates if str(c["deal"]["id"]) == deal_id), None)
                if matched_c:
                    deal = matched_c["deal"]
                    final_recs.append({
                        **deal,
                        "recommendation_score": matched_c["score"],
                        "reason_tr": item.get("reason_tr", ""),
                        "reason_en": item.get("reason_en", "")
                    })
                    
            return {
                "recommendations": final_recs,
                "general_summary": data.get("general_summary", "")
            }
    except Exception as e:
        print(f"[Recommendation Agent] Error: {e}")
        
    # Fallback return top 3 ranked deals without Gemini reasoning
    fallback_recs = []
    for c in top_candidates[:3]:
        d = c["deal"]
        fallback_recs.append({
            **d,
            "recommendation_score": c["score"],
            "reason_tr": f"Bu fırsat size özel olarak kategorisindeki yüksek puanı nedeniyle önerilmiştir.",
            "reason_en": f"This deal is recommended based on its high rating in {d.get('category')}."
        })
    return {
        "recommendations": fallback_recs,
        "general_summary": "Seyahat profilinize göre sizin için seçtiğimiz harika fırsatlar:"
    }

# =====================================================
# HELPER FUNCTIONS
# =====================================================

def json_safe_parse(text: str) -> Optional[Dict[str, Any]]:
    import json
    try:
        # Strip markdown code blocks if any
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception:
        return None

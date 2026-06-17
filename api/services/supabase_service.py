from supabase import create_client, Client
from api.config import SUPABASE_URL, SUPABASE_KEY
from uuid import UUID
from typing import Optional, List, Dict, Any
import json

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_user_profile(user_id: UUID) -> Optional[Dict[str, Any]]:
    try:
        response = supabase.table("profiles").select("*").eq("id", str(user_id)).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error getting user profile: {e}")
        return None

def get_engagement_logs(user_id: UUID, limit: int = 50) -> List[Dict[str, Any]]:
    try:
        response = supabase.table("engagement_logs").select("*").eq("user_id", str(user_id)).order("created_at", desc=True).limit(limit).execute()
        return response.data or []
    except Exception as e:
        print(f"Error getting engagement logs: {e}")
        return []

def get_candidate_deals(user_tier: str) -> List[Dict[str, Any]]:
    try:
        # Get all approved deals
        response = supabase.table("deals").select("*").eq("status", "approved").execute()
        deals = response.data or []
        
        # Simple tier validation logic:
        # VIP has access to all
        # PREMIUM has access to PREMIUM, BASIC, FREE, NONE
        # BASIC has access to BASIC, FREE, NONE
        # FREE has access to FREE, NONE
        # NONE has access to NONE
        tier_hierarchy = {
            "NONE": 0,
            "FREE": 1,
            "BASIC": 2,
            "PREMIUM": 3,
            "VIP": 4
        }
        
        user_level = tier_hierarchy.get(user_tier, 1)
        
        valid_deals = []
        for deal in deals:
            req_tier = deal.get("required_tier") or "FREE"
            req_level = tier_hierarchy.get(req_tier, 1)
            if user_level >= req_level:
                valid_deals.append(deal)
        return valid_deals
    except Exception as e:
        print(f"Error getting candidate deals: {e}")
        return []

def get_linked_loyalty_mappings(user_id: UUID) -> List[Dict[str, Any]]:
    try:
        response = supabase.table("external_user_mappings").select("*").eq("user_id", str(user_id)).execute()
        return response.data or []
    except Exception as e:
        print(f"Error getting linked loyalty mappings: {e}")
        return []

def insert_user_signal(user_id: Optional[UUID], session_id: Optional[str], signal_type: str, target_id: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    try:
        payload = {
            "signal_type": signal_type,
            "target_id": target_id,
            "metadata": metadata or {}
        }
        if user_id:
            payload["user_id"] = str(user_id)
        if session_id:
            payload["session_id"] = session_id
            
        # Insert to user_signals table
        response = supabase.table("user_signals").insert(payload).execute()
        
        # Log to engagement_logs table if user is authenticated and signal maps to allowed types
        allowed_events = {"view", "click", "search", "favorite", "save", "claim", "redeem", "rate"}
        if user_id and signal_type in allowed_events:
            log_payload = {
                "user_id": str(user_id),
                "event_type": signal_type,
                "item_id": target_id,
                "metadata": metadata or {}
            }
            supabase.table("engagement_logs").insert(log_payload).execute()
            
        return response.data[0] if response.data else {}
    except Exception as e:
        print(f"Error inserting user signal: {e}")
        return {}

def get_similar_deals_semantic(query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
    try:
        # Invoke vector-sync Edge Function
        res = supabase.functions.invoke("vector-sync", invoke_options={
            "body": {
                "action": "query",
                "query": {
                    "text": query_text,
                    "topK": top_k
                }
            }
        })
        
        # Safely parse response content
        if hasattr(res, "data"):
            content = res.data
            if isinstance(content, bytes):
                content = content.decode("utf-8")
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except Exception:
                    pass
            if isinstance(content, dict):
                if content.get("success"):
                    return content.get("results") or []
        return []
    except Exception as e:
        print(f"Error performing semantic query: {e}")
        return []

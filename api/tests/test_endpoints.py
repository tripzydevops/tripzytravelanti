import jwt
import datetime
import time
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from api.main import app
from api.config import SUPABASE_JWT_SECRET
from uuid import uuid4

client = TestClient(app)

def generate_test_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "email": "test@example.com",
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, SUPABASE_JWT_SECRET, algorithm="HS256")

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@patch("api.main.get_user_profile")
@patch("api.main.get_engagement_logs")
@patch("api.main.get_linked_loyalty_mappings")
@patch("api.main.run_cold_start_agent")
@patch("api.main.get_candidate_deals")
@patch("api.main.run_recommendation_agent")
def test_get_recommendations(
    mock_run_rec,
    mock_get_candidates,
    mock_run_cold,
    mock_get_linked,
    mock_get_logs,
    mock_get_profile
):
    user_id = str(uuid4())
    token = generate_test_jwt(user_id)
    
    # Setup mocks
    mock_get_profile.return_value = {
        "id": user_id,
        "name": "Test User",
        "email": "test@example.com",
        "tier": "PREMIUM",
        "city": "Istanbul"
    }
    mock_get_logs.return_value = []
    mock_get_linked.return_value = []
    mock_run_cold.return_value = [{"category": "Dining", "confidence": 0.9, "reasoning": "Test reasoning"}]
    mock_get_candidates.return_value = []
    
    mock_run_rec.return_value = {
        "recommendations": [
            {
                "id": str(uuid4()),
                "title": "Mock Deal",
                "title_tr": "Sahte Firsat",
                "description": "Mock description",
                "description_tr": "Sahte aciklama",
                "category": "Dining",
                "category_tr": "Yemek",
                "original_price": 100.0,
                "discounted_price": 50.0,
                "required_tier": "FREE",
                "vendor": "Mock Vendor",
                "recommendation_score": 9.5,
                "reason_tr": "Cunku bunu seversiniz",
                "reason_en": "Because you would love this"
            }
        ],
        "general_summary": "Turkish general explanation"
    }
    
    payload = {
        "user_id": user_id,
        "limit": 1
    }
    
    # Send with valid authorization header
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/recommendations", json=payload, headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["user_id"] == user_id
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["title"] == "Mock Deal"
    assert data["explanation"] == "Turkish general explanation"

def test_get_recommendations_unauthorized():
    payload = {
        "user_id": str(uuid4()),
        "limit": 1
    }
    # Send without authorization header
    response = client.post("/api/v1/recommendations", json=payload)
    assert response.status_code == 401
    assert "Missing Authorization" in response.json()["detail"]

def test_get_recommendations_forbidden_user_mismatch():
    user_id = str(uuid4())
    mismatched_user_id = str(uuid4())
    token = generate_test_jwt(mismatched_user_id) # token is for a different user
    
    payload = {
        "user_id": user_id,
        "limit": 1
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/recommendations", json=payload, headers=headers)
    assert response.status_code == 403
    assert "Token subject does not match" in response.json()["detail"]

@patch("api.main.insert_user_signal")
def test_post_signal(mock_insert_signal):
    user_id = str(uuid4())
    token = generate_test_jwt(user_id)
    mock_insert_signal.return_value = {"id": "some-signal-uuid"}
    
    payload = {
        "user_id": user_id,
        "signal_type": "view",
        "target_id": str(uuid4()),
        "metadata": {"test": "metadata"}
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/signals", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True

@patch("api.main.insert_user_signal")
def test_post_signals_batch(mock_insert_signal):
    user_id = str(uuid4())
    token = generate_test_jwt(user_id)
    mock_insert_signal.return_value = {"id": "some-signal-uuid"}
    
    payload = {
        "user_id": user_id,
        "session_id": "session-123",
        "signals": [
            {"signal_type": "hover", "target_id": str(uuid4()), "metadata": {"duration_ms": 750}},
            {"signal_type": "dwell", "target_id": str(uuid4()), "metadata": {"dwell_time_seconds": 5}}
        ]
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/signals/batch", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["recorded_count"] == 2

def test_post_signal_unauthorized():
    payload = {
        "user_id": str(uuid4()),
        "signal_type": "view",
        "target_id": str(uuid4()),
        "metadata": {"test": "metadata"}
    }
    response = client.post("/api/v1/signals", json=payload)
    assert response.status_code == 401

@patch("api.main.get_geofence_zone")
@patch("api.main.get_deal_by_id")
@patch("api.main.get_user_profile")
@patch("api.main.get_engagement_logs")
@patch("api.main.get_linked_loyalty_mappings")
@patch("api.main.run_cold_start_agent")
@patch("api.main.check_recent_notification")
@patch("api.main.insert_notification")
def test_post_location_update_success(
    mock_insert_notif,
    mock_check_recent,
    mock_run_cold,
    mock_get_linked,
    mock_get_logs,
    mock_get_profile,
    mock_get_deal,
    mock_get_zone
):
    user_id = str(uuid4())
    zone_id = str(uuid4())
    deal_id = str(uuid4())
    token = generate_test_jwt(user_id)
    
    mock_get_zone.return_value = {
        "id": zone_id,
        "deal_id": deal_id,
        "is_active": True,
        "radius_meters": 500
    }
    mock_get_deal.return_value = {
        "id": deal_id,
        "category": "Dining",
        "rating": 4.5,
        "vendor": "Test Restaurant",
        "title": "Free Dessert"
    }
    mock_get_profile.return_value = {
        "id": user_id,
        "name": "Test User",
        "email": "test@example.com",
        "tier": "FREE",
        "city": "Istanbul",
        "fcm_token": "mock-fcm-token"
    }
    mock_get_logs.return_value = []
    mock_get_linked.return_value = []
    # Make Cold-Start return high Dining preference confidence to exceed 0.85 threshold
    mock_run_cold.return_value = [{"category": "Dining", "confidence": 0.95}]
    mock_check_recent.return_value = False
    mock_insert_notif.return_value = True

    payload = {
        "user_id": user_id,
        "geofence_zone_id": zone_id,
        "latitude": 41.0082,
        "longitude": 28.9784
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/location-update", json=payload, headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["triggered"] is True
    assert data["notification_sent"] is True
    assert data["match_probability"] >= 0.85

def test_post_location_update_unauthorized():
    payload = {
        "user_id": str(uuid4()),
        "geofence_zone_id": str(uuid4()),
        "latitude": 41.0082,
        "longitude": 28.9784
    }
    response = client.post("/api/v1/location-update", json=payload)
    assert response.status_code == 401

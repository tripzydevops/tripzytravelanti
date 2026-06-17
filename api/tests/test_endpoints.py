from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from api.main import app
from uuid import uuid4

client = TestClient(app)

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
    user_id = uuid4()
    
    # Setup mocks
    mock_get_profile.return_value = {
        "id": str(user_id),
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
        "user_id": str(user_id),
        "limit": 1
    }
    
    response = client.post("/api/v1/recommendations", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["user_id"] == str(user_id)
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["title"] == "Mock Deal"
    assert data["recommendations"][0]["recommendation_score"] == 9.5
    assert data["explanation"] == "Turkish general explanation"

@patch("api.main.insert_user_signal")
def test_post_signal(mock_insert_signal):
    mock_insert_signal.return_value = {"id": "some-signal-uuid"}
    
    payload = {
        "user_id": str(uuid4()),
        "signal_type": "view",
        "target_id": str(uuid4()),
        "metadata": {"test": "metadata"}
    }
    
    response = client.post("/api/v1/signals", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

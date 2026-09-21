import time
from uuid import uuid4, UUID
from fastapi.testclient import TestClient
from unittest.mock import patch
from api.main import app
from api.services.lottery_engine import (
    generate_ticket_number,
    generate_provably_fair_seed,
    execute_provably_fair_draw,
    verify_story_screenshot_ocr
)

client = TestClient(app)

def test_list_lottery_campaigns():
    response = client.get("/api/v1/lottery/campaigns")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "title" in data[0]
    assert "prize_description" in data[0]

def test_create_lottery_campaign():
    payload = {
        "title": "Antalya 5-Star Resort Giveaway",
        "title_tr": "Antalya 5 Yıldızlı Resort Tatil Çekilişi",
        "description": "Share on Instagram to enter",
        "description_tr": "Instagramda paylaş çekilişe katıl",
        "prize_description": "All-Inclusive 3-Night Stay for 2",
        "prize_description_tr": "2 Kişilik 3 Gece Her Şey Dahil Konaklama",
        "image_url": "https://images.unsplash.com/photo-1540555700478-4be289fbecef",
        "total_winners": 2,
        "ends_at": "2026-10-01T00:00:00Z"
    }
    response = client.post("/api/v1/lottery/campaigns", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["total_winners"] == 2
    assert data["status"] == "active"

@patch("api.main.insert_user_signal")
def test_claim_lottery_ticket(mock_signal):
    campaign_id = "11111111-2222-3333-4444-555555555555"
    user_id = str(uuid4())
    
    payload = {
        "campaign_id": campaign_id,
        "user_id": user_id,
        "verification_method": "story_canvas"
    }
    response = client.post("/api/v1/lottery/claim-ticket", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["campaign_id"] == campaign_id
    assert data["user_id"] == user_id
    assert data["ticket_number"].startswith("TRPZ-LOT-")
    assert data["is_winner"] is False

def test_ocr_verify_story():
    campaign_id = "11111111-2222-3333-4444-555555555555"
    user_id = str(uuid4())
    
    payload = {
        "campaign_id": campaign_id,
        "user_id": user_id,
        "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
    response = client.post("/api/v1/lottery/ocr-verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["verified"] is True
    assert data["confidence"] > 0.9
    assert data["ticket_number"].startswith("TRPZ-LOT-")

def test_draw_lottery_winner():
    campaign_id = "11111111-2222-3333-4444-555555555555"
    payload = {
        "campaign_id": campaign_id
    }
    response = client.post("/api/v1/lottery/draw", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["winners"]) >= 1
    assert "draw_seed" in data
    assert len(data["draw_seed"]) > 10

def test_lottery_engine_provably_fair_reproducibility():
    campaign_id = "test-camp-123"
    seed = "test-fixed-seed-456"
    tickets = [
        {"ticket_id": "t1", "ticket_number": "TRPZ-LOT-AA11111", "user_id": "u1"},
        {"ticket_id": "t2", "ticket_number": "TRPZ-LOT-BB22222", "user_id": "u2"},
        {"ticket_id": "t3", "ticket_number": "TRPZ-LOT-CC33333", "user_id": "u3"}
    ]
    
    winners1, seed1 = execute_provably_fair_draw(campaign_id, tickets, total_winners=1)
    assert len(winners1) == 1
    assert winners1[0]["ticket_number"] in [t["ticket_number"] for t in tickets]

def test_meta_webhook_verification_handshake():
    # Valid subscription handshake
    params = {
        "hub.mode": "subscribe",
        "hub.verify_token": "tripzy_verify_token_secure",
        "hub.challenge": "1158201244"
    }
    response = client.get("/api/v1/lottery/webhook/instagram-mention", params=params)
    assert response.status_code == 200
    assert response.text == "1158201244"

    # Standby check when parameters are missing
    standby_response = client.get("/api/v1/lottery/webhook/instagram-mention")
    assert standby_response.status_code == 200
    assert standby_response.json()["status"] == "standby"

def test_meta_story_mention_webhook_receive():
    payload = {
        "object": "instagram",
        "entry": [
            {
                "id": "17841400000000000",
                "time": 1726918230,
                "changes": [
                    {
                        "field": "mentions",
                        "value": {
                            "comment_id": "17891234567890",
                            "media_id": "17928374829",
                            "sender_id": "17841401234567"
                        }
                    }
                ]
            }
        ]
    }
    response = client.post("/api/v1/lottery/webhook/instagram-mention", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["processed_mentions"] >= 1
    assert len(data["tickets_minted"]) >= 1
    assert data["tickets_minted"][0].startswith("TRPZ-LOT-")

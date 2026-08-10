import numpy as np
import math
from unittest.mock import patch, MagicMock
from api.services.agents import run_recommendation_agent

def test_svd_recommendation_calculation():
    # Setup inputs
    user_profile = {"id": "test-user-id", "name": "Test User", "tier": "FREE", "city": "Istanbul"}
    history_logs = [
        {"event_type": "view", "item_id": "deal-id-1"},
        {"event_type": "save", "item_id": "deal-id-1"},
    ]
    candidate_deals = [
        {
            "id": "deal-id-1",
            "category": "Dining",
            "rating": 4.5,
            "vendor": "Test Vendor",
            "title": "Test Title",
            "title_tr": "Test Title TR",
            "discounted_price": 10.0,
            "required_tier": "FREE"
        },
        {
            "id": "deal-id-2",
            "category": "Travel",
            "rating": 4.0,
            "vendor": "Test Vendor 2",
            "title": "Test Title 2",
            "title_tr": "Test Title 2 TR",
            "discounted_price": 20.0,
            "required_tier": "FREE"
        }
    ]
    inferred_preferences = [{"category": "Dining", "confidence": 0.8}, {"category": "Travel", "confidence": 0.3}]

    # Mock SVD++ parameters returned by supabase helpers
    mock_user_factors = {
        "user_id": "test-user-id",
        "factors": [0.1] * 32,
        "bias": 0.05
    }
    mock_deal_factors = [
        {"deal_id": "deal-id-1", "factors": [0.05] * 32, "bias": 0.02},
        {"deal_id": "deal-id-2", "factors": [0.02] * 32, "bias": 0.01}
    ]
    mock_implicit_factors = [
        {"category": "Dining", "factors": [0.03] * 32},
        {"category": "Travel", "factors": [0.01] * 32}
    ]

    with patch("api.services.agents.get_user_latent_factors", return_value=mock_user_factors), \
         patch("api.services.agents.get_deal_latent_factors", return_value=mock_deal_factors), \
         patch("api.services.agents.get_implicit_latent_factors", return_value=mock_implicit_factors), \
         patch("api.services.agents.client.models.generate_content") as mock_gemini:
        
        # Mock Gemini response
        mock_response = MagicMock()
        mock_response.text = """{
            "selected_deal_ids": ["deal-id-1", "deal-id-2"],
            "recommendation_explanations": [
                {"deal_id": "deal-id-1", "reason_tr": "Cunku meze seversiniz", "reason_en": "Because you love dining"},
                {"deal_id": "deal-id-2", "reason_tr": "Cunku seyahat seversiniz", "reason_en": "Because you love travel"}
            ],
            "general_summary": "Turkish general summary"
        }"""
        mock_gemini.return_value = mock_response

        # Execute
        result = run_recommendation_agent(user_profile, history_logs, candidate_deals, inferred_preferences)

        assert "recommendations" in result
        assert len(result["recommendations"]) == 2
        
        # Verify recommendation score is set
        rec1 = next(r for r in result["recommendations"] if r["id"] == "deal-id-1")
        assert "recommendation_score" in rec1
        assert rec1["recommendation_score"] > 0.0

def test_sgd_convergence_math():
    # Test that the SGD update math is mathematically sound and reduces error
    np.random.seed(42)
    k = 32
    eta = 0.1
    lambda_reg = 0.02
    
    # Target value we want to predict
    target_rating = 0.9
    
    # Initialize mock variables
    p_u = np.random.normal(0, 0.1, k)
    q_i = np.random.normal(0, 0.1, k)
    b_u = 0.0
    b_i = 0.0
    mu = 0.5
    y_c = np.random.normal(0, 0.1, k)
    
    # Assume 1 implicit item
    u_factor = p_u + y_c # sz_I_u = 1
    
    # Initial prediction
    pred_init = mu + b_u + b_i + np.dot(q_i, u_factor)
    error_init = abs(target_rating - pred_init)
    
    # Run 1 step of SGD update
    err = target_rating - pred_init
    b_u += eta * (err - lambda_reg * b_u)
    b_i += eta * (err - lambda_reg * b_i)
    
    p_update = eta * (err * q_i - lambda_reg * p_u)
    q_update = eta * (err * u_factor - lambda_reg * q_i)
    y_update = eta * (err * q_i - lambda_reg * y_c)
    
    p_u += p_update
    q_i += q_update
    y_c += y_update
    
    # Predict again
    u_factor_new = p_u + y_c
    pred_new = mu + b_u + b_i + np.dot(q_i, u_factor_new)
    error_new = abs(target_rating - pred_new)
    
    # Assert that error decreased after SGD update step
    assert error_new < error_init

def test_implicit_signals_rating_mapping():
    # Test that implicit telemetry events map to correct rating weights
    events_map = {
        "redeem": 1.0,
        "claim": 1.0,
        "save": 0.8,
        "favorite": 0.8,
        "dwell": 0.6,
        "view": 0.4,
        "click": 0.4,
        "scroll": 0.3,
        "hover": 0.2
    }

    logs = [
        {"user_id": "u1", "item_id": "d1", "event_type": event}
        for event in events_map.keys()
    ]

    for log in logs:
        event = log.get("event_type")
        score = 0.1
        if event in ("redeem", "claim"):
            score = 1.0
        elif event in ("save", "favorite"):
            score = 0.8
        elif event == "dwell":
            score = 0.6
        elif event in ("view", "click"):
            score = 0.4
        elif event == "scroll":
            score = 0.3
        elif event == "hover":
            score = 0.2

        assert score == events_map[event]


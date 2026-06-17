from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID

class UserProfile(BaseModel):
    id: UUID
    name: str
    email: str
    tier: str
    is_admin: bool = False
    points: int = 0
    mobile: Optional[str] = None
    address: Optional[str] = None
    billing_address: Optional[str] = None
    role: str = "user"
    status: str = "active"
    rank: Optional[str] = None
    geofence_enforcement_mode: str = "off"

class Deal(BaseModel):
    id: UUID
    title: str
    title_tr: str
    description: str
    description_tr: str
    image_url: Optional[str] = None
    category: str
    category_tr: str
    original_price: float
    discounted_price: float
    required_tier: str
    vendor: str
    rating: float = 0.0
    rating_count: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    store_locations: Optional[List[Dict[str, Any]]] = None

class RecommendedDeal(Deal):
    recommendation_score: float = 0.0
    reason_tr: str = ""
    reason_en: str = ""

class RecommendationRequest(BaseModel):
    user_id: UUID
    limit: int = 3
    session_id: Optional[str] = None

class RecommendationResponse(BaseModel):
    user_id: UUID
    recommendations: List[RecommendedDeal]
    explanation: str = ""  # General summary explanation

class SignalRequest(BaseModel):
    user_id: Optional[UUID] = None
    session_id: Optional[str] = None
    signal_type: str  # 'view', 'click', 'search', 'favorite', 'save', 'claim', 'redeem', 'rate'
    target_id: str
    metadata: Optional[Dict[str, Any]] = None

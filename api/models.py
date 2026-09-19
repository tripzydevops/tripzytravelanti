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
    signal_type: str  # 'view', 'click', 'search', 'favorite', 'save', 'claim', 'redeem', 'rate', 'dwell', 'scroll', 'hover'
    target_id: str
    metadata: Optional[Dict[str, Any]] = None

class BatchSignalRequest(BaseModel):
    user_id: UUID
    session_id: Optional[str] = None
    signals: List[Dict[str, Any]]

class LocationUpdateRequest(BaseModel):
    user_id: UUID
    geofence_zone_id: UUID
    latitude: float
    longitude: float

class LocationUpdateResponse(BaseModel):
    triggered: bool
    match_probability: float
    notification_sent: bool
    message: str

# =====================================================
# FLASH LOTTERY & INSTAGRAM OCR PYDANTIC MODELS
# =====================================================
class LotteryCampaignCreate(BaseModel):
    title: str
    title_tr: str
    description: str
    description_tr: str
    prize_description: str
    prize_description_tr: str
    image_url: str
    total_winners: int = 1
    deal_id: Optional[UUID] = None
    merchant_id: Optional[UUID] = None
    merchant_name: Optional[str] = None
    ends_at: str

class LotteryCampaignResponse(BaseModel):
    id: UUID
    title: str
    title_tr: str
    description: str
    description_tr: str
    prize_description: str
    prize_description_tr: str
    image_url: str
    total_winners: int
    starts_at: str
    ends_at: str
    status: str
    total_tickets_minted: int
    winning_ticket_ids: Optional[List[UUID]] = []

class LotteryTicketClaimRequest(BaseModel):
    campaign_id: UUID
    user_id: UUID
    verification_method: str = "story_canvas" # 'webhook_tag', 'story_canvas', 'referral_click', 'ocr_screenshot', 'points_exchange'
    proof_url: Optional[str] = None

class LotteryTicketResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    user_id: UUID
    ticket_number: str
    verification_method: str
    verified_at: str
    is_winner: bool

class StoryOCRVerificationRequest(BaseModel):
    campaign_id: UUID
    user_id: UUID
    image_base64: str

class StoryOCRVerificationResponse(BaseModel):
    success: bool
    verified: bool
    confidence: float
    extracted_tags: List[str]
    ticket_number: Optional[str] = None
    message: str

class LotteryDrawRequest(BaseModel):
    campaign_id: UUID
    admin_user_id: Optional[UUID] = None

class LotteryDrawWinner(BaseModel):
    ticket_id: UUID
    ticket_number: str
    user_id: UUID
    user_name: str

class LotteryDrawResponse(BaseModel):
    success: bool
    campaign_id: UUID
    winners: List[LotteryDrawWinner]
    draw_seed: str
    drawn_at: str


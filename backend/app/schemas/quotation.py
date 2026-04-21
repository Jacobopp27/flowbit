from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from app.models.quotation import QuotationStatus


# ── Items ──────────────────────────────────────────────────────────────────────

class QuotationItemCreate(BaseModel):
    product_id: Optional[int] = None
    reference: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    has_sizes: bool = True
    sizes_breakdown: Dict[str, Any] = Field(default_factory=dict)
    unit_price: Optional[float] = None
    notes: Optional[str] = None
    order: int = 0
    design_image_path: Optional[str] = None
    material_overrides: Optional[Dict[str, Any]] = None


class QuotationItemOut(QuotationItemCreate):
    id: int
    quotation_id: int
    product_name: Optional[str] = None
    design_image_path: Optional[str] = None
    material_overrides: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# ── Quotation ──────────────────────────────────────────────────────────────────

class QuotationCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)
    client_nit: Optional[str] = None
    client_contact: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    event_name: Optional[str] = None
    delivery_date: Optional[date] = None
    iva_rate: float = 0.19
    discount: float = 0
    gift_note: Optional[str] = None
    observations: Optional[str] = None
    payment_conditions: Optional[str] = None
    molderia: Optional[str] = None
    items: List[QuotationItemCreate] = []


class QuotationUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=1, max_length=200)
    client_nit: Optional[str] = None
    client_contact: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    event_name: Optional[str] = None
    delivery_date: Optional[date] = None
    iva_rate: Optional[float] = None
    discount: Optional[float] = None
    gift_note: Optional[str] = None
    observations: Optional[str] = None
    payment_conditions: Optional[str] = None
    molderia: Optional[str] = None
    items: Optional[List[QuotationItemCreate]] = None


class QuotationStatusUpdate(BaseModel):
    status: QuotationStatus


class QuotationOut(BaseModel):
    id: int
    number: str
    status: QuotationStatus
    client_name: str
    client_nit: Optional[str]
    client_contact: Optional[str]
    client_phone: Optional[str]
    client_email: Optional[str]
    event_name: Optional[str]
    delivery_date: Optional[date]
    iva_rate: float
    discount: float
    gift_note: Optional[str]
    observations: Optional[str]
    payment_conditions: Optional[str]
    molderia: Optional[str] = None
    design_image_path: Optional[str] = None
    items: List[QuotationItemOut] = []
    created_at: datetime
    updated_at: datetime
    project_id: Optional[int] = None

    class Config:
        from_attributes = True


class QuotationListItem(BaseModel):
    id: int
    number: str
    status: QuotationStatus
    client_name: str
    event_name: Optional[str]
    delivery_date: Optional[date]
    total_items: int
    created_at: datetime
    project_id: Optional[int] = None

    class Config:
        from_attributes = True


# ── Generate orders ────────────────────────────────────────────────────────────

class GenerateOrdersRequest(BaseModel):
    """Data needed when generating orders from an approved quotation"""
    template_id: Optional[int] = None          # flowbiit project template to use
    stage_ids: Optional[List[int]] = None       # manual stage list if no template
    stage_dates: Optional[Dict[int, str]] = None  # {stage_id: "YYYY-MM-DD"}
    tailor_name: Optional[str] = None           # for ficha de producción
    tailor_price_per_unit: Optional[float] = None
    notes: Optional[str] = None


class GenerateOrdersResponse(BaseModel):
    project_id: int
    message: str

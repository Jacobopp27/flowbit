from pydantic import BaseModel, Field
from datetime import date
from decimal import Decimal


class MaterialPurchaseCreate(BaseModel):
    """Create a general material purchase (adds to inventory)"""
    material_id: int
    quantity: Decimal = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)
    supplier_id: int | None = None
    purchase_date: date
    notes: str | None = None


class MaterialPurchaseResponse(BaseModel):
    """Material purchase response"""
    id: int = Field(serialization_alias='purchase_id')
    company_id: int
    material_id: int
    material_name: str
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    supplier_id: int | None
    supplier_name: str | None
    purchase_date: date
    notes: str | None
    created_at: str
    
    class Config:
        from_attributes = True

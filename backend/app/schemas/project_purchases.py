from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import date


class ProjectMaterialPurchaseCreate(BaseModel):
    """Approve/purchase a material in the purchasing stage of a project"""
    material_id: int
    quantity_purchased: Decimal = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)
    supplier_id: int | None = None
    purchase_date: date
    notes: str | None = None


class ProjectMaterialPurchaseResponse(BaseModel):
    """Response after purchasing material in project stage"""
    material_id: int
    material_name: str
    quantity_purchased: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    qty_required: Decimal
    qty_remaining: Decimal
    inventory_updated: bool
    
    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class MaterialBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=50)  # m, unit, kg, L, etc.
    supplier_id: Optional[int] = None


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    supplier_id: Optional[int] = None


class MaterialResponse(MaterialBase):
    id: int
    company_id: int
    qty_available: Decimal
    cost_per_unit: Optional[Decimal] = None
    category: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

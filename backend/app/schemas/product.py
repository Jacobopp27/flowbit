from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProductBOMItemBase(BaseModel):
    material_id: int
    qty_per_unit: float = Field(..., gt=0)


class ProductBOMItemCreate(ProductBOMItemBase):
    pass


class ProductBOMItemUpdate(BaseModel):
    material_id: Optional[int] = None
    qty_per_unit: Optional[float] = Field(None, gt=0)


class ProductBOMItemResponse(ProductBOMItemBase):
    id: int
    product_id: int

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=100)


class ProductCreate(ProductBase):
    bom_items: List[ProductBOMItemCreate] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=100)
    bom_items: Optional[List[ProductBOMItemCreate]] = None


class ProductResponse(ProductBase):
    id: int
    company_id: int
    created_at: datetime
    bom_items: List[ProductBOMItemResponse] = []

    class Config:
        from_attributes = True

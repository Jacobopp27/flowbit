from pydantic import BaseModel, Field


class CompanySettingsResponse(BaseModel):
    """Company settings including inventory configuration"""
    company_id: int = Field(serialization_alias='company_id')
    company_name: str
    track_raw_materials_inventory: bool
    track_finished_products_inventory: bool
    
    class Config:
        from_attributes = True


class CompanySettingsUpdate(BaseModel):
    """Update inventory tracking settings"""
    track_raw_materials_inventory: bool | None = None
    track_finished_products_inventory: bool | None = None

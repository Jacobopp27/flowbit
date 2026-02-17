from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# StageEdge schemas
class StageEdgeBase(BaseModel):
    from_stage_id: int
    to_stage_id: int


class StageEdgeCreate(StageEdgeBase):
    pass


class StageEdgeResponse(StageEdgeBase):
    id: int

    class Config:
        from_attributes = True


# Stage schemas
class StageBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")  # Hex color
    is_purchasing_stage: bool = False


class StageCreate(StageBase):
    pass


class StageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_purchasing_stage: Optional[bool] = None


class StageResponse(StageBase):
    id: int
    company_id: int
    created_at: datetime
    dependencies_from: List[StageEdgeResponse] = []
    dependencies_to: List[StageEdgeResponse] = []

    class Config:
        from_attributes = True

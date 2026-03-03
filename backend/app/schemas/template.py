from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class TemplateStageCreate(BaseModel):
    stage_id: int
    duration_days: int = Field(..., gt=0, le=365, description="Duration in days (1-365)")
    stage_order: int = Field(..., ge=0)
    has_operational_cost: bool = False
    cost_per_unit: Optional[float] = None
    depends_on_stage_ids: List[int] = []  # List of stage_ids this stage depends on


class TemplateStageResponse(BaseModel):
    id: int
    stage_id: int
    stage_name: str
    duration_days: int
    stage_order: int
    has_operational_cost: bool
    cost_per_unit: Optional[float]
    depends_on_stage_ids: List[int]

    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    stages: List[TemplateStageCreate]


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    stages: Optional[List[TemplateStageCreate]] = None


class TemplateListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    stages_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    stages: List[TemplateStageResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplyTemplateRequest(BaseModel):
    start_date: Optional[date] = None
    final_deadline: Optional[date] = None


class AppliedStageResponse(BaseModel):
    stage_id: int
    stage_name: str
    planned_due_date: date
    has_operational_cost: bool
    cost_per_unit: Optional[float]
    depends_on: List[int]
    stage_order: int


class ApplyTemplateResponse(BaseModel):
    stages: List[AppliedStageResponse]
    calculated_start_date: date
    calculated_end_date: date

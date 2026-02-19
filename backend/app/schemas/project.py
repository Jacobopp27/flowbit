from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.models.stage import StageStatus


class ProjectProductItem(BaseModel):
    """Product with quantity for a project"""
    product_id: int
    quantity: int = Field(..., gt=0)


class ProjectStageCreate(BaseModel):
    """Stage instance for project creation"""
    stage_id: int
    planned_due_date: date
    qty_required: Optional[int] = None
    notes: Optional[str] = None
    stage_order: int = 0
    depends_on: List[int] = []  # List of stage_ids this stage depends on
    has_operational_cost: bool = False
    cost_per_unit: Optional[float] = None


class ProjectCreate(BaseModel):
    """Create project with products and stages"""
    project_name: str = Field(..., min_length=1, max_length=200)
    client_name: str = Field(..., min_length=1, max_length=200)
    start_date: Optional[date] = None
    final_deadline: Optional[date] = None
    notes: Optional[str] = None
    products: List[ProjectProductItem] = []  # Products with quantities
    stages: List[ProjectStageCreate] = []  # Stage instances with deadlines
    sale_price: Optional[float] = None
    sale_includes_tax: bool = False
    adds_to_inventory: bool = False


class ProjectUpdate(BaseModel):
    """Update project basic info"""
    project_name: Optional[str] = Field(None, min_length=1, max_length=200)
    client_name: Optional[str] = Field(None, min_length=1, max_length=200)
    start_date: Optional[date] = None
    final_deadline: Optional[date] = None
    notes: Optional[str] = None
    sale_price: Optional[float] = None
    sale_includes_tax: Optional[bool] = None
    products: Optional[List[ProjectProductItem]] = None
    stages: Optional[List[ProjectStageCreate]] = None


class ProjectStageUpdate(BaseModel):
    """Update project stage"""
    status: Optional[StageStatus] = None
    qty_required: Optional[int] = Field(None, gt=0)
    qty_done: Optional[int] = Field(None, ge=0)
    planned_due_date: Optional[date] = None
    notes: Optional[str] = None
    has_operational_cost: Optional[bool] = None
    cost_per_unit: Optional[float] = None


class ProjectMaterialRequirementUpdate(BaseModel):
    """Update material requirement for project"""
    qty_per_unit: Optional[float] = Field(None, gt=0)
    qty_available: Optional[float] = Field(None, ge=0)


class MaterialRequirementResponse(BaseModel):
    id: int = Field(serialization_alias='requirement_id')
    material_id: int
    material_name: str
    material_unit: str
    qty_per_unit: float
    qty_total: float
    qty_available: float
    qty_to_buy: float
    
    class Config:
        from_attributes = True


class ProjectStageResponse(BaseModel):
    id: int = Field(serialization_alias='project_stage_id')
    stage_id: int
    stage_name: str
    status: StageStatus
    qty_required: int
    qty_done: int
    planned_due_date: date
    actual_ready_at: Optional[datetime] = None
    actual_started_at: Optional[datetime] = None
    actual_done_at: Optional[datetime] = None
    notes: Optional[str] = None
    stage_order: int = 0
    depends_on: List[int] = []  # List of stage IDs this stage depends on
    has_operational_cost: bool = False
    cost_per_unit: Optional[float] = None
    
    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Project list item"""
    id: int = Field(serialization_alias='project_id')
    project_name: str
    client_name: str
    start_date: Optional[date] = None
    final_deadline: Optional[date] = None
    created_at: datetime
    stages_count: int = 0
    completed_stages: int = 0
    
    class Config:
        from_attributes = True


class ProductInProject(BaseModel):
    """Product in project response"""
    product_id: int
    product_name: str
    quantity: int
    
    class Config:
        from_attributes = True


class ProjectDetailResponse(BaseModel):
    """Full project details with stages and materials"""
    id: int = Field(..., serialization_alias='project_id')
    project_name: str
    client_name: str
    start_date: Optional[date] = None
    final_deadline: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    sale_price: Optional[float] = None
    sale_includes_tax: bool = False
    products: List[ProductInProject] = []
    stages: List[ProjectStageResponse] = []
    material_requirements: List[MaterialRequirementResponse] = []
    
    class Config:
        from_attributes = True

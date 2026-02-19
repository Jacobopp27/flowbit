from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Date, Enum as SQLEnum, Numeric, Boolean
from sqlalchemy.orm import relationship
import enum
from app.database import Base
from app.models.stage import StageStatus


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    project_name = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    start_date = Column(Date, nullable=True)
    final_deadline = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Economics
    sale_price = Column(Numeric(10, 2), nullable=True)
    sale_includes_tax = Column(Boolean, nullable=False, default=False)
    
    # Relationships
    company = relationship("Company", back_populates="projects")
    project_stages = relationship("ProjectStage", back_populates="project", cascade="all, delete-orphan")
    material_requirements = relationship("ProjectMaterialRequirement", back_populates="project", cascade="all, delete-orphan")
    financial_events = relationship("FinancialEvent", back_populates="project")
    project_products = relationship("ProjectProduct", back_populates="project", cascade="all, delete-orphan")


class ProjectProduct(Base):
    """Products included in a project with their quantities"""
    __tablename__ = "project_products"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="project_products")
    product = relationship("Product")


class ProjectStage(Base):
    """Instance of a stage in a specific project"""
    __tablename__ = "project_stages"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey("stages.id"), nullable=False, index=True)
    
    status = Column(SQLEnum(StageStatus), nullable=False, default=StageStatus.BLOCKED)
    
    # Order
    stage_order = Column(Integer, nullable=False, default=0)
    
    # Quantities
    qty_required = Column(Integer, nullable=False)
    qty_done = Column(Integer, nullable=False, default=0)
    
    # Timeline
    planned_due_date = Column(Date, nullable=False)
    actual_ready_at = Column(DateTime, nullable=True)
    actual_started_at = Column(DateTime, nullable=True)
    actual_done_at = Column(DateTime, nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Operational costs
    has_operational_cost = Column(Boolean, nullable=False, default=False)
    cost_per_unit = Column(Numeric(10, 2), nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="project_stages")
    stage = relationship("Stage")
    time_logs = relationship("TimeLog", back_populates="project_stage")


class ProjectMaterialRequirement(Base):
    """Snapshot of material requirements per project (editable, independent of BOM)"""
    __tablename__ = "project_material_requirements"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    
    qty_per_unit = Column(Float, nullable=False)
    qty_total = Column(Float, nullable=False)
    qty_available = Column(Float, nullable=False, default=0)
    qty_to_buy = Column(Float, nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="material_requirements")
    material = relationship("Material")


class TimeLog(Base):
    """Work timer logs per project stage"""
    __tablename__ = "time_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_stage_id = Column(Integer, ForeignKey("project_stages.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    
    # Relationships
    project_stage = relationship("ProjectStage", back_populates="time_logs")
    user = relationship("User")


class FinancialEventType(str, enum.Enum):
    INCOME = "INCOME"
    COST = "COST"


class FinancialEvent(Base):
    """Visual finance tracking (not formal accounting)"""
    __tablename__ = "financial_events"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    
    type = Column(SQLEnum(FinancialEventType), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    category = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="financial_events")


class ProjectMaterialPurchase(Base):
    """Material purchases made within a project (purchasing stage)"""
    __tablename__ = "project_material_purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    project_stage_id = Column(Integer, ForeignKey("project_stages.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True, index=True)
    
    quantity_purchased = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=False)
    purchase_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    project = relationship("Project")
    project_stage = relationship("ProjectStage")
    material = relationship("Material")
    supplier = relationship("Supplier")
    user = relationship("User")


class StageEventLog(Base):
    """Audit log for stage events (status changes, etc)"""
    __tablename__ = "stage_event_log"
    
    id = Column(Integer, primary_key=True, index=True)
    project_stage_id = Column(Integer, ForeignKey("project_stages.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String, nullable=False)  # e.g., "status_change"
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Relationships
    project_stage = relationship("ProjectStage")
    user = relationship("User")


class ProjectStageDependency(Base):
    """Dependencies between stages in a project"""
    __tablename__ = "project_stage_dependencies"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey("project_stages.id", ondelete="CASCADE"), nullable=False, index=True)
    depends_on_stage_id = Column(Integer, ForeignKey("project_stages.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Relationships
    project = relationship("Project")
    stage = relationship("ProjectStage", foreign_keys=[stage_id])
    depends_on = relationship("ProjectStage", foreign_keys=[depends_on_stage_id])


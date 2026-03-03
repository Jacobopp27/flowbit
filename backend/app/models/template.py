from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Numeric
from sqlalchemy.orm import relationship
from app.database import Base


class ProjectTemplate(Base):
    """Template for quickly creating projects with predefined stages"""
    __tablename__ = "project_templates"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    company = relationship("Company", back_populates="project_templates")
    created_by_user = relationship("User")
    stages = relationship("ProjectTemplateStage", back_populates="template", cascade="all, delete-orphan")
    dependencies = relationship("ProjectTemplateStageDependency", back_populates="template", cascade="all, delete-orphan")


class ProjectTemplateStage(Base):
    """Stage within a project template with duration instead of absolute dates"""
    __tablename__ = "project_template_stages"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("project_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey("stages.id", ondelete="CASCADE"), nullable=False, index=True)
    duration_days = Column(Integer, nullable=False)  # Relative duration, not absolute date
    stage_order = Column(Integer, nullable=False)
    has_operational_cost = Column(Boolean, default=False, nullable=False)
    cost_per_unit = Column(Numeric(10, 2), nullable=True)

    # Relationships
    template = relationship("ProjectTemplate", back_populates="stages")
    stage = relationship("Stage")


class ProjectTemplateStageDependency(Base):
    """Dependencies between stages in a template"""
    __tablename__ = "project_template_stage_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("project_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    template_stage_id = Column(Integer, ForeignKey("project_template_stages.id", ondelete="CASCADE"), nullable=False, index=True)
    depends_on_template_stage_id = Column(Integer, ForeignKey("project_template_stages.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    template = relationship("ProjectTemplate", back_populates="dependencies")
    template_stage = relationship("ProjectTemplateStage", foreign_keys=[template_stage_id])
    depends_on_stage = relationship("ProjectTemplateStage", foreign_keys=[depends_on_template_stage_id])

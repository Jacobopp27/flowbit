from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    COMPANY_ADMIN = "COMPANY_ADMIN"
    STAGE_WORKER = "STAGE_WORKER"


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Inventory configuration
    track_raw_materials_inventory = Column(Boolean, default=True, nullable=False)
    track_finished_products_inventory = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="company")
    stages = relationship("Stage", back_populates="company")
    suppliers = relationship("Supplier", back_populates="company")
    materials = relationship("Material", back_populates="company")
    products = relationship("Product", back_populates="company")
    projects = relationship("Project", back_populates="company")
    project_templates = relationship("ProjectTemplate", back_populates="company")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.STAGE_WORKER)
    
    # Multi-tenant: null company_id = SUPER_ADMIN
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="users")
    stage_access = relationship("UserStageAccess", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class UserStageAccess(Base):
    """Junction table: which stages a user can access"""
    __tablename__ = "user_stage_access"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    stage_id = Column(Integer, ForeignKey("stages.id"), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="stage_access")
    stage = relationship("Stage")

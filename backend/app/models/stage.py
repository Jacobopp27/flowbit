from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Enum as SQLEnum, Boolean, Numeric
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class StageStatus(str, enum.Enum):
    BLOCKED = "BLOCKED"
    READY = "READY"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    SKIPPED = "SKIPPED"


class Stage(Base):
    """Generic workflow stage (e.g., Cut, Sew, Sublimation)"""
    __tablename__ = "stages"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, nullable=True)  # For UI
    is_purchasing_stage = Column(Boolean, default=False, nullable=False)  # Marks this as the purchasing/procurement stage
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="stages")
    dependencies_from = relationship("StageEdge", foreign_keys="StageEdge.from_stage_id")
    dependencies_to = relationship("StageEdge", foreign_keys="StageEdge.to_stage_id")


class StageEdge(Base):
    """Stage dependency: from_stage must be DONE before to_stage can be READY"""
    __tablename__ = "stage_edges"
    
    id = Column(Integer, primary_key=True, index=True)
    from_stage_id = Column(Integer, ForeignKey("stages.id"), nullable=False, index=True)
    to_stage_id = Column(Integer, ForeignKey("stages.id"), nullable=False, index=True)
    
    # Relationships
    from_stage = relationship("Stage", foreign_keys=[from_stage_id])
    to_stage = relationship("Stage", foreign_keys=[to_stage_id])


class Supplier(Base):
    """Supplier/Provider for materials"""
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="suppliers")
    materials = relationship("Material", back_populates="supplier")


class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    unit = Column(String, nullable=False)  # m, unit, kg, etc.
    qty_available = Column(Numeric(10, 2), nullable=False, server_default="0")
    cost_per_unit = Column(Numeric(10, 2), nullable=True)
    category = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="materials")
    supplier = relationship("Supplier", back_populates="materials")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="products")
    bom_items = relationship("ProductBOMItem", back_populates="product")


class ProductBOMItem(Base):
    """Bill of Materials: materials per product unit"""
    __tablename__ = "product_bom_items"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    qty_per_unit = Column(Float, nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="bom_items")
    material = relationship("Material")

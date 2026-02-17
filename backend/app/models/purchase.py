from datetime import datetime, date
from sqlalchemy import Column, Integer, ForeignKey, Date, Numeric, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class MaterialPurchase(Base):
    """General material purchases that add to raw materials inventory"""
    __tablename__ = "material_purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True, index=True)
    
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    purchase_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company")
    material = relationship("Material")
    supplier = relationship("Supplier")

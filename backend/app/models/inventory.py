from datetime import datetime, date
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Numeric, String, Date, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ProductInventory(Base):
    """Inventory of finished products"""
    __tablename__ = "product_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    qty_available = Column(Numeric(10, 2), default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company")
    product = relationship("Product")


class ProductSale(Base):
    """Sales of finished products from inventory"""
    __tablename__ = "product_sales"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    customer_name = Column(String, nullable=True)
    sale_date = Column(Date, nullable=False, default=date.today, index=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("Company")
    product = relationship("Product")

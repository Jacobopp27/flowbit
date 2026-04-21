from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Enum as SQLEnum, Boolean, Date, JSON, Numeric
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class QuotationStatus(str, enum.Enum):
    BORRADOR = "borrador"
    ENVIADA = "enviada"
    APROBADA = "aprobada"


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)

    number = Column(String, nullable=False, index=True)  # COT-001, COT-002...
    status = Column(SQLEnum(QuotationStatus), nullable=False, default=QuotationStatus.BORRADOR)

    # Client info
    client_name = Column(String, nullable=False)
    client_nit = Column(String, nullable=True)
    client_contact = Column(String, nullable=True)
    client_phone = Column(String, nullable=True)
    client_email = Column(String, nullable=True)

    # Order info
    event_name = Column(String, nullable=True)   # e.g. "Dotación Movilidad Q1"
    delivery_date = Column(Date, nullable=True)

    # Financial
    iva_rate = Column(Numeric(5, 4), nullable=False, default=0.19)   # 0.19 = 19%
    discount = Column(Numeric(12, 2), nullable=False, default=0)
    gift_note = Column(String, nullable=True)   # e.g. "Obsequio tula sublimada"

    # Production info
    molderia = Column(String, nullable=True)           # pattern ref, e.g. "ALCALDIA 2020"
    design_image_path = Column(String, nullable=True)  # relative path under static/uploads/designs/

    # Text blocks
    observations = Column(Text, nullable=True)
    payment_conditions = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationItem.order")
    projects = relationship("Project", back_populates="quotation")


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)

    reference = Column(String, nullable=False)       # e.g. "CHAQUETA-RANGLAN"
    description = Column(Text, nullable=True)
    has_sizes = Column(Boolean, nullable=False, default=True)
    design_image_path = Column(String, nullable=True)  # per-reference design image
    material_overrides = Column(JSON, nullable=True)  # {material_id: {"color": "Rojo", "code": "TEL-001"}}
    # JSON: {"XS": 10, "S": 20, "M": 30} or {"total": 50} when no sizes
    sizes_breakdown = Column(JSON, nullable=False, default=dict)
    unit_price = Column(Numeric(12, 2), nullable=True)
    notes = Column(Text, nullable=True)
    order = Column(Integer, nullable=False, default=0)

    # Relationships
    quotation = relationship("Quotation", back_populates="items")
    product = relationship("Product")

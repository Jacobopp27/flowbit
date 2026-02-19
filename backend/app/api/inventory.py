from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole, Company
from app.models.inventory import ProductInventory, ProductSale
from app.models.stage import Product
from app.api.auth import get_current_user
from pydantic import BaseModel
from datetime import date
from typing import Optional

router = APIRouter()


class ProductInventoryResponse(BaseModel):
    id: int
    company_id: int
    product_id: int
    product_name: str
    qty_available: float
    
    class Config:
        from_attributes = True


class ProductSaleCreate(BaseModel):
    product_id: int
    quantity: float
    unit_price: float
    customer_name: Optional[str] = None
    sale_date: date
    notes: Optional[str] = None


class ProductSaleResponse(BaseModel):
    id: int
    company_id: int
    product_id: int
    product_name: str
    quantity: float
    unit_price: float
    total_amount: float
    customer_name: Optional[str]
    sale_date: date
    notes: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


@router.get("/products/", response_model=list[ProductInventoryResponse])
def get_product_inventory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get product inventory for the company"""
    # Verify user is admin
    if current_user.role not in [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Only admins can access inventory"
        )
    
    # Check if tracking is enabled
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company or not company.track_finished_products_inventory:
        raise HTTPException(
            status_code=400,
            detail="Finished products inventory tracking is not enabled"
        )
    
    # Get all inventory items
    inventory_items = db.query(ProductInventory, Product).join(
        Product, ProductInventory.product_id == Product.id
    ).filter(
        ProductInventory.company_id == current_user.company_id
    ).all()
    
    result = []
    for inventory, product in inventory_items:
        result.append(ProductInventoryResponse(
            id=inventory.id,
            company_id=inventory.company_id,
            product_id=inventory.product_id,
            product_name=product.name,
            qty_available=float(inventory.qty_available)
        ))
    
    return result


@router.post("/products/sales", response_model=ProductSaleResponse)
def register_product_sale(
    sale_data: ProductSaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a sale of a finished product and reduce inventory"""
    
    # Check admin permissions
    if current_user.role not in [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Only admins can register sales"
        )
    
    # Check if tracking is enabled
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company or not company.track_finished_products_inventory:
        raise HTTPException(
            status_code=400,
            detail="Finished products inventory tracking is not enabled"
        )
    
    # Get the inventory item
    inventory = db.query(ProductInventory).filter(
        ProductInventory.company_id == current_user.company_id,
        ProductInventory.product_id == sale_data.product_id
    ).first()
    
    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Product not found in inventory"
        )
    
    # Check if there's enough inventory
    if inventory.qty_available < sale_data.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient inventory. Available: {inventory.qty_available}, Requested: {sale_data.quantity}"
        )
    
    # Create the sale record
    sale = ProductSale(
        company_id=current_user.company_id,
        product_id=sale_data.product_id,
        quantity=sale_data.quantity,
        unit_price=sale_data.unit_price,
        customer_name=sale_data.customer_name,
        sale_date=sale_data.sale_date,
        notes=sale_data.notes
    )
    db.add(sale)
    
    # Reduce inventory (convert to Decimal to avoid type mismatch)
    from decimal import Decimal
    inventory.qty_available = inventory.qty_available - Decimal(str(sale_data.quantity))
    
    db.commit()
    db.refresh(sale)
    
    # Get product name for response
    product = db.query(Product).filter(Product.id == sale_data.product_id).first()
    
    return ProductSaleResponse(
        id=sale.id,
        company_id=sale.company_id,
        product_id=sale.product_id,
        product_name=product.name if product else "",
        quantity=float(sale.quantity),
        unit_price=float(sale.unit_price),
        total_amount=float(sale.quantity * sale.unit_price),
        customer_name=sale.customer_name,
        sale_date=sale.sale_date,
        notes=sale.notes,
        created_at=sale.created_at.isoformat()
    )


@router.get("/products/sales")
def get_product_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all product sales for the company"""
    
    # Check admin permissions
    if current_user.role not in [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=403,
            detail="Only admins can access sales data"
        )
    
    # Check if tracking is enabled
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company or not company.track_finished_products_inventory:
        raise HTTPException(
            status_code=400,
            detail="Finished products inventory tracking is not enabled"
        )
    
    # Get all sales with product information
    sales = db.query(ProductSale, Product).join(
        Product, ProductSale.product_id == Product.id
    ).filter(
        ProductSale.company_id == current_user.company_id
    ).order_by(ProductSale.sale_date.desc()).all()
    
    result = []
    for sale, product in sales:
        result.append(ProductSaleResponse(
            id=sale.id,
            company_id=sale.company_id,
            product_id=sale.product_id,
            product_name=product.name,
            quantity=float(sale.quantity),
            unit_price=float(sale.unit_price),
            total_amount=float(sale.quantity * sale.unit_price),
            customer_name=sale.customer_name,
            sale_date=sale.sale_date,
            notes=sale.notes,
            created_at=sale.created_at.isoformat()
        ))
    
    return result

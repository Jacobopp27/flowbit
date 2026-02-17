from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, Company
from app.models.inventory import ProductInventory
from app.models.stage import Product
from app.api.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


class ProductInventoryResponse(BaseModel):
    id: int
    company_id: int
    product_id: int
    product_name: str
    qty_available: float
    
    class Config:
        from_attributes = True


@router.get("/", response_model=list[ProductInventoryResponse])
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

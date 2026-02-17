from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.stage import Product, ProductBOMItem
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.api.auth import get_current_user, check_admin_or_company_admin

router = APIRouter()


@router.get("/", response_model=List[ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all products for the user's company"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    products = db.query(Product).filter(
        Product.company_id == current_user.company_id
    ).all()
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific product by ID"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product


@router.post("/", response_model=ProductResponse)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Create a new product with BOM items"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    # Create product
    product = Product(
        company_id=current_user.company_id,
        name=product_data.name,
        sku=product_data.sku
    )
    db.add(product)
    db.flush()  # Get the product ID
    
    # Add BOM items
    for bom_item_data in product_data.bom_items:
        bom_item = ProductBOMItem(
            product_id=product.id,
            material_id=bom_item_data.material_id,
            qty_per_unit=bom_item_data.qty_per_unit
        )
        db.add(bom_item)
    
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Update a product and its BOM items"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update product fields
    if product_data.name is not None:
        product.name = product_data.name
    if product_data.sku is not None:
        product.sku = product_data.sku
    
    # Update BOM items if provided
    if product_data.bom_items is not None:
        # Delete existing BOM items
        db.query(ProductBOMItem).filter(
            ProductBOMItem.product_id == product_id
        ).delete()
        
        # Add new BOM items
        for bom_item_data in product_data.bom_items:
            bom_item = ProductBOMItem(
                product_id=product.id,
                material_id=bom_item_data.material_id,
                qty_per_unit=bom_item_data.qty_per_unit
            )
            db.add(bom_item)
    
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Delete a product"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

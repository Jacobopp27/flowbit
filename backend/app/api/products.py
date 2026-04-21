from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.stage import Product, ProductBOMItem
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductBOMItemResponse
from app.api.auth import get_current_user, check_admin_or_company_admin

router = APIRouter()


def _build_product_response(product: Product) -> dict:
    """Build a ProductResponse dict with material_name included in bom_items."""
    bom_items = []
    for bi in product.bom_items:
        bom_items.append(ProductBOMItemResponse(
            id=bi.id,
            product_id=bi.product_id,
            material_id=bi.material_id,
            qty_per_unit=float(bi.qty_per_unit),
            material_name=bi.material.name if bi.material else None,
        ))
    return ProductResponse(
        id=product.id,
        company_id=product.company_id,
        name=product.name,
        sku=product.sku,
        created_at=product.created_at,
        bom_items=bom_items,
    )


@router.get("/", response_model=List[ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all products for the user's company"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")

    products = db.query(Product).options(
        joinedload(Product.bom_items).joinedload(ProductBOMItem.material)
    ).filter(
        Product.company_id == current_user.company_id
    ).all()
    return [_build_product_response(p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific product by ID"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="User must belong to a company")

    product = db.query(Product).options(
        joinedload(Product.bom_items).joinedload(ProductBOMItem.material)
    ).filter(
        Product.id == product_id,
        Product.company_id == current_user.company_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return _build_product_response(product)


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
        sku=product_data.sku,
        has_sizes=product_data.has_sizes,
        available_sizes=product_data.available_sizes,
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
    # Reload with material relationship for material_name
    product = db.query(Product).options(
        joinedload(Product.bom_items).joinedload(ProductBOMItem.material)
    ).filter(Product.id == product.id).first()
    return _build_product_response(product)


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
    if product_data.has_sizes is not None:
        product.has_sizes = product_data.has_sizes
    if product_data.available_sizes is not None:
        product.available_sizes = product_data.available_sizes
    
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
    # Reload with material relationship for material_name
    product = db.query(Product).options(
        joinedload(Product.bom_items).joinedload(ProductBOMItem.material)
    ).filter(Product.id == product.id).first()
    return _build_product_response(product)


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
    
    # Check if product is used in any project
    from app.models.project import ProjectProduct
    project_usage = db.query(ProjectProduct).filter(
        ProjectProduct.product_id == product_id
    ).first()
    
    if project_usage:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete product because it is being used in one or more projects"
        )
    
    # Check if product has inventory records
    from app.models.inventory import ProductInventory, ProductSale
    inventory_count = db.query(ProductInventory).filter(
        ProductInventory.product_id == product_id
    ).count()
    
    sales_count = db.query(ProductSale).filter(
        ProductSale.product_id == product_id
    ).count()
    
    if inventory_count > 0 or sales_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete product because it has inventory or sales records"
        )
    
    # Delete BOM items first (cascade)
    db.query(ProductBOMItem).filter(
        ProductBOMItem.product_id == product_id
    ).delete()
    
    # Delete product
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

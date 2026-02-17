from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User, UserRole, Company
from app.models.stage import Material, Supplier
from app.models.purchase import MaterialPurchase
from app.schemas.purchases import MaterialPurchaseCreate, MaterialPurchaseResponse

router = APIRouter()


def require_company_admin(current_user: User = Depends(get_current_user)):
    """Check if user is COMPANY_ADMIN or SUPER_ADMIN"""
    if current_user.role not in [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage purchases"
        )
    return current_user


@router.post("/", response_model=MaterialPurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_material_purchase(
    purchase_data: MaterialPurchaseCreate,
    current_user: User = Depends(require_company_admin),
    db: Session = Depends(get_db)
):
    """
    Create a general material purchase (adds to raw materials inventory).
    Only works if company has track_raw_materials_inventory enabled.
    """
    # Check if company tracks raw materials inventory
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company or not company.track_raw_materials_inventory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Raw materials inventory tracking is not enabled for your company"
        )
    
    # Verify material exists and belongs to company
    material = db.query(Material).filter(
        Material.id == purchase_data.material_id,
        Material.company_id == current_user.company_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Verify supplier if provided
    supplier = None
    if purchase_data.supplier_id:
        supplier = db.query(Supplier).filter(
            Supplier.id == purchase_data.supplier_id,
            Supplier.company_id == current_user.company_id
        ).first()
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Create purchase record
    new_purchase = MaterialPurchase(
        company_id=current_user.company_id,
        material_id=purchase_data.material_id,
        supplier_id=purchase_data.supplier_id,
        quantity=purchase_data.quantity,
        unit_cost=purchase_data.unit_cost,
        purchase_date=purchase_data.purchase_date,
        notes=purchase_data.notes
    )
    db.add(new_purchase)
    
    # Update material inventory
    material.qty_available = (material.qty_available or Decimal(0)) + purchase_data.quantity
    
    db.commit()
    db.refresh(new_purchase)
    db.refresh(material)
    
    # Build response
    total_cost = purchase_data.quantity * purchase_data.unit_cost
    
    return MaterialPurchaseResponse(
        id=new_purchase.id,
        company_id=new_purchase.company_id,
        material_id=new_purchase.material_id,
        material_name=material.name,
        quantity=new_purchase.quantity,
        unit_cost=new_purchase.unit_cost,
        total_cost=total_cost,
        supplier_id=new_purchase.supplier_id,
        supplier_name=supplier.name if supplier else None,
        purchase_date=new_purchase.purchase_date,
        notes=new_purchase.notes,
        created_at=new_purchase.created_at.isoformat()
    )


@router.get("/", response_model=list[MaterialPurchaseResponse])
def list_material_purchases(
    current_user: User = Depends(require_company_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """List all material purchases for the company"""
    purchases = db.query(MaterialPurchase).filter(
        MaterialPurchase.company_id == current_user.company_id
    ).order_by(MaterialPurchase.purchase_date.desc()).offset(skip).limit(limit).all()
    
    result = []
    for purchase in purchases:
        material = db.query(Material).filter(Material.id == purchase.material_id).first()
        supplier = None
        if purchase.supplier_id:
            supplier = db.query(Supplier).filter(Supplier.id == purchase.supplier_id).first()
        
        total_cost = purchase.quantity * purchase.unit_cost
        
        result.append(MaterialPurchaseResponse(
            id=purchase.id,
            company_id=purchase.company_id,
            material_id=purchase.material_id,
            material_name=material.name if material else "Unknown",
            quantity=purchase.quantity,
            unit_cost=purchase.unit_cost,
            total_cost=total_cost,
            supplier_id=purchase.supplier_id,
            supplier_name=supplier.name if supplier else None,
            purchase_date=purchase.purchase_date,
            notes=purchase.notes,
            created_at=purchase.created_at.isoformat()
        ))
    
    return result

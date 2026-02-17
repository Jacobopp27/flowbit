from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User, Company, UserRole
from app.schemas.settings import CompanySettingsResponse, CompanySettingsUpdate

router = APIRouter()


def require_company_admin(current_user: User = Depends(get_current_user)):
    """Check if user is COMPANY_ADMIN or SUPER_ADMIN"""
    if current_user.role not in [UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access settings"
        )
    return current_user


@router.get("/", response_model=CompanySettingsResponse)
def get_company_settings(
    current_user: User = Depends(require_company_admin),
    db: Session = Depends(get_db)
):
    """Get company settings (inventory configuration)"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanySettingsResponse(
        company_id=company.id,
        company_name=company.name,
        track_raw_materials_inventory=company.track_raw_materials_inventory,
        track_finished_products_inventory=company.track_finished_products_inventory
    )


@router.patch("/", response_model=CompanySettingsResponse)
def update_company_settings(
    settings: CompanySettingsUpdate,
    current_user: User = Depends(require_company_admin),
    db: Session = Depends(get_db)
):
    """Update company settings (inventory configuration)"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Update only provided fields
    if settings.track_raw_materials_inventory is not None:
        company.track_raw_materials_inventory = settings.track_raw_materials_inventory
    if settings.track_finished_products_inventory is not None:
        company.track_finished_products_inventory = settings.track_finished_products_inventory
    
    db.commit()
    db.refresh(company)
    
    return CompanySettingsResponse(
        company_id=company.id,
        company_name=company.name,
        track_raw_materials_inventory=company.track_raw_materials_inventory,
        track_finished_products_inventory=company.track_finished_products_inventory
    )

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.stage import Material
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse

router = APIRouter()


def check_admin_or_company_admin(current_user: User):
    """Check if user is SUPER_ADMIN or COMPANY_ADMIN"""
    if current_user.role not in ["SUPER_ADMIN", "COMPANY_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage materials",
        )


@router.get("/", response_model=List[MaterialResponse])
def get_materials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all materials for current user's company"""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company",
        )
    
    materials = db.query(Material).filter(Material.company_id == current_user.company_id).all()
    return materials


@router.post("/", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    material_data: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new material"""
    check_admin_or_company_admin(current_user)
    
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company",
        )
    
    # Check if material name already exists in company
    existing_material = (
        db.query(Material)
        .filter(
            Material.company_id == current_user.company_id,
            Material.name == material_data.name,
        )
        .first()
    )
    
    if existing_material:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material with this name already exists",
        )
    
    material = Material(
        **material_data.model_dump(),
        company_id=current_user.company_id,
    )
    
    db.add(material)
    db.commit()
    db.refresh(material)
    
    return material


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific material by ID"""
    material = db.query(Material).filter(Material.id == material_id).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )
    
    # Check if material belongs to user's company
    if material.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    return material


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    material_data: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a material"""
    check_admin_or_company_admin(current_user)
    
    material = db.query(Material).filter(Material.id == material_id).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )
    
    # Check if material belongs to user's company
    if material.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # Check if new name conflicts with existing material
    if material_data.name and material_data.name != material.name:
        existing_material = (
            db.query(Material)
            .filter(
                Material.company_id == current_user.company_id,
                Material.name == material_data.name,
                Material.id != material_id,
            )
            .first()
        )
        
        if existing_material:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Material with this name already exists",
            )
    
    # Update fields
    update_data = material_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(material, field, value)
    
    db.commit()
    db.refresh(material)
    
    return material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a material"""
    check_admin_or_company_admin(current_user)
    
    material = db.query(Material).filter(Material.id == material_id).first()
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )
    
    # Check if material belongs to user's company
    if material.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # TODO: Check if material is used in any product BOMs before deleting
    # For now, we'll allow deletion
    
    db.delete(material)
    db.commit()
    
    return None

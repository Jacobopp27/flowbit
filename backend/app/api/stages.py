from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.stage import Stage, StageEdge
from app.schemas.stage import (
    StageCreate,
    StageUpdate,
    StageResponse,
    StageEdgeCreate,
    StageEdgeResponse,
)

router = APIRouter()


def check_admin_or_company_admin(current_user: User):
    """Check if user is SUPER_ADMIN or COMPANY_ADMIN"""
    if current_user.role not in ["SUPER_ADMIN", "COMPANY_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can manage stages",
        )


@router.get("/", response_model=List[StageResponse])
def get_stages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all stages for current user's company"""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company",
        )
    
    stages = db.query(Stage).filter(Stage.company_id == current_user.company_id).all()
    return stages


@router.post("/", response_model=StageResponse, status_code=status.HTTP_201_CREATED)
def create_stage(
    stage_data: StageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new stage"""
    check_admin_or_company_admin(current_user)
    
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company",
        )
    
    # Check if stage name already exists in company
    existing_stage = (
        db.query(Stage)
        .filter(
            Stage.company_id == current_user.company_id,
            Stage.name == stage_data.name,
        )
        .first()
    )
    
    if existing_stage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage with this name already exists",
        )
    
    # Check if trying to create a purchasing stage when one already exists
    if stage_data.is_purchasing_stage:
        existing_purchasing_stage = (
            db.query(Stage)
            .filter(
                Stage.company_id == current_user.company_id,
                Stage.is_purchasing_stage == True,
            )
            .first()
        )
        
        if existing_purchasing_stage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A purchasing stage already exists: {existing_purchasing_stage.name}. Only one purchasing stage is allowed per company.",
            )
    
    stage = Stage(
        **stage_data.model_dump(),
        company_id=current_user.company_id,
    )
    
    db.add(stage)
    db.commit()
    db.refresh(stage)
    
    return stage


@router.get("/{stage_id}", response_model=StageResponse)
def get_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific stage by ID"""
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )
    
    # Check if stage belongs to user's company
    if stage.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    return stage


@router.put("/{stage_id}", response_model=StageResponse)
def update_stage(
    stage_id: int,
    stage_data: StageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a stage"""
    check_admin_or_company_admin(current_user)
    
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )
    
    # Check if stage belongs to user's company
    if stage.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # Check if new name conflicts with existing stage
    if stage_data.name and stage_data.name != stage.name:
        existing_stage = (
            db.query(Stage)
            .filter(
                Stage.company_id == current_user.company_id,
                Stage.name == stage_data.name,
                Stage.id != stage_id,
            )
            .first()
        )
        
        if existing_stage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stage with this name already exists",
            )
    
    # Check if trying to set as purchasing stage when one already exists
    if stage_data.is_purchasing_stage is not None and stage_data.is_purchasing_stage and not stage.is_purchasing_stage:
        existing_purchasing_stage = (
            db.query(Stage)
            .filter(
                Stage.company_id == current_user.company_id,
                Stage.is_purchasing_stage == True,
                Stage.id != stage_id,
            )
            .first()
        )
        
        if existing_purchasing_stage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A purchasing stage already exists: {existing_purchasing_stage.name}. Only one purchasing stage is allowed per company.",
            )
    
    # Update fields
    update_data = stage_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(stage, field, value)
    
    db.commit()
    db.refresh(stage)
    
    return stage


@router.delete("/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a stage"""
    check_admin_or_company_admin(current_user)
    
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )
    
    # Check if stage belongs to user's company
    if stage.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # TODO: Check if stage is used in any projects before deleting
    # For now, we'll allow deletion
    
    db.delete(stage)
    db.commit()
    
    return None


# Stage Dependencies (Edges)


@router.post("/{stage_id}/dependencies", response_model=StageEdgeResponse, status_code=status.HTTP_201_CREATED)
def add_stage_dependency(
    stage_id: int,
    edge_data: StageEdgeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a dependency between stages"""
    check_admin_or_company_admin(current_user)
    
    # Verify both stages exist and belong to user's company
    from_stage = db.query(Stage).filter(Stage.id == edge_data.from_stage_id).first()
    to_stage = db.query(Stage).filter(Stage.id == edge_data.to_stage_id).first()
    
    if not from_stage or not to_stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both stages not found",
        )
    
    if from_stage.company_id != current_user.company_id or to_stage.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # Check for circular dependencies
    if edge_data.from_stage_id == edge_data.to_stage_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A stage cannot depend on itself",
        )
    
    # Check if edge already exists
    existing_edge = (
        db.query(StageEdge)
        .filter(
            StageEdge.from_stage_id == edge_data.from_stage_id,
            StageEdge.to_stage_id == edge_data.to_stage_id,
        )
        .first()
    )
    
    if existing_edge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This dependency already exists",
        )
    
    edge = StageEdge(**edge_data.model_dump())
    db.add(edge)
    db.commit()
    db.refresh(edge)
    
    return edge


@router.delete("/{stage_id}/dependencies/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_stage_dependency(
    stage_id: int,
    edge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a stage dependency"""
    check_admin_or_company_admin(current_user)
    
    edge = db.query(StageEdge).filter(StageEdge.id == edge_id).first()
    
    if not edge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dependency not found",
        )
    
    # Verify stages belong to user's company
    from_stage = db.query(Stage).filter(Stage.id == edge.from_stage_id).first()
    
    if from_stage and from_stage.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    db.delete(edge)
    db.commit()
    
    return None

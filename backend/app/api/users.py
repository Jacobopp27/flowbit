from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User, UserRole, UserStageAccess
from app.models.stage import Stage
from app.schemas.user import UserCreateByAdmin, UserUpdateByAdmin, UserListResponse
from app.api.auth import get_current_user, check_admin_or_company_admin
from app.auth import get_password_hash

router = APIRouter()


@router.get("/", response_model=List[UserListResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Get all users in the company"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    users = db.query(User).filter(
        User.company_id == current_user.company_id
    ).all()
    
    # Add stage_ids to each user
    result = []
    for user in users:
        stage_accesses = db.query(UserStageAccess).filter(
            UserStageAccess.user_id == user.id
        ).all()
        user_dict = UserListResponse.model_validate(user).model_dump()
        user_dict['stage_ids'] = [sa.stage_id for sa in stage_accesses]
        result.append(UserListResponse(**user_dict))
    
    return result


@router.get("/{user_id}", response_model=UserListResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Get a specific user by ID"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == current_user.company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add stage_ids
    stage_accesses = db.query(UserStageAccess).filter(
        UserStageAccess.user_id == user.id
    ).all()
    user_dict = UserListResponse.model_validate(user).model_dump()
    user_dict['stage_ids'] = [sa.stage_id for sa in stage_accesses]
    
    return UserListResponse(**user_dict)


@router.post("/", response_model=UserListResponse)
def create_user(
    user_data: UserCreateByAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Create a new user (COMPANY_ADMIN or STAGE_WORKER only)"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    # Validate role - can only create COMPANY_ADMIN or STAGE_WORKER
    if user_data.role not in [UserRole.COMPANY_ADMIN, UserRole.STAGE_WORKER]:
        raise HTTPException(
            status_code=400, 
            detail="Can only create COMPANY_ADMIN or STAGE_WORKER users"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username already exists (if provided)
    if user_data.username:
        existing_user = db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already registered")
    
    # Validate stages if STAGE_WORKER
    if user_data.role == UserRole.STAGE_WORKER:
        if not user_data.stage_ids or len(user_data.stage_ids) == 0:
            raise HTTPException(
                status_code=400,
                detail="STAGE_WORKER must be assigned to at least one stage"
            )
        
        # Verify all stages exist and belong to company
        for stage_id in user_data.stage_ids:
            stage = db.query(Stage).filter(
                Stage.id == stage_id,
                Stage.company_id == current_user.company_id
            ).first()
            if not stage:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stage {stage_id} not found or doesn't belong to your company"
                )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        company_id=current_user.company_id,
        is_active=user_data.is_active,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Assign stages if STAGE_WORKER
    if user_data.role == UserRole.STAGE_WORKER and user_data.stage_ids:
        for stage_id in user_data.stage_ids:
            stage_access = UserStageAccess(
                user_id=new_user.id,
                stage_id=stage_id
            )
            db.add(stage_access)
        db.commit()
    
    # Return with stage_ids
    stage_accesses = db.query(UserStageAccess).filter(
        UserStageAccess.user_id == new_user.id
    ).all()
    user_dict = UserListResponse.model_validate(new_user).model_dump()
    user_dict['stage_ids'] = [sa.stage_id for sa in stage_accesses]
    
    return UserListResponse(**user_dict)


@router.put("/{user_id}", response_model=UserListResponse)
def update_user(
    user_id: int,
    user_data: UserUpdateByAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Update a user"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == current_user.company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate role if being updated
    if user_data.role is not None:
        if user_data.role not in [UserRole.COMPANY_ADMIN, UserRole.STAGE_WORKER]:
            raise HTTPException(
                status_code=400,
                detail="Can only set role to COMPANY_ADMIN or STAGE_WORKER"
            )
        user.role = user_data.role
    
    # Update fields
    if user_data.email is not None:
        # Check if email already exists (excluding current user)
        existing = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = user_data.email
    
    if user_data.username is not None:
        # Check if username already exists (excluding current user)
        existing = db.query(User).filter(
            User.username == user_data.username,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already in use")
        user.username = user_data.username
    
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.password is not None:
        user.hashed_password = get_password_hash(user_data.password)
    
    # Handle stage assignments if being updated and user is/becomes STAGE_WORKER
    final_role = user_data.role if user_data.role is not None else user.role
    if user_data.stage_ids is not None:
        if final_role == UserRole.STAGE_WORKER:
            if len(user_data.stage_ids) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="STAGE_WORKER must be assigned to at least one stage"
                )
            
            # Verify all stages exist and belong to company
            for stage_id in user_data.stage_ids:
                stage = db.query(Stage).filter(
                    Stage.id == stage_id,
                    Stage.company_id == current_user.company_id
                ).first()
                if not stage:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stage {stage_id} not found or doesn't belong to your company"
                    )
            
            # Remove existing stage assignments
            db.query(UserStageAccess).filter(
                UserStageAccess.user_id == user_id
            ).delete()
            
            # Add new stage assignments
            for stage_id in user_data.stage_ids:
                stage_access = UserStageAccess(
                    user_id=user_id,
                    stage_id=stage_id
                )
                db.add(stage_access)
        else:
            # If not STAGE_WORKER, remove all stage assignments
            db.query(UserStageAccess).filter(
                UserStageAccess.user_id == user_id
            ).delete()
    
    db.commit()
    db.refresh(user)
    
    # Return with stage_ids
    stage_accesses = db.query(UserStageAccess).filter(
        UserStageAccess.user_id == user.id
    ).all()
    user_dict = UserListResponse.model_validate(user).model_dump()
    user_dict['stage_ids'] = [sa.stage_id for sa in stage_accesses]
    
    return UserListResponse(**user_dict)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_company_admin)
):
    """Delete/deactivate a user"""
    if not current_user.company_id:
        raise HTTPException(status_code=403, detail="Admin must belong to a company")
    
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == current_user.company_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete by deactivating instead of hard delete
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated successfully"}

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=200)
    role: UserRole


class UserCreateByAdmin(UserBase):
    password: str = Field(..., min_length=6)
    is_active: bool = True
    stage_ids: Optional[List[int]] = None  # Only for STAGE_WORKER


class UserUpdateByAdmin(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)
    stage_ids: Optional[List[int]] = None  # Only for STAGE_WORKER


class UserListResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    stage_ids: List[int] = []  # List of stage IDs the user has access to
    
    class Config:
        from_attributes = True

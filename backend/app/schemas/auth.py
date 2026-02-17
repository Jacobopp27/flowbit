from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserBase(BaseModel):
    email: str
    username: Optional[str] = None
    full_name: str


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.STAGE_WORKER
    company_id: Optional[int] = None


class CompanyBase(BaseModel):
    name: str


class CompanyCreate(CompanyBase):
    pass


class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserResponse(UserBase):
    id: int
    email: str
    username: Optional[str] = None
    role: UserRole
    company_id: Optional[int]
    company: Optional[CompanyResponse] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str  # Can be either username or email
    password: str

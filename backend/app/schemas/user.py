from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
from datetime import datetime

class RoleBase(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str
    role_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    profile_picture_url: Optional[str] = None
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserResponseData(UserBase):
    role: Optional[RoleBase] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2)
    phone: Optional[str] = Field(None, min_length=10)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

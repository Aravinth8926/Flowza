from pydantic import BaseModel, Field
from typing import Optional
from app.schemas.user import UserResponseData
from app.schemas.company import CompanyBase, AddressBase

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False

class RegisterRequest(BaseModel):
    # User fields
    full_name: str = Field(..., min_length=2)
    email: str
    password: str = Field(..., min_length=8)
    phone: str = Field(..., min_length=10)
    role_name: str # 'vendor' or 'supplier'

    # Company fields
    company_name: str
    business_type: str
    gst_number: Optional[str] = None
    description: Optional[str] = None

    # Address fields
    country: str
    state: str
    city: str
    address_line: str
    address_type: str = "billing"

class TokenResponseData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponseData
    company: Optional[CompanyBase] = None
    address: Optional[AddressBase] = None

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str

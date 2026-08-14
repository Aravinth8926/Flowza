from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime

class CompanyBase(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    company_name: str
    business_type: str
    gst_number: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    gst_number: Optional[str] = None
    description: Optional[str] = None

class AddressBase(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    country: str
    state: str
    city: str
    address_line: str
    address_type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AddressUpdate(BaseModel):
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    address_line: Optional[str] = None
    address_type: Optional[str] = None

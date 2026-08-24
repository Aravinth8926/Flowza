from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import uuid
from decimal import Decimal
from datetime import datetime
from app.schemas.company import CompanyBase

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    price: Decimal = Field(..., ge=0)
    unit: str = Field(..., min_length=1, max_length=20)
    image_url: Optional[str] = None
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def trim_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Name cannot be empty or whitespace only")
        return trimmed

    @field_validator("unit")
    @classmethod
    def trim_unit(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Unit cannot be empty or whitespace only")
        return trimmed

    @field_validator("sku")
    @classmethod
    def trim_sku(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                return None
            return trimmed
        return v

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    price: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def trim_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Name cannot be empty or whitespace only")
            return trimmed
        return v

    @field_validator("unit")
    @classmethod
    def trim_unit(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Unit cannot be empty or whitespace only")
            return trimmed
        return v

    @field_validator("sku")
    @classmethod
    def trim_sku(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                return None
            return trimmed
        return v

class ProductResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    sku: Optional[str]
    description: Optional[str]
    category: Optional[str]
    price: Decimal
    unit: str
    image_url: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    company: Optional[CompanyBase] = None

    class Config:
        from_attributes = True

class PaginationMetadata(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int

class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    pagination: PaginationMetadata

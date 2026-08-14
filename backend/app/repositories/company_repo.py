from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.company import Company
from app.models.address import Address
from typing import Optional, Dict, Any
import uuid

class CompanyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, company_id: uuid.UUID) -> Optional[Company]:
        result = await self.db.execute(
            select(Company)
            .options(selectinload(Company.addresses))
            .where(Company.id == company_id, Company.is_deleted == False)
        )
        return result.scalars().first()

    async def get_by_user_id(self, user_id: uuid.UUID) -> Optional[Company]:
        from app.models.user import User
        result = await self.db.execute(
            select(Company)
            .join(User, User.company_id == Company.id)
            .options(selectinload(Company.addresses))
            .where(User.id == user_id, Company.is_deleted == False)
        )
        return result.scalars().first()

    async def create(self, company_data: Dict[str, Any]) -> Company:
        company = Company(**company_data)
        self.db.add(company)
        await self.db.flush()
        return company

    async def update(self, company: Company, update_data: Dict[str, Any]) -> Company:
        for field, value in update_data.items():
            setattr(company, field, value)
        await self.db.flush()
        return company

    async def get_address(self, company_id: uuid.UUID, address_type: str = "billing") -> Optional[Address]:
        result = await self.db.execute(
            select(Address)
            .where(
                Address.company_id == company_id,
                Address.address_type == address_type,
                Address.is_deleted == False
            )
        )
        return result.scalars().first()

    async def create_address(self, address_data: Dict[str, Any]) -> Address:
        address = Address(**address_data)
        self.db.add(address)
        await self.db.flush()
        return address

    async def update_address(self, address: Address, update_data: Dict[str, Any]) -> Address:
        for field, value in update_data.items():
            setattr(address, field, value)
        await self.db.flush()
        return address

from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.company_repo import CompanyRepository
from app.core.exceptions import NotFoundException
from app.models.company import Company
from app.models.address import Address
from app.utils.helpers import save_uploaded_file
from fastapi import UploadFile
import uuid
from typing import Dict, Any

class CompanyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.company_repo = CompanyRepository(db)

    async def get_company_by_user(self, user_id: uuid.UUID) -> Company:
        company = await self.company_repo.get_by_user_id(user_id)
        if not company:
            raise NotFoundException(detail="Company profile not found")
        return company

    async def update_company_by_user(self, user_id: uuid.UUID, update_data: Dict[str, Any]) -> Company:
        company = await self.get_company_by_user(user_id)
        updated = await self.company_repo.update(company, update_data)
        await self.db.commit()
        return updated

    async def upload_logo(self, user_id: uuid.UUID, file: UploadFile) -> str:
        url = save_uploaded_file(file, "logos")
        company = await self.get_company_by_user(user_id)
        await self.company_repo.update(company, {"logo_url": url})
        await self.db.commit()
        return url

    async def get_address_by_user(self, user_id: uuid.UUID, address_type: str = "billing") -> Address:
        company = await self.get_company_by_user(user_id)
        address = await self.company_repo.get_address(company.id, address_type)
        if not address:
            raise NotFoundException(detail="Address not found")
        return address

    async def update_address_by_user(self, user_id: uuid.UUID, update_data: Dict[str, Any], address_type: str = "billing") -> Address:
        company = await self.get_company_by_user(user_id)
        address = await self.company_repo.get_address(company.id, address_type)
        if not address:
            # If address doesn't exist yet, create one
            address_data = {
                "company_id": company.id,
                "country": update_data.get("country", ""),
                "state": update_data.get("state", ""),
                "city": update_data.get("city", ""),
                "address_line": update_data.get("address_line", ""),
                "address_type": address_type
            }
            address = await self.company_repo.create_address(address_data)
        else:
            address = await self.company_repo.update_address(address, update_data)
        await self.db.commit()
        return address

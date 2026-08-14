from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.role import Role
from typing import Optional
import uuid

class RoleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, role_id: uuid.UUID) -> Optional[Role]:
        result = await self.db.execute(
            select(Role).where(Role.id == role_id, Role.is_deleted == False)
        )
        return result.scalars().first()

    async def get_by_name(self, name: str) -> Optional[Role]:
        result = await self.db.execute(
            select(Role).where(Role.name == name.lower(), Role.is_deleted == False)
        )
        return result.scalars().first()

    async def create(self, name: str, description: Optional[str] = None) -> Role:
        role = Role(name=name.lower(), description=description)
        self.db.add(role)
        await self.db.flush()
        return role

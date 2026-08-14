from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.company import Company
from typing import Optional, Dict, Any
import uuid

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        result = await self.db.execute(
            select(User)
            .options(
                selectinload(User.role),
                selectinload(User.company).selectinload(Company.addresses)
            )
            .where(User.id == user_id, User.is_deleted == False)
        )
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User)
            .options(
                selectinload(User.role),
                selectinload(User.company).selectinload(Company.addresses)
            )
            .where(User.email == email.lower(), User.is_deleted == False)
        )
        return result.scalars().first()

    async def create(self, user_data: Dict[str, Any]) -> User:
        user = User(**user_data)
        self.db.add(user)
        await self.db.flush()
        return user

    async def update(self, user: User, update_data: Dict[str, Any]) -> User:
        for field, value in update_data.items():
            setattr(user, field, value)
        await self.db.flush()
        return user

    async def soft_delete(self, user: User) -> None:
        user.is_deleted = True
        user.is_active = False
        if user.company:
            user.company.is_deleted = True
            for address in user.company.addresses:
                address.is_deleted = True
        await self.db.flush()

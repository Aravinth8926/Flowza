from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repo import UserRepository
from app.core.security import verify_password, get_password_hash
from app.core.exceptions import CredentialsException, NotFoundException
from app.models.user import User
from app.utils.helpers import save_uploaded_file
from fastapi import UploadFile
import uuid
from typing import Dict, Any

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def get_profile(self, user_id: uuid.UUID) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(detail="User profile not found")
        return user

    async def update_profile(self, user_id: uuid.UUID, update_data: Dict[str, Any]) -> User:
        user = await self.get_profile(user_id)
        await self.user_repo.update(user, update_data)
        await self.db.commit()
        return await self.user_repo.get_by_id(user_id)

    async def change_password(self, user_id: uuid.UUID, old_pass: str, new_pass: str) -> None:
        user = await self.get_profile(user_id)
        if not verify_password(old_pass, user.hashed_password):
            raise CredentialsException(detail="Incorrect old password")
        
        hashed = get_password_hash(new_pass)
        await self.user_repo.update(user, {"hashed_password": hashed})
        await self.db.commit()

    async def upload_picture(self, user_id: uuid.UUID, file: UploadFile) -> str:
        url = save_uploaded_file(file, "avatars")
        user = await self.get_profile(user_id)
        await self.user_repo.update(user, {"profile_picture_url": url})
        await self.db.commit()
        return url

    async def delete_account(self, user_id: uuid.UUID) -> None:
        user = await self.get_profile(user_id)
        await self.user_repo.soft_delete(user)
        await self.db.commit()

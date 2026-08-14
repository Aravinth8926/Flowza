import uuid
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.core.security import decode_token
from app.core.exceptions import CredentialsException
from app.repositories.user_repo import UserRepository
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise CredentialsException(detail="Could not validate credentials")
        
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise CredentialsException(detail="Could not validate credentials")
        
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise CredentialsException(detail="Invalid token structure")
        
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise CredentialsException(detail="User account not found")
        
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active or current_user.is_deleted:
        raise CredentialsException(detail="Account is inactive or deleted")
    return current_user

import uuid
from fastapi import Depends, HTTPException, status
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

def check_role(allowed_roles: list[str]):
    """
    Reusable dependency to verify that the current active user has one of the allowed roles.
    """
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        role_name = current_user.role.name if current_user.role else None
        if not role_name or role_name.lower() not in [r.lower() for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return current_user
    return role_checker

# Pre-defined role dependencies
verify_vendor = check_role(["vendor"])
verify_supplier = check_role(["supplier"])
verify_admin = check_role(["admin"])

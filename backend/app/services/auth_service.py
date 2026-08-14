import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user_repo import UserRepository
from app.repositories.company_repo import CompanyRepository
from app.repositories.role_repo import RoleRepository
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import UserAlreadyExistsException, CredentialsException, FlowzaException
from app.schemas.auth import RegisterRequest, LoginRequest
from app.models.user import User

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.company_repo = CompanyRepository(db)
        self.role_repo = RoleRepository(db)

    async def register(self, req: RegisterRequest) -> dict:
        # Check if email is registered
        existing = await self.user_repo.get_by_email(req.email)
        if existing:
            raise UserAlreadyExistsException()

        # Find role by name
        role = await self.role_repo.get_by_name(req.role_name)
        if not role:
            raise FlowzaException(status_code=400, detail="Invalid role specified")

        # Create User
        hashed_password = get_password_hash(req.password)
        user_data = {
            "full_name": req.full_name,
            "email": req.email.lower(),
            "hashed_password": hashed_password,
            "phone": req.phone,
            "role_id": role.id,
            "is_active": True
        }
        user = await self.user_repo.create(user_data)
        
        # Create Company
        company_data = {
            "user_id": user.id,
            "company_name": req.company_name,
            "business_type": req.business_type,
            "gst_number": req.gst_number or None,
            "description": req.description or None
        }
        company = await self.company_repo.create(company_data)

        # Create Address
        address_data = {
            "company_id": company.id,
            "country": req.country,
            "state": req.state,
            "city": req.city,
            "address_line": req.address_line,
            "address_type": req.address_type
        }
        address = await self.company_repo.create_address(address_data)

        await self.db.commit()

        # Generate access and refresh tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        # Reload eagerly to avoid missing greenlet errors in async SQLAlchemy
        reloaded_user = await self.user_repo.get_by_id(user.id)
        reloaded_company = await self.company_repo.get_by_id(company.id)
        reloaded_address = await self.company_repo.get_address(company.id, req.address_type)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": reloaded_user,
            "company": reloaded_company,
            "address": reloaded_address
        }

    async def login(self, req: LoginRequest) -> dict:
        user = await self.user_repo.get_by_email(req.email)
        if not user:
            raise CredentialsException(detail="Incorrect email or password")

        if not verify_password(req.password, user.hashed_password):
            raise CredentialsException(detail="Incorrect email or password")

        # Update last login time
        user.last_login_at = datetime.now(timezone.utc)
        await self.user_repo.update(user, {})
        await self.db.commit()

        # Reload eagerly to avoid missing greenlet errors in async SQLAlchemy
        reloaded_user = await self.user_repo.get_by_id(user.id)

        access_token = create_access_token(reloaded_user.id)
        refresh_token = create_refresh_token(reloaded_user.id)

        company_address = None
        if reloaded_user.company and reloaded_user.company.addresses and len(reloaded_user.company.addresses) > 0:
            company_address = reloaded_user.company.addresses[0]

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": reloaded_user,
            "company": reloaded_user.company,
            "address": company_address
        }

    async def refresh(self, refresh_token: str) -> dict:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise CredentialsException(detail="Invalid refresh token")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise CredentialsException(detail="Invalid token subject")

        user_id = uuid.UUID(user_id_str)
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise CredentialsException(detail="User associated with token not found")

        access_token = create_access_token(user.id)
        new_refresh_token = create_refresh_token(user.id)

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

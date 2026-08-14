from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, TokenResponseData
from app.schemas.common import FlowzaResponse
from app.services.auth_service import AuthService
from app.api.v1.deps import get_current_active_user
from app.models.user import User
from app.core.websocket import manager as ws_manager

router = APIRouter()

@router.post("/register", response_model=FlowzaResponse[TokenResponseData], status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    data = await auth_service.register(req)

    # Real-time WebSocket broadcast to vendors if new supplier registers
    if req.role_name.lower() == "supplier":
        await ws_manager.send_to_all_vendors({
            "type": "new_supplier",
            "data": {
                "id": str(data.user.id),
                "company_name": req.company_name,
                "business_type": req.business_type,
                "city": req.city,
                "state": req.state,
                "joined_date": "2026-08-01",
            }
        })

    return FlowzaResponse(
        success=True,
        message="Registration successful",
        data=data
    )

@router.post("/login", response_model=FlowzaResponse[TokenResponseData])
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    data = await auth_service.login(req)
    return FlowzaResponse(
        success=True,
        message="Login successful",
        data=data
    )

@router.post("/logout", response_model=FlowzaResponse[None])
async def logout(current_user: User = Depends(get_current_active_user)):
    return FlowzaResponse(
        success=True,
        message="Logged out successfully",
        data=None
    )

@router.post("/refresh", response_model=FlowzaResponse[dict])
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    data = await auth_service.refresh(req.refresh_token)
    return FlowzaResponse(
        success=True,
        message="Token refreshed successfully",
        data=data
    )

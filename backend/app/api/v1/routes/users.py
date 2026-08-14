from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.user import UserResponseData, UserUpdate, ChangePasswordRequest
from app.schemas.common import FlowzaResponse
from app.services.user_service import UserService
from app.api.v1.deps import get_current_active_user
from app.models.user import User

router = APIRouter()

@router.get("/me", response_model=FlowzaResponse[UserResponseData])
async def get_me(current_user: User = Depends(get_current_active_user)):
    return FlowzaResponse(
        success=True,
        message="Profile retrieved successfully",
        data=current_user
    )

@router.patch("/me", response_model=FlowzaResponse[UserResponseData])
async def update_me(
    req: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    user_service = UserService(db)
    # Filter none fields
    update_dict = req.model_dump(exclude_unset=True)
    updated = await user_service.update_profile(current_user.id, update_dict)
    return FlowzaResponse(
        success=True,
        message="Profile updated successfully",
        data=updated
    )

@router.post("/me/change-password", response_model=FlowzaResponse[None])
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    user_service = UserService(db)
    await user_service.change_password(current_user.id, req.old_password, req.new_password)
    return FlowzaResponse(
        success=True,
        message="Password changed successfully",
        data=None
    )

@router.delete("/me", response_model=FlowzaResponse[None])
async def delete_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    user_service = UserService(db)
    await user_service.delete_account(current_user.id)
    return FlowzaResponse(
        success=True,
        message="Account deactivated successfully",
        data=None
    )

@router.post("/me/profile-picture", response_model=FlowzaResponse[dict])
async def upload_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    user_service = UserService(db)
    url = await user_service.upload_picture(current_user.id, file)
    return FlowzaResponse(
        success=True,
        message="Profile picture uploaded successfully",
        data={"url": url}
    )

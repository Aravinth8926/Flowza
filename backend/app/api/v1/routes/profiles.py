from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.company import CompanyBase, CompanyUpdate, AddressBase, AddressUpdate
from app.schemas.common import FlowzaResponse
from app.services.company_service import CompanyService
from app.api.v1.deps import get_current_active_user
from app.models.user import User

router = APIRouter()

@router.get("/me", response_model=FlowzaResponse[CompanyBase])
async def get_my_company(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    company_service = CompanyService(db)
    company = await company_service.get_company_by_user(current_user.id)
    return FlowzaResponse(
        success=True,
        message="Company profile retrieved successfully",
        data=company
    )

@router.patch("/me", response_model=FlowzaResponse[CompanyBase])
async def update_my_company(
    req: CompanyUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    company_service = CompanyService(db)
    update_dict = req.model_dump(exclude_unset=True)
    company = await company_service.update_company_by_user(current_user.id, update_dict)
    return FlowzaResponse(
        success=True,
        message="Company profile updated successfully",
        data=company
    )

@router.post("/me/logo", response_model=FlowzaResponse[dict])
async def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    company_service = CompanyService(db)
    url = await company_service.upload_logo(current_user.id, file)
    return FlowzaResponse(
        success=True,
        message="Company logo uploaded successfully",
        data={"url": url}
    )

@router.get("/me/address", response_model=FlowzaResponse[AddressBase])
async def get_my_address(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    company_service = CompanyService(db)
    address = await company_service.get_address_by_user(current_user.id)
    return FlowzaResponse(
        success=True,
        message="Address retrieved successfully",
        data=address
    )

@router.patch("/me/address", response_model=FlowzaResponse[AddressBase])
async def update_my_address(
    req: AddressUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    company_service = CompanyService(db)
    update_dict = req.model_dump(exclude_unset=True)
    address = await company_service.update_address_by_user(current_user.id, update_dict)
    return FlowzaResponse(
        success=True,
        message="Address updated successfully",
        data=address
    )

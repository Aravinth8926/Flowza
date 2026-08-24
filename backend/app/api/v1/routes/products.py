from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse, PaginationMetadata
from app.schemas.common import FlowzaResponse
from app.services.product_service import ProductService
from app.api.v1.deps import get_current_active_user, verify_supplier, verify_admin
from app.models.user import User
from app.core.exceptions import PermissionDeniedException, NotFoundException
import uuid
from typing import Optional, List

router = APIRouter()

@router.post("", response_model=FlowzaResponse[ProductResponse], status_code=status.HTTP_201_CREATED)
async def create_product(
    req: ProductCreate,
    current_user: User = Depends(verify_supplier),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Supplier user must belong to a company to create products")

    service = ProductService(db)
    product = await service.create_product(current_user.company_id, req)
    return FlowzaResponse(
        success=True,
        message="Product created successfully",
        data=ProductResponse.model_validate(product)
    )

@router.get("/my", response_model=FlowzaResponse[ProductListResponse])
async def get_my_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(verify_supplier),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Supplier user must belong to a company")

    service = ProductService(db)
    items, total = await service.list_products(
        company_id=current_user.company_id,
        category=category,
        search=search,
        is_active=is_active,
        page=page,
        limit=limit
    )

    total_pages = (total + limit - 1) // limit
    return FlowzaResponse(
        success=True,
        message="My products retrieved successfully",
        data=ProductListResponse(
            items=[ProductResponse.model_validate(i) for i in items],
            pagination=PaginationMetadata(
                total=total,
                page=page,
                page_size=limit,
                total_pages=total_pages
            )
        )
    )

@router.get("", response_model=FlowzaResponse[ProductListResponse])
async def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    supplier_company_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    role_name = current_user.role.name.lower() if current_user.role else "vendor"
    is_admin = role_name == "admin"

    # Vendors and suppliers can only see active products
    is_active_filter = None if is_admin else True

    service = ProductService(db)
    items, total = await service.list_products(
        company_id=supplier_company_id,
        category=category,
        search=search,
        is_active=is_active_filter,
        page=page,
        limit=limit
    )

    total_pages = (total + limit - 1) // limit
    return FlowzaResponse(
        success=True,
        message="Products retrieved successfully",
        data=ProductListResponse(
            items=[ProductResponse.model_validate(i) for i in items],
            pagination=PaginationMetadata(
                total=total,
                page=page,
                page_size=limit,
                total_pages=total_pages
            )
        )
    )

@router.get("/{product_id}", response_model=FlowzaResponse[ProductResponse])
async def get_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProductService(db)
    product = await service.get_product(product_id)

    role_name = current_user.role.name.lower() if current_user.role else "vendor"
    is_admin = role_name == "admin"

    # If product is inactive and user is not admin and not the owner supplier
    if not product.is_active and not is_admin:
        if role_name != "supplier" or current_user.company_id != product.company_id:
            raise NotFoundException(detail="Product not found")

    return FlowzaResponse(
        success=True,
        message="Product retrieved successfully",
        data=ProductResponse.model_validate(product)
    )

@router.patch("/{product_id}", response_model=FlowzaResponse[ProductResponse])
async def update_product(
    product_id: uuid.UUID,
    req: ProductUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    role_name = current_user.role.name.lower() if current_user.role else "vendor"
    if role_name not in ["supplier", "admin"]:
        raise PermissionDeniedException(detail="You do not have permission to update products")

    service = ProductService(db)
    is_admin = role_name == "admin"
    company_id = None if is_admin else current_user.company_id

    product = await service.update_product(
        product_id=product_id,
        company_id=company_id,
        data=req,
        is_admin=is_admin
    )
    return FlowzaResponse(
        success=True,
        message="Product updated successfully",
        data=ProductResponse.model_validate(product)
    )

@router.delete("/{product_id}", response_model=FlowzaResponse[None])
async def delete_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    role_name = current_user.role.name.lower() if current_user.role else "vendor"
    if role_name not in ["supplier", "admin"]:
        raise PermissionDeniedException(detail="You do not have permission to delete products")

    service = ProductService(db)
    is_admin = role_name == "admin"
    company_id = None if is_admin else current_user.company_id

    await service.delete_product(
        product_id=product_id,
        company_id=company_id,
        is_admin=is_admin
    )
    return FlowzaResponse(
        success=True,
        message="Product deleted successfully",
        data=None
    )

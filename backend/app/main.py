import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.exceptions import FlowzaException
from app.schemas.common import FlowzaErrorResponse, ErrorDetails
from app.api.v1.routes import auth, users, profiles, suppliers, orders, products, inventory, cart, invoices, notifications, analytics, ai
from app.core.websocket import router as ws_router
from app.database.session import engine
from app.database.base import Base
# Import all models to ensure metadata registration
from app.models import (
    role as _role,
    user as _user,
    company as _company,
    address as _address,
    product as _product,
    inventory as _inventory_model,
    cart as _cart_model,
    order_request as _order_request_model,
    invoice as _invoice_model,
    notification as _notification_model,
)

# Ensure uploads directories exist before mounting static folder
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/logos", exist_ok=True)

# Application Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure base metadata exists
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown logic if any

# Create FastAPI app instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Scalable B2B E-commerce & Procurement Platform API",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded files directory as /static
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# Exception handlers
def add_cors_headers(request: Request, response: JSONResponse) -> JSONResponse:
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.exception_handler(FlowzaException)
async def flowza_exception_handler(request: Request, exc: FlowzaException):
    code = getattr(exc, "code", getattr(exc, "error_code", "ERROR"))
    details = getattr(exc, "details", getattr(exc, "extra", {}))
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": exc.detail,
                "details": details,
            }
        }
    )
    return add_cors_headers(request, response)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = ".".join([str(x) for x in err["loc"] if x != "body"])
        errors.append(f"{loc}: {err['msg']}")
    
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid input provided.",
                "details": {"validation_errors": errors},
            }
        }
    )
    return add_cors_headers(request, response)

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "details": {"error": str(exc)},
            }
        }
    )
    return add_cors_headers(request, response)

# Routes registration
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(profiles.router, prefix="/api/v1/companies", tags=["Companies"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["Orders"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(cart.router, prefix="/api/v1/carts", tags=["Cart & Checkout"])
app.include_router(invoices.router, prefix="/api/v1", tags=["Invoices & Financial Records"])
app.include_router(notifications.router, prefix="/api/v1", tags=["Notifications & Communication"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Dashboards & Analytics"])
app.include_router(ai.router, prefix="/api/v1", tags=["Agentic AI Assistant"])
app.include_router(ws_router, tags=["WebSocket"])

@app.get("/", tags=["Root"])
async def root():
    return {
        "status": "online",
        "message": "Welcome to Flowza B2B Supply Chain & Procurement API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "app": "Flowza B2B Backend"}


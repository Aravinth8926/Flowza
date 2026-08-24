import os
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.exceptions import FlowzaException
from app.schemas.common import FlowzaErrorResponse, ErrorDetails
from app.api.v1.routes import auth, users, profiles, suppliers, orders, products
from app.core.websocket import router as ws_router
from app.database.session import engine
from app.database.base import Base
# Import all models to ensure metadata registration
from app.models import role, user, company, address, product, inventory, cart, order_request

# Ensure uploads directories exist before mounting static folder
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/logos", exist_ok=True)

app = FastAPI(
    title="Flowza — B2B Supply Chain & Procurement API",
    description="Backend services for B2B Vendor & Supplier Network",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_db_init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[DB] Database tables initialized successfully.")

@app.middleware("http")
async def log_options(request: Request, call_next):
    if request.method == "OPTIONS":
        print("OPTIONS Request Headers:", dict(request.headers))
        print("CORS Configured Origins:", settings.cors_origins_list)
    return await call_next(request)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded files directory as /static
app.mount("/static", StaticFiles(directory="uploads"), name="static")

def add_cors_headers(request: Request, response: JSONResponse) -> JSONResponse:
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Custom Flowza Exceptions handler
@app.exception_handler(FlowzaException)
async def flowza_exception_handler(request: Request, exc: FlowzaException):
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.detail,
                "details": exc.details
            }
        }
    )
    return add_cors_headers(request, response)

# FastAPI Request Validation Exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = []
    for err in exc.errors():
        details.append({
            "loc": err.get("loc"),
            "msg": err.get("msg"),
            "type": err.get("type")
        })
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": details
            }
        }
    )
    return add_cors_headers(request, response)

# Fallback Generic Exception handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred on the server.",
                "details": [str(exc)]
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


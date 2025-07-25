from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.mongodb import mongodb
from app.api import deps
from app.core.security import get_password_hash
from app.services.mqtt_service import start_mqtt_service, stop_mqtt_service
import secrets
import string
from datetime import datetime, timezone, timedelta
import os

# IST timezone (UTC+5:30)
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://127.0.0.1:5173", 
        "http://127.0.0.1:5174",
        "https://dashboard.bluedrop.shop",
        "https://api.bluedrop.shop",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Get the current directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Mount static files
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Templates
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

@app.on_event("startup")
async def startup_db_client():
    await mongodb.connect_to_mongodb()
    # Create admin user if not exists
    admin = await mongodb.get_collection("users").find_one({"username": settings.ADMIN_USERNAME})
    if not admin:
        now = datetime.now(IST_TIMEZONE)
        admin_user = {
            "username": settings.ADMIN_USERNAME,
            "email": settings.ADMIN_EMAIL,
            "hashed_password": get_password_hash(settings.ADMIN_PASSWORD),
            "is_verified": True,
            "is_approved": True,
            "is_admin": True,
            "assigned_dashboards": [],
            "created_at": now,
            "updated_at": now
        }
        await mongodb.get_collection("users").insert_one(admin_user)
    
    # Start MQTT service
    try:
        start_mqtt_service()
    except Exception as e:
        print(f"Warning: Could not start MQTT service: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    await mongodb.close_mongodb_connection()
    # Stop MQTT service
    stop_mqtt_service()

def generate_api_key(length: int = 12) -> str:
    """Generate a random API key"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

# Include routers
from app.api.endpoints import auth_router, users_router, dashboards_router, data_router

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(dashboards_router, prefix=settings.API_V1_STR)
app.include_router(data_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("base.html", {"request": request})

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        await mongodb.get_collection("users").find_one()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/test-cors")
async def test_cors():
    return {"message": "CORS is working!"}


from app.api.endpoints.device_ingest import router as device_ingest_router
app.include_router(device_ingest_router, prefix="/api/v1")
# app/api/endpoints/__init__.py

from .auth import router as auth_router
from .users import router as users_router
from .dashboards import router as dashboards_router
from .data import router as data_router
from fastapi import FastAPI # This line is often in main.py, but keeping as per your provided code
from .device_ingest import router as device_ingest_router # This import will now work!
  # ... existing code ...
app = FastAPI() # This line is often in main.py, but keeping as per your provided code
app.include_router(device_ingest_router, prefix="/api/v1") # This line is often in main.py, but keeping as per your provided code
__all__ = ['auth_router', 'users_router', 'dashboards_router', 'data_router', 'device_ingest_router'] # Add device_ingest_router here if you want it exposed for other modules to import
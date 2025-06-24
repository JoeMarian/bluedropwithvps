from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ThingSpeak Clone"
    VERSION: str = "1.0.0"
    
    # MongoDB Configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/thingspeak_clone")
    
    # JWT Configuration
    SECRET_KEY: str = os.getenv("JWT_SECRET", "your_jwt_secret_key_here")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Admin Configuration
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "joemarian3010@gmail.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin")
    
    # Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "")
    EMAIL_FROM_NAME: str = os.getenv("EMAIL_FROM_NAME", "TankManage")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
    
    # MQTT Configuration
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "localhost")  # Default to localhost for local dev
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))      # Default to 1883 for local dev
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "mqtt_user")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "mqtt_password")
    
    # Frontend Configuration
    FRONTEND_URL: str = os.getenv("VITE_API_URL", "http://localhost:8000")
    MQTT_WS_URL: str = os.getenv("VITE_MQTT_WS_URL", "ws://localhost:9001")
    
    class Config:
        case_sensitive = True

settings = Settings()

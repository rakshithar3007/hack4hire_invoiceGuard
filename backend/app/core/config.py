import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "InvoiceGuard AI"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "sqlite:///./invoiceguard.db"
    
    # Security
    SECRET_KEY: str = "invoiceguard-super-secret-jwt-key-2026-production-grade"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Storage
    STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../storage/invoices"))
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".jpg", ".jpeg", ".png"]
    
    # n8n Automation
    N8N_WEBHOOK_URL: str = "http://localhost:5678/webhook/new-invoice"
    N8N_WEBHOOK_SECRET: str = "n8n_invoiceguard_secret_2026"
    
    # AI / LLM Integration (optional key; system has robust rule-based fallback)
    OPENAI_API_KEY: Optional[str] = None
    AI_MODEL: str = "gpt-4o-mini"
    
    # External verification / GST mock
    GST_PORTAL_VERIFY_ENABLED: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
os.makedirs(settings.STORAGE_DIR, exist_ok=True)

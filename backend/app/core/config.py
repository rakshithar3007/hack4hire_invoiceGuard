import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "InvoiceGuard AI"
    API_V1_STR: str = "/api"
    
    # Database - works on both Windows local dev and Render Linux
    DATABASE_URL: str = "sqlite:///./invoiceguard.db"
    
    # Security
    SECRET_KEY: str = "invoiceguard-super-secret-jwt-key-2026-production-grade"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Storage - computed after init
    STORAGE_DIR: str = ""
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
    GST_AGENT_ENABLED: bool = True
    GST_TOLERANCE_INR: float = 0.05

    # RBAC Security Feature Flag
    RBAC_ENFORCED: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# --- Resolve STORAGE_DIR reliably for both local Windows and Render Linux ---
# Use the backend/ directory (where main.py lives) as the anchor, not __file__
# because __file__ here is app/core/config.py which is 3 levels deep.
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if not settings.STORAGE_DIR:
    settings.STORAGE_DIR = os.path.join(_backend_dir, "storage", "invoices")

os.makedirs(settings.STORAGE_DIR, exist_ok=True)

# --- Resolve DATABASE_URL to absolute path for SQLite ---
# sqlite:///./invoiceguard.db is relative to CWD which may differ on Render.
# Convert to absolute path anchored at the backend/ directory.
if settings.DATABASE_URL.startswith("sqlite:///./"):
    _db_filename = settings.DATABASE_URL.replace("sqlite:///./", "")
    _db_abs_path = os.path.join(_backend_dir, _db_filename)
    settings.DATABASE_URL = f"sqlite:///{_db_abs_path}"

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from gem-backend root
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
UPLOAD_DIR = BASE_DIR / "uploads"
TENDER_UPLOAD_DIR = UPLOAD_DIR / "tenders"
BIDDER_UPLOAD_DIR = UPLOAD_DIR / "bidders"

# Create directories if they don't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TENDER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
BIDDER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_PATH = BASE_DIR / "gem_compliance.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH.as_posix()}")

# App Settings
APP_TITLE = "GeM AI Bid Compliance Verification Platform"
APP_VERSION = "1.0.0"
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

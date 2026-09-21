import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Find .env.local in parent directory
env_path = Path(__file__).resolve().parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("VITE_SUPABASE_JWT_SECRET")

is_test = bool(
    os.getenv("PYTEST_CURRENT_TEST") or 
    os.getenv("TESTING") or 
    os.getenv("CI") or 
    "pytest" in sys.modules or 
    any("pytest" in arg for arg in sys.argv)
)

if not SUPABASE_URL:
    if is_test:
        SUPABASE_URL = "https://mock.supabase.co"
    else:
        raise ValueError("Missing SUPABASE_URL environment variable")

if not SUPABASE_KEY:
    if is_test:
        SUPABASE_KEY = "mock-key"
    else:
        raise ValueError("Missing SUPABASE_KEY/VITE_SUPABASE_ANON_KEY environment variable")

if not GEMINI_API_KEY:
    if is_test:
        GEMINI_API_KEY = "mock-gemini-key"
    else:
        raise ValueError("Missing GEMINI_API_KEY environment variable")

if not SUPABASE_JWT_SECRET:
    if is_test:
        SUPABASE_JWT_SECRET = "mock-jwt-secret"
    else:
        raise ValueError("Missing SUPABASE_JWT_SECRET environment variable")


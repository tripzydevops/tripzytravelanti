import os
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

if not SUPABASE_URL:
    raise ValueError("Missing SUPABASE_URL environment variable")
if not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_KEY/VITE_SUPABASE_ANON_KEY environment variable")
if not GEMINI_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY environment variable")

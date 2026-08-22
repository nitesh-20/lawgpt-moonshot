# Application constants

API_V1_STR: str = "/api/v1"

# Upload and formats configuration
ALLOWED_EXTENSIONS = {"pdf", "txt", "doc", "docx", "png", "jpg", "jpeg"}

# Prompt templates location
PROMPTS_DIR = "app/prompts"

# Rate limits, timeouts, etc.
SARVAM_REQUEST_TIMEOUT = 30.0
GEMINI_REQUEST_TIMEOUT = 30.0

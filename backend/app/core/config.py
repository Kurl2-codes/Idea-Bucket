from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ShoreAI Backend"
    API_V1_STR: str = "/api/v1"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "mindcanvas_db"

    # S3 Object Storage
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET_NAME: str
    S3_ENDPOINT: str
    S3_REGION: str

    # Gemini
    GEMINI_API_KEY: str
    SECRET_KEY: str = "your-secret-key-keep-it-secret"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

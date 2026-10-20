from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database.session import init_db
from app.database.seed_data import seed_database
from app.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed baseline smart-city scenario
    init_db()
    seed_database()
    yield

app = FastAPI(
    title=f"{settings.PROJECT_NAME} ({settings.PROJECT_NAME_TAMIL})",
    description="AI-Powered Adaptive Urban Waste Collection & Environmental Risk Management System",
    version=settings.VERSION,
    lifespan=lifespan
)

# Enable CORS for local React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "tamil_name": settings.PROJECT_NAME_TAMIL,
        "subtitle": "AI-Powered Adaptive Urban Waste Collection & Environmental Risk Management System",
        "tagline": "Predict. Prevent. Optimize. Verify. Learn.",
        "tamil_tagline": "கழிவை முன்கூட்டியே கணித்து, அபாயத்தைத் தடுத்து, சேகரிப்பை மேம்படுத்தி, தொடர்ந்து கற்றுக்கொள்.",
        "status": "OPERATIONAL",
        "api_docs": "/docs",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

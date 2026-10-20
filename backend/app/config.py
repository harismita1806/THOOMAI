import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ThooimAI"
    PROJECT_NAME_TAMIL: str = "தூய்மை AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database (Flexible SQLite default for seamless local run, PostgreSQL compatible)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./thooymathi.db")
    
    # Weather (Free Open-Meteo)
    OPEN_METEO_URL: str = os.getenv("OPEN_METEO_URL", "https://api.open-meteo.com/v1/forecast")
    
    # Routing (OSRM Free Demo / Local Fallback)
    OSRM_URL: str = os.getenv("OSRM_URL", "https://router.project-osrm.org")
    
    # Geocoding (Nominatim Free OpenStreetMap)
    NOMINATIM_URL: str = os.getenv("NOMINATIM_URL", "https://nominatim.openstreetmap.org")
    
    # MQTT IoT
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "localhost")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_TOPIC_TELEMETRY: str = "thooymathi/bins/telemetry"
    MQTT_TOPIC_ALERTS: str = "thooymathi/alerts"

    # Coordinates for Urban Smart City Center (Chennai, Tamil Nadu, India)
    DEFAULT_LAT: float = 13.0827
    DEFAULT_LON: float = 80.2707

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

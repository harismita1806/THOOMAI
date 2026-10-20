import httpx
from datetime import datetime, timedelta
from typing import Dict, Any
from app.config import settings

# In-memory cache to respect free Open-Meteo guidelines (30 min TTL)
_weather_cache: Dict[str, Any] = {}
_cache_expiry: datetime = datetime.min

async def get_current_weather(lat: float = None, lon: float = None) -> Dict[str, Any]:
    global _weather_cache, _cache_expiry
    lat = lat or settings.DEFAULT_LAT
    lon = lon or settings.DEFAULT_LON

    now = datetime.utcnow()
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
    if cache_key in _weather_cache and now < _cache_expiry:
        return _weather_cache[cache_key]

    # Free Open-Meteo API call with fallback
    url = f"{settings.OPEN_METEO_URL}?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation_probability,rain&timezone=auto"
    
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                hourly = data.get("hourly", {})
                
                # Check next 3-hour precipitation probability
                prob_next_3h = hourly.get("precipitation_probability", [25.0])[:3]
                avg_prob = float(sum(prob_next_3h) / max(1, len(prob_next_3h)))
                
                weather_info = {
                    "source": "Open-Meteo Live API",
                    "latitude": lat,
                    "longitude": lon,
                    "temperature_c": current.get("temperature_2m", 31.0),
                    "humidity_pct": current.get("relative_humidity_2m", 72.0),
                    "rainfall_mm": current.get("rain", 14.5),
                    "precipitation_probability": avg_prob,
                    "wind_speed_kmh": current.get("wind_speed_10m", 18.0),
                    "condition": "Monsoon Showers Expected" if avg_prob > 50 else "Partly Cloudy",
                    "flood_warning": avg_prob > 60 or current.get("rain", 0) > 10.0,
                    "timestamp": now.isoformat()
                }
                _weather_cache[cache_key] = weather_info
                _cache_expiry = now + timedelta(minutes=30)
                return weather_info
    except Exception:
        pass

    # Reliable fallback (Coastal smart-city monsoon profile)
    fallback = {
        "source": "Local Weather Engine (Simulated Fallback)",
        "latitude": lat,
        "longitude": lon,
        "temperature_c": 30.5,
        "humidity_pct": 78.0,
        "rainfall_mm": 12.4,
        "precipitation_probability": 75.0,
        "wind_speed_kmh": 22.0,
        "condition": "Scattered Monsoon Showers Expected",
        "flood_warning": True,
        "timestamp": now.isoformat()
    }
    _weather_cache[cache_key] = fallback
    _cache_expiry = now + timedelta(minutes=15)
    return fallback

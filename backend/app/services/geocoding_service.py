import httpx
from typing import Dict, Any, Optional
from app.config import settings

_geo_cache: Dict[str, Dict[str, float]] = {
    "Marina Beach, Chennai": {"lat": 13.0500, "lon": 80.2824},
    "T. Nagar, Chennai": {"lat": 13.0405, "lon": 80.2337},
    "Adyar, Chennai": {"lat": 13.0067, "lon": 80.2570},
    "Koyambedu, Chennai": {"lat": 13.0694, "lon": 80.1948},
    "George Town, Chennai": {"lat": 13.0891, "lon": 80.2870}
}

async def geocode_address(address: str) -> Optional[Dict[str, float]]:
    clean = address.strip()
    if clean in _geo_cache:
        return _geo_cache[clean]

    headers = {"User-Agent": "ThooymathiAI-SmartWaste/1.0 (academic-prototype)"}
    url = f"{settings.NOMINATIM_URL}/search?q={clean}&format=json&limit=1"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                results = resp.json()
                if results:
                    coords = {
                        "lat": float(results[0]["lat"]),
                        "lon": float(results[0]["lon"])
                    }
                    _geo_cache[clean] = coords
                    return coords
    except Exception:
        pass

    # Default to Chennai center
    return {"lat": settings.DEFAULT_LAT, "lon": settings.DEFAULT_LON}

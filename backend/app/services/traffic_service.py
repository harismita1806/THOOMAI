from typing import Dict, Any, List
from datetime import datetime
from app.database.session import SessionLocal
from app.database.models import TrafficSegment

def get_all_traffic_segments() -> List[Dict[str, Any]]:
    db = SessionLocal()
    segments = db.query(TrafficSegment).all()
    results = []
    for s in segments:
        results.append({
            "road_id": s.road_id,
            "road_name": s.road_name,
            "start_lat": s.start_lat,
            "start_lon": s.start_lon,
            "end_lat": s.end_lat,
            "end_lon": s.end_lon,
            "current_speed_kmh": s.current_speed_kmh,
            "freeflow_speed_kmh": s.freeflow_speed_kmh,
            "congestion_level": s.congestion_level,
            "predicted_congestion_15m": s.predicted_congestion_15m,
            "flood_risk": s.flood_risk,
            "is_blocked": s.is_blocked
        })
    db.close()
    return results

def get_traffic_penalty(road_id: str, minutes_ahead: int = 0) -> float:
    """
    Returns time penalty factor (1.0 = normal, 2.5 = high congestion, 5.0+ = severe/blocked).
    """
    db = SessionLocal()
    seg = db.query(TrafficSegment).filter(TrafficSegment.road_id == road_id).first()
    db.close()
    if not seg:
        return 1.0

    if seg.is_blocked:
        return 999.0

    level = seg.predicted_congestion_15m if minutes_ahead >= 15 else seg.congestion_level

    penalties = {
        "LOW": 1.0,
        "MODERATE": 1.35,
        "HIGH": 2.20,
        "SEVERE": 3.80
    }
    base_factor = penalties.get(level, 1.0)
    
    # Add flood penalty if roadway has standing water/flood risk
    if seg.flood_risk > 0.5:
        base_factor *= 1.45

    return round(base_factor, 2)

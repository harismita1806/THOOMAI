from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.database.session import SessionLocal
from app.database.models import Event, Bin

def predict_event_waste_impact(
    event_name: str,
    event_type: str,
    attendance: int,
    duration_hours: float,
    latitude: float,
    longitude: float,
    rainfall_mm: float = 0.0,
    is_weekend: bool = True
) -> Dict[str, Any]:
    """
    Predicts event-driven waste surge, additional tonnage, overflow likelihood,
    and mitigation directives based on urban event dynamics.
    """
    # Per capita waste factors (kg/person/hour)
    waste_factors = {
        "Festival": 0.085,         # Food packaging, flowers, organic prasad, plastics
        "Wholesale Market": 0.120, # Heavy organic produce, wooden crates, packaging
        "Concert": 0.095,          # Beverage cups, food trays, plastics
        "Public Gathering": 0.060, # Leaflets, beverage bottles
        "Sports": 0.075            # Plastic bottles, snack cartons
    }
    
    factor = waste_factors.get(event_type, 0.075)
    weekend_multiplier = 1.25 if is_weekend else 1.0
    rain_multiplier = 1.15 if rainfall_mm > 10.0 else 1.0  # soggy waste expansion

    total_additional_waste_kg = round(attendance * duration_hours * factor * weekend_multiplier * rain_multiplier, 1)

    # Surge probability
    if attendance >= 10000:
        surge_prob = 92.0
    elif attendance >= 4000:
        surge_prob = 84.0
    else:
        surge_prob = 68.0

    # Overflow probability in proximity
    overflow_prob = min(98.0, surge_prob + (10.0 if rainfall_mm > 5.0 else 0.0))

    # Identify affected bins in radius (~2.5 km)
    db = SessionLocal()
    bins = db.query(Bin).all()
    affected_bins = []
    
    for b in bins:
        dist_km = (((b.latitude - latitude)**2 + (b.longitude - longitude)**2)**0.5) * 111.0
        if dist_km <= 3.0:
            affected_bins.append({
                "bin_id": b.bin_id,
                "name": b.name,
                "zone": b.zone,
                "distance_km": round(dist_km, 2),
                "current_fill": b.current_fill,
                "predicted_event_fill": min(100.0, round(b.current_fill + (total_additional_waste_kg / 15.0), 1))
            })
    db.close()

    mitigation_actions = [
        f"Deploy 4 temporary 1100L compactor bins near {event_name} perimeter.",
        "Pre-position rapid response truck (e.g. TRUCK-T03) within 1.5 km staging radius.",
        "Increase collection frequency from 1/day to 3/day during peak hours.",
        "Dispatch sweep crew 45 minutes after peak period."
    ]

    return {
        "event_name": event_name,
        "event_type": event_type,
        "expected_attendance": attendance,
        "predicted_additional_waste_kg": total_additional_waste_kg,
        "surge_probability": surge_prob,
        "overflow_probability": overflow_prob,
        "peak_waste_period": "7:00 PM - 10:30 PM",
        "affected_bins_count": len(affected_bins),
        "affected_bins": affected_bins,
        "recommended_mitigations": mitigation_actions
    }

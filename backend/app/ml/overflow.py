from typing import Dict, Any

def predict_overflow_probability(
    current_fill: float,
    forecast_3h_fill: float,
    velocity: float,
    rainfall_mm: float = 0.0,
    commercial_activity: float = 0.5,
    collection_delay_min: int = 0
) -> Dict[str, Any]:
    """
    Computes P(overflow) combining current state, trajectory velocity,
    rainfall context (which slows pedestrian dumping but clogs bins with wet garbage/runoff),
    and collection delays.
    """
    # Base overflow probability directly tied to predicted fill
    if forecast_3h_fill >= 95.0:
        base_prob = 85.0 + (forecast_3h_fill - 95.0) * 3.0
    elif forecast_3h_fill >= 80.0:
        base_prob = 60.0 + (forecast_3h_fill - 80.0) * 1.6
    elif forecast_3h_fill >= 65.0:
        base_prob = 35.0 + (forecast_3h_fill - 65.0) * 1.6
    else:
        base_prob = (forecast_3h_fill / 65.0) * 35.0

    # Modifiers
    # High velocity surge bonus (+5% to +15%)
    velocity_penalty = min(15.0, velocity * 1.5) if velocity > 4.0 else 0.0
    
    # Rainfall penalty (rain accelerates soggy waste expansion & run-off contamination)
    rain_penalty = min(12.0, rainfall_mm * 0.8) if rainfall_mm > 5.0 else 0.0

    # Delay penalty (collection delayed past schedule)
    delay_penalty = min(15.0, (collection_delay_min / 30.0) * 8.0)

    # Commercial density surcharge
    commercial_penalty = commercial_activity * 6.0

    total_prob = base_prob + velocity_penalty + rain_penalty + delay_penalty + commercial_penalty
    total_prob = min(99.0, max(2.0, round(total_prob, 1)))

    if total_prob >= 81.0:
        risk_category = "CRITICAL"
    elif total_prob >= 61.0:
        risk_category = "HIGH"
    elif total_prob >= 31.0:
        risk_category = "MODERATE"
    else:
        risk_category = "LOW"

    return {
        "overflow_probability": total_prob,
        "risk_category": risk_category,
        "breakdown": {
            "base_fill_factor": round(base_prob, 1),
            "velocity_surge": round(velocity_penalty, 1),
            "rainfall_impact": round(rain_penalty, 1),
            "collection_delay": round(delay_penalty, 1),
            "commercial_demand": round(commercial_penalty, 1)
        }
    }

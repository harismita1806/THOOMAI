from typing import List, Tuple
from datetime import datetime

def calculate_waste_velocity(readings: List[Tuple[datetime, float]]) -> float:
    """
    Calculates waste accumulation velocity (% fill change per hour).
    readings: List of (timestamp, fill_level) ordered chronologically.
    Returns: velocity in % / hour.
    """
    if not readings or len(readings) < 2:
        return 0.0
    
    t_start, fill_start = readings[0]
    t_end, fill_end = readings[-1]

    delta_hours = (t_end - t_start).total_seconds() / 3600.0
    if delta_hours <= 0:
        return 0.0
    
    delta_fill = fill_end - fill_start
    # If a collection occurred (sudden drop), compute velocity on recent rising segment
    if delta_fill < 0:
        # find last minimum or collection point
        min_idx = 0
        min_val = readings[0][1]
        for idx, (_, fill) in enumerate(readings):
            if fill <= min_val:
                min_val = fill
                min_idx = idx
        if min_idx < len(readings) - 1:
            sub_start, sub_f_start = readings[min_idx]
            sub_hours = (t_end - sub_start).total_seconds() / 3600.0
            if sub_hours > 0:
                return max(0.0, round((fill_end - sub_f_start) / sub_hours, 2))
        return 0.0

    return round(delta_fill / delta_hours, 2)

def compute_bin_urgency_priority(current_fill: float, velocity: float, overflow_prob: float) -> Tuple[str, float]:
    """
    Computes priority based on:
    CURRENT LEVEL + ACCUMULATION VELOCITY + OVERFLOW PROBABILITY.
    Bin B with 90% fill and +1%/hr vs Bin A with 60% fill and +8%/hr:
    Bin A will surge to 84% in 3 hours, Bin B reaches 93%.
    """
    urgency_score = (current_fill * 0.40) + (velocity * 3.5) + (overflow_prob * 0.35)
    urgency_score = min(100.0, max(0.0, round(urgency_score, 1)))

    if urgency_score >= 78.0 or current_fill >= 85.0 or overflow_prob >= 80.0:
        return "CRITICAL", urgency_score
    elif urgency_score >= 58.0 or current_fill >= 70.0:
        return "HIGH", urgency_score
    elif urgency_score >= 35.0 or current_fill >= 45.0:
        return "MEDIUM", urgency_score
    else:
        return "LOW", urgency_score

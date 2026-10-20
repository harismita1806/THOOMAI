from typing import Dict, Any

def compute_environmental_risk(
    fill_level: float,
    waste_velocity: float,
    overflow_prob: float,
    rainfall_mm: float,
    flood_susceptibility: float,
    population_density: float,
    commercial_activity: float
) -> Dict[str, Any]:
    """
    Computes multi-dimensional environmental risk score:
    - Waste Risk: Pressure from accumulating uncollected solid waste
    - Flood Risk: Susceptibility to monsoon waterlogging and stormwater drain clogging
    - Population Exposure: Public health and disease vector vulnerability
    - Overall Risk: Holistic environmental threat score (0-100)
    """
    # 1. Waste Risk (0 to 100)
    waste_risk = (fill_level * 0.45) + (waste_velocity * 4.0) + (overflow_prob * 0.25)
    waste_risk = min(100.0, max(0.0, round(waste_risk, 1)))

    # 2. Flood & Drainage Risk (0 to 100)
    rain_factor = min(50.0, rainfall_mm * 3.5)
    drainage_choke = (fill_level / 100.0) * flood_susceptibility * 40.0
    flood_risk = rain_factor + drainage_choke + (flood_susceptibility * 20.0)
    flood_risk = min(100.0, max(0.0, round(flood_risk, 1)))

    # 3. Population Exposure (0 to 100)
    pop_score = (population_density / 35000.0) * 60.0
    comm_score = commercial_activity * 40.0
    population_exposure = min(100.0, max(0.0, round(pop_score + comm_score, 1)))

    # 4. Overall Environmental Risk (0 to 100)
    # If waste overflows during rain near high population, environmental hazard escalates exponentially
    interaction_hazard = 15.0 if (waste_risk > 70.0 and flood_risk > 60.0) else 0.0
    
    overall = (
        (waste_risk * 0.45) +
        (flood_risk * 0.30) +
        (population_exposure * 0.25) +
        interaction_hazard
    )
    overall = min(100.0, max(0.0, round(overall, 1)))

    if overall >= 80.0:
        status = "CRITICAL"
    elif overall >= 60.0:
        status = "HIGH"
    elif overall >= 35.0:
        status = "MODERATE"
    else:
        status = "LOW"

    return {
        "waste_risk": waste_risk,
        "flood_risk": flood_risk,
        "population_exposure": population_exposure,
        "overall_risk": overall,
        "status": status,
        "hazard_summary": (
            "CRITICAL environmental threat: imminent waste overflow coupled with rainfall hazard in dense pedestrian zone."
            if status == "CRITICAL" else
            ("Elevated environmental pressure: accelerated waste generation requires proactive collection." if status == "HIGH" else "Stable environmental conditions.")
        )
    }

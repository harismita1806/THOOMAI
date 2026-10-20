from typing import Dict, Any, List

def compute_feature_attributions(
    fill_level: float,
    waste_velocity: float,
    commercial_activity: float,
    population_density: float,
    rainfall_mm: float,
    is_weekend: bool = False
) -> List[Dict[str, Any]]:
    """
    Computes normalized relative feature contributions (SHAP-style local attribution)
    traceable to the specific bin and environmental factors.
    """
    weights = {
        "Waste accumulation velocity": max(0.5, waste_velocity * 3.2),
        "Commercial / Market activity": commercial_activity * 25.0,
        "Population exposure density": (population_density / 35000.0) * 20.0,
        "Precipitation & Monsoon rainfall": min(20.0, rainfall_mm * 1.5),
        "Weekend crowd surge": 18.0 if is_weekend else 6.0,
        "Current bin fill level": (fill_level / 100.0) * 15.0
    }

    total_weight = sum(weights.values())
    contributions = []

    for name, w in weights.items():
        pct = round((w / total_weight) * 100.0, 1)
        contributions.append({
            "feature": name,
            "contribution_pct": pct,
            "direction": "+" if pct > 10.0 else "~"
        })

    # Sort descending by contribution percentage
    contributions.sort(key=lambda x: x["contribution_pct"], reverse=True)
    return contributions

def generate_natural_language_explanation(
    zone_name: str,
    overflow_prob: float,
    top_contributions: List[Dict[str, Any]],
    risk_category: str
) -> str:
    """
    Synthesizes concise, explainable natural-language explanation
    grounded directly in the top contributing features.
    """
    top_two = [c["feature"] for c in top_contributions[:2]]
    first = top_two[0].lower()
    second = top_two[1].lower() if len(top_two) > 1 else "environmental factors"

    if risk_category in ["CRITICAL", "HIGH"]:
        return (
            f"Rapid {first} combined with elevated {second} are primary drivers "
            f"propelling {zone_name} to a {risk_category} overflow probability of {overflow_prob}%. "
            f"Immediate collection intervention recommended before rainfall exacerbates risk."
        )
    elif risk_category == "MODERATE":
        return (
            f"Moderate {first} observed in {zone_name}. "
            f"Bin fill trajectory is steadily escalating; scheduled collection within standard window will avert overflow."
        )
    else:
        return (
            f"Normal waste generation patterns maintained in {zone_name}. "
            f"Accumulation velocity is low and environmental conditions remain stable."
        )

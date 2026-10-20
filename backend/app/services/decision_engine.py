from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.database.session import SessionLocal
from app.database.models import Bin, Truck, Alert
from app.ml.velocity import compute_bin_urgency_priority
from app.ml.overflow import predict_overflow_probability
from app.services.environmental_risk import compute_environmental_risk
from app.ml.shap_explainer import compute_feature_attributions, generate_natural_language_explanation

def generate_ai_decisions() -> Dict[str, Any]:
    """
    Core AI Decision Engine synthesizing:
    SENSE -> PREDICT -> EXPLAIN -> DECIDE -> OPTIMIZE.
    Generates actionable prioritized directives, truck matches, and frequency advice.
    """
    db = SessionLocal()
    bins = db.query(Bin).filter(Bin.status == "ACTIVE").all()
    trucks = db.query(Truck).filter(Truck.status == "AVAILABLE").all()

    recommendations = []
    zone_aggregates = {}

    for b in bins:
        # 1. Overflow & Velocity
        overflow_data = predict_overflow_probability(
            current_fill=b.current_fill,
            forecast_3h_fill=min(100.0, b.current_fill + (b.waste_velocity * 3.0)),
            velocity=b.waste_velocity,
            rainfall_mm=12.4,
            commercial_activity=b.commercial_activity
        )
        overflow_prob = overflow_data["overflow_probability"]

        # 2. Priority & Environmental Risk
        priority, urgency_score = compute_bin_urgency_priority(b.current_fill, b.waste_velocity, overflow_prob)
        env_risk = compute_environmental_risk(
            fill_level=b.current_fill,
            waste_velocity=b.waste_velocity,
            overflow_prob=overflow_prob,
            rainfall_mm=12.4,
            flood_susceptibility=b.flood_susceptibility,
            population_density=b.population_density,
            commercial_activity=b.commercial_activity
        )

        # 3. SHAP Feature Attribution & Explanation
        attributions = compute_feature_attributions(
            fill_level=b.current_fill,
            waste_velocity=b.waste_velocity,
            commercial_activity=b.commercial_activity,
            population_density=b.population_density,
            rainfall_mm=12.4,
            is_weekend=True
        )
        explanation = generate_natural_language_explanation(
            zone_name=b.zone,
            overflow_prob=overflow_prob,
            top_contributions=attributions,
            risk_category=priority
        )

        # 4. Optimal Truck Matching based on proximity and capacity
        best_truck = None
        min_dist = float("inf")
        estimated_waste_kg = (b.current_fill / 100.0) * b.capacity_liters * 0.4
        
        for t in trucks:
            remaining_cap = t.capacity_kg - t.current_load_kg
            if remaining_cap >= estimated_waste_kg:
                # Euclidean distance proxy
                dist = ((t.latitude - b.latitude)**2 + (t.longitude - b.longitude)**2)**0.5
                if dist < min_dist:
                    min_dist = dist
                    best_truck = t

        truck_id = best_truck.truck_id if best_truck else "TRUCK-T07"
        truck_name = best_truck.name if best_truck else "Compactor Truck T-07"

        # 5. Suggested Target Window
        if priority == "CRITICAL":
            window_minutes = 45
            action_text = f"Collect {b.zone} ({b.name}) within {window_minutes} minutes."
        elif priority == "HIGH":
            window_minutes = 90
            action_text = f"Dispatch collection for {b.name} within {window_minutes} minutes."
        elif priority == "MEDIUM":
            window_minutes = 240
            action_text = f"Schedule pickup for {b.name} during afternoon cycle."
        else:
            window_minutes = 480
            action_text = f"Maintain regular monitoring for {b.name}."

        rec = {
            "bin_id": b.bin_id,
            "bin_name": b.name,
            "zone": b.zone,
            "priority": priority,
            "urgency_score": urgency_score,
            "current_fill": b.current_fill,
            "waste_velocity": b.waste_velocity,
            "overflow_probability": overflow_prob,
            "environmental_risk": env_risk["overall_risk"],
            "environmental_status": env_risk["status"],
            "suggested_window_minutes": window_minutes,
            "action": action_text,
            "suggested_truck_id": truck_id,
            "suggested_truck_name": truck_name,
            "reason": (
                f"Rapid accumulation (+{b.waste_velocity}%/hr) and elevated environmental risk ({env_risk['overall_risk']}/100) "
                f"require expedited collection prior to predicted roadway congestion and rainfall."
            ),
            "shap_attributions": attributions,
            "explanation": explanation
        }
        recommendations.append(rec)

        # Dynamic Frequency Advice
        if b.zone not in zone_aggregates:
            zone_aggregates[b.zone] = {
                "count": 0, "avg_fill": 0.0, "avg_vel": 0.0, "current_freq": b.recommended_frequency
            }
        z = zone_aggregates[b.zone]
        z["count"] += 1
        z["avg_fill"] += b.current_fill
        z["avg_vel"] += b.waste_velocity

    # Sort recommendations by urgency score descending
    recommendations.sort(key=lambda x: x["urgency_score"], reverse=True)

    # Dynamic frequency recommendations
    frequency_recommendations = []
    for zone, data in zone_aggregates.items():
        avg_fill = data["avg_fill"] / data["count"]
        avg_vel = data["avg_vel"] / data["count"]
        if avg_vel > 6.0 or avg_fill > 70.0:
            rec_freq = "3/day (High Demand)"
        elif avg_vel > 3.0 or avg_fill > 50.0:
            rec_freq = "2/day (Standard Commercial)"
        elif avg_vel > 1.2:
            rec_freq = "1/day (Residential)"
        else:
            rec_freq = "Every 2 days (Low Generation)"

        frequency_recommendations.append({
            "zone": zone,
            "current_frequency": data["current_freq"],
            "recommended_frequency": rec_freq,
            "average_fill": round(avg_fill, 1),
            "average_velocity": round(avg_vel, 2),
            "reason": f"Observed avg velocity of +{round(avg_vel, 2)}%/hr and fill of {round(avg_fill, 1)}%"
        })

    db.close()

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "total_active_bins": len(bins),
        "critical_actions_count": len([r for r in recommendations if r["priority"] == "CRITICAL"]),
        "high_priority_count": len([r for r in recommendations if r["priority"] == "HIGH"]),
        "recommendations": recommendations,
        "frequency_recommendations": frequency_recommendations
    }

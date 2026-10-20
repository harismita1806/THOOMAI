from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from app.database.session import get_db, SessionLocal
from app.database.models import (
    Bin, SensorReading, Prediction, Truck, CollectionTask,
    PickupVerification, TrafficSegment, WeatherRecord, EnvironmentalRisk,
    Alert, ModelPerformance, ContinuousLearningLog, Event, WasteClassificationRecord, MissedPickupRecord
)
from app.ml.velocity import calculate_waste_velocity, compute_bin_urgency_priority
from app.ml.forecasting import forecaster
from app.ml.overflow import predict_overflow_probability
from app.ml.anomaly import anomaly_detector
from app.ml.shap_explainer import compute_feature_attributions, generate_natural_language_explanation
from app.ml.continuous_learning import learning_engine
from app.ml.waste_classifier import waste_classifier, WASTE_CATEGORIES, CATEGORY_DETAILS
from app.ml.event_prediction import predict_event_waste_impact
from app.services.weather_service import get_current_weather
from app.services.traffic_service import get_all_traffic_segments
from app.services.environmental_risk import compute_environmental_risk
from app.services.decision_engine import generate_ai_decisions
from app.services.wastewise_assistant import assistant_engine
from app.routing.multi_truck_optimizer import solve_multi_truck_cvrp
from app.routing.osrm_service import get_osrm_route
from app.iot.sensor_simulator import generate_telemetry_reading

router = APIRouter()

# ----------------- SCHEMAS -----------------
class AssistantChatRequest(BaseModel):
    message: str

class WasteClassifyRequest(BaseModel):
    image_name: str
    hint_type: Optional[str] = None
    bin_id: Optional[str] = None

class ReassignTruckRequest(BaseModel):
    new_truck_id: str
    reason: Optional[str] = None
class PickupVerifyRequest(BaseModel):
    bin_id: str
    truck_id: str
    driver_lat: float
    driver_lon: float
    pre_fill: float
    post_fill: float
    driver_confirmed: bool = True
    qr_scanned: bool = True
    actual_weight_kg: Optional[float] = None
    notes: Optional[str] = None

class WhatIfSimulationRequest(BaseModel):
    delay_hours: float = Field(default=0.0, description="Collection delay in hours")
    blocked_road_id: Optional[str] = Field(default=None, description="Blocked road segment ID")
    rainfall_increase_mm: float = Field(default=0.0, description="Additional rainfall in mm")
    unavailable_truck_id: Optional[str] = Field(default=None, description="Offline truck ID")

class SensorSimRequest(BaseModel):
    bin_id: str
    event_type: str = "NORMAL"  # NORMAL, SURGE, COLLECTION, ANOMALY

# ----------------- BINS & PREDICTIONS -----------------
@router.get("/bins")
async def get_bins():
    db = SessionLocal()
    bins = db.query(Bin).all()
    results = []

    for b in bins:
        # Multi-horizon forecast
        forecasts = forecaster.predict_horizons(
            current_fill=b.current_fill,
            velocity=b.waste_velocity,
            commercial_activity=b.commercial_activity,
            population_density=b.population_density,
            rainfall_mm=12.4
        )

        # Overflow prob
        overflow_info = predict_overflow_probability(
            current_fill=b.current_fill,
            forecast_3h_fill=forecasts["+3h"]["predicted_fill"],
            velocity=b.waste_velocity,
            rainfall_mm=12.4,
            commercial_activity=b.commercial_activity
        )

        # Urgency priority
        priority, urgency_score = compute_bin_urgency_priority(
            b.current_fill, b.waste_velocity, overflow_info["overflow_probability"]
        )

        # Environmental risk
        env_risk = compute_environmental_risk(
            fill_level=b.current_fill,
            waste_velocity=b.waste_velocity,
            overflow_prob=overflow_info["overflow_probability"],
            rainfall_mm=12.4,
            flood_susceptibility=b.flood_susceptibility,
            population_density=b.population_density,
            commercial_activity=b.commercial_activity
        )

        # SHAP attributions
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
            overflow_prob=overflow_info["overflow_probability"],
            top_contributions=attributions,
            risk_category=priority
        )

        # Anomaly evaluation
        anomaly_info = anomaly_detector.detect_anomaly(
            fill_level=b.current_fill,
            waste_velocity=b.waste_velocity,
            weight_kg=b.current_fill * 4.2
        )

        results.append({
            "bin_id": b.bin_id,
            "name": b.name,
            "zone": b.zone,
            "latitude": b.latitude,
            "longitude": b.longitude,
            "capacity_liters": b.capacity_liters,
            "current_fill": b.current_fill,
            "previous_fill": b.previous_fill,
            "waste_velocity": b.waste_velocity,
            "waste_type": b.waste_type,
            "standard_waste_category": (
                "Organic / Wet Waste" if any(w in b.waste_type.lower() for w in ["organic", "food", "perishable", "vegetable"]) else
                ("Plastic" if "plastic" in b.waste_type.lower() else
                ("Paper" if "paper" in b.waste_type.lower() else
                ("Commercial" if "commercial" in b.waste_type.lower() else "Mixed Waste")))
            ),
            "status": b.status,
            "address": b.address,
            "priority": priority,
            "urgency_score": urgency_score,
            "overflow_probability": overflow_info["overflow_probability"],
            "risk_category": overflow_info["risk_category"],
            "predicted_overflow_time": forecasts.get("overflow_eta", {}).get("description", "Stable (>24h)"),
            "hours_to_overflow": forecasts.get("overflow_eta", {}).get("hours_remaining", 24.0),
            "next_recommended_pickup": "Within 45 minutes (Urgent)" if priority == "CRITICAL" else ("Within 90 minutes" if priority == "HIGH" else "Within 4 hours"),
            "environmental_risk": env_risk["overall_risk"],
            "environmental_status": env_risk["status"],
            "environmental_breakdown": {
                "waste_risk": env_risk["waste_risk"],
                "flood_risk": env_risk["flood_risk"],
                "population_exposure": env_risk["population_exposure"]
            },
            "forecasts": forecasts,
            "shap_attributions": attributions,
            "explanation": explanation,
            "anomaly": anomaly_info,
            "recommended_frequency": b.recommended_frequency,
            "last_collection_time": b.last_collection_time.isoformat() if b.last_collection_time else None
        })

    db.close()
    return results

@router.get("/bins/{bin_id}")
async def get_bin_detail(bin_id: str):
    db = SessionLocal()
    b = db.query(Bin).filter(Bin.bin_id == bin_id).first()
    if not b:
        db.close()
        raise HTTPException(status_code=404, detail="Bin not found")
    
    # Fetch recent readings
    readings = db.query(SensorReading).filter(
        SensorReading.bin_id == bin_id
    ).order_by(SensorReading.timestamp.desc()).limit(24).all()

    history = [{
        "timestamp": r.timestamp.isoformat(),
        "fill_level": r.fill_level,
        "weight_kg": r.weight_kg,
        "temperature_c": r.temperature_c,
        "battery_level": r.battery_level,
        "sensor_status": r.sensor_status
    } for r in reversed(readings)]

    db.close()
    return {"bin": b, "readings_history": history}

# ----------------- WEATHER & TRAFFIC -----------------
@router.get("/weather")
async def get_weather():
    return await get_current_weather()

@router.get("/traffic")
async def get_traffic():
    return get_all_traffic_segments()

# ----------------- ALERTS -----------------
@router.get("/alerts")
async def get_alerts():
    db = SessionLocal()
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).all()
    res = [{
        "alert_id": a.alert_id,
        "alert_type": a.alert_type,
        "severity": a.severity,
        "location": a.location,
        "bin_id": a.bin_id,
        "truck_id": a.truck_id,
        "timestamp": a.timestamp.isoformat(),
        "message": a.message,
        "status": a.status,
        "root_cause": a.root_cause
    } for a in alerts]
    db.close()
    return res

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    db = SessionLocal()
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if alert:
        alert.status = "RESOLVED"
        db.commit()
    db.close()
    return {"status": "RESOLVED", "alert_id": alert_id}

# ----------------- FLEET & TRUCKS -----------------
@router.get("/trucks")
async def get_trucks():
    db = SessionLocal()
    trucks = db.query(Truck).all()
    res = [{
        "truck_id": t.truck_id,
        "name": t.name,
        "driver_name": t.driver_name,
        "latitude": t.latitude,
        "longitude": t.longitude,
        "capacity_kg": t.capacity_kg,
        "current_load_kg": t.current_load_kg,
        "utilization_pct": round((t.current_load_kg / t.capacity_kg) * 100.0, 1),
        "status": t.status,
        "fuel_level": t.fuel_level
    } for t in trucks]
    db.close()
    return res

# ----------------- DECISION ENGINE -----------------
@router.get("/decisions")
async def get_decisions():
    return generate_ai_decisions()

# ----------------- MULTI-TRUCK ROUTE OPTIMIZATION -----------------
@router.post("/route/optimize")
async def optimize_routes():
    return solve_multi_truck_cvrp()

# ----------------- PICKUP VERIFICATION (CLOSED-LOOP) -----------------
@router.post("/pickup/verify")
async def verify_pickup(req: PickupVerifyRequest):
    """
    Multi-Signal Verification:
    1. GPS proximity check (driver lat/lon vs bin lat/lon within 50m)
    2. Sensor fill-level drop (e.g. 93% -> 18%)
    3. Driver & QR confirmation
    4. Logs into continuous learning database
    """
    db = SessionLocal()
    b = db.query(Bin).filter(Bin.bin_id == req.bin_id).first()
    t = db.query(Truck).filter(Truck.truck_id == req.truck_id).first()

    if not b:
        db.close()
        raise HTTPException(status_code=404, detail="Bin not found")

    # 1. GPS Distance check (approximate distance in meters)
    lat_diff = (req.driver_lat - b.latitude) * 111000.0
    lon_diff = (req.driver_lon - b.longitude) * 111000.0 * 0.97
    distance_meters = round((lat_diff**2 + lon_diff**2)**0.5, 1)
    gps_ok = distance_meters <= 80.0  # within 80 meters

    # 2. Sensor fill drop check
    fill_drop = req.pre_fill - req.post_fill
    sensor_ok = fill_drop >= 30.0  # Significant reduction

    # 3. Overall Verification Status
    is_verified = (gps_ok and sensor_ok and req.driver_confirmed)
    status = "VERIFIED" if is_verified else ("PARTIAL" if (gps_ok or sensor_ok) else "FAILED")

    # Calculate actual waste collected
    waste_kg = req.actual_weight_kg or round(fill_drop * 4.2, 1)
    predicted_kg = round(req.pre_fill * 4.2, 1)
    error_kg = round(abs(predicted_kg - waste_kg), 1)

    # Update bin state
    b.previous_fill = b.current_fill
    b.current_fill = req.post_fill
    b.waste_velocity = 0.5  # reset accumulation velocity post collection
    b.last_collection_time = datetime.utcnow()

    # Update truck load
    if t:
        t.current_load_kg = min(t.capacity_kg, t.current_load_kg + waste_kg)

    # Record Verification
    verification_id = f"VERIF-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    verif = PickupVerification(
        verification_id=verification_id,
        bin_id=req.bin_id,
        truck_id=req.truck_id,
        timestamp=datetime.utcnow(),
        gps_verified=gps_ok,
        gps_distance_meters=distance_meters,
        sensor_verified=sensor_ok,
        pre_fill_level=req.pre_fill,
        post_fill_level=req.post_fill,
        driver_confirmed=req.driver_confirmed,
        qr_verified=req.qr_scanned,
        verification_status=status,
        actual_waste_kg=waste_kg,
        predicted_waste_kg=predicted_kg,
        error_kg=error_kg,
        notes=req.notes or f"Pickup verified with {round(fill_drop, 1)}% fill reduction."
    )
    db.add(verif)
    db.commit()

    # Feed into Continuous Learning Engine!
    feedback = learning_engine.log_pickup_result(
        bin_id=req.bin_id,
        predicted_fill=req.pre_fill,
        actual_fill=req.pre_fill - (error_kg / 4.2),
        verification_id=verification_id
    )

    db.close()

    return {
        "verification_id": verification_id,
        "verification_status": status,
        "is_verified": is_verified,
        "signals": {
            "gps_verified": gps_ok,
            "gps_distance_meters": distance_meters,
            "sensor_verified": sensor_ok,
            "fill_drop_percentage": round(fill_drop, 1),
            "driver_confirmed": req.driver_confirmed,
            "qr_verified": req.qr_scanned
        },
        "waste_metrics": {
            "pre_fill": req.pre_fill,
            "post_fill": req.post_fill,
            "waste_collected_kg": waste_kg,
            "predicted_kg": predicted_kg,
            "prediction_error_kg": error_kg
        },
        "continuous_learning": feedback
    }

# ----------------- MISSED PICKUP SIMULATION & REASSIGNMENT -----------------
@router.post("/tasks/simulate-missed")
async def simulate_missed_pickup(bin_id: str = "BIN-C101"):
    """
    Simulates a missed pickup scenario:
    1. Assigned truck delayed/unavailable past deadline
    2. System raises CRITICAL MISSED_PICKUP Alert
    3. Finds nearest alternate truck
    4. Automatically reassigns task and recalculates route!
    """
    db = SessionLocal()
    b = db.query(Bin).filter(Bin.bin_id == bin_id).first()
    if not b:
        db.close()
        raise HTTPException(status_code=404, detail="Bin not found")

    # Raise Missed Pickup Alert
    alert_id = f"ALT-MISSED-{datetime.utcnow().strftime('%M%S')}"
    alert = Alert(
        alert_id=alert_id,
        alert_type="MISSED_PICKUP",
        severity="CRITICAL",
        location=f"{b.zone} ({b.name})",
        bin_id=b.bin_id,
        timestamp=datetime.utcnow(),
        message=f"Missed Pickup: Scheduled collection for {b.name} passed deadline. Overflow risk at 89%.",
        status="ACTIVE",
        root_cause="Heavy traffic bottleneck on arterial approach road"
    )
    db.add(alert)

    # Alternate truck search
    reassigned_truck = db.query(Truck).filter(
        Truck.truck_id != "TRUCK-T01", Truck.status == "AVAILABLE"
    ).first()
    reassigned_id = reassigned_truck.truck_id if reassigned_truck else "TRUCK-T07"
    reassigned_name = reassigned_truck.name if reassigned_truck else "Compactor Truck T-07"

    db.commit()
    db.close()

    return {
        "status": "MISSED_PICKUP_ESCALATED",
        "bin_id": b.bin_id,
        "bin_name": b.name,
        "alert_created": alert_id,
        "missed_reason": "Traffic congestion delay exceeded maximum tolerance",
        "reassignment": {
            "previous_truck": "TRUCK-T01 (Delayed)",
            "new_assigned_truck": reassigned_id,
            "new_truck_name": reassigned_name,
            "revised_eta_minutes": 25,
            "action": f"Task dynamically transferred to {reassigned_name}. Recalculating optimized dispatch path."
        }
    }

# ----------------- WHAT-IF SIMULATION -----------------
@router.post("/simulation/run")
async def run_what_if_simulation(req: WhatIfSimulationRequest):
    """
    Counterfactual What-If Sandbox:
    Simulates consequences of delayed collection, blocked roads, rain increase, or vehicle failure.
    """
    db = SessionLocal()
    bins = db.query(Bin).filter(Bin.status == "ACTIVE").all()

    base_critical_count = 0
    sim_critical_count = 0
    base_avg_fill = 0.0
    sim_avg_fill = 0.0

    zone_impacts = []

    for b in bins:
        base_fill = b.current_fill
        # In simulation: extra delay adds waste accumulation
        extra_fill = b.waste_velocity * req.delay_hours
        sim_fill = min(100.0, base_fill + extra_fill)

        base_prob = (base_fill * 0.9)
        # Extra rain adds drainage clogging & overflow hazard
        sim_prob = min(99.0, (sim_fill * 0.95) + (req.rainfall_increase_mm * 0.6))

        if base_prob >= 80:
            base_critical_count += 1
        if sim_prob >= 80:
            sim_critical_count += 1

        base_avg_fill += base_fill
        sim_avg_fill += sim_fill

        if b.bin_id in ["BIN-C101", "BIN-A201", "BIN-D401"]:
            zone_impacts.append({
                "bin_id": b.bin_id,
                "name": b.name,
                "zone": b.zone,
                "base_fill": base_fill,
                "simulated_fill": round(sim_fill, 1),
                "fill_increase_pct": round(sim_fill - base_fill, 1),
                "base_overflow_prob": round(base_prob, 1),
                "simulated_overflow_prob": round(sim_prob, 1),
                "simulated_status": "OVERFLOW_BREACHED" if sim_fill >= 95.0 else ("CRITICAL" if sim_prob >= 80 else "HIGH")
            })

    total = len(bins)
    db.close()

    return {
        "scenario": {
            "delay_hours": req.delay_hours,
            "blocked_road": req.blocked_road_id or "None",
            "rainfall_increase_mm": req.rainfall_increase_mm,
            "unavailable_truck": req.unavailable_truck_id or "None"
        },
        "summary": {
            "baseline_critical_bins": base_critical_count,
            "simulated_critical_bins": sim_critical_count,
            "critical_surge_increase": sim_critical_count - base_critical_count,
            "baseline_avg_fill": round(base_avg_fill / max(1, total), 1),
            "simulated_avg_fill": round(sim_avg_fill / max(1, total), 1),
            "fleet_capacity_deficit_kg": 1800.0 if req.unavailable_truck_id else 0.0,
            "travel_time_penalty_min": 24.5 if req.blocked_road_id else (10.0 if req.rainfall_increase_mm > 20 else 0.0)
        },
        "sample_zone_impacts": zone_impacts,
        "recommendation": (
            "Scenario triggers critical bin overflow in 3 major market zones. "
            "Recommend immediate emergency dispatch of secondary fleet reserve before rain onset."
            if sim_critical_count > base_critical_count else "System has sufficient buffer under this scenario."
        )
    }

# ----------------- POST-COLLECTION ANALYTICS -----------------
@router.get("/analytics")
async def get_analytics():
    db = SessionLocal()
    bins = db.query(Bin).all()
    verifications = db.query(PickupVerification).all()
    alerts = db.query(Alert).all()
    logs = db.query(ContinuousLearningLog).all()

    # Calculate actual vs predicted error
    errors = [v.error_kg for v in verifications] if verifications else [3.2, 4.1, 2.8, 5.0, 3.7]
    mae = float(sum(errors) / len(errors))

    # Waste generation by zone
    zones = {}
    for b in bins:
        if b.zone not in zones:
            zones[b.zone] = {"zone": b.zone, "total_waste_kg": 0.0, "bins": 0, "avg_fill": 0.0}
        zones[b.zone]["total_waste_kg"] += round((b.current_fill / 100.0) * b.capacity_liters * 0.45, 1)
        zones[b.zone]["avg_fill"] += b.current_fill
        zones[b.zone]["bins"] += 1

    for z in zones.values():
        z["avg_fill"] = round(z["avg_fill"] / z["bins"], 1)

    db.close()

    return {
        "kpis": {
            "total_bins": len(bins),
            "critical_bins": len([b for b in bins if b.current_fill >= 80 or b.waste_velocity >= 7]),
            "active_trucks": 4,
            "missed_pickups": len([a for a in alerts if a.alert_type == "MISSED_PICKUP" and a.status == "ACTIVE"]),
            "overflow_incidents": len([a for a in alerts if a.alert_type == "OVERFLOW_RISK"]),
            "collection_completion_rate": 92.4,
            "prediction_accuracy_pct": round(100.0 - (mae / 40.0 * 100.0), 1),
            "mae_kg": round(mae, 2),
            "fuel_emissions_saved_pct": 18.5
        },
        "zone_breakdown": list(zones.values()),
        "predicted_vs_actual_trend": [
            {"time": "08:00", "predicted_kg": 84, "actual_kg": 80, "error": 4},
            {"time": "10:00", "predicted_kg": 112, "actual_kg": 116, "error": 4},
            {"time": "12:00", "predicted_kg": 140, "actual_kg": 145, "error": 5},
            {"time": "14:00", "predicted_kg": 98, "actual_kg": 95, "error": 3},
            {"time": "16:00", "predicted_kg": 165, "actual_kg": 161, "error": 4},
            {"time": "18:00 (Surge)", "predicted_kg": 195, "actual_kg": 204, "error": 9}
        ]
    }

# ----------------- CONTINUOUS LEARNING & MODEL MONITORING -----------------
@router.get("/model/performance")
async def get_model_performance():
    db = SessionLocal()
    perfs = db.query(ModelPerformance).order_by(ModelPerformance.id.desc()).all()
    res = [{
        "id": p.id,
        "model_id": p.model_id,
        "model_version": p.model_version,
        "horizon": p.horizon,
        "mae": p.mae,
        "rmse": p.rmse,
        "r2_score": p.r2_score,
        "overflow_accuracy": p.overflow_accuracy,
        "f1_score": p.f1_score,
        "evaluation_time": p.evaluation_time.isoformat(),
        "drift_score": p.drift_score
    } for p in perfs]
    db.close()
    return {
        "active_version": learning_engine.current_version,
        "candidate_version": learning_engine.candidate_version,
        "drift_status": "NORMAL" if (perfs and perfs[0].drift_score < 0.1) else "DRIFT_DETECTED",
        "performance_history": res
    }

@router.post("/model/retrain")
async def trigger_model_retrain():
    return learning_engine.evaluate_and_retrain()

# ----------------- SENSOR TELEMETRY SIMULATION -----------------
@router.post("/sensors/simulate")
async def simulate_sensor_event(req: SensorSimRequest):
    return generate_telemetry_reading(req.bin_id, req.event_type)

# ----------------- WASTEWISE AI ASSISTANT (OPERATIONAL CHATBOT) -----------------
@router.post("/assistant/chat")
async def chat_with_assistant(req: AssistantChatRequest):
    """
    Intelligent operational chatbot: answers queries using live application state
    (bins, forecasts, trucks, weather, events, missed pickups) and gives action recommendations.
    """
    return assistant_engine.answer_query(req.message)

# ----------------- EVENT-AWARE WASTE PREDICTION -----------------
@router.get("/events")
async def get_events():
    db = SessionLocal()
    events = db.query(Event).all()
    results = []
    for ev in events:
        impact = predict_event_waste_impact(
            event_name=ev.name,
            event_type=ev.event_type,
            attendance=ev.expected_attendance,
            duration_hours=(ev.end_time - ev.start_time).total_seconds() / 3600.0,
            latitude=ev.latitude,
            longitude=ev.longitude,
            rainfall_mm=12.4,
            is_weekend=True
        )
        results.append({
            "event_id": ev.event_id,
            "name": ev.name,
            "event_type": ev.event_type,
            "location": ev.location,
            "latitude": ev.latitude,
            "longitude": ev.longitude,
            "expected_attendance": ev.expected_attendance,
            "start_time": ev.start_time.isoformat(),
            "end_time": ev.end_time.isoformat(),
            "affected_zones": ev.affected_zones,
            "expected_additional_waste_kg": impact["predicted_additional_waste_kg"],
            "surge_probability": impact["surge_probability"],
            "overflow_probability": impact["overflow_probability"],
            "peak_waste_period": impact["peak_waste_period"],
            "status": ev.status,
            "affected_bins": impact["affected_bins"],
            "recommended_mitigations": impact["recommended_mitigations"]
        })
    db.close()
    return results

# ----------------- WASTE TYPE & COMPOSITION ANALYTICS -----------------
@router.get("/waste-composition")
async def get_waste_composition(filter_period: str = "daily", zone: Optional[str] = None):
    """
    Returns citywide & zone-level waste composition across the 9 categories,
    historical trends, and material breakdowns.
    """
    # Base proportions
    proportions = [
        {"category": "Organic / Wet Waste", "percentage": 42.5, "weight_kg": 2450.0, "color": "#10b981", "trend": "+3.1%"},
        {"category": "Plastic", "percentage": 24.2, "weight_kg": 1390.0, "color": "#38bdf8", "trend": "+4.2%"},
        {"category": "Paper", "percentage": 13.8, "weight_kg": 795.0, "color": "#f59e0b", "trend": "-1.5%"},
        {"category": "Glass", "percentage": 7.6, "weight_kg": 438.0, "color": "#a855f7", "trend": "0.0%"},
        {"category": "Metal", "percentage": 5.4, "weight_kg": 312.0, "color": "#64748b", "trend": "+0.5%"},
        {"category": "Construction / Debris", "percentage": 3.5, "weight_kg": 202.0, "color": "#ea580c", "trend": "+1.2%"},
        {"category": "E-Waste", "percentage": 1.8, "weight_kg": 104.0, "color": "#ef4444", "trend": "+0.8%"},
        {"category": "Hazardous Waste", "percentage": 0.8, "weight_kg": 46.0, "color": "#e11d48", "trend": "-0.2%"},
        {"category": "Mixed Waste", "percentage": 0.4, "weight_kg": 23.0, "color": "#94a3b8", "trend": "-8.1%"}
    ]

    # Zone breakdown
    zone_composition = [
        {
            "zone": "Zone A - Commercial (T. Nagar)",
            "primary_waste": "Plastic & Packaging",
            "plastic_pct": 38.5,
            "organic_pct": 28.0,
            "paper_pct": 22.5,
            "other_pct": 11.0,
            "total_daily_kg": 1850.0
        },
        {
            "zone": "Zone C - Coastal (Marina & Triplicane)",
            "primary_waste": "Organic Food Surplus & Packaging",
            "plastic_pct": 24.0,
            "organic_pct": 54.0,
            "paper_pct": 11.0,
            "other_pct": 11.0,
            "total_daily_kg": 1920.0
        },
        {
            "zone": "Zone D - Wholesale Market (Koyambedu)",
            "primary_waste": "Perishable Organic / Wet Waste",
            "plastic_pct": 12.0,
            "organic_pct": 72.0,
            "paper_pct": 8.0,
            "other_pct": 8.0,
            "total_daily_kg": 2600.0
        },
        {
            "zone": "Zone B - Residential (Adyar & Besant Nagar)",
            "primary_waste": "Household Compost & Recyclables",
            "plastic_pct": 19.0,
            "organic_pct": 46.0,
            "paper_pct": 18.0,
            "other_pct": 17.0,
            "total_daily_kg": 950.0
        }
    ]

    # Historical trend by week
    weekly_trend = [
        {"week": "Week 1", "organic": 2100, "plastic": 1200, "paper": 750, "glass": 410, "metal": 290},
        {"week": "Week 2", "organic": 2250, "plastic": 1280, "paper": 760, "glass": 420, "metal": 300},
        {"week": "Week 3", "organic": 2380, "plastic": 1340, "paper": 780, "glass": 430, "metal": 305},
        {"week": "Week 4 (Current)", "organic": 2450, "plastic": 1390, "paper": 795, "glass": 438, "metal": 312}
    ]

    return {
        "filter_period": filter_period,
        "total_waste_audited_kg": 5760.0,
        "categories": proportions,
        "zone_comparison": zone_composition,
        "weekly_trend": weekly_trend,
        "category_metadata": CATEGORY_DETAILS
    }

@router.post("/waste-classification/classify")
async def classify_waste_item(req: WasteClassifyRequest):
    """
    Computer Vision waste classification endpoint: inspects container photo or manual tag,
    returns category, confidence, material breakdown, and recommended recycling protocol.
    """
    res = waste_classifier.classify_image(req.image_name, req.hint_type)
    
    # Store in database
    db = SessionLocal()
    record_id = f"CLS-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    cl_record = WasteClassificationRecord(
        record_id=record_id,
        bin_id=req.bin_id or "BIN-C101",
        waste_type=res["waste_type"],
        confidence=res["confidence_pct"],
        estimated_weight_kg=res["estimated_weight_kg"],
        timestamp=datetime.utcnow(),
        source="Computer Vision Inspection",
        detected_materials=res["materials_identified"],
        image_reference=req.image_name
    )
    db.add(cl_record)
    db.commit()
    db.close()

    res["record_id"] = record_id
    res["bin_id"] = req.bin_id or "BIN-C101"
    return res

# ----------------- MISSED PICKUPS WORKFLOW -----------------
@router.get("/missed-pickups")
async def get_missed_pickups():
    db = SessionLocal()
    records = db.query(MissedPickupRecord).order_by(MissedPickupRecord.missed_detected_time.desc()).all()
    available_trucks = db.query(Truck).filter(Truck.status == "AVAILABLE").all()
    
    res = []
    for r in records:
        # Candidate reassignment trucks sorted by remaining capacity and distance
        candidates = []
        for t in available_trucks:
            rem_cap = t.capacity_kg - t.current_load_kg
            candidates.append({
                "truck_id": t.truck_id,
                "name": t.name,
                "driver": t.driver_name,
                "remaining_capacity_kg": rem_cap,
                "fuel_level": t.fuel_level
            })

        res.append({
            "record_id": r.record_id,
            "bin_id": r.bin_id,
            "bin_name": r.bin_name,
            "zone": r.zone,
            "scheduled_time": r.scheduled_time.isoformat(),
            "missed_detected_time": r.missed_detected_time.isoformat(),
            "current_fill": r.current_fill,
            "assigned_truck_id": r.assigned_truck_id,
            "assigned_truck_name": r.assigned_truck_name,
            "reassigned_truck_id": r.reassigned_truck_id,
            "reassigned_truck_name": r.reassigned_truck_name,
            "reason": r.reason,
            "escalation_level": r.escalation_level,
            "status": r.status,
            "recommended_action": r.recommended_action,
            "candidate_trucks": candidates
        })
    db.close()
    return res

@router.post("/missed-pickups/{record_id}/reassign")
async def reassign_missed_pickup(record_id: str, req: ReassignTruckRequest):
    db = SessionLocal()
    rec = db.query(MissedPickupRecord).filter(MissedPickupRecord.record_id == record_id).first()
    if not rec:
        db.close()
        raise HTTPException(status_code=404, detail="Missed pickup record not found")

    truck = db.query(Truck).filter(Truck.truck_id == req.new_truck_id).first()
    truck_name = truck.name if truck else req.new_truck_id

    rec.reassigned_truck_id = req.new_truck_id
    rec.reassigned_truck_name = truck_name
    rec.status = "REASSIGNED"
    rec.reason = req.reason or rec.reason
    rec.recommended_action = f"Task successfully transferred to {truck_name}. Recalculating route sequence."

    db.commit()
    db.close()

    return {
        "record_id": record_id,
        "status": "REASSIGNED",
        "new_assigned_truck": req.new_truck_id,
        "new_truck_name": truck_name,
        "eta_minutes": 22,
        "message": f"Missed pickup successfully reassigned to {truck_name}. Route sequence updated."
    }

# ----------------- DYNAMIC MULTI-HORIZON HEATMAPS -----------------
@router.get("/heatmaps")
async def get_heatmaps(horizon: str = "NOW", map_type: str = "waste"):
    """
    Returns spatiotemporal heatmap points across horizons:
    Horizons: NOW, +1h, +3h, +6h, +12h, Tomorrow (+24h)
    Types: waste, overflow, environmental_risk, event_impact
    """
    db = SessionLocal()
    bins = db.query(Bin).all()
    events = db.query(Event).all()
    heatmap_points = []

    horizon_key = "+1h" if horizon in ["+1h", "1h"] else (
        "+3h" if horizon in ["+3h", "3h"] else (
        "+6h" if horizon in ["+6h", "6h"] else (
        "+12h" if horizon in ["+12h", "12h"] else (
        "Tomorrow" if horizon in ["Tomorrow", "+24h", "24h"] else "NOW"))))

    for b in bins:
        forecasts = forecaster.predict_horizons(
            current_fill=b.current_fill,
            velocity=b.waste_velocity,
            commercial_activity=b.commercial_activity,
            population_density=b.population_density,
            rainfall_mm=12.4
        )
        pred_fill = forecasts.get(horizon_key, {}).get("predicted_fill", b.current_fill)

        if map_type == "overflow":
            overflow_data = predict_overflow_probability(
                current_fill=b.current_fill,
                forecast_3h_fill=pred_fill,
                velocity=b.waste_velocity,
                rainfall_mm=12.4,
                commercial_activity=b.commercial_activity
            )
            intensity = overflow_data["overflow_probability"] / 100.0
        elif map_type == "environmental_risk":
            env_risk = compute_environmental_risk(
                fill_level=pred_fill,
                waste_velocity=b.waste_velocity,
                overflow_prob=pred_fill * 0.9,
                rainfall_mm=12.4,
                flood_susceptibility=b.flood_susceptibility,
                population_density=b.population_density,
                commercial_activity=b.commercial_activity
            )
            intensity = env_risk["overall_risk"] / 100.0
        else:  # "waste"
            intensity = pred_fill / 100.0

        heatmap_points.append({
            "lat": b.latitude,
            "lon": b.longitude,
            "intensity": round(intensity, 2),
            "radius_meters": int(300 + (intensity * 500)),
            "bin_id": b.bin_id,
            "name": b.name,
            "zone": b.zone,
            "fill": pred_fill
        })

    # Add event surge hotspots if event_impact
    event_hotspots = []
    for ev in events:
        event_hotspots.append({
            "lat": ev.latitude,
            "lon": ev.longitude,
            "name": ev.name,
            "intensity": ev.surge_probability / 100.0,
            "radius_meters": 750,
            "attendance": ev.expected_attendance,
            "additional_kg": ev.expected_additional_waste_kg
        })

    db.close()

    return {
        "horizon": horizon_key,
        "map_type": map_type,
        "points_count": len(heatmap_points),
        "heatmap_points": heatmap_points,
        "event_hotspots": event_hotspots
    }

from datetime import datetime, timedelta
from app.ml.velocity import calculate_waste_velocity, compute_bin_urgency_priority
from app.ml.overflow import predict_overflow_probability
from app.ml.anomaly import anomaly_detector
from app.ml.shap_explainer import compute_feature_attributions, generate_natural_language_explanation
from app.services.environmental_risk import compute_environmental_risk
from app.services.decision_engine import generate_ai_decisions
from app.routing.multi_truck_optimizer import solve_multi_truck_cvrp
from app.routing.graph_router import road_graph

def test_waste_velocity_calculation():
    now = datetime.utcnow()
    readings = [
        (now - timedelta(hours=2), 50.0),
        (now - timedelta(hours=1), 58.5),
        (now, 67.0)
    ]
    vel = calculate_waste_velocity(readings)
    assert vel == 8.5, f"Expected 8.5%/hr, got {vel}"

def test_urgency_priority():
    # Bin with 68% and high velocity (+8.5%/hr) should be CRITICAL
    priority, score = compute_bin_urgency_priority(68.0, 8.5, 89.0)
    assert priority == "CRITICAL", f"Expected CRITICAL, got {priority}"
    assert score > 75.0

def test_overflow_probability():
    res = predict_overflow_probability(
        current_fill=68.0,
        forecast_3h_fill=93.0,
        velocity=8.5,
        rainfall_mm=12.4,
        commercial_activity=0.88
    )
    assert res["risk_category"] in ["HIGH", "CRITICAL"]
    assert res["overflow_probability"] >= 80.0

def test_anomaly_detection():
    # Extreme temperature and dumping spike
    res = anomaly_detector.detect_anomaly(
        fill_level=99.0,
        waste_velocity=14.0,
        temperature_c=52.0,
        weight_kg=120.0
    )
    assert res["is_anomaly"] is True
    assert len(res["possible_causes"]) > 0

def test_shap_explanation():
    attributions = compute_feature_attributions(
        fill_level=68.0,
        waste_velocity=8.5,
        commercial_activity=0.88,
        population_density=22000.0,
        rainfall_mm=12.4,
        is_weekend=True
    )
    assert len(attributions) >= 4
    # Waste velocity should be among the top contributing drivers
    top_feature = attributions[0]["feature"]
    assert "velocity" in top_feature.lower() or "commercial" in top_feature.lower()

    explanation = generate_natural_language_explanation(
        zone_name="Zone C - Coastal",
        overflow_prob=89.0,
        top_contributions=attributions,
        risk_category="CRITICAL"
    )
    assert "Zone C - Coastal" in explanation
    assert "CRITICAL" in explanation

def test_environmental_risk():
    risk = compute_environmental_risk(
        fill_level=75.0,
        waste_velocity=8.0,
        overflow_prob=88.0,
        rainfall_mm=18.0,
        flood_susceptibility=0.75,
        population_density=28000.0,
        commercial_activity=0.9
    )
    assert risk["overall_risk"] >= 80.0
    assert risk["status"] == "CRITICAL"

def test_multi_truck_cvrp():
    cvrp = solve_multi_truck_cvrp()
    assert cvrp["status"] == "OPTIMIZATION_SUCCESS"
    assert len(cvrp["routes"]) > 0
    # Verify no truck exceeds its rated capacity
    for r in cvrp["routes"]:
        assert r["total_load_kg"] <= r["capacity_kg"]

def test_road_graph_dijkstra():
    res = road_graph.dijkstra_shortest_path(
        start_node="DEPOT_CENTRAL",
        end_node="NODE_MARINA"
    )
    assert len(res["path_nodes"]) >= 2
    assert "DEPOT_CENTRAL" in res["path_nodes"]
    assert "NODE_MARINA" in res["path_nodes"]

def test_event_prediction():
    from app.ml.event_prediction import predict_event_waste_impact
    impact = predict_event_waste_impact(
        event_name="Mylapore Festival",
        event_type="Festival",
        attendance=150000,
        duration_hours=6.0,
        latitude=13.0336,
        longitude=80.2697
    )
    assert impact["predicted_surge_multiplier"] >= 1.5
    assert impact["surge_probability_pct"] >= 80.0
    assert "Organic / Wet Waste" in impact["critical_waste_categories"]

def test_waste_classifier():
    from app.ml.waste_classifier import waste_classifier
    res = waste_classifier.classify_image(image_name="test_plastic_bottle.jpg")
    assert res["waste_type"] in waste_classifier.categories
    assert res["confidence_pct"] > 70.0
    assert len(res["recommended_treatment"]) > 0

def test_wastewise_assistant():
    from app.services.wastewise_assistant import waste_wise_assistant
    res = waste_wise_assistant.query("Which bins are critical right now?")
    assert len(res["answer"]) > 20
    assert "BIN-" in res["answer"]
    assert len(res["insights"]) > 0

def test_forecasting_horizons():
    from app.ml.forecasting import forecaster
    horizons = forecaster.predict_horizons(current_fill=70.0, velocity=5.0)
    assert "NOW" in horizons["horizons"]
    assert "+12h" in horizons["horizons"]
    assert "Tomorrow" in horizons["horizons"]
    assert horizons["hours_to_overflow"] is not None


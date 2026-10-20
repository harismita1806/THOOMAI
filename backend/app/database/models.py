from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, create_engine
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Bin(Base):
    __tablename__ = "bins"

    bin_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    zone = Column(String(50), index=True)  # e.g., "Zone A - Commercial", "Zone C - Coastal", etc.
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_liters = Column(Float, default=1000.0)
    current_fill = Column(Float, default=0.0)  # 0 to 100%
    previous_fill = Column(Float, default=0.0)
    waste_velocity = Column(Float, default=0.0)  # % / hour
    waste_type = Column(String(50), default="Mixed Solid Waste")  # Organic, Recyclable, Commercial, Hazardous
    status = Column(String(50), default="ACTIVE")  # ACTIVE, MAINTENANCE, OFFLINE
    address = Column(String(200), nullable=True)
    population_density = Column(Float, default=15000.0)  # people per sq km
    commercial_activity = Column(Float, default=0.5)  # 0.0 to 1.0
    flood_susceptibility = Column(Float, default=0.2)  # 0.0 to 1.0
    last_collection_time = Column(DateTime, default=datetime.utcnow)
    recommended_frequency = Column(String(50), default="1/day")
    
    # Relationships
    readings = relationship("SensorReading", back_populates="bin", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="bin", cascade="all, delete-orphan")
    tasks = relationship("CollectionTask", back_populates="bin")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    reading_id = Column(Integer, primary_key=True, autoincrement=True)
    bin_id = Column(String(50), ForeignKey("bins.bin_id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    fill_level = Column(Float, nullable=False)  # 0-100%
    weight_kg = Column(Float, default=0.0)
    temperature_c = Column(Float, default=30.0)
    battery_level = Column(Float, default=95.0)  # %
    sensor_status = Column(String(50), default="OK")  # OK, FAULT, SPIKE, DRIFT
    
    bin = relationship("Bin", back_populates="readings")

class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(Integer, primary_key=True, autoincrement=True)
    bin_id = Column(String(50), ForeignKey("bins.bin_id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    horizon = Column(String(20), nullable=False)  # "NOW", "+30m", "+1h", "+3h", "+6h"
    predicted_fill = Column(Float, nullable=False)
    predicted_waste_kg = Column(Float, default=0.0)
    overflow_probability = Column(Float, default=0.0)  # 0 to 100%
    confidence = Column(String(20), default="HIGH")  # HIGH, MEDIUM, LOW
    model_version = Column(String(50), default="xgb-v1.0.0")
    shap_top_features = Column(Text, nullable=True)  # JSON string of contributing features
    explanation = Column(Text, nullable=True)

    bin = relationship("Bin", back_populates="predictions")

class Truck(Base):
    __tablename__ = "trucks"

    truck_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    driver_name = Column(String(100), default="Unassigned")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_kg = Column(Float, default=5000.0)
    current_load_kg = Column(Float, default=0.0)
    status = Column(String(50), default="AVAILABLE")  # AVAILABLE, EN_ROUTE, COLLECTING, MAINTENANCE
    fuel_level = Column(Float, default=90.0)  # %
    assigned_route_id = Column(String(50), nullable=True)

class CollectionTask(Base):
    __tablename__ = "collection_tasks"

    task_id = Column(String(50), primary_key=True, index=True)
    bin_id = Column(String(50), ForeignKey("bins.bin_id"), nullable=False, index=True)
    truck_id = Column(String(50), ForeignKey("trucks.truck_id"), nullable=True)
    priority = Column(String(20), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW
    priority_score = Column(Float, default=50.0)
    scheduled_time = Column(DateTime, default=datetime.utcnow)
    deadline = Column(DateTime, nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, EN_ROUTE, ARRIVED, COLLECTED, VERIFIED, MISSED, REASSIGNED
    created_at = Column(DateTime, default=datetime.utcnow)
    missed_reason = Column(String(200), nullable=True)

    bin = relationship("Bin", back_populates="tasks")

class PickupVerification(Base):
    __tablename__ = "pickup_verifications"

    verification_id = Column(String(50), primary_key=True, index=True)
    task_id = Column(String(50), nullable=True, index=True)
    bin_id = Column(String(50), nullable=False, index=True)
    truck_id = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    gps_verified = Column(Boolean, default=False)
    gps_distance_meters = Column(Float, default=0.0)
    sensor_verified = Column(Boolean, default=False)
    pre_fill_level = Column(Float, nullable=False)
    post_fill_level = Column(Float, nullable=False)
    driver_confirmed = Column(Boolean, default=False)
    qr_verified = Column(Boolean, default=False)
    verification_status = Column(String(50), default="VERIFIED")  # VERIFIED, PARTIAL, REJECTED
    actual_waste_kg = Column(Float, default=0.0)
    predicted_waste_kg = Column(Float, default=0.0)
    error_kg = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)

class TrafficSegment(Base):
    __tablename__ = "traffic_segments"

    road_id = Column(String(50), primary_key=True, index=True)
    road_name = Column(String(100), nullable=False)
    start_lat = Column(Float, nullable=False)
    start_lon = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lon = Column(Float, nullable=False)
    current_speed_kmh = Column(Float, default=35.0)
    freeflow_speed_kmh = Column(Float, default=45.0)
    congestion_level = Column(String(20), default="LOW")  # LOW, MODERATE, HIGH, SEVERE
    predicted_congestion_15m = Column(String(20), default="LOW")
    flood_risk = Column(Float, default=0.1)  # 0 to 1.0
    is_blocked = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class WeatherRecord(Base):
    __tablename__ = "weather_records"

    record_id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    temperature_c = Column(Float, default=31.0)
    rainfall_mm = Column(Float, default=0.0)
    humidity_pct = Column(Float, default=65.0)
    precipitation_prob = Column(Float, default=10.0)
    weather_condition = Column(String(50), default="Clear")
    flood_warning = Column(Boolean, default=False)

class EnvironmentalRisk(Base):
    __tablename__ = "environmental_risks"

    risk_id = Column(Integer, primary_key=True, autoincrement=True)
    bin_id = Column(String(50), nullable=False, index=True)
    zone = Column(String(50), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    waste_risk = Column(Float, default=0.0)  # 0-100
    flood_risk = Column(Float, default=0.0)  # 0-100
    population_exposure = Column(Float, default=0.0)  # 0-100
    overall_risk = Column(Float, default=0.0)  # 0-100
    risk_status = Column(String(20), default="LOW")  # LOW, MODERATE, HIGH, CRITICAL

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String(50), primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False)  # OVERFLOW_RISK, MISSED_PICKUP, FLOOD_RISK, TRAFFIC_WARNING, SENSOR_FAILURE, ANOMALY, TRUCK_BREAKDOWN, CAPACITY_WARNING
    severity = Column(String(20), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    location = Column(String(100), nullable=True)
    bin_id = Column(String(50), nullable=True)
    truck_id = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, RESOLVED
    root_cause = Column(String(200), nullable=True)

class RouteRecord(Base):
    __tablename__ = "routes"

    route_id = Column(String(50), primary_key=True, index=True)
    truck_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    total_distance_km = Column(Float, default=0.0)
    total_duration_min = Column(Float, default=0.0)
    stops_count = Column(Integer, default=0)
    route_polyline_json = Column(Text, nullable=True)  # JSON coordinates array
    stops_json = Column(Text, nullable=True)  # JSON ordered stops
    status = Column(String(20), default="ACTIVE")  # ACTIVE, COMPLETED, CANCELLED

class ModelPerformance(Base):
    __tablename__ = "model_performance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_id = Column(String(50), default="xgb-forecaster")
    model_version = Column(String(50), nullable=False)
    horizon = Column(String(20), default="+1h")
    mae = Column(Float, default=0.0)
    rmse = Column(Float, default=0.0)
    r2_score = Column(Float, default=0.0)
    overflow_accuracy = Column(Float, default=0.0)
    f1_score = Column(Float, default=0.0)
    evaluation_time = Column(DateTime, default=datetime.utcnow)
    drift_score = Column(Float, default=0.0)

class ContinuousLearningLog(Base):
    __tablename__ = "continuous_learning_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    verification_id = Column(String(50), nullable=True)
    bin_id = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    predicted_fill = Column(Float, nullable=False)
    actual_fill = Column(Float, nullable=False)
    error_diff = Column(Float, nullable=False)
    detected_pattern = Column(String(200), nullable=True)
    used_in_retraining = Column(Boolean, default=False)

class Event(Base):
    __tablename__ = "events"

    event_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    event_type = Column(String(50), default="Festival")  # Festival, Concert, Wholesale Market, Public Gathering, Sports
    location = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    expected_attendance = Column(Integer, default=5000)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    affected_zones = Column(String(150), default="Zone C - Coastal")
    expected_additional_waste_kg = Column(Float, default=350.0)
    surge_probability = Column(Float, default=85.0)  # 0 to 100%
    peak_waste_period = Column(String(50), default="7:00 PM - 10:00 PM")
    status = Column(String(20), default="SCHEDULED")  # SCHEDULED, ACTIVE, CONCLUDED
    mitigation_action = Column(Text, nullable=True)

class WasteClassificationRecord(Base):
    __tablename__ = "waste_classifications"

    record_id = Column(String(50), primary_key=True, index=True)
    bin_id = Column(String(50), nullable=True, index=True)
    waste_type = Column(String(50), nullable=False)  # Organic, Plastic, Paper, Glass, Metal, E-Waste, Hazardous, Mixed, Construction
    confidence = Column(Float, default=92.5)  # 0 to 100%
    estimated_weight_kg = Column(Float, default=15.0)
    timestamp = Column(DateTime, default=datetime.utcnow)
    source = Column(String(50), default="Camera / Computer Vision")  # Camera, Sensor, Manual Inspection
    detected_materials = Column(Text, nullable=True)  # JSON or comma-separated details
    image_reference = Column(String(200), nullable=True)

class MissedPickupRecord(Base):
    __tablename__ = "missed_pickups"

    record_id = Column(String(50), primary_key=True, index=True)
    bin_id = Column(String(50), nullable=False, index=True)
    bin_name = Column(String(100), nullable=False)
    zone = Column(String(50), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    missed_detected_time = Column(DateTime, default=datetime.utcnow)
    current_fill = Column(Float, nullable=False)
    assigned_truck_id = Column(String(50), nullable=True)
    assigned_truck_name = Column(String(100), nullable=True)
    reassigned_truck_id = Column(String(50), nullable=True)
    reassigned_truck_name = Column(String(100), nullable=True)
    reason = Column(String(200), default="Traffic Congestion on Approach Artery")
    escalation_level = Column(String(20), default="CRITICAL")  # MODERATE, HIGH, CRITICAL
    status = Column(String(20), default="PENDING_REASSIGNMENT")  # PENDING_REASSIGNMENT, REASSIGNED, RESOLVED
    recommended_action = Column(Text, nullable=True)

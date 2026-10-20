import random
from datetime import datetime, timedelta
from app.database.models import (
    Bin, SensorReading, Truck, CollectionTask, TrafficSegment, 
    WeatherRecord, Alert, ModelPerformance, Event, WasteClassificationRecord, MissedPickupRecord
)
from app.database.session import SessionLocal, init_db

def seed_database():
    init_db()
    db = SessionLocal()

    seed_events_and_classifications(db)

    # Check if already seeded bins
    if db.query(Bin).first():
        db.close()
        return

    # Urban center: Chennai (13.0827° N, 80.2707° E)
    bins_data = [
        {
            "bin_id": "BIN-C101",
            "name": "Marina Beach Promenade - North",
            "zone": "Zone C - Coastal",
            "latitude": 13.0500,
            "longitude": 80.2824,
            "capacity_liters": 1200.0,
            "current_fill": 68.0,
            "previous_fill": 59.5,
            "waste_velocity": 8.5,  # % per hour - surging rapidly!
            "waste_type": "Organic & Food Stalls",
            "status": "ACTIVE",
            "address": "Kamarajar Promenade, Triplicane, Chennai",
            "population_density": 22000.0,
            "commercial_activity": 0.88,
            "flood_susceptibility": 0.75,
            "recommended_frequency": "3/day"
        },
        {
            "bin_id": "BIN-C102",
            "name": "Triplicane High Road Market",
            "zone": "Zone C - Coastal",
            "latitude": 13.0585,
            "longitude": 80.2750,
            "capacity_liters": 1500.0,
            "current_fill": 72.0,
            "previous_fill": 64.0,
            "waste_velocity": 8.0,
            "waste_type": "Mixed Commercial & Plastic",
            "status": "ACTIVE",
            "address": "Triplicane High Road, Chennai",
            "population_density": 28000.0,
            "commercial_activity": 0.92,
            "flood_susceptibility": 0.65,
            "recommended_frequency": "3/day"
        },
        {
            "bin_id": "BIN-A201",
            "name": "T. Nagar Ranganathan St. Hub",
            "zone": "Zone A - Commercial",
            "latitude": 13.0405,
            "longitude": 80.2337,
            "capacity_liters": 2000.0,
            "current_fill": 84.0,
            "previous_fill": 81.0,
            "waste_velocity": 3.0,
            "waste_type": "Retail & Packaging",
            "status": "ACTIVE",
            "address": "Ranganathan Street, T. Nagar, Chennai",
            "population_density": 31000.0,
            "commercial_activity": 0.95,
            "flood_susceptibility": 0.40,
            "recommended_frequency": "2/day"
        },
        {
            "bin_id": "BIN-A202",
            "name": "Panagal Park Commercial Arcade",
            "zone": "Zone A - Commercial",
            "latitude": 13.0430,
            "longitude": 80.2380,
            "capacity_liters": 1500.0,
            "current_fill": 45.0,
            "previous_fill": 42.0,
            "waste_velocity": 3.0,
            "waste_type": "Mixed Solid Waste",
            "status": "ACTIVE",
            "address": "Prakasam Rd, T. Nagar, Chennai",
            "population_density": 25000.0,
            "commercial_activity": 0.85,
            "flood_susceptibility": 0.35,
            "recommended_frequency": "2/day"
        },
        {
            "bin_id": "BIN-B301",
            "name": "Adyar Gandhi Nagar Colony",
            "zone": "Zone B - Residential",
            "latitude": 13.0067,
            "longitude": 80.2570,
            "capacity_liters": 1000.0,
            "current_fill": 52.0,
            "previous_fill": 50.5,
            "waste_velocity": 1.5,
            "waste_type": "Household Compost & Recyclables",
            "status": "ACTIVE",
            "address": "Gandhi Nagar 2nd Main Rd, Adyar, Chennai",
            "population_density": 12000.0,
            "commercial_activity": 0.20,
            "flood_susceptibility": 0.50,
            "recommended_frequency": "1/day"
        },
        {
            "bin_id": "BIN-B302",
            "name": "Besant Nagar 4th Avenue",
            "zone": "Zone B - Residential",
            "latitude": 13.0002,
            "longitude": 80.2675,
            "capacity_liters": 1000.0,
            "current_fill": 38.0,
            "previous_fill": 37.0,
            "waste_velocity": 1.0,
            "waste_type": "Household Waste",
            "status": "ACTIVE",
            "address": "4th Avenue, Besant Nagar, Chennai",
            "population_density": 11000.0,
            "commercial_activity": 0.30,
            "flood_susceptibility": 0.60,
            "recommended_frequency": "1/day"
        },
        {
            "bin_id": "BIN-D401",
            "name": "Koyambedu Wholesale Vegetable Market Gate 3",
            "zone": "Zone D - Wholesale Market",
            "latitude": 13.0694,
            "longitude": 80.1948,
            "capacity_liters": 3000.0,
            "current_fill": 78.0,
            "previous_fill": 70.0,
            "waste_velocity": 8.0,
            "waste_type": "Perishable Organic Waste",
            "status": "ACTIVE",
            "address": "Market Road, Koyambedu, Chennai",
            "population_density": 18000.0,
            "commercial_activity": 0.98,
            "flood_susceptibility": 0.45,
            "recommended_frequency": "3/day"
        },
        {
            "bin_id": "BIN-D402",
            "name": "Koyambedu Fruit Market Terminal",
            "zone": "Zone D - Wholesale Market",
            "latitude": 13.0720,
            "longitude": 80.1915,
            "capacity_liters": 2500.0,
            "current_fill": 62.0,
            "previous_fill": 56.0,
            "waste_velocity": 6.0,
            "waste_type": "Organic & Wood Crates",
            "status": "ACTIVE",
            "address": "Fruit Market Complex, Koyambedu, Chennai",
            "population_density": 16000.0,
            "commercial_activity": 0.90,
            "flood_susceptibility": 0.40,
            "recommended_frequency": "3/day"
        },
        {
            "bin_id": "BIN-E501",
            "name": "George Town Parry's Corner",
            "zone": "Zone E - Historic Wholesale",
            "latitude": 13.0891,
            "longitude": 80.2870,
            "capacity_liters": 1500.0,
            "current_fill": 82.0,
            "previous_fill": 80.0,
            "waste_velocity": 2.0,
            "waste_type": "Commercial & Hardware Waste",
            "status": "ACTIVE",
            "address": "NSC Bose Road, George Town, Chennai",
            "population_density": 35000.0,
            "commercial_activity": 0.94,
            "flood_susceptibility": 0.55,
            "recommended_frequency": "2/day"
        },
        {
            "bin_id": "BIN-E502",
            "name": "Central Railway Station Forecourt",
            "zone": "Zone E - Historic Wholesale",
            "latitude": 13.0827,
            "longitude": 80.2755,
            "capacity_liters": 2000.0,
            "current_fill": 65.0,
            "previous_fill": 61.0,
            "waste_velocity": 4.0,
            "waste_type": "Passenger Transit Waste",
            "status": "ACTIVE",
            "address": "EVR Periyar Salai, Park Town, Chennai",
            "population_density": 30000.0,
            "commercial_activity": 0.89,
            "flood_susceptibility": 0.30,
            "recommended_frequency": "2/day"
        }
    ]

    for b in bins_data:
        bin_obj = Bin(**b)
        db.add(bin_obj)
        
        # Add historical sensor readings for last 48 hours to power time-series ML
        now = datetime.utcnow()
        for h in range(48, -1, -3):
            t = now - timedelta(hours=h)
            # simulate fill curve
            base_fill = max(10.0, (b["current_fill"] - (h * b["waste_velocity"] * 0.4)) % 95)
            db.add(SensorReading(
                bin_id=b["bin_id"],
                timestamp=t,
                fill_level=round(base_fill, 1),
                weight_kg=round(base_fill * 4.2, 1),
                temperature_c=round(29.0 + random.uniform(-2, 4), 1),
                battery_level=round(98.0 - (h * 0.05), 1),
                sensor_status="OK"
            ))

    # Trucks fleet
    trucks_data = [
        {
            "truck_id": "TRUCK-T07",
            "name": "Compactor Truck T-07 (Heavy Duty)",
            "driver_name": "Murugan R. (ID: DRV-801)",
            "latitude": 13.0600,
            "longitude": 80.2650,
            "capacity_kg": 6000.0,
            "current_load_kg": 1800.0,
            "status": "AVAILABLE",
            "fuel_level": 88.0
        },
        {
            "truck_id": "TRUCK-T01",
            "name": "Medium Collector T-01",
            "driver_name": "Karthik S. (ID: DRV-722)",
            "latitude": 13.0450,
            "longitude": 80.2400,
            "capacity_kg": 4000.0,
            "current_load_kg": 1200.0,
            "status": "AVAILABLE",
            "fuel_level": 92.0
        },
        {
            "truck_id": "TRUCK-T02",
            "name": "Medium Collector T-02",
            "driver_name": "Senthil Kumar (ID: DRV-650)",
            "latitude": 13.0750,
            "longitude": 80.2050,
            "capacity_kg": 4500.0,
            "current_load_kg": 2100.0,
            "status": "AVAILABLE",
            "fuel_level": 76.0
        },
        {
            "truck_id": "TRUCK-T03",
            "name": "Rapid Response T-03",
            "driver_name": "Anand V. (ID: DRV-412)",
            "latitude": 13.0100,
            "longitude": 80.2500,
            "capacity_kg": 3000.0,
            "current_load_kg": 500.0,
            "status": "AVAILABLE",
            "fuel_level": 95.0
        }
    ]

    for t in trucks_data:
        db.add(Truck(**t))

    # Traffic Segments with simulated and predicted congestion
    traffic_data = [
        {
            "road_id": "RD-ANNA-SALAI",
            "road_name": "Anna Salai Arterial Highway",
            "start_lat": 13.0600,
            "start_lon": 80.2550,
            "end_lat": 13.0800,
            "end_lon": 80.2700,
            "current_speed_kmh": 32.0,
            "freeflow_speed_kmh": 50.0,
            "congestion_level": "MODERATE",
            "predicted_congestion_15m": "HIGH",  # Predicted evening congestion spike
            "flood_risk": 0.20,
            "is_blocked": False
        },
        {
            "road_id": "RD-KAMARAJAR-SALAI",
            "road_name": "Kamarajar Salai (Beach Road)",
            "start_lat": 13.0450,
            "start_lon": 80.2800,
            "end_lat": 13.0650,
            "end_lon": 80.2850,
            "current_speed_kmh": 40.0,
            "freeflow_speed_kmh": 45.0,
            "congestion_level": "LOW",
            "predicted_congestion_15m": "LOW",
            "flood_risk": 0.65,  # High flood/storm risk near shoreline
            "is_blocked": False
        },
        {
            "road_id": "RD-POONAMALLEE",
            "road_name": "Poonamallee High Road (Near Market)",
            "start_lat": 13.0750,
            "start_lon": 80.2000,
            "end_lat": 13.0820,
            "end_lon": 80.2300,
            "current_speed_kmh": 18.0,
            "freeflow_speed_kmh": 40.0,
            "congestion_level": "HIGH",
            "predicted_congestion_15m": "SEVERE",
            "flood_risk": 0.35,
            "is_blocked": False
        },
        {
            "road_id": "RD-GANDHI-MANDAPAM",
            "road_name": "Gandhi Mandapam Road",
            "start_lat": 13.0080,
            "start_lon": 80.2450,
            "end_lat": 13.0150,
            "end_lon": 80.2550,
            "current_speed_kmh": 42.0,
            "freeflow_speed_kmh": 45.0,
            "congestion_level": "LOW",
            "predicted_congestion_15m": "LOW",
            "flood_risk": 0.40,
            "is_blocked": False
        }
    ]

    for tr in traffic_data:
        db.add(TrafficSegment(**tr))

    # Weather Record (Simulating realistic coastal monsoon conditions)
    weather = WeatherRecord(
        latitude=13.0827,
        longitude=80.2707,
        temperature_c=30.5,
        rainfall_mm=12.4,  # Moderate monsoon shower expected
        humidity_pct=78.0,
        precipitation_prob=75.0,
        weather_condition="Scattered Monsoon Showers Expected",
        flood_warning=True
    )
    db.add(weather)

    # Initial Alerts
    alerts_data = [
        {
            "alert_id": "ALT-001",
            "alert_type": "OVERFLOW_RISK",
            "severity": "CRITICAL",
            "location": "Zone C - Coastal (BIN-C101)",
            "bin_id": "BIN-C101",
            "timestamp": datetime.utcnow() - timedelta(minutes=15),
            "message": "Zone C Promenade bin at 68% with +8.5%/hr surge. Projected overflow in 2.5 hours before evening rain.",
            "status": "ACTIVE",
            "root_cause": "Evening tourist rush & street food vendors accumulating waste rapidly"
        },
        {
            "alert_id": "ALT-002",
            "alert_type": "FLOOD_RISK",
            "severity": "HIGH",
            "location": "Kamarajar Promenade Coastal Lowlands",
            "bin_id": "BIN-C102",
            "timestamp": datetime.utcnow() - timedelta(minutes=40),
            "message": "Heavy monsoon rainfall forecasted (75% prob). Waste in low-lying bins poses high risk of drainage clogging.",
            "status": "ACTIVE",
            "root_cause": "High tide confluence and coastal precipitation forecast"
        }
    ]
    for a in alerts_data:
        db.add(Alert(**a))

    # Baseline Model Performance logs
    db.add(ModelPerformance(
        model_id="xgb-forecaster",
        model_version="v1.0.0",
        horizon="+1h",
        mae=3.42,
        rmse=4.81,
        r2_score=0.932,
        overflow_accuracy=94.5,
        f1_score=0.92,
        drift_score=0.03
    ))
    db.add(ModelPerformance(
        model_id="xgb-forecaster",
        model_version="v1.0.0",
        horizon="+3h",
        mae=5.12,
        rmse=7.10,
        r2_score=0.898,
        overflow_accuracy=91.0,
        f1_score=0.88,
        drift_score=0.05
    ))

    db.commit()
    db.close()
    print("ThooimAI database successfully seeded.")

def seed_events_and_classifications(db):
    # 1. Seed Events if none
    if not db.query(Event).first():
        events_data = [
            {
                "event_id": "EVT-PANGUNI-2026",
                "name": "Kapaleeshwarar Temple Panguni Peruvizha Festival",
                "event_type": "Festival",
                "location": "Mylapore Tank & Sannidhi Street, Chennai",
                "latitude": 13.0336,
                "longitude": 80.2690,
                "expected_attendance": 25000,
                "start_time": datetime.utcnow() + timedelta(hours=2),
                "end_time": datetime.utcnow() + timedelta(hours=8),
                "affected_zones": "Zone C - Coastal, Zone B - Residential",
                "expected_additional_waste_kg": 650.0,
                "surge_probability": 94.0,
                "peak_waste_period": "5:30 PM - 9:30 PM",
                "status": "ACTIVE",
                "mitigation_action": "Deploy 6 temporary 1100L bins and pre-position Truck T-03 along South Mada Street."
            },
            {
                "event_id": "EVT-MARINA-WEEKEND",
                "name": "Marina Beach Promenade Weekend Food Festival",
                "event_type": "Public Gathering",
                "location": "Kamarajar Promenade, Triplicane, Chennai",
                "latitude": 13.0500,
                "longitude": 80.2824,
                "expected_attendance": 18000,
                "start_time": datetime.utcnow() + timedelta(hours=1),
                "end_time": datetime.utcnow() + timedelta(hours=6),
                "affected_zones": "Zone C - Coastal",
                "expected_additional_waste_kg": 420.0,
                "surge_probability": 88.0,
                "peak_waste_period": "6:00 PM - 10:00 PM",
                "status": "ACTIVE",
                "mitigation_action": "Increase collection frequency to 3/day; assign Truck T-07 for 7:30 PM clearance."
            },
            {
                "event_id": "EVT-KOYAMBEDU-WHOLESALE",
                "name": "Koyambedu Wholesale Morning Produce Auction",
                "event_type": "Wholesale Market",
                "location": "Market Road, Koyambedu Complex, Chennai",
                "latitude": 13.0694,
                "longitude": 80.1948,
                "expected_attendance": 12000,
                "start_time": datetime.utcnow() - timedelta(hours=4),
                "end_time": datetime.utcnow() + timedelta(hours=3),
                "affected_zones": "Zone D - Wholesale Market",
                "expected_additional_waste_kg": 850.0,
                "surge_probability": 92.0,
                "peak_waste_period": "4:00 AM - 9:00 AM",
                "status": "ACTIVE",
                "mitigation_action": "Compactor truck T-02 assigned for continuous perishable organic clearance."
            }
        ]
        for ev in events_data:
            db.add(Event(**ev))

    # 2. Seed Waste Classifications
    if not db.query(WasteClassificationRecord).first():
        classifications_data = [
            {
                "record_id": "CLS-001",
                "bin_id": "BIN-C101",
                "waste_type": "Organic / Wet Waste",
                "confidence": 96.4,
                "estimated_weight_kg": 14.5,
                "timestamp": datetime.utcnow() - timedelta(minutes=25),
                "source": "Camera / Computer Vision",
                "detected_materials": "Food leftovers, vegetable peels, coconut shells",
                "image_reference": "marina_beach_bin_c101.jpg"
            },
            {
                "record_id": "CLS-002",
                "bin_id": "BIN-A201",
                "waste_type": "Plastic",
                "confidence": 93.8,
                "estimated_weight_kg": 9.2,
                "timestamp": datetime.utcnow() - timedelta(minutes=45),
                "source": "Camera / Computer Vision",
                "detected_materials": "PET bottles, LDPE packaging wrappers, plastic straws",
                "image_reference": "tnagar_ranganathan_bin_a201.jpg"
            },
            {
                "record_id": "CLS-003",
                "bin_id": "BIN-E501",
                "waste_type": "Paper",
                "confidence": 94.5,
                "estimated_weight_kg": 18.0,
                "timestamp": datetime.utcnow() - timedelta(hours=1),
                "source": "Camera / Computer Vision",
                "detected_materials": "Cardboard boxes, shipping cartons, newspaper wraps",
                "image_reference": "georgetown_parrys_bin_e501.jpg"
            }
        ]
        for cl in classifications_data:
            db.add(WasteClassificationRecord(**cl))

    # 3. Seed Missed Pickups
    if not db.query(MissedPickupRecord).first():
        missed_data = [
            {
                "record_id": "MSD-20260912-01",
                "bin_id": "BIN-C101",
                "bin_name": "Marina Beach Promenade - North",
                "zone": "Zone C - Coastal",
                "scheduled_time": datetime.utcnow() - timedelta(minutes=45),
                "missed_detected_time": datetime.utcnow() - timedelta(minutes=15),
                "current_fill": 68.0,
                "assigned_truck_id": "TRUCK-T01",
                "assigned_truck_name": "Medium Collector T-01",
                "reassigned_truck_id": "TRUCK-T07",
                "reassigned_truck_name": "Compactor Truck T-07",
                "reason": "Traffic congestion bottleneck on Anna Salai arterial route",
                "escalation_level": "CRITICAL",
                "status": "REASSIGNED",
                "recommended_action": "Route reassigned to Truck T-07 with ETA of 20 minutes via Kamarajar Salai."
            }
        ]
        for m in missed_data:
            db.add(MissedPickupRecord(**m))

    db.commit()

if __name__ == "__main__":
    seed_database()

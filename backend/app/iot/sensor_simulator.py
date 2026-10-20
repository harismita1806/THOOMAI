import random
from datetime import datetime
from typing import Dict, Any
from app.database.session import SessionLocal
from app.database.models import Bin, SensorReading

def generate_telemetry_reading(
    bin_id: str,
    event_type: str = "NORMAL"  # NORMAL, SURGE, COLLECTION, ANOMALY, HARDWARE_FAULT
) -> Dict[str, Any]:
    """
    Simulates real-time IoT bin sensor telemetry (Ultrasonic, Load Cell, Temperature, Battery).
    """
    db = SessionLocal()
    b = db.query(Bin).filter(Bin.bin_id == bin_id).first()
    if not b:
        db.close()
        return {}

    now = datetime.utcnow()
    new_fill = b.current_fill
    status = "OK"

    if event_type == "COLLECTION":
        # Bin emptied by truck
        new_fill = random.uniform(8.0, 18.0)
        b.waste_velocity = 0.5
        b.last_collection_time = now
    elif event_type == "SURGE":
        # Rapid accumulation spike
        new_fill = min(100.0, b.current_fill + random.uniform(6.0, 12.0))
        b.waste_velocity = round(random.uniform(7.5, 11.0), 2)
    elif event_type == "ANOMALY":
        # Sudden heavy dumping or thermal event
        new_fill = min(100.0, b.current_fill + random.uniform(15.0, 25.0))
        status = "SPIKE"
    elif event_type == "HARDWARE_FAULT":
        status = "FAULT"
    else:
        # Normal steady accumulation
        new_fill = min(100.0, b.current_fill + random.uniform(0.5, 2.5))

    b.previous_fill = b.current_fill
    b.current_fill = round(new_fill, 1)

    # Weight proportional to fill + density noise
    weight = round((new_fill / 100.0) * b.capacity_liters * random.uniform(0.35, 0.55), 1)
    temp = round(30.0 + random.uniform(-1.5, 3.5), 1)
    if status == "SPIKE":
        temp += 12.0

    reading = SensorReading(
        bin_id=bin_id,
        timestamp=now,
        fill_level=b.current_fill,
        weight_kg=weight,
        temperature_c=temp,
        battery_level=round(random.uniform(88.0, 96.0), 1),
        sensor_status=status
    )
    db.add(reading)
    db.commit()

    result = {
        "bin_id": bin_id,
        "bin_name": b.name,
        "zone": b.zone,
        "timestamp": now.isoformat(),
        "fill_level": b.current_fill,
        "weight_kg": weight,
        "temperature_c": temp,
        "sensor_status": status,
        "waste_velocity": b.waste_velocity,
        "event_type": event_type
    }
    db.close()
    return result

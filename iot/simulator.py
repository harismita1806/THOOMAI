"""
THOOYMATHI AI - Standalone IoT Bin Sensor Telemetry Publisher
Simulates ESP32 microcontrollers publishing ultrasonic distance,
weight load cell, temperature, and battery telemetry over MQTT.
"""

import time
import json
import random
from datetime import datetime

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except Exception:
    MQTT_AVAILABLE = False

BROKER = "localhost"
PORT = 1883
TOPIC = "thooymathi/bins/telemetry"

BINS = ["BIN-C101", "BIN-C102", "BIN-A201", "BIN-B301", "BIN-D401"]

def run_simulation(cycles=10):
    client = None
    if MQTT_AVAILABLE:
        try:
            client = mqtt.Client(client_id="thooymathi_iot_esp32")
            client.connect(BROKER, PORT, 60)
            print(f"[IoT] Connected to MQTT Broker at {BROKER}:{PORT}")
        except Exception as e:
            print(f"[IoT] MQTT broker unavailable ({e}), running local sensor stream:")

    for i in range(cycles):
        for bin_id in BINS:
            # Simulate sensor telemetry
            is_surge = (bin_id == "BIN-C101" and i > 2)
            fill = 68.0 + (i * 2.5) if is_surge else round(40.0 + random.uniform(0, 15), 1)
            weight = round(fill * 4.2, 1)
            temp = round(30.0 + random.uniform(-1, 3), 1)
            battery = round(95.0 - (i * 0.1), 1)

            payload = {
                "bin_id": bin_id,
                "timestamp": datetime.utcnow().isoformat(),
                "fill_level": min(100.0, fill),
                "weight_kg": weight,
                "temperature_c": temp,
                "battery_pct": battery,
                "sensor_status": "OK" if fill < 90 else "HIGH_ACCUMULATION"
            }

            msg = json.dumps(payload)
            if client:
                client.publish(TOPIC, msg)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Telemetry emitted: {msg}")
        
        time.sleep(1.5)

if __name__ == "__main__":
    run_simulation()

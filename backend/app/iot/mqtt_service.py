import json
import logging
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger("mqtt_service")

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except Exception:
    MQTT_AVAILABLE = False

class MQTTService:
    def __init__(self):
        self.connected = False
        self.client = None
        if MQTT_AVAILABLE:
            try:
                self.client = mqtt.Client(client_id="thooymathi_backend")
                self.client.on_connect = self._on_connect
                self.client.on_disconnect = self._on_disconnect
            except Exception as e:
                logger.warning(f"Could not initialize MQTT client: {e}")

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT Broker.")
        else:
            self.connected = False

    def _on_disconnect(self, client, userdata, rc):
        self.connected = False

    def publish_telemetry(self, topic: str, payload: Dict[str, Any]):
        if self.connected and self.client:
            try:
                self.client.publish(topic, json.dumps(payload))
                return True
            except Exception:
                pass
        return False

mqtt_service = MQTTService()

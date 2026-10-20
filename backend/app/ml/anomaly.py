import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Dict, Any, List

class AnomalyDetector:
    def __init__(self):
        self.clf = IsolationForest(contamination=0.08, random_state=42)
        self._fit_baseline()

    def _fit_baseline(self):
        # Baseline normal waste reading patterns (fill, velocity, temp, weight_ratio)
        rng = np.random.RandomState(42)
        n = 500
        normal_fills = rng.uniform(10, 85, n)
        normal_vels = rng.uniform(0.5, 6.0, n)
        normal_temps = rng.uniform(26, 36, n)
        normal_weights = normal_fills * 4.0 + rng.normal(0, 15, n)
        
        X = np.column_stack([normal_fills, normal_vels, normal_temps, normal_weights])
        self.clf.fit(X)

    def detect_anomaly(
        self,
        fill_level: float,
        waste_velocity: float,
        temperature_c: float = 30.0,
        weight_kg: float = 0.0,
        battery_level: float = 90.0,
        zone_type: str = "Commercial"
    ) -> Dict[str, Any]:
        """
        Evaluates current reading for anomalies and returns possible contextual causes.
        """
        features = np.array([[fill_level, waste_velocity, temperature_c, weight_kg]])
        pred = self.clf.predict(features)[0]  # -1 for anomaly, 1 for normal
        score = float(self.clf.score_samples(features)[0])

        is_anomaly = bool(pred == -1 or waste_velocity > 12.0 or fill_level > 98.0 or temperature_c > 50.0)

        possible_causes = []
        if is_anomaly:
            if temperature_c > 45.0:
                possible_causes.append("Thermal anomaly: Possible internal smoldering, direct solar heating, or battery heat")
            if waste_velocity > 12.0:
                possible_causes.append("Sudden volume surge: Weekend market influx, festival gathering, or unauthorized bulk commercial dumping")
            if weight_kg > 0 and (weight_kg / max(1.0, fill_level)) > 10.0:
                possible_causes.append("High-density anomaly: Illegal dumping of construction debris, soil, or heavy concrete rubble")
            if battery_level < 20.0:
                possible_causes.append("Hardware alert: Low battery voltage inducing erratic ultrasonic sensor fluctuations")
            if not possible_causes:
                possible_causes.append("Unusual accumulation pattern deviating significantly from historical time-of-day baseline")

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(abs(score), 3),
            "severity": "CRITICAL" if (temperature_c > 45.0 or waste_velocity > 15.0) else ("HIGH" if is_anomaly else "NORMAL"),
            "possible_causes": possible_causes
        }

anomaly_detector = AnomalyDetector()

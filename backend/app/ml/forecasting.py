import os
import joblib
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except Exception:
    XGB_AVAILABLE = False

from sklearn.ensemble import RandomForestRegressor

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

class WasteForecaster:
    def __init__(self):
        self.version = "xgb-v1.0.0"
        self.horizons = ["NOW", "+30m", "+1h", "+3h", "+6h", "+12h", "Tomorrow"]
        self.horizon_factors = {
            "NOW": 0.0,
            "+30m": 0.5,
            "+1h": 1.0,
            "+3h": 3.0,
            "+6h": 6.0,
            "+12h": 12.0,
            "Tomorrow": 24.0
        }
        self.models = {}
        self._initialize_or_load_models()

    def _initialize_or_load_models(self):
        """
        Loads pre-trained models or fits initial baseline estimators
        using synthetic historical patterns.
        """
        for h in ["+30m", "+1h", "+3h", "+6h", "+12h", "Tomorrow"]:
            model_path = os.path.join(MODEL_DIR, f"forecast_{h}.joblib")
            if os.path.exists(model_path):
                try:
                    self.models[h] = joblib.load(model_path)
                    continue
                except Exception:
                    pass
            
            # Train baseline model with domain features
            # Features: [current_fill, velocity, hour, day_of_week, commercial, pop_density/10000, rainfall, temp]
            X_synthetic, y_synthetic = self._generate_training_data(self.horizon_factors[h])
            
            if XGB_AVAILABLE:
                model = xgb.XGBRegressor(
                    n_estimators=60,
                    max_depth=4,
                    learning_rate=0.08,
                    random_state=42
                )
            else:
                model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
            
            model.fit(X_synthetic, y_synthetic)
            self.models[h] = model
            joblib.dump(model, model_path)

    def _generate_training_data(self, delta_hours: float):
        """
        Generates realistic urban waste accumulation training pairs
        reflecting time-of-day, commercial surges, weekend markets, and rain delays.
        """
        rng = np.random.RandomState(42)
        n_samples = 1200
        
        fills = rng.uniform(5.0, 85.0, n_samples)
        velocities = rng.uniform(0.5, 9.0, n_samples)
        hours = rng.randint(0, 24, n_samples)
        days = rng.randint(0, 7, n_samples)
        commercial = rng.uniform(0.1, 1.0, n_samples)
        pop_density = rng.uniform(0.8, 3.5, n_samples)  # scaled / 10000
        rainfall = rng.exponential(3.0, n_samples)
        temp = rng.uniform(25.0, 38.0, n_samples)
        
        # Target: future fill with non-linear saturation
        hour_multiplier = np.where((hours >= 10) & (hours <= 21), 1.25, 0.7)
        weekend_multiplier = np.where(days >= 5, 1.20, 1.0)
        
        delta_fill = (
            velocities * delta_hours * hour_multiplier * weekend_multiplier * (0.8 + 0.4 * commercial)
            + rng.normal(0, 1.5, n_samples)
        )
        
        future_fill = np.clip(fills + delta_fill, 0.0, 100.0)
        
        X = np.column_stack([fills, velocities, hours, days, commercial, pop_density, rainfall, temp])
        return X, future_fill

    def predict_horizons(
        self,
        current_fill: float,
        velocity: float,
        commercial_activity: float = 0.5,
        population_density: float = 18000.0,
        rainfall_mm: float = 0.0,
        temperature_c: float = 30.0,
        timestamp: datetime = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Predicts waste fill and waste in kg for all horizons.
        """
        if timestamp is None:
            timestamp = datetime.utcnow()

        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        scaled_pop = population_density / 10000.0

        features = np.array([[
            current_fill,
            velocity,
            hour,
            day_of_week,
            commercial_activity,
            scaled_pop,
            rainfall_mm,
            temperature_c
        ]])

        results = {
            "NOW": {
                "predicted_fill": round(current_fill, 1),
                "predicted_waste_kg": round(current_fill * 8.5, 1),
                "confidence": "HIGH"
            }
        }

        for h in ["+30m", "+1h", "+3h", "+6h", "+12h", "Tomorrow"]:
            if h in self.models:
                pred = float(self.models[h].predict(features)[0])
                pred = min(100.0, max(current_fill, round(pred, 1)))
            else:
                # Direct extrapolation fallback
                factor = self.horizon_factors[h]
                pred = min(100.0, round(current_fill + (velocity * factor), 1))

            # Determine confidence: degrades for longer horizons or rapid extreme velocity
            if h in ["+30m", "+1h"]:
                conf = "HIGH" if velocity < 7.0 else "MEDIUM"
            elif h == "+3h":
                conf = "HIGH" if velocity < 5.0 else "MEDIUM"
            elif h == "+6h":
                conf = "MEDIUM" if velocity < 6.0 else "LOW"
            else:
                conf = "MEDIUM" if velocity < 4.0 else "LOW"

            results[h] = {
                "predicted_fill": pred,
                "predicted_waste_kg": round(pred * 8.5, 1),
                "confidence": conf
            }

        # Calculate predicted overflow time
        if current_fill >= 95.0:
            overflow_time_desc = "IMMINENT / OVERFLOWING NOW"
            hours_to_overflow = 0.0
        elif velocity > 0.1:
            hours_to_overflow = round((100.0 - current_fill) / velocity, 1)
            overflow_eta = timestamp + timedelta(hours=hours_to_overflow)
            overflow_time_desc = f"{overflow_eta.strftime('%I:%M %p')} (in {hours_to_overflow} hrs)"
        else:
            overflow_time_desc = "> 48 hours (Stable)"
            hours_to_overflow = 48.0

        results["overflow_eta"] = {
            "description": overflow_time_desc,
            "hours_remaining": hours_to_overflow
        }

        return results

forecaster = WasteForecaster()

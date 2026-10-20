# THOOYMATHI AI (தூய்மதி AI) — REST API Documentation

Base URL: `http://localhost:8000/api`

---

## 1. Smart Bins & Forecasting

### `GET /bins`
Returns all smart waste containers with current fill, velocity, urgency priority, multi-horizon forecasts, overflow probabilities, environmental risk scores, and SHAP explanations.

### `GET /bins/{bin_id}`
Returns granular historical sensor telemetry (fill level, weight, temperature, battery) for a specific container.

---

## 2. Weather & Traffic Intelligence

### `GET /weather`
Fetches current weather and monsoon forecast via Open-Meteo REST API (with in-memory cache and offline fallback).

### `GET /traffic`
Returns real-time and predicted (15-min) traffic congestion levels across arterial road segments.

---

## 3. Alerts & Incident Management

### `GET /alerts`
Returns active smart-city alerts (`OVERFLOW_RISK`, `MISSED_PICKUP`, `FLOOD_RISK`, `ANOMALY`).

### `POST /alerts/{alert_id}/resolve`
Marks an alert as acknowledged and resolved.

---

## 4. AI Decision Engine & Routing

### `GET /decisions`
Synthesizes telemetry, predictions, weather, and fleet availability into prioritized action directives and dynamic collection frequencies.

### `POST /route/optimize`
Solves the Capacitated Vehicle Routing Problem (CVRP) across available compactor trucks, factoring in predicted traffic bottlenecks.

---

## 5. Closed-Loop Verification & Reassignment

### `POST /pickup/verify`
Multi-signal verification endpoint requiring GPS proximity ($\le 50$m), telemetry fill drop ($\ge 30\%$), and driver confirmation. Logs error into continuous learning engine.

**Request Body:**
```json
{
  "bin_id": "BIN-C101",
  "truck_id": "TRUCK-T07",
  "driver_lat": 13.0501,
  "driver_lon": 80.2825,
  "pre_fill": 93.0,
  "post_fill": 18.0,
  "driver_confirmed": true,
  "qr_scanned": true,
  "actual_weight_kg": 315.0
}
```

### `POST /tasks/simulate-missed?bin_id={bin_id}`
Simulates a missed pickup scenario, triggers a CRITICAL alert, searches for the nearest active truck, and reassigns the task.

---

## 6. Continuous Learning & What-If Simulation

### `POST /simulation/run`
Executes counterfactual scenario analysis (collection delays, roadway blockages, rainfall surges, truck breakdowns).

### `GET /analytics`
Returns post-collection performance KPIs, MAE, RMSE, zone breakdown, and prediction vs. actual trends.

### `GET /model/performance`
Returns model version history, accuracy benchmarks, and data drift indicators.

### `POST /model/retrain`
Executes chronological retraining on verified feedback and promotes the model if performance improves.

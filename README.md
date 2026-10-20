# THOOYMATHI AI (தூய்மதி AI)
### AI-Powered Adaptive Urban Waste Collection & Environmental Risk Management System

**Tagline:** *"Predict. Prevent. Optimize. Verify. Learn."*  
**Tamil Tagline:** *"கழிவை முன்கூட்டியே கணித்து, அபாயத்தைத் தடுத்து, சேகரிப்பை மேம்படுத்தி, தொடர்ந்து கற்றுக்கொள்."*

---

## 🌟 Overview

**THOOYMATHI AI** is not a simple vehicle tracking utility. It is an **adaptive AI decision-support system** engineered for municipal corporations and smart cities. It transforms conventional fixed-schedule waste collection into a predictive, dynamic, risk-aware, explainable, verified, and continuously learning operations platform.

### The Core Intelligence Loop:
$$\text{SENSE} \longrightarrow \text{PREDICT} \longrightarrow \text{EXPLAIN} \longrightarrow \text{DECIDE} \longrightarrow \text{OPTIMIZE} \longrightarrow \text{ACT} \longrightarrow \text{VERIFY} \longrightarrow \text{ANALYZE} \longrightarrow \text{LEARN}$$

---

## 🚀 Key Features

1. **Multi-Horizon Waste Forecasting**: Predicts fill levels at NOW, +30m, +1h, +3h, and +6h via XGBoost and Random Forest models.
2. **Waste Accumulation Velocity**: Identifies surging zones where waste accumulates rapidly (+8.5%/hr) before bins overflow.
3. **Overflow Probability & Environmental Risk**: Synthesizes waste urgency, rainfall/flood hazards, and population exposure into a normalized 0–100 Environmental Risk Score.
4. **Explainable AI (SHAP)**: Provides transparent percentage attributions and human-readable explanations for all critical predictions.
5. **AI Decision Engine**: Issues prioritized collection directives, truck recommendations, and adaptive collection frequencies (e.g. 3/day vs 1/day).
6. **Multi-Truck Route Optimization (CVRP)**: Solves the Capacitated Vehicle Routing Problem with road graph A*/Dijkstra pathfinding and real-time/predicted traffic avoidance.
7. **Free-First Services & Offline Fallback**: Open-Meteo for weather, OpenStreetMap/Leaflet for GIS, Nominatim geocoding with caching, and local road graph routing.
8. **Driver Interface & Multi-Signal Verification**: Requires GPS proximity ($\le 50$m), sensor telemetry drop ($\ge 30\%$), and driver confirmation before marking a collection verified.
9. **Missed Pickup Detection & Automatic Reassignment**: Escalates delayed pickups, raises CRITICAL alerts, and dynamically reassigns nearest available trucks.
10. **What-If Simulation Sandbox**: Stress-tests municipal capacity against delays, roadway blockages, and monsoon rain spikes.
11. **Post-Collection Analytics & Continuous Learning**: Compares predicted vs. actual outcomes, tracks MAE/RMSE, monitors data drift, and supports validated model retraining.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Leaflet.js, React-Leaflet, Recharts, Lucide Icons
- **Backend**: Python 3.14, FastAPI, SQLAlchemy, Pydantic, Uvicorn
- **AI/ML**: XGBoost, Scikit-learn, Isolation Forest, NumPy, Pandas
- **Routing & Optimization**: OSRM API, Road Graph Router (A* / Dijkstra), Priority-Aware CVRP
- **IoT & Simulation**: Paho-MQTT, Virtual Sensor Telemetry Simulator
- **Database**: SQLite / PostgreSQL with spatial coordinate indexing

---

## ⚡ Quick Start

### 1. Backend Setup
```bash
cd backend
py -m app.database.seed_data
py -m uvicorn app.main:app --port 8000 --reload
```
API Documentation: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Dashboard: `http://localhost:5173`

### 3. Run Automated Tests
```bash
cd backend
py -c "import tests.test_system as t; t.test_waste_velocity_calculation(); t.test_urgency_priority(); t.test_overflow_probability(); t.test_anomaly_detection(); t.test_shap_explanation(); t.test_environmental_risk(); t.test_multi_truck_cvrp(); t.test_road_graph_dijkstra(); print('ALL 8 UNIT TESTS PASSED SUCCESSFULLY!')"
```

---

## 🚢 Docker Deployment

```bash
cd docker
docker-compose up --build
```

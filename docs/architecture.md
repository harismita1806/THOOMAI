# THOOYMATHI AI (தூய்மதி AI) — System Architecture

**Subtitle:** AI-Powered Adaptive Urban Waste Collection & Environmental Risk Management System  
**Tagline:** "Predict. Prevent. Optimize. Verify. Learn."  
**Tamil Tagline:** "கழிவை முன்கூட்டியே கணித்து, அபாயத்தைத் தடுத்து, சேகரிப்பை மேம்படுத்தி, தொடர்ந்து கற்றுக்கொள்."

---

## 1. High-Level Vision & Intelligence Loop

THOOYMATHI AI transforms conventional fixed-schedule collection into a closed-loop, predictive, explainable, and continuously learning urban decision system.

```
       [ SENSE ]              [ PREDICT ]            [ EXPLAIN ]
IoT Sensors / Telemetry ──> Multi-Horizon ML ──> SHAP Feature Impact
  (ESP32 / MQTT Sim)      (NOW, +30m, +1h, 3h, 6h) & Natural Language
           │                        │                    │
           ▼                        ▼                    ▼
       [ LEARN ]               [ OPTIMIZE ]          [ DECIDE ]
Continuous Retraining   <── Multi-Truck CVRP   <── Environmental Risk &
& Model Performance         OSRM + Graph A*        Decision Engine
           ▲                        │
           │                        ▼
       [ ANALYZE ]              [ ACT ]              [ VERIFY ]
 Post-Collection Pred-vs-Actual  ──> Driver App  ──> Multi-Signal Verification
 (Error, Delay, Efficiency)        Route & Tasks     (GPS + Sensor + QR)
```

---

## 2. Component Layers

### A. SENSE Layer (IoT & Real-Time Telemetry)
- **Edge Devices**: Simulated ESP32 microcontrollers equipped with ultrasonic depth sensors, load-cell strain gauges, temperature sensors, and GPS.
- **Protocol**: MQTT pub/sub over Mosquitto with fallback to direct HTTP telemetry injection (`/api/sensors/simulate`).
- **Telemetry Payload**: Fill level (%), estimated weight (kg), enclosure temperature (°C), battery percentage (%), and sensor operational status (`OK`, `FAULT`, `SPIKE`).

### B. PREDICT Layer (Machine Learning)
- **Multi-Horizon Waste Forecasting**: Regression models for NOW, +30m, +1h, +3h, and +6h. Primary model: XGBoost Regressor (with Random Forest ensemble fallback).
- **Waste Accumulation Velocity ($\Delta \text{Fill} / \Delta t$)**: Quantifies surging zones where waste accumulates at high velocity (+8.5%/hr) before bins overflow.
- **Overflow Probability Classification ($P(\text{overflow})$)**: Estimates overflow likelihood based on fill level, forecast trajectory, rainfall, and commercial footfall. Categorized into LOW (0–30%), MODERATE (31–60%), HIGH (61–80%), and CRITICAL (81–100%).
- **Anomaly Detection**: Isolation Forest model detecting illegal dumping spikes, festival surges, or sensor degradation.

### C. EXPLAIN Layer (Explainable AI)
- **Attribution Model**: Computes localized feature attribution percentages (e.g., Velocity +24%, Commercial Activity +20%, Weekend Crowd +16%, Rainfall +13%).
- **Natural Language Generator**: Synthesizes transparent, human-auditable rationale grounded directly in model features without hallucination.

### D. DECIDE Layer (AI Decision Engine)
- **Multi-Dimensional Environmental Risk**:
  $$\text{Risk Score} = 0.45 \times \text{Waste Risk} + 0.30 \times \text{Flood Risk} + 0.25 \times \text{Population Exposure}$$
- **Action Directives**: Identifies optimal collection windows (e.g., *"Collect Zone C within 45 minutes"*), selects best candidate vehicle based on capacity and distance, and formulates traceable justification.
- **Dynamic Frequency Recommendation**: Recommends zone collection frequency (3x/day, 2x/day, 1x/day, or every 2 days) derived from historical demand.

### E. OPTIMIZE Layer (Routing & Fleet Allocation)
- **Capacitated Vehicle Routing Problem (CVRP)**: Solves multi-truck allocation respecting vehicle capacity constraints, current payloads, and bin priority rankings.
- **Dynamic Road Graph Router**: Implements Dijkstra/A* pathfinding with real-time and predicted (15-min) traffic congestion penalties and flood risk road avoidance.
- **OSRM Integration**: Queries Open Source Routing Machine for driving geometry and travel time estimations.

### F. ACT & VERIFY Layer (Driver Cockpit & Closed-Loop Verification)
- **Driver Console**: Tablet/mobile interface displaying turn-by-turn waypoint schedule, truck load utilization, and stop instructions.
- **Multi-Signal Verification Protocol**:
  1. GPS proximity check ($\le 50\text{m}$)
  2. Telemetry fill drop ($\Delta \text{Fill} \ge 30\%$)
  3. QR / RFID tag physical scan
  4. Driver digital sign-off
- **Missed Pickup Detection**: Identifies overdue tasks, raises CRITICAL alerts, identifies nearest available vehicle, and executes dynamic reassignment.

### G. ANALYZE & LEARN Layer (Post-Collection & Continuous ML)
- **Actual vs. Predicted Evaluation**: Computes collection error ($\Delta \text{kg}$, MAE, RMSE) upon verified collection.
- **Continuous Learning Loop**: Retrains candidate model on chronological feedback, validates against holdout set, and promotes new version with rollback protection.
- **What-If Scenario Sandbox**: Allows testing the ripple effects of delayed collection, blocked roads, or monsoon rain.

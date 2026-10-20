# THOOYMATHI AI (தூய்மதி AI) — Machine Learning & AI Specification

---

## 1. Multi-Horizon Forecasting Engine

### Problem Formulation
Predict future waste fill percentage $y_{t+h} \in [0, 100]$ across multiple horizons:
$$h \in \{+30\text{m}, +1\text{h}, +3\text{h}, +6\text{h}\}$$

### Features:
1. `current_fill`: Sensor-reported fill level (%)
2. `waste_velocity`: Rate of change $\Delta \text{fill} / \Delta t$ (%/hour)
3. `hour`: Hour of the day (0–23)
4. `day_of_week`: Day of week (0–6)
5. `commercial_activity`: Commercial/market density index (0.0–1.0)
6. `population_density`: Scaled inhabitants per $\text{km}^2$
7. `rainfall_mm`: Forecast precipitation in mm
8. `temperature_c`: Ambient temperature in °C

### Primary Model
- **Algorithm**: XGBoost Regressor (`n_estimators=60`, `max_depth=4`, `learning_rate=0.08`).
- **Ensemble Fallback**: Scikit-Learn Random Forest Regressor (`n_estimators=50`, `max_depth=5`).
- **Chronological Validation**: Data is split chronologically (older $\rightarrow$ train, intermediate $\rightarrow$ validation, latest $\rightarrow$ holdout test) to avoid temporal data leakage.

---

## 2. Waste Accumulation Velocity Engine

Calculates instantaneous trajectory:
$$\text{Velocity} = \frac{\text{Fill}_{t} - \text{Fill}_{t-\Delta t}}{\Delta t}$$

If a sudden negative step occurs (bin emptying), velocity is computed strictly on the subsequent rising segment. Priority integrates:
$$\text{Urgency Score} = (\text{Fill} \times 0.40) + (\text{Velocity} \times 3.5) + (P(\text{overflow}) \times 0.35)$$

---

## 3. Overflow Probability Classifier

Computes non-linear risk probability:
$$P(\text{overflow}) = \text{BaseFill} + \text{VelocityPenalty} + \text{RainPenalty} + \text{DelayPenalty} + \text{CommercialSurcharge}$$
Categorized as:
- **0–30%**: LOW
- **31–60%**: MODERATE
- **61–80%**: HIGH
- **81–100%**: CRITICAL

---

## 4. Anomaly Detection (Isolation Forest)

- **Contamination**: 8%
- **Monitored Variables**: `[fill_level, waste_velocity, temperature_c, weight_kg]`
- **Possible Causes**: Formulates non-dogmatic explanations:
  - Thermal spike ($T > 45^\circ\text{C}$): Possible smoldering, solar radiation, or battery heat.
  - Sudden volume spike ($\text{Vel} > 12\%/\text{h}$): Festival, weekend market influx, or unauthorized commercial dumping.
  - Density anomaly ($\text{Weight}/\text{Fill} > 10$): Debris, construction soil dumping.

---

## 5. Explainable AI (SHAP-Style Feature Attribution)

Calculates local attribution percentages and synthesizes plain-language operational summaries directly tied to the primary driving features.

---

## 6. Continuous Learning & Retraining

1. **Prediction Logging**: On verified pickup, actual waste collected vs predicted waste is recorded.
2. **Error Tracking**: Tracks Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE).
3. **Drift Monitoring**: Evaluates whether real-world error exceeds baseline threshold ($> 6\text{ kg}$).
4. **Validation Before Deployment**: Incremental retraining executes against chronological holdout pairs. The candidate version (`xgb-v1.1.0`) is **only** promoted if holdout RMSE demonstrates empirical improvement.

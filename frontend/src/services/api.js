const API_BASE = "http://localhost:8000/api";

export async function fetchBins() {
  const res = await fetch(`${API_BASE}/bins`);
  if (!res.ok) throw new Error("Failed to fetch bins");
  return res.json();
}

export async function fetchWeather() {
  const res = await fetch(`${API_BASE}/weather`);
  if (!res.ok) throw new Error("Failed to fetch weather");
  return res.json();
}

export async function fetchTraffic() {
  const res = await fetch(`${API_BASE}/traffic`);
  if (!res.ok) throw new Error("Failed to fetch traffic");
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function fetchTrucks() {
  const res = await fetch(`${API_BASE}/trucks`);
  if (!res.ok) throw new Error("Failed to fetch trucks");
  return res.json();
}

export async function fetchDecisions() {
  const res = await fetch(`${API_BASE}/decisions`);
  if (!res.ok) throw new Error("Failed to fetch AI decisions");
  return res.json();
}

export async function optimizeRoutes() {
  const res = await fetch(`${API_BASE}/route/optimize`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to run route optimization");
  return res.json();
}

export async function verifyPickup(payload) {
  const res = await fetch(`${API_BASE}/pickup/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Pickup verification failed");
  return res.json();
}

export async function simulateMissedPickup(binId = "BIN-C101") {
  const res = await fetch(`${API_BASE}/tasks/simulate-missed?bin_id=${binId}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to simulate missed pickup");
  return res.json();
}

export async function runWhatIfSimulation(payload) {
  const res = await fetch(`${API_BASE}/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to run What-If simulation");
  return res.json();
}

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function fetchModelPerformance() {
  const res = await fetch(`${API_BASE}/model/performance`);
  if (!res.ok) throw new Error("Failed to fetch model performance");
  return res.json();
}

export async function triggerRetrain() {
  const res = await fetch(`${API_BASE}/model/retrain`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to trigger retrain");
  return res.json();
}

export async function triggerSensorSim(binId, eventType) {
  const res = await fetch(`${API_BASE}/sensors/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bin_id: binId, event_type: eventType })
  });
  if (!res.ok) throw new Error("Failed to trigger sensor simulation");
  return res.json();
}

export async function resolveAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: "POST"
  });
  return res.json();
}

export async function chatWithAssistant(message, context = {}) {
  const res = await fetch(`${API_BASE}/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context })
  });
  if (!res.ok) throw new Error("Assistant request failed");
  return res.json();
}

export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function fetchWasteComposition(period = "month") {
  const res = await fetch(`${API_BASE}/waste-composition?period=${period}`);
  if (!res.ok) throw new Error("Failed to fetch waste composition");
  return res.json();
}

export async function classifyWaste(payload) {
  const res = await fetch(`${API_BASE}/waste-classification/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to classify waste");
  return res.json();
}

export async function fetchMissedPickups() {
  const res = await fetch(`${API_BASE}/missed-pickups`);
  if (!res.ok) throw new Error("Failed to fetch missed pickups");
  return res.json();
}

export async function reassignMissedPickup(pickupId, targetTruckId = null) {
  const res = await fetch(`${API_BASE}/missed-pickups/${pickupId}/reassign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_truck_id: targetTruckId })
  });
  if (!res.ok) throw new Error("Failed to reassign missed pickup");
  return res.json();
}

export async function fetchHeatmaps(horizon = "NOW", mapType = "all") {
  const res = await fetch(`${API_BASE}/heatmaps?horizon=${encodeURIComponent(horizon)}&map_type=${mapType}`);
  if (!res.ok) throw new Error("Failed to fetch heatmap data");
  return res.json();
}


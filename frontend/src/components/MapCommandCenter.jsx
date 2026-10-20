import React, { useState, useEffect } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Circle, 
  Polyline, 
  useMap 
} from "react-leaflet";
import L from "leaflet";
import { 
  Clock, 
  Zap, 
  AlertOctagon, 
  Layers, 
  Navigation, 
  CheckCircle, 
  Flame, 
  Droplets,
  Truck as TruckIcon,
  HelpCircle
} from "lucide-react";

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Create custom SVG markers for bins and trucks
const createBinIcon = (fill, priority) => {
  const color = 
    priority === "CRITICAL" || fill >= 80 ? "#f43f5e" : 
    priority === "HIGH" || fill >= 65 ? "#f59e0b" : 
    fill >= 40 ? "#eab308" : "#10b981";

  const isCritical = priority === "CRITICAL" || fill >= 85;

  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      ${isCritical ? `<div style="
        position: absolute;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(244, 63, 94, 0.35);
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>` : ''}
      <div style="
        width: 28px;
        height: 28px;
        background: #0f172a;
        border: 2.5px solid ${color};
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        color: white;
        font-weight: 700;
        font-size: 10px;
      ">
        ${Math.round(fill)}%
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: "custom-bin-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createTruckIcon = (truckId, isBusy) => {
  const html = `
    <div style="
      width: 32px;
      height: 32px;
      background: #0284c7;
      border: 2px solid #38bdf8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.6);
      color: white;
      font-size: 14px;
    ">
      🚛
    </div>
  `;

  return L.divIcon({
    html: html,
    className: "custom-truck-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const MAP_PROVIDERS = {
  satellite: {
    id: "satellite",
    name: "🛰️ Real Satellite Imagery (Esri)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 19,
    hasLabels: true,
    labelsUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
  },
  osm_streets: {
    id: "osm_streets",
    name: "🗺️ Real OpenStreetMap (Live)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    hasLabels: false
  },
  voyager: {
    id: "voyager",
    name: "🏙️ Real City Streets (CartoDB)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
    hasLabels: false
  },
  dark: {
    id: "dark",
    name: "🌃 Tactical Dark Mode (CartoDB)",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19,
    hasLabels: false
  },
  esri_navigation: {
    id: "esri_navigation",
    name: "🚗 Navigation & Relief (Esri)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri & OpenStreetMap contributors',
    maxZoom: 19,
    hasLabels: false
  }
};

export default function MapCommandCenter({ 
  bins, 
  trucks, 
  traffic, 
  routes, 
  onSimulateMissed, 
  onSimulateSurge, 
  onSelectBinForDriver 
}) {
  const [horizon, setHorizon] = useState("NOW"); // NOW, +30m, +1h, +3h, +6h
  const [mapProviderKey, setMapProviderKey] = useState("satellite"); // Default to Real Satellite Imagery!
  const [showLabels, setShowLabels] = useState(true);
  const [customApiModalOpen, setCustomApiModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [customTileUrl, setCustomTileUrl] = useState("");

  const [layers, setLayers] = useState({
    bins: true,
    heatmap: true,
    velocity: true,
    trucks: true,
    routes: true,
    traffic: true,
    flood: true,
    events: true
  });

  const [activeMapMode, setActiveMapMode] = useState("all");

  const horizons = [
    { id: "NOW", label: "NOW (Real-Time)" },
    { id: "+1h", label: "+1 HOUR" },
    { id: "+3h", label: "+3 HOURS" },
    { id: "+6h", label: "+6 HOURS" },
    { id: "+12h", label: "+12 HOURS" },
    { id: "Tomorrow", label: "TOMORROW" }
  ];

  const applyMapMode = (modeId) => {
    setActiveMapMode(modeId);
    if (modeId === "all") {
      setLayers({ bins: true, heatmap: true, velocity: true, trucks: true, routes: true, traffic: true, flood: true, events: true });
    } else if (modeId === "live_bins") {
      setLayers({ bins: true, heatmap: false, velocity: false, trucks: true, routes: false, traffic: false, flood: false, events: false });
    } else if (modeId === "future_heat") {
      setLayers({ bins: true, heatmap: true, velocity: true, trucks: false, routes: false, traffic: false, flood: false, events: false });
    } else if (modeId === "overflow_risk") {
      setLayers({ bins: true, heatmap: true, velocity: true, trucks: true, routes: true, traffic: false, flood: false, events: false });
    } else if (modeId === "traffic") {
      setLayers({ bins: false, heatmap: false, velocity: false, trucks: true, routes: true, traffic: true, flood: false, events: false });
    } else if (modeId === "flood") {
      setLayers({ bins: true, heatmap: false, velocity: false, trucks: false, routes: false, traffic: false, flood: true, events: false });
    } else if (modeId === "routes") {
      setLayers({ bins: true, heatmap: false, velocity: false, trucks: true, routes: true, traffic: false, flood: false, events: false });
    } else if (modeId === "events") {
      setLayers({ bins: true, heatmap: true, velocity: false, trucks: false, routes: false, traffic: false, flood: false, events: true });
    } else if (modeId === "waste_types") {
      setLayers({ bins: true, heatmap: false, velocity: false, trucks: false, routes: false, traffic: false, flood: false, events: false });
    }
  };

  // Helper to get fill level for selected horizon
  const getFillForHorizon = (bin) => {
    if (horizon === "NOW" || !bin.forecasts || !bin.forecasts[horizon]) {
      return bin.current_fill;
    }
    return bin.forecasts[horizon].predicted_fill;
  };

  const getConfidenceForHorizon = (bin) => {
    if (horizon === "NOW" || !bin.forecasts || !bin.forecasts[horizon]) {
      return "HIGH";
    }
    return bin.forecasts[horizon].confidence;
  };

  const activeProvider = MAP_PROVIDERS[mapProviderKey] || MAP_PROVIDERS.satellite;

  return (
    <div className="relative w-full h-[calc(100vh-180px)] min-h-[550px] bg-slate-950 flex flex-col">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Prediction Timeline Slider */}
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/80 shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Clock className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            <span>AI TIMELINE:</span>
          </div>
          <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800">
            {horizons.map((h) => (
              <button
                key={h.id}
                onClick={() => setHorizon(h.id)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  horizon === h.id
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 hidden xl:inline-block">
            Multi-horizon prediction matrix
          </span>
        </div>

        {/* Real Maps API Provider Selector */}
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/50 shadow-2xl flex items-center gap-2 text-xs">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            REAL MAP API:
          </span>
          <select
            value={mapProviderKey}
            onChange={(e) => setMapProviderKey(e.target.value)}
            className="bg-slate-950 text-slate-100 font-medium text-xs rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {Object.values(MAP_PROVIDERS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {activeProvider.hasLabels && (
            <label className="flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white pl-1 border-l border-slate-700 text-[11px]">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span>Labels</span>
            </label>
          )}

          <button
            onClick={() => setCustomApiModalOpen(true)}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-mono border border-slate-700"
            title="Custom Map API Key / Custom Tile Source"
          >
            API Key
          </button>
        </div>

        {/* GIS Layer Toggles */}
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-2xl flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1">Overlays:</span>
          
          <label className="flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={layers.heatmap} 
              onChange={() => setLayers(prev => ({...prev, heatmap: !prev.heatmap}))}
              className="accent-emerald-500 rounded"
            />
            <span>Heatmap</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={layers.traffic} 
              onChange={() => setLayers(prev => ({...prev, traffic: !prev.traffic}))}
              className="accent-emerald-500 rounded"
            />
            <span>Traffic</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={layers.flood} 
              onChange={() => setLayers(prev => ({...prev, flood: !prev.flood}))}
              className="accent-emerald-500 rounded"
            />
            <span>Flood Risk</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={layers.trucks} 
              onChange={() => setLayers(prev => ({...prev, trucks: !prev.trucks}))}
              className="accent-emerald-500 rounded"
            />
            <span>Fleet</span>
          </label>
        </div>

        {/* Action Shortcuts */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => onSimulateSurge("BIN-C101")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg transition"
            title="Simulate sudden food festival surge at Marina Beach Promenade"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate Waste Surge</span>
          </button>
          <button
            onClick={() => onSimulateMissed("BIN-C101")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl shadow-lg transition"
            title="Simulate driver delay / missed pickup triggering dynamic reassignment"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Simulate Missed Pickup</span>
          </button>
        </div>

        {/* Dedicated Map Mode Switcher Bar */}
        <div className="w-full flex items-center justify-between pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-xl overflow-x-auto scrollbar-none gap-2 text-xs">
          <span className="text-[11px] font-bold text-emerald-400 shrink-0 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Map Mode:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: "🌐 All Overlays" },
              { id: "live_bins", label: "🗑️ Live Waste Bins" },
              { id: "future_heat", label: "🔮 Future Waste Heatmap" },
              { id: "overflow_risk", label: "⚠️ Overflow Risk" },
              { id: "traffic", label: "🚦 Traffic Congestion" },
              { id: "flood", label: "🌧️ Flood & Drainage" },
              { id: "routes", label: "🚛 Route Sequence" },
              { id: "events", label: "🎪 Event Crowd Surges" },
              { id: "waste_types", label: "♻️ Waste Types" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => applyMapMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeMapMode === m.id
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-950"
                    : "bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Map API Key Modal */}
      {customApiModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Configure Custom Real Map API
              </h3>
              <button 
                onClick={() => setCustomApiModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-slate-300">
              The system is currently using the live <strong>{activeProvider.name}</strong> API without mandatory keys. If you have a private <strong>Mapbox</strong> or <strong>Stadia Maps</strong> token, paste it below:
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Mapbox / Stadia API Key:</label>
                <input
                  type="text"
                  placeholder="pk.eyJ1Ijo..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Custom XYZ Tile URL (Optional):</label>
                <input
                  type="text"
                  placeholder="https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=..."
                  value={customTileUrl}
                  onChange={(e) => setCustomTileUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setCustomApiModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Custom Map API configuration saved!");
                  setCustomApiModalOpen(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
              >
                Save & Apply Map API
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <div className="flex-1 w-full h-full relative z-10">
        <MapContainer
          center={[13.0550, 80.2500]}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          {/* Base Real Map Tile Layer */}
          <TileLayer
            key={activeProvider.id}
            attribution={activeProvider.attribution}
            url={customTileUrl || activeProvider.url}
            maxZoom={activeProvider.maxZoom || 19}
          />

          {/* Optional Reference Labels on top of Satellite */}
          {activeProvider.hasLabels && showLabels && activeProvider.labelsUrl && (
            <TileLayer
              key={`${activeProvider.id}-labels`}
              url={activeProvider.labelsUrl}
              maxZoom={19}
              zIndex={50}
            />
          )}

          {/* 1. Flood Risk Zones */}
          {layers.flood && (
            <>
              {/* Marina coastal lowlands flood hazard */}
              <Circle
                center={[13.0500, 80.2824]}
                radius={850}
                pathOptions={{
                  color: "#0284c7",
                  fillColor: "#0284c7",
                  fillOpacity: 0.18,
                  dashArray: "6, 6"
                }}
              />
              <Circle
                center={[13.0067, 80.2570]}
                radius={650}
                pathOptions={{
                  color: "#0284c7",
                  fillColor: "#0284c7",
                  fillOpacity: 0.15,
                  dashArray: "6, 6"
                }}
              />
            </>
          )}

          {/* 2. Traffic Overlay Polylines */}
          {layers.traffic && traffic?.map((seg) => {
            const isSevere = seg.congestion_level === "SEVERE" || seg.predicted_congestion_15m === "SEVERE";
            const isHigh = seg.congestion_level === "HIGH" || seg.predicted_congestion_15m === "HIGH";
            const isModerate = seg.congestion_level === "MODERATE";

            const color = isSevere ? "#be123c" : (isHigh ? "#f43f5e" : (isModerate ? "#f59e0b" : "#10b981"));

            return (
              <Polyline
                key={seg.road_id}
                positions={[
                  [seg.start_lat, seg.start_lon],
                  [seg.end_lat, seg.end_lon]
                ]}
                pathOptions={{
                  color: color,
                  weight: 5,
                  opacity: 0.85
                }}
              >
                <Popup>
                  <div className="p-2 text-xs space-y-1">
                    <strong className="text-slate-100 font-semibold">{seg.road_name}</strong>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Current Speed:</span>
                      <span className="font-mono text-emerald-400">{seg.current_speed_kmh} km/h</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Current Congestion:</span>
                      <span className="font-semibold text-amber-400">{seg.congestion_level}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Predicted in 15 min:</span>
                      <span className="font-bold text-rose-400">{seg.predicted_congestion_15m}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      CVRP router dynamically applies {seg.predicted_congestion_15m === "HIGH" ? "2.2x" : "1.0x"} travel penalty to this artery.
                    </p>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* 3. Predictive Waste Hotspot Heatmaps */}
          {layers.heatmap && bins?.map((b) => {
            const displayFill = getFillForHorizon(b);
            if (displayFill < 50) return null;

            const radius = Math.min(800, 300 + (displayFill * 5));
            const color = displayFill >= 80 ? "#f43f5e" : (displayFill >= 65 ? "#f59e0b" : "#eab308");

            return (
              <Circle
                key={`heat-${b.bin_id}`}
                center={[b.latitude, b.longitude]}
                radius={radius}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: displayFill >= 80 ? 0.28 : 0.18,
                  stroke: false
                }}
              />
            );
          })}

          {/* 4. Multi-Truck Routes */}
          {layers.routes && routes?.map((r) => (
            <Polyline
              key={r.route_id}
              positions={r.polyline}
              pathOptions={{
                color: "#38bdf8",
                weight: 3.5,
                opacity: 0.7,
                dashArray: "8, 6"
              }}
            />
          ))}

          {/* 5. Smart Bins Markers with Timeline Fill Projection */}
          {layers.bins && bins?.map((b) => {
            const displayFill = getFillForHorizon(b);
            const conf = getConfidenceForHorizon(b);

            return (
              <Marker
                key={b.bin_id}
                position={[b.latitude, b.longitude]}
                icon={createBinIcon(displayFill, b.priority)}
              >
                <Popup maxWidth={340}>
                  <div className="p-3 text-xs space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-emerald-400">{b.bin_id}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                            {b.zone}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white font-heading mt-0.5">{b.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.priority === "CRITICAL" ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" :
                        b.priority === "HIGH" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" :
                        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      }`}>
                        {b.priority}
                      </span>
                    </div>

                    {/* Waste Type / Category Tag */}
                    <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-slate-950/70 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Waste Stream:</span>
                      <span className="font-semibold text-emerald-300 font-mono text-[10.5px]">
                        {b.standard_waste_category || b.waste_type || "Mixed Municipal"}
                      </span>
                    </div>

                    {/* Timeline Waste Status */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400">Current Level:</span>
                        <div className="text-base font-bold text-slate-200">{b.current_fill}%</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 font-semibold">Forecast ({horizon}):</span>
                        <div className="text-base font-bold text-emerald-400">{displayFill}%</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Velocity:</span>
                        <div className="text-xs font-mono font-bold text-amber-400">+{b.waste_velocity}%/hr</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">P(Overflow):</span>
                        <div className="text-xs font-mono font-bold text-rose-400">{b.overflow_probability}%</div>
                      </div>
                    </div>

                    {/* Overflow ETA & Pickup Scheduling */}
                    <div className="space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Predicted Overflow:</span>
                        <span className="font-bold text-rose-400 font-mono">
                          {b.predicted_overflow_time || "In ~14 hrs"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Last Collection:</span>
                        <span className="text-slate-300 font-mono text-[10px]">
                          {b.last_collection_time || "Today, 06:00 AM"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Next Recommended:</span>
                        <span className="text-cyan-300 font-mono font-medium text-[10px]">
                          {b.next_recommended_pickup || "Today, 17:30 PM"}
                        </span>
                      </div>
                    </div>

                    {/* Confidence & Environmental Risk */}
                    <div className="flex items-center justify-between text-[11px] px-1">
                      <span className="text-slate-400">AI Confidence:</span>
                      <span className={`font-semibold ${conf === "HIGH" ? "text-emerald-400" : (conf === "MEDIUM" ? "text-amber-400" : "text-rose-400")}`}>
                        {conf}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-1">
                      <span className="text-slate-400">Environmental Risk Score:</span>
                      <span className="font-bold text-rose-400">{b.environmental_risk}/100 ({b.environmental_status})</span>
                    </div>

                    {/* SHAP Feature Contributions */}
                    {b.shap_attributions && b.shap_attributions.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-800">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                          SHAP Feature Drivers:
                        </span>
                        <div className="space-y-0.5">
                          {b.shap_attributions.slice(0, 3).map((attr, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 truncate max-w-[170px]">{attr.feature}</span>
                              <span className="font-mono text-emerald-400 font-medium">+{attr.contribution_pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Natural language explanation */}
                    <p className="text-[10px] text-slate-300 italic bg-slate-900/90 p-2 rounded border border-slate-800">
                      "{b.explanation}"
                    </p>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectBinForDriver(b)}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-center font-semibold text-xs transition"
                      >
                        Dispatch & Verify in Driver Console
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* 6. Active Fleet Trucks */}
          {layers.trucks && trucks?.map((t) => (
            <Marker
              key={t.truck_id}
              position={[t.latitude, t.longitude]}
              icon={createTruckIcon(t.truck_id, t.status !== "AVAILABLE")}
            >
              <Popup>
                <div className="p-2 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                    <strong className="text-white font-heading">{t.name}</strong>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-300 font-mono">
                      {t.status}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Driver: <span className="font-semibold text-slate-100">{t.driver_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Load:</span>
                    <span className="font-mono font-bold text-sky-400">
                      {t.current_load_kg} / {t.capacity_kg} kg ({t.utilization_pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-sky-400 h-full rounded-full transition-all"
                      style={{ width: `${t.utilization_pct}%` }}
                    />
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

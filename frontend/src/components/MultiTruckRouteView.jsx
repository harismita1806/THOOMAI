import React, { useState } from "react";
import { 
  Truck, 
  Navigation, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { optimizeRoutes } from "../services/api";

export default function MultiTruckRouteView({ initialRoutes }) {
  const [routesData, setRoutesData] = useState(initialRoutes);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    try {
      const res = await optimizeRoutes();
      setRoutesData(res);
    } catch (err) {
      alert("Route optimization error: " + err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const activeRoutes = routesData?.routes || [];
  const selectedRoute = activeRoutes[selectedRouteIndex] || activeRoutes[0];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white font-heading">
              CAPACITATED VEHICLE ROUTING OPTIMIZER (CVRP)
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/50">
              OR-Tools & Graph A*
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Multi-truck assignment with capacity constraints, priority weighting, and real-time traffic bypass
          </p>
        </div>

        <button
          onClick={handleRunOptimization}
          disabled={isOptimizing}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
          <span>{isOptimizing ? "Solving CVRP Matrix..." : "Recalculate Multi-Truck Routes"}</span>
        </button>
      </div>

      {/* Traffic Avoidance Warning Banner */}
      <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Predicted Congestion Avoidance Active:</strong> Anna Salai Arterial Highway predicted to reach SEVERE congestion in 15 minutes. Routes dynamically recalculated via Western bypass.
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 font-mono">
          -14 min Delay Avoided
        </span>
      </div>

      {/* Fleet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeRoutes.map((r, idx) => {
          const isSelected = idx === selectedRouteIndex;
          return (
            <div
              key={r.route_id}
              onClick={() => setSelectedRouteIndex(idx)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected 
                  ? "bg-slate-800 border-sky-500 shadow-lg shadow-sky-950/40" 
                  : "bg-slate-900/80 border-slate-800 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-sky-400">{r.truck_id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                  {r.stops_count} stops
                </span>
              </div>
              <h4 className="text-sm font-bold text-white font-heading">{r.truck_name}</h4>
              <p className="text-[11px] text-slate-400">Driver: {r.driver_name}</p>

              {/* Capacity Bar */}
              <div className="space-y-1 my-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Payload:</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {r.total_load_kg} / {r.capacity_kg} kg ({r.utilization_pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-sky-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, r.utilization_pct)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Dist: <strong className="text-slate-200">{r.total_distance_km} km</strong></span>
                <span>Est: <strong className="text-slate-200">{r.total_duration_min} min</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Route Waypoint Schedule */}
      {selectedRoute && (
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono text-sky-400">WAYPOINT SCHEDULE</span>
              <h3 className="text-base font-bold text-white font-heading">
                {selectedRoute.truck_name} — Dispatch Route
              </h3>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-400">Total Distance:</span>
              <span className="font-mono font-bold text-emerald-400 ml-1">{selectedRoute.total_distance_km} km</span>
              <span className="text-slate-500 mx-2">|</span>
              <span className="text-slate-400">Total Duration:</span>
              <span className="font-mono font-bold text-sky-400 ml-1">{selectedRoute.total_duration_min} min</span>
            </div>
          </div>

          <div className="space-y-3">
            {selectedRoute.stops?.map((stop, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-300">
                    {stop.step}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{stop.name}</h5>
                    <span className="text-[10px] text-slate-400">
                      {stop.type === "DEPOT_START" ? "Starting Depot Station" : `${stop.zone} (${stop.bin_id})`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {stop.demand_kg && (
                    <span className="text-slate-300 font-mono">
                      Load: <strong>+{stop.demand_kg} kg</strong>
                    </span>
                  )}
                  {stop.priority && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      stop.priority === "CRITICAL" ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" :
                      stop.priority === "HIGH" ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {stop.priority}
                    </span>
                  )}
                  <span className="text-emerald-400 font-semibold">{stop.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

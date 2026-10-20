import React, { useState } from "react";
import { 
  Sliders, 
  Play, 
  AlertTriangle, 
  Clock, 
  CloudRain, 
  Truck, 
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { runWhatIfSimulation } from "../services/api";

export default function WhatIfSandbox({ traffic, trucks }) {
  const [delayHours, setDelayHours] = useState(3.0);
  const [rainfallMm, setRainfallMm] = useState(35.0);
  const [blockedRoad, setBlockedRoad] = useState("RD-ANNA-SALAI");
  const [unavailableTruck, setUnavailableTruck] = useState("TRUCK-T03");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState(null);

  const handleRunSim = async () => {
    setIsSimulating(true);
    try {
      const res = await runWhatIfSimulation({
        delay_hours: delayHours,
        rainfall_increase_mm: rainfallMm,
        blocked_road_id: blockedRoad === "none" ? null : blockedRoad,
        unavailable_truck_id: unavailableTruck === "none" ? null : unavailableTruck
      });
      setSimResults(res);
    } catch (err) {
      alert("Simulation failed: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white font-heading">
              WHAT-IF COUNTERFACTUAL SIMULATION SANDBOX
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
              Scenario Modeling
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Stress-test city response before real-world disruptions: delays, roadway flash-floods, monsoon surges, and fleet downtime
          </p>
        </div>

        <button
          onClick={handleRunSim}
          disabled={isSimulating}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition text-xs"
        >
          <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? "Computing Matrix Dynamics..." : "Run Scenario Simulation"}</span>
        </button>
      </div>

      {/* Scenario Control Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800">
        {/* Param 1: Collection Delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Collection Delay:
            </span>
            <span className="font-mono text-amber-400 font-bold">+{delayHours} Hours</span>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            step="0.5"
            value={delayHours}
            onChange={(e) => setDelayHours(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <p className="text-[10px] text-slate-400">
            Simulates trucks delayed in depots or traffic.
          </p>
        </div>

        {/* Param 2: Heavy Monsoon Rain */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              Monsoon Rainfall Surge:
            </span>
            <span className="font-mono text-sky-400 font-bold">+{rainfallMm} mm</span>
          </div>
          <input
            type="range"
            min="0"
            max="80"
            step="5"
            value={rainfallMm}
            onChange={(e) => setRainfallMm(Number(e.target.value))}
            className="w-full accent-sky-500"
          />
          <p className="text-[10px] text-slate-400">
            Expands soggy waste & accelerates drainage overflow.
          </p>
        </div>

        {/* Param 3: Roadway Closure */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Roadway Blockage / Flash Flood:
          </label>
          <select
            value={blockedRoad}
            onChange={(e) => setBlockedRoad(e.target.value)}
            className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-lg p-2"
          >
            <option value="none">None (All Roads Open)</option>
            {traffic?.map(t => (
              <option key={t.road_id} value={t.road_id}>
                {t.road_name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400">
            Forces route recalculation around bottleneck.
          </p>
        </div>

        {/* Param 4: Truck Breakdown */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-indigo-400" />
            Fleet Truck Outage:
          </label>
          <select
            value={unavailableTruck}
            onChange={(e) => setUnavailableTruck(e.target.value)}
            className="w-full bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-lg p-2"
          >
            <option value="none">None (Full Fleet Active)</option>
            {trucks?.map(t => (
              <option key={t.truck_id} value={t.truck_id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400">
            Tests remaining fleet capacity under load.
          </p>
        </div>
      </div>

      {/* Comparison Dashboard */}
      {simResults && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Impact Metric 1 */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-rose-500/30 space-y-1">
              <span className="text-[11px] text-slate-400">Critical Bins Surge:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-400">
                  {simResults.summary?.baseline_critical_bins}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="text-2xl font-bold text-rose-400 font-heading">
                  {simResults.summary?.simulated_critical_bins}
                </span>
              </div>
              <p className="text-[10px] text-rose-400 font-semibold">
                +{simResults.summary?.critical_surge_increase} bins breached overflow threshold
              </p>
            </div>

            {/* Impact Metric 2 */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-amber-500/30 space-y-1">
              <span className="text-[11px] text-slate-400">Average Fill Level:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-400">
                  {simResults.summary?.baseline_avg_fill}%
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span className="text-2xl font-bold text-amber-400 font-heading">
                  {simResults.summary?.simulated_avg_fill}%
                </span>
              </div>
              <p className="text-[10px] text-amber-400 font-semibold">
                +{(simResults.summary?.simulated_avg_fill - simResults.summary?.baseline_avg_fill).toFixed(1)}% Citywide waste accumulation
              </p>
            </div>

            {/* Impact Metric 3 */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-sky-500/30 space-y-1">
              <span className="text-[11px] text-slate-400">Travel Delay Penalty:</span>
              <div className="text-2xl font-bold text-sky-400 font-heading">
                +{simResults.summary?.travel_time_penalty_min} min
              </div>
              <p className="text-[10px] text-sky-300">
                Detours around flooded/congested roads
              </p>
            </div>

            {/* Impact Metric 4 */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-purple-500/30 space-y-1">
              <span className="text-[11px] text-slate-400">Fleet Capacity Deficit:</span>
              <div className="text-2xl font-bold text-purple-400 font-heading">
                {simResults.summary?.fleet_capacity_deficit_kg} kg
              </div>
              <p className="text-[10px] text-purple-300">
                Payload lost due to truck breakdown
              </p>
            </div>
          </div>

          {/* AI Automated Recommendation for this scenario */}
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm font-bold text-purple-300">AI Mitigation Recommendation:</strong>
              <p className="text-xs text-slate-200 mt-0.5">
                {simResults.recommendation}
              </p>
            </div>
          </div>

          {/* Impact Breakdown Table */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              ZONE-BY-ZONE COUNTERFACTUAL IMPACT
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Container / Zone</th>
                    <th className="p-3">Base Fill</th>
                    <th className="p-3">Simulated Fill</th>
                    <th className="p-3">Base P(Overflow)</th>
                    <th className="p-3">Simulated P(Overflow)</th>
                    <th className="p-3">Projected Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {simResults.sample_zone_impacts?.map((z, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-white">{z.name}</div>
                        <div className="text-[10px] text-slate-400">{z.zone} ({z.bin_id})</div>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{z.base_fill}%</td>
                      <td className="p-3 font-mono font-bold text-amber-400">
                        {z.simulated_fill}% (+{z.fill_increase_pct}%)
                      </td>
                      <td className="p-3 font-mono text-slate-400">{z.base_overflow_prob}%</td>
                      <td className="p-3 font-mono font-bold text-rose-400">{z.simulated_overflow_prob}%</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          z.simulated_status === "OVERFLOW_BREACHED" 
                            ? "bg-rose-600 text-white" 
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          {z.simulated_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

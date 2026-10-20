import React from "react";
import { 
  Sparkles, 
  AlertCircle, 
  Clock, 
  Truck, 
  ArrowRight, 
  Repeat, 
  SendHorizontal,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

export default function AiDecisionPanel({ 
  decisions, 
  onDispatchTask, 
  onRunOptimization 
}) {
  const recommendations = decisions?.recommendations || [];
  const frequencies = decisions?.frequency_recommendations || [];

  return (
    <div className="w-full bg-slate-900 border-t border-slate-800 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-heading tracking-wide flex items-center gap-2">
              AI DECISION ENGINE & DISPATCH DIRECTIVES
              <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">
                Continuous Closed-Loop
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Synthesizing waste velocity, overflow probability, weather hazards, and fleet constraints
            </p>
          </div>
        </div>

        <button
          onClick={onRunOptimization}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Execute Multi-Truck CVRP Optimization</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1 & 2: Top Action Recommendations */}
        <div className="lg:col-span-2 space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Active Collection Directives ({recommendations.length})
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
            {recommendations.slice(0, 4).map((rec, i) => {
              const isCritical = rec.priority === "CRITICAL";
              return (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCritical
                      ? "bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20"
                      : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">{rec.bin_id}</span>
                      <h4 className="text-xs font-bold text-white leading-snug">{rec.bin_name}</h4>
                      <span className="text-[10px] text-slate-400">{rec.zone}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCritical ? "bg-rose-500 text-white" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {rec.priority}
                    </span>
                  </div>

                  {/* Recommendation directive box */}
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1 my-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{rec.action}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <Truck className="w-3 h-3 text-sky-400" />
                      <span>Suggested: <strong>{rec.suggested_truck_name}</strong></span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      "{rec.reason}"
                    </p>
                  </div>

                  {/* Metric Chips */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Fill: <strong className="text-slate-200">{rec.current_fill}%</strong></span>
                    <span>Vel: <strong className="text-amber-400">+{rec.waste_velocity}%/hr</strong></span>
                    <span>P(Overflow): <strong className="text-rose-400">{rec.overflow_probability}%</strong></span>
                    <span>Risk: <strong className="text-rose-400">{rec.environmental_risk}/100</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Dynamic Collection Frequency Recommendations */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-sky-400" />
            Adaptive Zone Frequencies
          </span>
          <p className="text-[11px] text-slate-400">
            Frequencies dynamically recommended from historical velocity rather than rigid schedules:
          </p>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {frequencies.map((freq, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-200 font-semibold">{freq.zone}</strong>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/50">
                    {freq.recommended_frequency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Current: {freq.current_frequency}</span>
                  <span className="text-amber-400">Avg Vel: +{freq.average_velocity}%/h</span>
                </div>
                <p className="text-[10px] text-slate-500 italic">{freq.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

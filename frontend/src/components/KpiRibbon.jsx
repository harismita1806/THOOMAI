import React from "react";
import { 
  AlertOctagon, 
  AlertTriangle, 
  Truck, 
  ClockAlert, 
  Trash2, 
  CheckCircle2, 
  TrendingUp, 
  Leaf 
} from "lucide-react";

export default function KpiRibbon({ kpis, bins }) {
  const criticalBins = bins?.filter(b => b.priority === "CRITICAL")?.length || 0;
  const highRiskBins = bins?.filter(b => b.priority === "HIGH")?.length || 0;

  const cards = [
    {
      label: "Critical Urgency Bins",
      value: criticalBins,
      sub: "Immediate pickup required",
      icon: AlertOctagon,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      badge: "Action < 45m"
    },
    {
      label: "High-Risk Surge",
      value: highRiskBins,
      sub: "Velocity > +6%/hr",
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      badge: "Pre-empt Rain"
    },
    {
      label: "Active Fleet Trucks",
      value: kpis?.active_trucks || 4,
      sub: "All units connected (GPS)",
      icon: Truck,
      color: "text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      badge: "100% Online"
    },
    {
      label: "Missed Pickups",
      value: kpis?.missed_pickups || 0,
      sub: "Auto-reassignment ready",
      icon: ClockAlert,
      color: kpis?.missed_pickups > 0 ? "text-rose-400" : "text-emerald-400",
      bg: kpis?.missed_pickups > 0 ? "bg-rose-500/10" : "bg-emerald-500/10",
      border: kpis?.missed_pickups > 0 ? "border-rose-500/30" : "border-emerald-500/30",
      badge: kpis?.missed_pickups > 0 ? "Reassigning" : "Zero Missed"
    },
    {
      label: "Collection Completion",
      value: `${kpis?.collection_completion_rate || 92.4}%`,
      sub: "Target: >90% daily",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      badge: "On Target"
    },
    {
      label: "AI Prediction Accuracy",
      value: `${kpis?.prediction_accuracy_pct || 94.2}%`,
      sub: `MAE: ${kpis?.mae_kg || 3.4} kg`,
      icon: TrendingUp,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/30",
      badge: "XGBoost v1.0"
    },
    {
      label: "Fuel & Emissions Saved",
      value: `${kpis?.fuel_emissions_saved_pct || 18.5}%`,
      sub: "Via CVRP route bypass",
      icon: Leaf,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
      border: "border-teal-500/30",
      badge: "Eco-Optimized"
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 px-6 py-4 bg-slate-900/50 border-b border-slate-800/80">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div 
            key={i} 
            className={`p-3 rounded-xl border ${c.border} ${c.bg} backdrop-blur-sm transition-all hover:translate-y-[-1px]`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-400 truncate">{c.label}</span>
              <Icon className={`w-3.5 h-3.5 ${c.color} shrink-0`} />
            </div>
            <div className="flex items-baseline justify-between gap-1">
              <span className={`text-xl font-bold font-heading ${c.color}`}>{c.value}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900/80 font-mono text-slate-300 border border-slate-700/50">
                {c.badge}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

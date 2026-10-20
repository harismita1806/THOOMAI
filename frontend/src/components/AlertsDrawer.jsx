import React from "react";
import { 
  AlertOctagon, 
  AlertTriangle, 
  Droplets, 
  ClockAlert, 
  Check, 
  X, 
  Zap,
  RotateCcw
} from "lucide-react";
import { resolveAlert } from "../services/api";

export default function AlertsDrawer({ 
  alerts, 
  isOpen, 
  onClose, 
  onSimulateMissed, 
  onRefresh 
}) {
  if (!isOpen) return null;

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to resolve alert: " + err.message);
    }
  };

  const getAlertIcon = (type) => {
    switch(type) {
      case "OVERFLOW_RISK": return AlertOctagon;
      case "MISSED_PICKUP": return ClockAlert;
      case "FLOOD_RISK": return Droplets;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col p-5 shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-white font-heading">
              SYSTEM ALERTS & INCIDENT STREAM
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Trigger Buttons */}
        <div className="py-3 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => {
              onSimulateMissed("BIN-C101");
              onClose();
            }}
            className="flex-1 py-1.5 px-3 bg-rose-700/80 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <ClockAlert className="w-3.5 h-3.5" />
            <span>Simulate Missed Pickup</span>
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {alerts?.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No active alerts. All systems operational.
            </div>
          ) : (
            alerts?.map((a) => {
              const Icon = getAlertIcon(a.alert_type);
              const isCrit = a.severity === "CRITICAL";
              const isResolved = a.status === "RESOLVED";

              return (
                <div
                  key={a.alert_id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                    isResolved 
                      ? "bg-slate-950/40 border-slate-800 opacity-60" 
                      : isCrit 
                      ? "bg-rose-950/40 border-rose-500/50 shadow-md shadow-rose-950/30" 
                      : "bg-slate-950/70 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 shrink-0 ${isCrit ? 'text-rose-400' : 'text-amber-400'}`} />
                      <span className="font-bold text-white font-mono text-[11px]">{a.alert_type}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCrit ? "bg-rose-500 text-white" : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {a.severity}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{a.message}</p>

                  <div className="text-[10px] text-slate-400">
                    Location: <strong className="text-slate-200">{a.location}</strong>
                  </div>

                  {a.root_cause && (
                    <div className="text-[10px] text-slate-400 italic bg-slate-900/90 p-1.5 rounded border border-slate-800">
                      Root Cause: {a.root_cause}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>

                    {a.status === "ACTIVE" ? (
                      <button
                        onClick={() => handleResolve(a.alert_id)}
                        className="px-2 py-1 bg-slate-800 hover:bg-emerald-700 text-slate-200 hover:text-white rounded text-[10px] font-semibold transition flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Acknowledge & Resolve</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        &check; RESOLVED
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

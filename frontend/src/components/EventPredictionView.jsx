import React, { useState, useEffect } from "react";
import { 
  Calendar, Users, TrendingUp, AlertTriangle, CheckCircle2, 
  MapPin, ShieldAlert, Sparkles, RefreshCw, Zap, ArrowUpRight
} from "lucide-react";
import { fetchEvents } from "../services/api";

export default function EventPredictionView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatedProtocols, setActivatedProtocols] = useState({});
  const [notice, setNotice] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleActivate = (eventId, eventName) => {
    setActivatedProtocols({ ...activatedProtocols, [eventId]: true });
    setNotice(`Mitigation Protocol Activated for "${eventName}". Temporary bins & dynamic dispatch scheduled.`);
    setTimeout(() => setNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Urban Crowd Surge & Cultural Event Intelligence</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Event-Aware Waste Surge Forecasting</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Predictive modeling of festivals, food fairs, and wholesale market spikes to prevent sudden overflows.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors self-start md:self-auto"
          title="Refresh Events"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((evt) => {
          const isActivated = activatedProtocols[evt.id];
          return (
            <div 
              key={evt.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isActivated 
                  ? "bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20" 
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">
                    {evt.event_type}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {evt.start_date}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5">{evt.name}</h3>

                <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{evt.location} ({evt.zone})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Est. Attendance: <strong className="text-white">{evt.expected_attendance?.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Surge Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4">
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 font-medium">Surge Impact</div>
                    <div className="text-emerald-400 font-mono font-bold text-base flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      +{evt.predicted_surge_pct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 font-medium">Probability</div>
                    <div className="text-cyan-400 font-mono font-bold text-base">
                      {evt.surge_probability_pct}%
                    </div>
                  </div>
                </div>

                {/* Primary Waste Stream */}
                <div className="text-xs text-slate-300 mb-3">
                  <span className="text-slate-400 text-[11px] block mb-0.5">Primary Waste Streams:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {evt.waste_category_impact?.map((cat, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-800 text-emerald-300 text-[10px] rounded border border-slate-700">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mitigation Strategy */}
                <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 mb-4">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1 mb-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Recommended Mitigation:
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    {evt.mitigation_plan}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleActivate(evt.id, evt.name)}
                disabled={isActivated}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isActivated
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md hover:shadow-cyan-500/20"
                }`}
              >
                {isActivated ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mitigation Deployed</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Deploy Mitigation Protocol</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

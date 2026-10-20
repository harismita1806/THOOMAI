import React, { useState, useEffect } from "react";
import { 
  AlertOctagon, CheckCircle2, Clock, Truck, MapPin, 
  RefreshCw, ArrowRight, ShieldAlert, Sparkles, Navigation, Zap
} from "lucide-react";
import { fetchMissedPickups, reassignMissedPickup, simulateMissedPickup, fetchTrucks } from "../services/api";

export default function MissedPickupsView() {
  const [pickups, setPickups] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reassigningId, setReassigningId] = useState(null);
  const [selectedTrucks, setSelectedTrucks] = useState({});
  const [actionNotice, setActionNotice] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pickupList, truckList] = await Promise.all([
        fetchMissedPickups(),
        fetchTrucks()
      ]);
      setPickups(pickupList);
      setTrucks(truckList);
      
      // Default selected truck per pickup
      const defaults = {};
      pickupList.forEach(p => {
        if (p.candidate_trucks && p.candidate_trucks.length > 0) {
          defaults[p.id] = p.candidate_trucks[0].truck_id;
        }
      });
      setSelectedTrucks(defaults);
    } catch (err) {
      console.error("Failed to load missed pickups", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReassign = async (pickupId) => {
    const targetTruckId = selectedTrucks[pickupId];
    setReassigningId(pickupId);
    try {
      const res = await reassignMissedPickup(pickupId, targetTruckId);
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 5000);
      await loadData();
    } catch (err) {
      console.error("Reassignment failed", err);
    } finally {
      setReassigningId(null);
    }
  };

  const handleSimulateNew = async () => {
    setSimulating(true);
    try {
      await simulateMissedPickup("BIN-C101");
      await loadData();
      setActionNotice("Simulated new missed pickup event for BIN-C101 (Marina Beach Road).");
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase tracking-wider mb-1">
            <AlertOctagon className="w-4 h-4" />
            <span>AI Geofence Telematics Incident Detection</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Missed Collection Exceptions & Rapid Reassignment</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic detection when a designated truck bypasses scheduled bin coordinate by {">"}150m or exceeds window SLA.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateNew}
            disabled={simulating}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-medium transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>{simulating ? "Simulating..." : "Trigger Missed Incident"}</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Missed Pickups"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* List of Missed Pickups */}
      {pickups.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">All Pickups On Schedule</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Zero missed pickup incidents detected across Greater Chennai. Click "Trigger Missed Incident" to simulate an urban detour exception.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pickups.map((p) => {
            const isPending = p.status === "Pending Reassignment";
            return (
              <div 
                key={p.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isPending 
                    ? "bg-slate-900/80 border-rose-500/30 shadow-lg shadow-rose-950/20" 
                    : "bg-slate-900/40 border-slate-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Incident Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">{p.bin_id}</span>
                      <span className="text-xs text-slate-400">• {p.bin_name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${
                        isPending 
                          ? "bg-rose-500/20 border-rose-500/40 text-rose-300" 
                          : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Zone: {p.zone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Missed at: {p.missed_time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Assigned Unit: {p.scheduled_truck_id}</span>
                      </div>
                    </div>

                    <div className="text-xs bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800 text-rose-300/90 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-rose-200">Incident Reason: </span>
                        <span>{p.reason}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reassignment Action Box */}
                  <div className="lg:w-96 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span>Available Recovery Units:</span>
                      <span className="text-emerald-400 font-mono text-[10px]">Optimized by OSRM</span>
                    </div>

                    {isPending ? (
                      <>
                        <select
                          value={selectedTrucks[p.id] || ""}
                          onChange={(e) => setSelectedTrucks({ ...selectedTrucks, [p.id]: e.target.value })}
                          className="w-full bg-slate-900 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:border-emerald-500 focus:outline-none"
                        >
                          {p.candidate_trucks?.map((c) => (
                            <option key={c.truck_id} value={c.truck_id}>
                              {c.truck_id} • {c.distance_km} km away • {c.eta_mins}m ETA (Cap: {c.current_load_pct}%)
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleReassign(p.id)}
                          disabled={reassigningId === p.id}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md transition-all"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{reassigningId === p.id ? "Re-optimizing Route..." : "Dispatch Immediate Recovery"}</span>
                        </button>
                      </>
                    ) : (
                      <div className="text-xs text-emerald-300 py-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Successfully rerouted to unit {p.reassigned_truck_id || "TRUCK-02"}.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

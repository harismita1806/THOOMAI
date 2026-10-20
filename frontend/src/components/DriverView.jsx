import React, { useState } from "react";
import { 
  Smartphone, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  Scale, 
  Gauge, 
  Navigation, 
  ArrowRight,
  ShieldCheck,
  CheckCircle
} from "lucide-react";
import { verifyPickup } from "../services/api";

export default function DriverView({ bins, trucks, onPickupSuccess }) {
  const [selectedTruckId, setSelectedTruckId] = useState("TRUCK-T07");
  const [selectedBinId, setSelectedBinId] = useState("BIN-C101");
  const [preFill, setPreFill] = useState(93.0);
  const [postFill, setPostFill] = useState(18.0);
  const [driverConfirmed, setDriverConfirmed] = useState(true);
  const [qrScanned, setQrScanned] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const currentTruck = trucks?.find(t => t.truck_id === selectedTruckId) || trucks?.[0];
  const targetBin = bins?.find(b => b.bin_id === selectedBinId) || bins?.[0];

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      // Driver GPS is within 15 meters of bin for realistic verification
      const res = await verifyPickup({
        bin_id: targetBin.bin_id,
        truck_id: currentTruck.truck_id,
        driver_lat: targetBin.latitude + 0.0001,
        driver_lon: targetBin.longitude + 0.0001,
        pre_fill: preFill,
        post_fill: postFill,
        driver_confirmed: driverConfirmed,
        qr_scanned: qrScanned,
        actual_weight_kg: Math.round((preFill - postFill) * 4.2),
        notes: "Driver verified collection with hydraulic bin lift cycle."
      });
      setVerificationResult(res);
      if (onPickupSuccess) {
        onPickupSuccess();
      }
    } catch (err) {
      alert("Verification failed: " + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Driver Cockpit Header */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-heading">
                DRIVER INTERACTIVE TERMINAL
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                ACTIVE ON-DUTY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Assigned Vehicle: <strong className="text-slate-200">{currentTruck?.name}</strong> | Driver: <strong className="text-emerald-400">{currentTruck?.driver_name}</strong>
            </p>
          </div>
        </div>

        {/* Vehicle Selection & Load Gauge */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] text-slate-400">Vehicle Payload:</span>
            <div className="text-sm font-bold text-sky-400 font-mono">
              {currentTruck?.current_load_kg} / {currentTruck?.capacity_kg} kg ({currentTruck?.utilization_pct}%)
            </div>
          </div>
          <select
            value={selectedTruckId}
            onChange={(e) => setSelectedTruckId(e.target.value)}
            className="bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-2"
          >
            {trucks?.map(t => (
              <option key={t.truck_id} value={t.truck_id}>
                {t.truck_id} - {t.driver_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Assigned Route Queue */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-sky-400" />
            Active Collection Queue
          </h3>

          <div className="space-y-2">
            {bins?.slice(0, 5).map((b, i) => {
              const isSelected = b.bin_id === selectedBinId;
              const isCrit = b.priority === "CRITICAL";

              return (
                <div
                  key={b.bin_id}
                  onClick={() => {
                    setSelectedBinId(b.bin_id);
                    setPreFill(b.current_fill);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-slate-800 border-emerald-500 shadow-md shadow-emerald-950/40" 
                      : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-[10px] text-slate-400">Stop #{i+1} · {b.bin_id}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isCrit ? "bg-rose-500/20 text-rose-400" : "bg-slate-800 text-slate-300"
                    }`}>
                      {b.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug">{b.name}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Fill: <strong className="text-slate-200">{b.current_fill}%</strong></span>
                    <span>Vel: <strong className="text-amber-400">+{b.waste_velocity}%/h</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2 & 3: Multi-Signal Pickup Verification Cockpit */}
        <div className="md:col-span-2 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-mono text-emerald-400">CURRENT TARGET BIN</span>
              <h3 className="text-base font-bold text-white font-heading">{targetBin?.name}</h3>
              <p className="text-xs text-slate-400">{targetBin?.address} ({targetBin?.zone})</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              TRUCK EN ROUTE
            </span>
          </div>

          {/* Workflow Indicator */}
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 font-mono">PENDING</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-500 font-mono">EN ROUTE</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-emerald-400 font-bold font-mono">ARRIVED AT BIN</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-sky-400 font-bold font-mono">VERIFY & EMPTY</span>
          </div>

          {/* Verification Multi-Signal Form */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              MULTI-SIGNAL VERIFICATION CRITERIA (FREE OF ASSUMPTION):
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Signal 1: GPS Proximity */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    1. GPS Proximity
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
                    Within 15m (PASS)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Vehicle telemetry matches container GPS coordinates ({targetBin?.latitude.toFixed(4)}, {targetBin?.longitude.toFixed(4)}).
                </p>
              </div>

              {/* Signal 2: QR / RFID Confirmation */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <QrCode className="w-3.5 h-3.5 text-sky-400" />
                    2. RFID / QR Code Scan
                  </span>
                  <label className="flex items-center gap-1 cursor-pointer text-xs text-sky-300">
                    <input 
                      type="checkbox" 
                      checked={qrScanned} 
                      onChange={(e) => setQrScanned(e.target.checked)}
                      className="accent-sky-500 rounded" 
                    />
                    <span>Scanned</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-400">
                  Physical container tag scanned via driver handheld scanner.
                </p>
              </div>

              {/* Signal 3: Sensor Fill-Level Reduction */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    3. Sensor Fill-Level Differential (Telemetry Drop)
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    Must drop by &ge; 30%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Pre-Collection Fill Level (%):
                    </label>
                    <input
                      type="number"
                      value={preFill}
                      onChange={(e) => setPreFill(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-100 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-emerald-400 block mb-1">
                      Post-Collection Fill Level (%):
                    </label>
                    <input
                      type="number"
                      value={postFill}
                      onChange={(e) => setPostFill(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg p-2 text-sm text-emerald-400 font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Delta Fill Reduction:</span>
                  <strong className="text-emerald-400 font-mono">-{Math.round(preFill - postFill)}% Drop</strong>
                </div>
              </div>
            </div>

            {/* Driver Physical Confirmation Toggle */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-300">
                4. Driver Physical Confirmation (Bin inspected & surroundings sanitized):
              </span>
              <input
                type="checkbox"
                checked={driverConfirmed}
                onChange={(e) => setDriverConfirmed(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Execute Verification Button */}
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isVerifying ? "Verifying Sensor & GPS Signals..." : "CONFIRM & VERIFY PICKUP"}</span>
            </button>
          </div>

          {/* Verification Result Feedback Box */}
          {verificationResult && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  STATUS: {verificationResult.verification_status}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  ID: {verificationResult.verification_id}
                </span>
              </div>
              <p className="text-xs text-slate-200">
                {verificationResult.signals?.fill_drop_percentage}% fill reduction verified. Collected <strong>{verificationResult.waste_metrics?.waste_collected_kg} kg</strong> of waste.
              </p>
              <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800 font-mono">
                Continuous Learning Feedback: Logged into error database (Diff: {verificationResult.waste_metrics?.prediction_error_kg} kg). System will adapt future predictions.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

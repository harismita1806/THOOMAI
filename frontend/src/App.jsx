import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import KpiRibbon from "./components/KpiRibbon";
import MapCommandCenter from "./components/MapCommandCenter";
import AiDecisionPanel from "./components/AiDecisionPanel";
import MultiTruckRouteView from "./components/MultiTruckRouteView";
import DriverView from "./components/DriverView";
import WhatIfSandbox from "./components/WhatIfSandbox";
import AnalyticsAndLearningView from "./components/AnalyticsAndLearningView";
import AlertsDrawer from "./components/AlertsDrawer";

// New Core Modules
import WasteWiseAssistant from "./components/WasteWiseAssistant";
import WasteCompositionView from "./components/WasteCompositionView";
import MissedPickupsView from "./components/MissedPickupsView";
import EventPredictionView from "./components/EventPredictionView";

import { 
  fetchBins, 
  fetchWeather, 
  fetchTraffic, 
  fetchAlerts, 
  fetchTrucks, 
  fetchDecisions, 
  fetchAnalytics, 
  fetchModelPerformance, 
  optimizeRoutes, 
  simulateMissedPickup, 
  triggerSensorSim 
} from "./services/api";
import { Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState("map");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // System states
  const [bins, setBins] = useState([]);
  const [weather, setWeather] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [decisions, setDecisions] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [modelPerf, setModelPerf] = useState(null);
  const [bannerNotice, setBannerNotice] = useState(null);

  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      const [b, w, tr, al, tk, dec, opt, an, mp] = await Promise.allSettled([
        fetchBins(),
        fetchWeather(),
        fetchTraffic(),
        fetchAlerts(),
        fetchTrucks(),
        fetchDecisions(),
        optimizeRoutes(),
        fetchAnalytics(),
        fetchModelPerformance()
      ]);

      if (b.status === "fulfilled") setBins(b.value);
      if (w.status === "fulfilled") setWeather(w.value);
      if (tr.status === "fulfilled") setTraffic(tr.value);
      if (al.status === "fulfilled") setAlerts(al.value);
      if (tk.status === "fulfilled") setTrucks(tk.value);
      if (dec.status === "fulfilled") setDecisions(dec.value);
      if (opt.status === "fulfilled") setRoutes(opt.value.routes || []);
      if (an.status === "fulfilled") setAnalytics(an.value);
      if (mp.status === "fulfilled") setModelPerf(mp.value);
    } catch (err) {
      console.error("Data loading error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Auto-refresh poll every 30 seconds
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateMissed = async (binId = "BIN-C101") => {
    try {
      const res = await simulateMissedPickup(binId);
      setBannerNotice({
        type: "CRITICAL_MISSED",
        title: "MISSED PICKUP DETECTED — AUTOMATED REASSIGNMENT TRIGGERED",
        message: `${res.reassignment?.action} Alert ID: ${res.alert_created}`
      });
      loadAllData();
      setIsAlertsOpen(true);
    } catch (err) {
      alert("Simulation failed: " + err.message);
    }
  };

  const handleSimulateSurge = async (binId = "BIN-C101") => {
    try {
      const res = await triggerSensorSim(binId, "SURGE");
      setBannerNotice({
        type: "SURGE_ALERT",
        title: "TELEMETRY SPIKE INGESTED",
        message: `${res.bin_name} fill surged to ${res.fill_level}% with +${res.waste_velocity}%/hr accumulation velocity.`
      });
      loadAllData();
    } catch (err) {
      alert("Surge simulation failed: " + err.message);
    }
  };

  const handleSelectBinForDriver = (bin) => {
    setCurrentTab("driver");
  };

  const criticalAlertCount = alerts?.filter(a => a.severity === "CRITICAL" && a.status === "ACTIVE").length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Global Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        weather={weather}
        criticalAlertCount={criticalAlertCount}
        onRefresh={loadAllData}
        isRefreshing={isRefreshing}
      />

      {/* Situational Awareness Marquee */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border-b border-emerald-500/20 px-4 py-1.5 flex items-center justify-between text-xs overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-700/60 font-semibold text-emerald-400">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>AI SITUATIONAL RADAR:</span>
        </div>
        <div className="flex-1 overflow-x-auto scrollbar-none px-3 whitespace-nowrap text-[11px] text-slate-300 flex items-center gap-6">
          <span>🚨 <strong>{criticalAlertCount} Critical Overflows:</strong> BIN-C101 (94%) & BIN-C104 (88%) require immediate collection</span>
          <span>🌧️ <strong>Weather Impact:</strong> {weather?.condition || "Moderate Rain"} ({weather?.rainfall_mm || 12.4}mm) increasing leachate risk factor by +18%</span>
          <span>🎪 <strong>Event Surge Watch:</strong> Mylapore Panguni Uthiram (+145% surge probability 85%)</span>
          <span>🚛 <strong>Fleet Status:</strong> 4/4 trucks dispatched • 0 off-route exceptions</span>
        </div>
        <div className="shrink-0 pl-3 border-l border-slate-700/60 font-mono text-[10px] text-emerald-400">
          ONLINE • GROUNDED
        </div>
      </div>

      {/* Top KPI Ribbon */}
      <KpiRibbon kpis={analytics?.kpis} bins={bins} />

      {/* Global Notification Banner */}
      {bannerNotice && (
        <div className="px-6 py-2.5 bg-rose-900/90 border-b border-rose-500/50 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
            <strong className="text-white">{bannerNotice.title}:</strong>
            <span className="text-rose-200">{bannerNotice.message}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-rose-300 hover:text-white text-xs font-bold px-2 py-0.5 rounded hover:bg-rose-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full">
        {currentTab === "map" && (
          <div className="flex flex-col h-full">
            <MapCommandCenter
              bins={bins}
              trucks={trucks}
              traffic={traffic}
              routes={routes}
              onSimulateMissed={handleSimulateMissed}
              onSimulateSurge={handleSimulateSurge}
              onSelectBinForDriver={handleSelectBinForDriver}
            />
            <AiDecisionPanel
              decisions={decisions}
              onRunOptimization={() => setCurrentTab("routes")}
            />
          </div>
        )}

        {currentTab === "waste_types" && (
          <div className="p-6 max-w-7xl mx-auto w-full">
            <WasteCompositionView />
          </div>
        )}

        {currentTab === "events" && (
          <div className="p-6 max-w-7xl mx-auto w-full">
            <EventPredictionView />
          </div>
        )}

        {currentTab === "missed_pickups" && (
          <div className="p-6 max-w-7xl mx-auto w-full">
            <MissedPickupsView />
          </div>
        )}

        {currentTab === "routes" && (
          <MultiTruckRouteView initialRoutes={{ routes }} />
        )}

        {currentTab === "driver" && (
          <DriverView
            bins={bins}
            trucks={trucks}
            onPickupSuccess={loadAllData}
          />
        )}

        {currentTab === "simulation" && (
          <WhatIfSandbox
            traffic={traffic}
            trucks={trucks}
          />
        )}

        {currentTab === "analytics" && (
          <AnalyticsAndLearningView
            analytics={analytics}
            modelPerformance={modelPerf}
            onRetrainSuccess={loadAllData}
          />
        )}
      </main>

      {/* Floating Alert Stream Toggle (Shifted left so it doesn't collide with WasteWise AI) */}
      <button
        onClick={() => setIsAlertsOpen(true)}
        className="fixed bottom-6 right-56 z-40 px-3.5 py-2 bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700 rounded-full shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur transition"
        title="Open Alert Stream"
      >
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        <span>Alerts ({alerts.filter(a => a.status === "ACTIVE").length})</span>
      </button>

      {/* Floating WasteWise AI Operational Assistant */}
      <WasteWiseAssistant activeBins={bins} activeTrucks={trucks} />

      {/* Slide-over Alerts Drawer */}
      <AlertsDrawer
        alerts={alerts}
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onSimulateMissed={handleSimulateMissed}
        onRefresh={loadAllData}
      />
    </div>
  );
}


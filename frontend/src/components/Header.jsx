import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  CloudRain, 
  Truck, 
  MapPin, 
  BarChart3, 
  Sliders, 
  Smartphone, 
  AlertTriangle,
  RefreshCw,
  Recycle,
  Calendar,
  AlertOctagon
} from "lucide-react";

export default function Header({ 
  currentTab, 
  setCurrentTab, 
  weather, 
  criticalAlertCount, 
  onRefresh, 
  isRefreshing 
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navTabs = [
    { id: "map", label: "Command Center", icon: MapPin },
    { id: "waste_types", label: "Waste Composition", icon: Recycle },
    { id: "events", label: "Event Surges", icon: Calendar },
    { id: "missed_pickups", label: "Missed Pickups", icon: AlertOctagon },
    { id: "routes", label: "Multi-Truck Routes", icon: Truck },
    { id: "driver", label: "Driver Console", icon: Smartphone },
    { id: "simulation", label: "What-If Sandbox", icon: Sliders },
    { id: "analytics", label: "Post-Collection & ML", icon: BarChart3 },
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      {/* Top Banner */}
      <div className="px-4 py-2 border-b border-slate-800/60 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            AI Core: Online (XGBoost v1.0.0)
          </span>
          <span className="hidden sm:inline-block text-slate-500">|</span>
          <span className="hidden sm:inline-block">
            Smart City Grid: <strong className="text-slate-300">Chennai Urban Center</strong>
          </span>
          <span className="hidden md:inline-block text-slate-500">|</span>
          <span className="hidden md:inline-block font-mono text-emerald-400">
            Tamil: "கழிவை முன்கூட்டியே கணித்து, அபாயத்தைத் தடுத்து, தொடர்ந்து கற்றுக்கொள்"
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Weather status */}
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-700">
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            <span>{weather?.temperature_c || 31}°C</span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-400 font-medium">{weather?.condition || "Monsoon Alert"}</span>
            <span className="text-xs text-sky-300">({weather?.rainfall_mm || 12}mm)</span>
          </div>

          {/* Clock */}
          <span className="font-mono text-slate-300 font-medium hidden lg:inline-block">
            {time.toLocaleTimeString()} IST
          </span>

          {/* Manual Refresh */}
          <button 
            onClick={onRefresh}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Refresh System Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Navigation & Title */}
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/30 border border-emerald-400/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-heading">
                ThooimAI
              </h1>
              <span className="text-emerald-400 font-medium text-sm">தூய்மை AI</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/50 rounded">
                DECISION SUPPORT
              </span>
            </div>
            <p className="text-xs text-slate-400 tracking-wide">
              Adaptive Urban Waste Collection & Environmental Risk Management System
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === "map" && criticalAlertCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {criticalAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

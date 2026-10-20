import React, { useState, useEffect } from "react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from "recharts";
import { 
  Recycle, Upload, Camera, CheckCircle2, AlertCircle, Sparkles, 
  Layers, BarChart3, Filter, RefreshCw, Zap, ShieldAlert, ArrowUpRight
} from "lucide-react";
import { fetchWasteComposition, classifyWaste } from "../services/api";

const CATEGORY_COLORS = {
  "Organic / Wet Waste": "#10b981", // emerald
  "Plastic Waste": "#06b6d4", // cyan
  "Paper & Cardboard": "#f59e0b", // amber
  "Glass": "#3b82f6", // blue
  "Metal & Cans": "#8b5cf6", // violet
  "Electronic Waste (E-Waste)": "#ec4899", // pink
  "Hazardous & Bio-waste": "#ef4444", // red
  "Mixed Municipal Waste": "#64748b", // slate
  "Construction & Demolition": "#d97706" // orange
};

const SAMPLE_INSPECTION_ITEMS = [
  { name: "Discarded Water Bottle & Food Wrapper", category: "Plastic Waste", bin: "BIN-C102" },
  { name: "Vegetable Trimmings & Coconut Shells", category: "Organic / Wet Waste", bin: "BIN-C101" },
  { name: "Packaging Corrugated Cardboard Boxes", category: "Paper & Cardboard", bin: "BIN-C103" },
  { name: "Broken Fluorescent Bulb & Batteries", category: "Hazardous & Bio-waste", bin: "BIN-C104" }
];

export default function WasteCompositionView() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Computer Vision Inspection State
  const [selectedSample, setSelectedSample] = useState(SAMPLE_INSPECTION_ITEMS[0]);
  const [inspecting, setInspecting] = useState(false);
  const [classificationResult, setClassificationResult] = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWasteComposition(period);
      setData(res);
    } catch (err) {
      console.error("Failed to fetch composition", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const handleRunInspection = async (sample = selectedSample) => {
    setInspecting(true);
    try {
      const payload = {
        image_base64: "data:image/jpeg;base64,sampleInspectionData",
        image_name: sample.name,
        bin_id: sample.bin
      };
      const res = await classifyWaste(payload);
      setClassificationResult(res);
      setUploadedImageName(sample.name);
    } catch (err) {
      console.error("Classification failed", err);
    } finally {
      setInspecting(false);
    }
  };

  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedImageName(file.name);
    const mockSample = {
      name: file.name,
      category: file.name.toLowerCase().includes("organic") ? "Organic / Wet Waste" : "Plastic Waste",
      bin: "BIN-C101"
    };
    setSelectedSample(mockSample);
    handleRunInspection(mockSample);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-3" />
        <span>Loading 9-Category Waste Composition Analytics...</span>
      </div>
    );
  }

  const pieData = data?.categories?.map(c => ({
    name: c.name,
    value: c.percentage,
    weight_kg: c.weight_kg,
    color: c.color || CATEGORY_COLORS[c.name] || "#94a3b8"
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
            <Recycle className="w-4 h-4" />
            <span>9-Category Material Flow & Spectrometric Audit</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Urban Waste Type Composition</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit of {data?.total_waste_audited_kg?.toLocaleString()} kg monitored waste across Greater Chennai zones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            {["today", "week", "month"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  period === p ? "bg-emerald-500 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={loadData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Composition Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Donut + Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composition Donut */}
        <div className="lg:col-span-5 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col">
          <h3 className="text-sm font-semibold text-white flex items-center justify-between">
            <span>Material Distribution Ratio</span>
            <span className="text-xs text-emerald-400 font-mono">100% Normalized</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Proportion of physical waste collected in selected window.</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-xs shadow-xl">
                          <div className="font-semibold text-white">{d.name}</div>
                          <div className="text-emerald-400 font-mono mt-1">{d.value}% of total</div>
                          <div className="text-slate-400 font-mono">{d.weight_kg?.toLocaleString()} kg</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-[11px]">
            {pieData.slice(0, 6).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-slate-300 truncate">{c.name}:</span>
                <span className="text-white font-mono ml-auto">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zone Comparison Bar Chart */}
        <div className="lg:col-span-7 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col">
          <h3 className="text-sm font-semibold text-white flex items-center justify-between">
            <span>Zone-Wise Waste Composition (kg)</span>
            <span className="text-xs text-slate-400">T. Nagar • Mylapore • Marina • Adyar</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Comparison of key waste streams across primary municipal collection zones.</p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.zone_comparison || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="zone" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="Organic" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Plastic" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Paper" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Hazardous" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly Trend Area Chart */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Weekly Waste Generation Trajectory</h3>
            <p className="text-xs text-slate-400 mt-0.5">Day-by-day fluctuation showing weekend commercial surges.</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Peak: Sunday (+38% Organic)
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.weekly_trend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPlastic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
              <Area type="monotone" dataKey="organic" stroke="#10b981" fillOpacity={1} fill="url(#colorOrganic)" />
              <Area type="monotone" dataKey="plastic" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPlastic)" />
              <Area type="monotone" dataKey="paper" stroke="#f59e0b" fillOpacity={0.2} fill="#f59e0b" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Computer Vision Photo Inspection Module */}
      <div className="bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 p-6 rounded-2xl border border-emerald-500/30 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
              <Camera className="w-4 h-4" />
              <span>Edge AI Computer Vision</span>
            </div>
            <h3 className="text-lg font-bold text-white">Smart Bin Waste Photo Classification & Contamination Audit</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate or test camera captures to identify waste category, contamination flags, and recyclable yield.
            </p>
          </div>

          <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            <span>Upload Bin Photo</span>
            <input type="file" accept="image/*" onChange={handleCustomUpload} className="hidden" />
          </label>
        </div>

        {/* Sample Selection Bar */}
        <div className="mt-5">
          <div className="text-xs text-slate-400 font-medium mb-2.5">Select Sample Inspection Feed:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SAMPLE_INSPECTION_ITEMS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedSample(item);
                  handleRunInspection(item);
                }}
                className={`p-3 text-left rounded-xl border transition-all ${
                  selectedSample.name === item.name
                    ? "bg-emerald-950/40 border-emerald-500 text-white"
                    : "bg-slate-800/60 border-slate-700/70 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-emerald-400 font-mono">{item.bin}</span>
                  <span className="text-slate-400">{item.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Inspection Result Card */}
        <div className="mt-6 p-5 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
          <div className="w-32 h-32 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col items-center justify-center text-center p-3 shrink-0">
            <Camera className="w-8 h-8 text-emerald-400 mb-2" />
            <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
              {uploadedImageName || selectedSample.name}
            </span>
            <span className="text-[9px] font-mono text-emerald-400 mt-1">CV-V2.1 READY</span>
          </div>

          <div className="flex-1 w-full space-y-3">
            {inspecting ? (
              <div className="flex items-center gap-3 text-emerald-400 text-sm py-6">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Running neural feature extraction on image...</span>
              </div>
            ) : classificationResult ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{classificationResult.waste_type}</span>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono rounded-full">
                      {classificationResult.confidence_pct}% Confidence
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Model: {classificationResult.model_version}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Recyclable</div>
                    <div className="text-white font-semibold mt-0.5 flex items-center gap-1">
                      {classificationResult.recyclable ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{classificationResult.recyclable ? "Yes (Yield High)" : "No (Landfill/Incinerate)"}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Hazard Level</div>
                    <div className={`font-semibold mt-0.5 ${
                      classificationResult.hazard_level === "High" ? "text-rose-400" : "text-emerald-400"
                    }`}>
                      {classificationResult.hazard_level}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Est. Weight</div>
                    <div className="text-white font-mono font-semibold mt-0.5">
                      {classificationResult.estimated_weight_kg} kg
                    </div>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Record Log ID</div>
                    <div className="text-emerald-400 font-mono text-[11px] mt-0.5">
                      #{classificationResult.record_id || "7829"}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Recommended Treatment: </span>
                    <span>{classificationResult.recommended_treatment}</span>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Identified Materials: {classificationResult.materials_identified?.join(", ")}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 py-4">
                Click "Select Sample" or "Upload Bin Photo" above to run automatic computer vision classification.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

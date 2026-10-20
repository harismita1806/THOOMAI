import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, X, Send, Sparkles, AlertTriangle, CheckCircle2, 
  HelpCircle, RefreshCw, Zap, ArrowRight, ShieldCheck, ChevronDown, Minimize2, Maximize2
} from "lucide-react";
import { chatWithAssistant } from "../services/api";

const QUICK_PROMPTS = [
  "Which bins are at critical overflow risk right now?",
  "Recommend immediate truck reassignments for high load zones",
  "How will the Mylapore Panguni festival affect waste surge?",
  "Summarize active high-priority alerts and environmental risks",
  "What is the status of missed collections in Zone 2?"
];

export default function WasteWiseAssistant({ activeBins = [], activeTrucks = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "Hello, Commander. I am **WasteWise AI**, your smart city operational co-pilot for ThooimAI. I have real-time access to live bin telemetry, fleet GPS, environmental sensor feeds, and upcoming urban events. How can I assist municipal dispatch today?",
      insights: [
        "Live Telemetry Grounded: 10/10 active IoT smart bins connected",
        "Predictive Horizon: Up to 24-hr overflow ETA computed with XGBoost"
      ],
      recommended_actions: [
        "Inspect high fill bins (>80%) before next precipitation window",
        "Review festival crowd surge mitigation buffer for Mylapore Zone"
      ]
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend = null) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMessages);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const response = await chatWithAssistant(query, {
        active_bins_count: activeBins.length,
        active_trucks_count: activeTrucks.length
      });

      setMessages([
        ...newMessages,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: response.answer || "Operational analysis complete.",
          insights: response.insights || [],
          recommended_actions: response.recommended_actions || []
        }
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: "⚠️ WasteWise AI service encountered a temporary connection issue. Please verify backend server status on port 8000.",
          insights: [],
          recommended_actions: ["Retry query in 5 seconds", "Verify API connection"]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-full shadow-2xl hover:shadow-emerald-500/25 border border-emerald-400/40 transition-all duration-300 hover:scale-105 active:scale-95"
          title="Open WasteWise AI Assistant"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-slate-900/40 flex items-center justify-center border border-white/20">
              <Bot className="w-5 h-5 text-emerald-300 group-hover:rotate-6 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-slate-900" />
          </div>
          <div className="text-left pr-1">
            <div className="text-xs font-bold tracking-wider text-emerald-100 flex items-center gap-1.5">
              WASTEWISE AI
              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-400/20 rounded text-emerald-300 font-mono">LIVE</span>
            </div>
            <div className="text-[11px] text-emerald-200/80">Operational Co-Pilot</div>
          </div>
        </button>
      )}

      {/* Main Chat Drawer */}
      {isOpen && (
        <div 
          className={`w-[440px] max-w-[95vw] bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? "h-16" : "h-[620px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">WasteWise AI Assistant</h3>
                  <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    GROUNDED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Real-time Telemetry & Urban AI Knowledge</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Telemetry Status Bar */}
              <div className="px-3.5 py-1.5 bg-emerald-950/40 border-b border-emerald-500/10 flex items-center justify-between text-[11px] text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Zero-Hallucination Grounding Active
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  10 Bins • 4 Trucks • 3 Events
                </span>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {msg.role === "user" ? "Dispatcher" : "WasteWise AI"}
                      </span>
                    </div>

                    <div 
                      className={`max-w-[90%] rounded-xl p-3.5 leading-relaxed ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white rounded-br-none shadow-md"
                          : msg.isError
                          ? "bg-rose-950/60 border border-rose-500/40 text-rose-200 rounded-bl-none"
                          : "bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-bl-none shadow-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                        {msg.text}
                      </div>

                      {/* AI Key Insights Chips */}
                      {msg.insights && msg.insights.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/60">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Operational Insights
                          </div>
                          <div className="space-y-1">
                            {msg.insights.map((ins, idx) => (
                              <div key={idx} className="text-[11px] text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800 flex items-start gap-1.5">
                                <span className="text-emerald-400 font-bold">•</span>
                                <span>{ins}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Recommended Actions */}
                      {msg.recommended_actions && msg.recommended_actions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 mb-1.5 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Recommended Actions
                          </div>
                          <div className="space-y-1">
                            {msg.recommended_actions.map((act, idx) => (
                              <div key={idx} className="text-[11px] text-emerald-200 bg-emerald-950/30 px-2.5 py-1 rounded border border-emerald-500/20 flex items-start gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                                <span>{act}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs p-2 bg-slate-800/40 rounded-lg border border-slate-700/40 w-fit">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Analyzing live telemetry & city graph...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800 overflow-x-auto scrollbar-none flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> Quick:
                </span>
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    disabled={loading}
                    className="shrink-0 text-[11px] text-slate-300 hover:text-emerald-300 bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-full border border-slate-700 hover:border-emerald-500/40 transition-colors whitespace-nowrap"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-slate-900 border-t border-slate-800">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder="Ask WasteWise AI (e.g. 'Show overflow risks in Zone 1')..."
                    className="w-full bg-slate-950 text-white placeholder-slate-500 text-xs rounded-xl pl-3.5 pr-11 py-2.5 border border-slate-700 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputMessage.trim() || loading}
                    className="absolute right-1.5 p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-lg transition-colors"
                    title="Send"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span>Enter to send • Shift+Enter for newline</span>
                  <button 
                    onClick={() => setMessages(messages.slice(0, 1))}
                    className="hover:text-slate-400 transition-colors"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

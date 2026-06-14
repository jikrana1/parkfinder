import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface PredictionHour {
  hour: string;
  hourRaw: number;
  availabilityPct: number;
  confidence: "high" | "medium" | "low";
  dataPoints: number;
  label: "High" | "Moderate" | "Limited" | "Full";
}

interface PredictionMeta {
  totalDataPoints: number;
  generatedAt?: string;
  message?: string;
}

interface PredictionPanelProps {
  parkingId: string;
  parkingName: string;
  onClose: () => void;
}

const PredictionPanel: React.FC<PredictionPanelProps> = ({
  parkingId,
  parkingName,
  onClose,
}) => {
  const [predictions, setPredictions] = useState<PredictionHour[]>([]);
  const [meta, setMeta] = useState<PredictionMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { theme } = useTheme();

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/predictions/${parkingId}`);
        const data = await res.json();
        if (data.success) {
          setPredictions(data.data);
          setMeta(data.meta);
        } else {
          setError(data.message || "Failed to load predictions");
        }
      } catch {
        setError("Could not reach the server. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [parkingId]);

  // ── Theme helpers ──────────────────────────────────────────────────────────
  const tc = {
    bg: theme === "light" ? "bg-gray-50" : "bg-[#191919]",
    cardBg: theme === "light" ? "bg-white" : "bg-[#1a1a1a]",
    cardBorder: theme === "light" ? "border-gray-200" : "border-[#1B42CB]/20",
    text: theme === "light" ? "text-gray-900" : "text-[#EEECF6]",
    textSecondary: theme === "light" ? "text-gray-600" : "text-[#EEECF6]/70",
    textMuted: theme === "light" ? "text-gray-400" : "text-[#EEECF6]/40",
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getBarColor = (pct: number) => {
    if (pct >= 70) return "bg-green-500";
    if (pct >= 40) return "bg-yellow-400";
    if (pct > 0) return "bg-orange-400";
    return "bg-red-500";
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case "High":
        return theme === "light"
          ? "text-green-700 bg-green-100"
          : "text-green-300 bg-green-500/20";
      case "Moderate":
        return theme === "light"
          ? "text-yellow-700 bg-yellow-100"
          : "text-yellow-300 bg-yellow-500/20";
      case "Limited":
        return theme === "light"
          ? "text-orange-700 bg-orange-100"
          : "text-orange-300 bg-orange-500/20";
      case "Full":
        return theme === "light"
          ? "text-red-700 bg-red-100"
          : "text-red-300 bg-red-500/20";
      default:
        return tc.textMuted;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return {
          icon: <Icons.CheckCircle2 className="w-3 h-3" />,
          label: "High confidence",
          color:
            theme === "light"
              ? "text-green-700 bg-green-100 border-green-200"
              : "text-green-300 bg-green-500/20 border-green-500/30",
        };
      case "medium":
        return {
          icon: <Icons.AlertCircle className="w-3 h-3" />,
          label: "Medium confidence",
          color:
            theme === "light"
              ? "text-yellow-700 bg-yellow-100 border-yellow-200"
              : "text-yellow-300 bg-yellow-500/20 border-yellow-500/30",
        };
      default:
        return {
          icon: <Icons.HelpCircle className="w-3 h-3" />,
          label: "Low confidence",
          color:
            theme === "light"
              ? "text-gray-600 bg-gray-100 border-gray-200"
              : "text-[#EEECF6]/50 bg-white/5 border-white/10",
        };
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden
          ${tc.cardBg} ${tc.cardBorder}`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1B42CB]/20 bg-gradient-to-r from-[#1B42CB]/10 to-[#FF2F6C]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B42CB] to-[#FF2F6C] flex items-center justify-center">
                <Icons.TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${tc.text}`}>
                  Availability Forecast
                </h2>
                <p className={`text-sm ${tc.textSecondary}`}>{parkingName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close prediction panel"
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${tc.text}`}
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 border-2 border-[#1B42CB]/30 border-t-[#1B42CB] rounded-full animate-spin" />
              <p className={`text-sm ${tc.textSecondary}`}>
                Analyzing historical occupancy data…
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Icons.AlertTriangle className="w-10 h-10 text-[#FF2F6C]" />
              <p className={`text-sm ${tc.textSecondary}`}>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Data quality notice */}
              {meta && meta.totalDataPoints < 3 && (
                <div
                  className={`flex items-start gap-3 mb-5 p-3 rounded-xl border
                  ${theme === "light"
                    ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"}`}
                >
                  <Icons.Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    {meta.message ||
                      "Limited historical data available. Predictions will improve as more bookings are recorded."}
                  </p>
                </div>
              )}

              {/* Prediction bars */}
              <div className="space-y-3">
                <p className={`text-xs font-semibold uppercase tracking-wide ${tc.textMuted} mb-4`}>
                  Next 8 hours · based on {meta?.totalDataPoints ?? 0} historical bookings
                </p>

                {predictions.map((pred, idx) => {
                  const badge = getConfidenceBadge(pred.confidence);
                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center gap-3 mb-1">
                        {/* Time */}
                        <span className={`text-sm font-semibold w-20 shrink-0 ${tc.text}`}>
                          {pred.hour}
                        </span>

                        {/* Bar track */}
                        <div className="flex-1 h-6 rounded-lg bg-black/10 dark:bg-white/5 overflow-hidden relative">
                          <div
                            className={`h-full rounded-lg transition-all duration-700 ${getBarColor(pred.availabilityPct)}`}
                            style={{ width: `${pred.availabilityPct}%` }}
                          />
                          {/* Percentage label inside bar */}
                          <span
                            className="absolute inset-0 flex items-center pl-3 text-xs font-bold text-white mix-blend-plus-lighter"
                          >
                            {pred.availabilityPct}%
                          </span>
                        </div>

                        {/* Availability label */}
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full w-20 text-center shrink-0
                            ${getLabelColor(pred.label)}`}
                        >
                          {pred.label}
                        </span>
                      </div>

                      {/* Confidence badge — shown on hover or always on mobile */}
                      <div className="flex justify-end pl-20">
                        <span
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border
                            opacity-60 group-hover:opacity-100 transition-opacity ${badge.color}`}
                        >
                          {badge.icon}
                          {badge.label}
                          {pred.dataPoints > 0 && (
                            <span className="ml-1 opacity-70">
                              ({pred.dataPoints} pts)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className={`mt-6 pt-4 border-t ${tc.cardBorder} flex flex-wrap gap-x-5 gap-y-2`}>
                <p className={`text-xs ${tc.textMuted} w-full mb-1`}>Legend</p>
                {[
                  { color: "bg-green-500", label: "High (≥70%)" },
                  { color: "bg-yellow-400", label: "Moderate (40–69%)" },
                  { color: "bg-orange-400", label: "Limited (1–39%)" },
                  { color: "bg-red-500", label: "Full (0%)" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className={`text-xs ${tc.textSecondary}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionPanel;

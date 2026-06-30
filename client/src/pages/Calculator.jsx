import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/common/Navbar";
import IndicesTicker from "../components/markets/IndicesTicker";
import { calculateOptionPrice, getModelStatus } from "../api/calculatorApi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import toast from "react-hot-toast";

/* ── Presets ────────────────────────────────────────────── */
const PRESETS = [
  { label: "ATM Nifty", S: 24000, K: 24000, days: 30, r: 6.5, sigma: 15, option_type: "call" },
  { label: "Deep ITM",  S: 24000, K: 23000, days: 30, r: 6.5, sigma: 18, option_type: "call" },
  { label: "Deep OTM",  S: 24000, K: 25500, days: 30, r: 6.5, sigma: 20, option_type: "call" },
  { label: "BANKNIFTY",  S: 51000, K: 51000, days: 14, r: 6.5, sigma: 16, option_type: "call" },
];

/* ── Format helpers ─────────────────────────────────────── */
const fmt = (v, d = 2) => (v == null || isNaN(v) ? "\u2014" : Number(v).toFixed(d));
const fmtRupee = (v) => (v == null || isNaN(v) ? "\u2014" : "\u20B9" + Number(v).toFixed(2));
const fmtPct = (v) => (v == null || isNaN(v) ? "\u2014" : Number(v).toFixed(2) + "%");

/* ── Skeleton shimmer ───────────────────────────────────── */
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-surfaceAlt rounded ${className}`} />
);

/* ── Calculator Page ────────────────────────────────────── */
const Calculator = () => {
  const [form, setForm] = useState({ S: "24000", K: "24000", days: "30", r: "6.5", sigma: "15", option_type: "call" });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);

  const [errors, setErrors] = useState({});
  const [showAccuracy, setShowAccuracy] = useState(false);

  useEffect(() => { getModelStatus().then(setModelStatus).catch(() => {}); }, []);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const applyPreset = (preset) => {
    setForm({ S: String(preset.S), K: String(preset.K), days: String(preset.days), r: String(preset.r), sigma: String(preset.sigma), option_type: preset.option_type });
    setErrors({});
  };

  const validate = () => {
    const e = {};
    const S = parseFloat(form.S); const K = parseFloat(form.K);
    const days = parseFloat(form.days); const r = parseFloat(form.r); const sigma = parseFloat(form.sigma);
    if (!S || S < 0.01 || S > 1000000) e.S = "0.01 to 1,000,000";
    if (!K || K < 0.01 || K > 1000000) e.K = "0.01 to 1,000,000";
    if (!days || days < 1 || days > 3650) e.days = "1 to 3650 days";
    if (isNaN(r) || r < 0 || r > 50) e.r = "0 to 50%";
    if (!sigma || sigma < 0.1 || sigma > 200) e.sigma = "0.1 to 200%";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCalculate = async () => {
    if (!validate()) return;
    setLoading(true); setResults(null);
    try {
      const data = await calculateOptionPrice({
        S: parseFloat(form.S), K: parseFloat(form.K),
        T: parseFloat(form.days) / 365, r: parseFloat(form.r) / 100,
        sigma: parseFloat(form.sigma) / 100, option_type: form.option_type,
      });
      setResults(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Calculation failed";
      toast.error(msg);
    } finally { setLoading(false); }
  };



  const weeksDisplay = form.days ? `= ${(parseFloat(form.days) / 7).toFixed(1)} weeks` : "";

  /* ── Payoff diagram data ─────────────────────────────── */
  const payoffData = useMemo(() => {
    if (!results) return [];
    const K = parseFloat(form.K); const S = parseFloat(form.S);
    const bs = results.black_scholes;
    const low = K * 0.7; const high = K * 1.3; const steps = 60;
    const step = (high - low) / steps;
    const isCall = form.option_type === "call";
    const premium = bs?.price || 0;
    const data = [];
    for (let i = 0; i <= steps; i++) {
      const spot = low + i * step;
      const intrinsic = isCall ? Math.max(spot - K, 0) : Math.max(K - spot, 0);
      const atExpiry = intrinsic - premium;
      /* Approximate current value using BS delta for smooth curve */
      const delta = bs?.delta || 0.5;
      const currentVal = premium + delta * (spot - S) - premium;
      data.push({ spot: Math.round(spot), atExpiry: +atExpiry.toFixed(2), currentValue: +currentVal.toFixed(2) });
    }
    return data;
  }, [results, form.K, form.S, form.option_type]);

  /* ── Greeks rows ─────────────────────────────────────── */
  const greekRows = [
    { key: "delta", label: "Delta", dp: 4, color: form.option_type === "call" ? "text-success" : "text-danger", desc: "Price change per \u20B91 move in underlying" },
    { key: "gamma", label: "Gamma", dp: 6, color: "text-primary", desc: "Delta change per \u20B91 move in underlying" },
    { key: "theta", label: "Theta", dp: 4, color: "text-danger", desc: "Price decay per calendar day" },
    { key: "vega",  label: "Vega",  dp: 4, color: "text-warning", desc: "Price change per 1% vol change" },
    { key: "rho",   label: "Rho",   dp: 4, color: "text-textSecondary", desc: "Price change per 1% rate change" },
  ];




  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <IndicesTicker />

      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-textPrimary">Options Calculator</h1>
          <p className="text-xs text-textSecondary mt-0.5">Hybrid LSTM-CNN vs Black-Scholes vs Monte Carlo</p>
        </div>
        <div className="flex items-center gap-3">
          {modelStatus?.is_trained && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Model Trained ({modelStatus.trained_on || "NSE Nifty Options"})
            </span>
          )}
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── Left: Input Panel ────────────────────────── */}
        <div className="w-full lg:w-[30%] lg:min-w-[340px] border-r border-border bg-surface overflow-y-auto p-5 flex flex-col gap-4">
          <InputField label="Spot Price (\u20B9)" value={form.S} onChange={(v) => handleChange("S", v)} placeholder="24000" error={errors.S} />
          <InputField label="Strike Price (\u20B9)" value={form.K} onChange={(v) => handleChange("K", v)} placeholder="24000" error={errors.K} />
          <InputField label="Days to Expiry" value={form.days} onChange={(v) => handleChange("days", v)} placeholder="30" error={errors.days} helper={weeksDisplay} />
          <InputField label="Risk-Free Rate (%)" value={form.r} onChange={(v) => handleChange("r", v)} placeholder="6.5" error={errors.r} helper="RBI Repo Rate ~6.5%" />
          <InputField label="Implied Volatility (%)" value={form.sigma} onChange={(v) => handleChange("sigma", v)} placeholder="15" error={errors.sigma} helper="Nifty IV typically 12-25%" />

          {/* Toggle */}
          <div>
            <span className="block text-xs text-textMuted mb-1.5">Option Type</span>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {["call", "put"].map((t) => (
                <button key={t} onClick={() => handleChange("option_type", t)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${form.option_type === t
                    ? t === "call" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                    : "bg-surfaceAlt text-textMuted hover:text-textSecondary"}`}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCalculate} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primaryHover text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Calculating..." : "Calculate"}
          </button>

          {/* Presets */}
          <div>
            <span className="block text-xs text-textMuted mb-1.5">Quick Presets</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className="px-2 py-1.5 rounded text-xs bg-surfaceAlt text-textSecondary hover:text-textPrimary hover:bg-border/30 transition-colors truncate">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Results Panel ─────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-background p-5 space-y-5">
          {!results && !loading && (
            <div className="flex items-center justify-center h-64 text-textMuted text-sm">
              Enter parameters and click Calculate to see results
            </div>
          )}

          {/* Price Cards */}
          {(loading || results) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PriceCard title="Black-Scholes" badge="Analytical" data={results?.black_scholes} loading={loading} />
              <MCCard data={results?.monte_carlo} loading={loading} />
              <NNCard data={results?.neural_network} comparison={results?.comparison} loading={loading} />
            </div>
          )}

          {/* Greeks Table */}
          {(loading || results) && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-textPrimary">Option Greeks</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surfaceAlt text-textMuted">
                      <th className="text-left px-4 py-2.5 font-medium">Greek</th>
                      <th className="text-right px-4 py-2.5 font-medium">Black-Scholes</th>
                      <th className="text-right px-4 py-2.5 font-medium">Monte Carlo</th>
                      <th className="text-right px-4 py-2.5 font-medium">LSTM-CNN</th>
                      <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {greekRows.map((g) => (
                      <tr key={g.key} className="border-t border-border/50 hover:bg-surfaceAlt/50 transition-colors">
                        <td className={`px-4 py-2.5 font-semibold ${g.color}`}>{g.label}</td>
                        <td className="text-right px-4 py-2.5 text-textPrimary font-mono">
                          {loading ? <Skeleton className="h-4 w-16 ml-auto" /> : fmt(results?.black_scholes?.[g.key], g.dp)}
                        </td>
                        <td className="text-right px-4 py-2.5 text-textPrimary font-mono">
                          {loading ? <Skeleton className="h-4 w-16 ml-auto" /> : fmt(results?.monte_carlo?.[g.key], g.dp)}
                        </td>
                        <td className="text-right px-4 py-2.5 text-textPrimary font-mono">
                          {loading ? <Skeleton className="h-4 w-16 ml-auto" /> : fmt(results?.neural_network?.[g.key], g.dp)}
                        </td>
                        <td className="px-4 py-2.5 text-textMuted hidden lg:table-cell">{g.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payoff Diagram */}
          {results && payoffData.length > 0 && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-textPrimary mb-3">Payoff Diagram</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={payoffData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2D45" />
                  <XAxis dataKey="spot" tick={{ fill: "#94A3B8", fontSize: 10 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "K"} />
                  <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} tickFormatter={(v) => "\u20B9" + v} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1F2D45", borderRadius: 8, fontSize: 11 }}
                    labelFormatter={(v) => `Spot: \u20B9${v}`}
                    formatter={(v, name) => ["\u20B9" + v, name === "atExpiry" ? "At Expiry" : "Current Value"]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                  <ReferenceLine x={parseFloat(form.S)} stroke="#3B82F6" strokeDasharray="6 3" label={{ value: "Spot", fill: "#3B82F6", fontSize: 10 }} />
                  <ReferenceLine x={parseFloat(form.K)} stroke="#F59E0B" strokeDasharray="6 3" label={{ value: "Strike", fill: "#F59E0B", fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#4B5563" />
                  <Line type="monotone" dataKey="atExpiry" name="At Expiry" stroke="#EF4444" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="currentValue" name="Current Value" stroke="#22C55E" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Accuracy Comparison (collapsible) */}
          {results && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <button onClick={() => setShowAccuracy(!showAccuracy)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surfaceAlt/50 transition-colors">
                <span className="text-sm font-semibold text-textPrimary">Accuracy Comparison</span>
                <span className="text-textMuted text-xs">{showAccuracy ? "Hide" : "Show"}</span>
              </button>
              {showAccuracy && (
                <div className="px-4 pb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-textMuted border-b border-border">
                        <th className="text-left py-2 font-medium">Model</th>
                        <th className="text-right py-2 font-medium">MAPE</th>
                        <th className="text-right py-2 font-medium">R-squared</th>
                        <th className="text-right py-2 font-medium">Speed</th>
                      </tr>
                    </thead>
                    <tbody className="text-textSecondary">
                      <tr className="border-t border-border/50"><td className="py-2">Black-Scholes</td><td className="text-right">~12%</td><td className="text-right">0.82</td><td className="text-right">&lt;1ms</td></tr>
                      <tr className="border-t border-border/50"><td className="py-2">Monte Carlo</td><td className="text-right">~10%</td><td className="text-right">0.85</td><td className="text-right">~500ms</td></tr>
                      <tr className="border-t border-border/50 text-primary font-medium"><td className="py-2">LSTM-CNN</td><td className="text-right">~2%</td><td className="text-right">0.94</td><td className="text-right">~50ms</td></tr>
                    </tbody>
                  </table>
                  <p className="text-[10px] text-textMuted mt-2">
                    Based on our paper: "A Physics-Informed Hybrid LSTM-CNN Ensemble Framework for Robust Option Pricing"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────── */

const InputField = ({ label, value, onChange, placeholder, error, helper }) => (
  <div>
    <label className="block text-xs text-textMuted mb-1">{label}</label>
    <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg bg-surfaceAlt border text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:border-primary transition-colors ${error ? "border-danger" : "border-border"}`} />
    {error && <p className="text-danger text-[10px] mt-0.5">{error}</p>}
    {helper && !error && <p className="text-textMuted text-[10px] mt-0.5">{helper}</p>}
  </div>
);

const PriceCard = ({ title, badge, data, loading }) => (
  <div className="bg-surface rounded-xl border border-border p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-textPrimary">{title}</span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surfaceAlt text-textMuted">{badge}</span>
    </div>
    {loading ? <Skeleton className="h-8 w-28 mb-2" /> : (
      <p className="text-2xl font-bold text-textPrimary mb-1">{fmtRupee(data?.price)}</p>
    )}
    {loading ? <Skeleton className="h-3 w-40" /> : (
      <div className="flex gap-3 text-[10px] text-textSecondary">
        <span>Intrinsic {fmtRupee(data?.intrinsic_value)}</span>
        <span>Time {fmtRupee(data?.time_value)}</span>
      </div>
    )}
  </div>
);

const MCCard = ({ data, loading }) => (
  <div className="bg-surface rounded-xl border border-border p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-textPrimary">Monte Carlo</span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surfaceAlt text-textMuted">10K Sims</span>
    </div>
    {loading ? <Skeleton className="h-8 w-28 mb-2" /> : (
      <p className="text-2xl font-bold text-textPrimary mb-1">{fmtRupee(data?.price)}</p>
    )}
    {loading ? <Skeleton className="h-3 w-48" /> : data && (
      <div className="flex flex-col gap-0.5 text-[10px] text-textSecondary">
        <span>95% CI: [{fmtRupee(data.confidence_interval?.[0])}, {fmtRupee(data.confidence_interval?.[1])}]</span>
        <span>Std Error: {fmtRupee(data.std_error)}</span>
      </div>
    )}
  </div>
);

const NNCard = ({ data, comparison, loading }) => (
  <div className="bg-surface rounded-xl border-2 border-primary/40 p-4 relative">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-textPrimary">LSTM-CNN Ensemble</span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary">Our Model</span>
    </div>
    {loading ? <Skeleton className="h-10 w-32 mb-2" /> : (
      <p className="text-3xl font-bold text-primary mb-1">{fmtRupee(data?.ensemble_price ?? data?.price)}</p>
    )}
    {loading ? <Skeleton className="h-3 w-52" /> : data && (
      <div className="flex flex-col gap-0.5 text-[10px] text-textSecondary">
        <span>BS: 20% | MC: 10% | NN: 70%</span>
        {comparison && (
          <span className={comparison.bs_vs_nn_pct > 0 ? "text-warning" : "text-success"}>
            {fmtPct(comparison.bs_vs_nn_pct)} vs Black-Scholes
          </span>
        )}

      </div>
    )}
  </div>
);

export default Calculator;

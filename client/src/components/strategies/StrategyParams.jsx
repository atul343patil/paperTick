import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { runAnalysis } from "../../store/slices/strategySlice";
import Loader from "../common/Loader";
import toast from "react-hot-toast";

// ── Realistic defaults for each strategy ─────────────────
// Based on Nifty 50 typical values (ATM ~24000, weekly expiry)
// All premiums are realistic approximations for ATM/OTM options
const STRATEGY_DEFAULTS = {
  longStraddle: {
    underlying: 24000,
    atm: 24000, step: 100,
    ceAtm: 180, peAtm: 175,
    lotSize: 25, lots: 1,
  },
  shortStraddle: {
    underlying: 24000,
    atm: 24000, step: 100,
    ceAtm: 180, peAtm: 175,
    lotSize: 25, lots: 1,
  },
  longStrangle: {
    underlying: 24000,
    atm: 24000, step: 200,
    ceOtm: 85, peOtm: 80,
    lotSize: 25, lots: 1,
  },
  shortStrangle: {
    underlying: 24000,
    atm: 24000, step: 200,
    ceOtm: 85, peOtm: 80,
    lotSize: 25, lots: 1,
  },
  bullCallSpread: {
    underlying: 24000,
    atm: 24000, step: 200,
    ceAtm: 180, ceOtm: 85,
    lotSize: 25, lots: 1,
  },
  bearPutSpread: {
    underlying: 24000,
    atm: 24000, step: 200,
    peAtm: 175, peOtm: 80,
    lotSize: 25, lots: 1,
  },
  ironCondor: {
    underlying: 24000,
    atm: 24000, step: 200,
    ceOtm: 85,  peOtm: 80,
    ceWing: 35, peWing: 30,
    lotSize: 25, lots: 1,
  },
  bullPutSpread: {
    underlying: 24000,
    atm: 24000, step: 200,
    peAtm: 175, peOtm: 80,
    lotSize: 25, lots: 1,
  },
  bearCallSpread: {
    underlying: 24000,
    atm: 24000, step: 200,
    ceAtm: 180, ceOtm: 85,
    lotSize: 25, lots: 1,
  },
};

// ── Fields each strategy needs (including underlying always) ─
const STRATEGY_FIELDS = {
  longStraddle:   ["underlying", "atm", "ceAtm", "peAtm", "lotSize", "lots"],
  shortStraddle:  ["underlying", "atm", "ceAtm", "peAtm", "lotSize", "lots"],
  longStrangle:   ["underlying", "atm", "step", "ceOtm", "peOtm", "lotSize", "lots"],
  shortStrangle:  ["underlying", "atm", "step", "ceOtm", "peOtm", "lotSize", "lots"],
  bullCallSpread: ["underlying", "atm", "step", "ceAtm", "ceOtm", "lotSize", "lots"],
  bearPutSpread:  ["underlying", "atm", "step", "peAtm", "peOtm", "lotSize", "lots"],
  ironCondor:     ["underlying", "atm", "step", "ceOtm", "peOtm", "ceWing", "peWing", "lotSize", "lots"],
  bullPutSpread:  ["underlying", "atm", "step", "peAtm", "peOtm", "lotSize", "lots"],
  bearCallSpread: ["underlying", "atm", "step", "ceAtm", "ceOtm", "lotSize", "lots"],
};

const FIELD_LABELS = {
  underlying: "Current Underlying Price (₹)",
  atm:        "ATM Strike Price",
  step:       "Strike Step (distance)",
  ceAtm:      "ATM Call (CE) Premium",
  peAtm:      "ATM Put (PE) Premium",
  ceOtm:      "OTM Call (CE) Premium",
  peOtm:      "OTM Put (PE) Premium",
  ceWing:     "Far OTM Call (Wing CE) Premium",
  peWing:     "Far OTM Put (Wing PE) Premium",
  lotSize:    "Lot Size",
  lots:       "Number of Lots",
};

const FIELD_HELPERS = {
  underlying: "Current Nifty/BankNifty spot price",
  atm:        "Usually nearest round number to underlying",
  step:       "Distance between strikes (e.g. 100, 200, 500)",
  ceAtm:      "Premium of the ATM call option",
  peAtm:      "Premium of the ATM put option",
  ceOtm:      "Premium of the OTM call (higher strike than ATM)",
  peOtm:      "Premium of the OTM put (lower strike than ATM)",
  ceWing:     "Far OTM call used for protection in Iron Condor",
  peWing:     "Far OTM put used for protection in Iron Condor",
  lotSize:    "Nifty=25, BankNifty=15, FinNifty=40",
  lots:       "Number of lots to trade",
};

// ── Compute and display the actual strikes used ───────────
const getStrategyLegsPreview = (strategyId, params) => {
  const { atm = 0, step = 0 } = params;
  const previewMap = {
    longStraddle:   [`BUY ${atm} CE`, `BUY ${atm} PE`],
    shortStraddle:  [`SELL ${atm} CE`, `SELL ${atm} PE`],
    longStrangle:   [`BUY ${atm + step} CE`, `BUY ${atm - step} PE`],
    shortStrangle:  [`SELL ${atm + step} CE`, `SELL ${atm - step} PE`],
    bullCallSpread: [`BUY ${atm} CE`, `SELL ${atm + step} CE`],
    bearPutSpread:  [`BUY ${atm} PE`, `SELL ${atm - step} PE`],
    ironCondor:     [`SELL ${atm + step} CE`, `BUY ${atm + step * 2} CE`, `SELL ${atm - step} PE`, `BUY ${atm - step * 2} PE`],
    bullPutSpread:  [`SELL ${atm} PE`, `BUY ${atm - step} PE`],
    bearCallSpread: [`SELL ${atm} CE`, `BUY ${atm + step} CE`],
  };
  return previewMap[strategyId] || [];
};

const StrategyParams = ({ strategyId }) => {
  const dispatch = useDispatch();
  const { analyzing, result } = useSelector((s) => s.strategy);

  // Initialize with defaults
  const [params, setParams] = useState(STRATEGY_DEFAULTS[strategyId] || {});
  const [isDirty, setIsDirty] = useState(false);
  const [lastAnalyzedParams, setLastAnalyzedParams] = useState(null);

  // ── CRITICAL FIX: Reset params when strategyId changes ──
  useEffect(() => {
    setParams(STRATEGY_DEFAULTS[strategyId] || {});
    setIsDirty(false);
    setLastAnalyzedParams(null);
  }, [strategyId]);

  // Track dirty state — when params change after a successful analysis
  useEffect(() => {
    if (lastAnalyzedParams) {
      const changed = JSON.stringify(params) !== JSON.stringify(lastAnalyzedParams);
      setIsDirty(changed);
    }
  }, [params, lastAnalyzedParams]);

  const fields  = STRATEGY_FIELDS[strategyId] || [];
  const preview = getStrategyLegsPreview(strategyId, params);

  const handleChange = (field, value) => {
    const parsed = parseFloat(value);
    setParams((p) => ({ ...p, [field]: isNaN(parsed) ? "" : parsed }));
  };

  const validate = () => {
    const currentFields = STRATEGY_FIELDS[strategyId] || [];
    for (const f of currentFields) {
      const val = params[f];
      if (val === "" || val === undefined || val === null) {
        toast.error(`Please fill in: ${FIELD_LABELS[f]}`);
        return false;
      }
      if (typeof val === "number" && val <= 0 && f !== "underlying") {
        toast.error(`${FIELD_LABELS[f]} must be greater than 0`);
        return false;
      }
      if (f === "underlying" && (typeof val !== "number" || val <= 0)) {
        toast.error("Underlying price must be greater than 0");
        return false;
      }
    }
    // Validate premium logic
    if (params.ceOtm && params.ceAtm && params.ceOtm >= params.ceAtm) {
      toast.error("OTM Call premium must be less than ATM Call premium");
      return false;
    }
    if (params.peOtm && params.peAtm && params.peOtm >= params.peAtm) {
      toast.error("OTM Put premium must be less than ATM Put premium");
      return false;
    }
    if (params.ceWing && params.ceOtm && params.ceWing >= params.ceOtm) {
      toast.error("Wing CE premium must be less than OTM CE premium");
      return false;
    }
    if (params.peWing && params.peOtm && params.peWing >= params.peOtm) {
      toast.error("Wing PE premium must be less than OTM PE premium");
      return false;
    }
    return true;
  };

  const handleAnalyze = () => {
    if (!validate()) return;
    setLastAnalyzedParams({ ...params });
    setIsDirty(false);
    dispatch(runAnalysis({
      strategyId,
      params,
      underlyingPrice: params.underlying || params.atm,
    }));
  };

  // Group fields for better layout
  const priceFields   = fields.filter((f) => ["underlying", "atm", "step"].includes(f));
  const premiumFields = fields.filter((f) => ["ceAtm","peAtm","ceOtm","peOtm","ceWing","peWing"].includes(f));
  const sizeFields    = fields.filter((f) => ["lotSize","lots"].includes(f));

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-5">

      {/* Section: Price Inputs */}
      {priceFields.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
            Price Parameters
          </p>
          <div className="grid grid-cols-2 gap-3">
            {priceFields.map((field) => (
              <div key={field} className={field === "underlying" ? "col-span-2" : ""}>
                <label className="block text-xs text-textMuted mb-1">
                  {FIELD_LABELS[field]}
                </label>
                <input
                  type="number"
                  value={params[field] ?? ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  min="0"
                  step={field === "step" ? "50" : "1"}
                  className={`input-field text-sm py-2 ${
                    (params[field] === "" || params[field] === undefined)
                      ? "border-warning/50"
                      : ""
                  }`}
                  placeholder={STRATEGY_DEFAULTS[strategyId]?.[field] ?? ""}
                />
                {FIELD_HELPERS[field] && (
                  <p className="text-xs text-textMuted mt-0.5">
                    {FIELD_HELPERS[field]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legs Preview — shows user exactly what strikes are used */}
      {preview.length > 0 && params.atm > 0 && (
        <div className="bg-surfaceAlt rounded-lg p-3">
          <p className="text-xs text-textMuted mb-2 font-medium">
            Strategy Legs (computed from above values)
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.map((leg, i) => {
              const isBuy = leg.startsWith("BUY");
              return (
                <span
                  key={i}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${
                    isBuy
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-danger/10 text-danger border-danger/20"
                  }`}
                >
                  {leg}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: Premium Inputs */}
      {premiumFields.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
            Option Premiums (₹)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {premiumFields.map((field) => (
              <div key={field}>
                <label className="block text-xs text-textMuted mb-1">
                  {FIELD_LABELS[field]}
                </label>
                <input
                  type="number"
                  value={params[field] ?? ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  min="0.5"
                  step="0.5"
                  className={`input-field text-sm py-2 ${
                    (params[field] === "" || params[field] === undefined)
                      ? "border-warning/50"
                      : ""
                  }`}
                  placeholder={STRATEGY_DEFAULTS[strategyId]?.[field] ?? ""}
                />
                {FIELD_HELPERS[field] && (
                  <p className="text-xs text-textMuted mt-0.5">
                    {FIELD_HELPERS[field]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Lot Size */}
      {sizeFields.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
            Position Size
          </p>
          <div className="grid grid-cols-2 gap-3">
            {sizeFields.map((field) => (
              <div key={field}>
                <label className="block text-xs text-textMuted mb-1">
                  {FIELD_LABELS[field]}
                </label>
                <input
                  type="number"
                  value={params[field] ?? ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  min="1"
                  step="1"
                  className="input-field text-sm py-2"
                  placeholder={STRATEGY_DEFAULTS[strategyId]?.[field] ?? ""}
                />
                {FIELD_HELPERS[field] && (
                  <p className="text-xs text-textMuted mt-0.5">
                    {FIELD_HELPERS[field]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stale warning */}
      {isDirty && result && (
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
          <p className="text-xs text-warning">
            Parameters changed — click Analyze to update the chart
          </p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {analyzing
          ? <><Loader size="sm" /> Analyzing...</>
          : result ? "Re-Analyze Strategy" : "Analyze Strategy"}
      </button>
    </div>
  );
};

export default StrategyParams;
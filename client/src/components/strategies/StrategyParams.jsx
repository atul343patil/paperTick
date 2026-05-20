import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { runAnalysis, setSelectedStrategy } from "../../store/slices/strategySlice";
import Loader from "../common/Loader";

// Default premiums and params for each strategy
const STRATEGY_DEFAULTS = {
  longStraddle:  { atm: 22500, step: 50, ceAtm: 180, peAtm: 165, lotSize: 50, lots: 1 },
  shortStraddle: { atm: 22500, step: 50, ceAtm: 180, peAtm: 165, lotSize: 50, lots: 1 },
  longStrangle:  { atm: 22500, step: 100, ceOtm: 90, peOtm: 80, lotSize: 50, lots: 1 },
  shortStrangle: { atm: 22500, step: 100, ceOtm: 90, peOtm: 80, lotSize: 50, lots: 1 },
  bullCallSpread:{ atm: 22500, step: 100, ceAtm: 180, ceOtm: 80, lotSize: 50, lots: 1 },
  bearPutSpread: { atm: 22500, step: 100, peAtm: 165, peOtm: 70, lotSize: 50, lots: 1 },
  ironCondor:    { atm: 22500, step: 100, ceOtm: 90, peOtm: 80, ceWing: 40, peWing: 35, lotSize: 50, lots: 1 },
  bullPutSpread: { atm: 22500, step: 100, peAtm: 165, peOtm: 70, lotSize: 50, lots: 1 },
  bearCallSpread:{ atm: 22500, step: 100, ceAtm: 180, ceOtm: 80, lotSize: 50, lots: 1 },
};

// Which fields each strategy needs
const STRATEGY_FIELDS = {
  longStraddle:  ["atm", "ceAtm", "peAtm", "lotSize", "lots"],
  shortStraddle: ["atm", "ceAtm", "peAtm", "lotSize", "lots"],
  longStrangle:  ["atm", "step", "ceOtm", "peOtm", "lotSize", "lots"],
  shortStrangle: ["atm", "step", "ceOtm", "peOtm", "lotSize", "lots"],
  bullCallSpread:["atm", "step", "ceAtm", "ceOtm", "lotSize", "lots"],
  bearPutSpread: ["atm", "step", "peAtm", "peOtm", "lotSize", "lots"],
  ironCondor:    ["atm", "step", "ceOtm", "peOtm", "ceWing", "peWing", "lotSize", "lots"],
  bullPutSpread: ["atm", "step", "peAtm", "peOtm", "lotSize", "lots"],
  bearCallSpread:["atm", "step", "ceAtm", "ceOtm", "lotSize", "lots"],
};

const FIELD_LABELS = {
  atm:     "ATM Strike",
  step:    "Strike Step",
  ceAtm:   "ATM CE Premium",
  peAtm:   "ATM PE Premium",
  ceOtm:   "OTM CE Premium",
  peOtm:   "OTM PE Premium",
  ceWing:  "Wing CE Premium",
  peWing:  "Wing PE Premium",
  lotSize: "Lot Size",
  lots:    "Number of Lots",
};

const StrategyParams = ({ strategyId }) => {
  const dispatch = useDispatch();
  const { analyzing } = useSelector((s) => s.strategy);

  const defaultParams = STRATEGY_DEFAULTS[strategyId] || {};
  const fields = STRATEGY_FIELDS[strategyId] || [];
  const [params, setParams] = useState(defaultParams);

  const handleChange = (field, value) => {
    setParams((p) => ({ ...p, [field]: parseFloat(value) || 0 }));
  };

  const handleAnalyze = () => {
    dispatch(runAnalysis({
      strategyId,
      params,
      underlyingPrice: params.atm,
    }));
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-4">
        Strategy Parameters
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {fields.map((field) => (
          <div key={field}>
            <label className="block text-xs text-textMuted mb-1">
              {FIELD_LABELS[field]}
            </label>
            <input
              type="number"
              value={params[field] ?? ""}
              onChange={(e) => handleChange(field, e.target.value)}
              min="0"
              step={field.includes("Premium") || field.includes("Wing") ? "0.5" : "1"}
              className="input-field text-sm py-2"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {analyzing ? <><Loader size="sm" /> Analyzing...</> : "Analyze Strategy"}
      </button>
    </div>
  );
};

export default StrategyParams;
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Trash2 } from "lucide-react";
import {
  addCustomLeg, removeCustomLeg, updateCustomLeg,
  clearCustomLegs, runCustomAnalysis,
} from "../../store/slices/strategySlice";
import Loader from "../common/Loader";
import toast from "react-hot-toast";

const EMPTY_LEG = {
  optionType: "CE",
  action: "BUY",
  strike: 24000,
  premium: 100,
  lots: 1,
  lotSize: 25,
};

const CustomStrategyBuilder = () => {
  const dispatch = useDispatch();
  const { customLegs, analyzing } = useSelector((s) => s.strategy);
  const [underlying, setUnderlying] = useState(24000);

  const handleAdd = () => {
    if (customLegs.length >= 8) {
      toast.error("Maximum 8 legs allowed."); return;
    }
    dispatch(addCustomLeg({ ...EMPTY_LEG }));
  };

  const handleUpdate = (index, field, value) => {
    dispatch(updateCustomLeg({ index, field, value }));
  };

  const handleAnalyze = () => {
    if (customLegs.length === 0) {
      toast.error("Add at least one leg."); return;
    }
    if (!underlying || underlying <= 0) {
      toast.error("Enter a valid underlying price."); return;
    }
    dispatch(runCustomAnalysis({
      legs: customLegs,
      underlyingPrice: underlying,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
          Custom Strategy Builder
        </p>
        <div className="flex gap-2">
          {customLegs.length > 0 && (
            <button
              onClick={() => dispatch(clearCustomLegs())}
              className="text-xs text-textMuted hover:text-danger px-2 py-1 rounded transition-colors"
            >
              Clear All
            </button>
          )}
          <button onClick={handleAdd} className="btn-ghost text-xs flex items-center gap-1 py-1.5">
            <Plus size={13} /> Add Leg
          </button>
        </div>
      </div>

      {/* Underlying Price — FIX: separate field instead of using first leg's strike */}
      <div className="bg-surfaceAlt rounded-lg p-3">
        <label className="block text-xs text-textMuted mb-1.5">
          Current Underlying Price (₹)
        </label>
        <input
          type="number"
          value={underlying}
          min="1"
          step="50"
          onChange={(e) => setUnderlying(parseFloat(e.target.value) || 0)}
          placeholder="e.g. 24000 for Nifty"
          className="input-field text-sm py-2"
        />
        <p className="text-xs text-textMuted mt-1">
          Used to center the payoff chart around current market levels
        </p>
      </div>

      {customLegs.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-textMuted text-sm mb-2">No legs added yet</p>
          <p className="text-textMuted text-xs">Click "Add Leg" to start building your strategy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customLegs.map((leg, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-textSecondary">Leg {i + 1}</span>
                <button
                  onClick={() => dispatch(removeCustomLeg(i))}
                  className="text-textMuted hover:text-danger transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Action */}
                <div>
                  <label className="text-xs text-textMuted block mb-1">Action</label>
                  <div className="flex gap-1">
                    {["BUY", "SELL"].map((a) => (
                      <button
                        key={a}
                        onClick={() => handleUpdate(i, "action", a)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${
                          leg.action === a
                            ? a === "BUY"
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-danger/10 text-danger border-danger/30"
                            : "border-border text-textMuted hover:text-textSecondary"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Option Type */}
                <div>
                  <label className="text-xs text-textMuted block mb-1">Type</label>
                  <div className="flex gap-1">
                    {["CE", "PE"].map((t) => (
                      <button
                        key={t}
                        onClick={() => handleUpdate(i, "optionType", t)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors border ${
                          leg.optionType === t
                            ? t === "CE"
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-danger/10 text-danger border-danger/30"
                            : "border-border text-textMuted hover:text-textSecondary"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lots */}
                <div>
                  <label className="text-xs text-textMuted block mb-1">Lots</label>
                  <input
                    type="number"
                    value={leg.lots}
                    min="1"
                    onChange={(e) => handleUpdate(i, "lots", parseInt(e.target.value) || 1)}
                    className="input-field text-xs py-1.5"
                  />
                </div>

                {/* Strike */}
                <div>
                  <label className="text-xs text-textMuted block mb-1">Strike</label>
                  <input
                    type="number"
                    value={leg.strike}
                    min="0"
                    onChange={(e) => handleUpdate(i, "strike", parseFloat(e.target.value) || 0)}
                    className="input-field text-xs py-1.5"
                  />
                </div>

                {/* Premium */}
                <div>
                  <label className="text-xs text-textMuted block mb-1">Premium</label>
                  <input
                    type="number"
                    value={leg.premium}
                    min="0"
                    step="0.5"
                    onChange={(e) => handleUpdate(i, "premium", parseFloat(e.target.value) || 0)}
                    className="input-field text-xs py-1.5"
                  />
                </div>

                {/* Lot Size */}
                <div>
                  <label className="text-xs text-textMuted block mb-1">Lot Size</label>
                  <input
                    type="number"
                    value={leg.lotSize}
                    min="1"
                    onChange={(e) => handleUpdate(i, "lotSize", parseInt(e.target.value) || 1)}
                    className="input-field text-xs py-1.5"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {customLegs.length > 0 && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {analyzing ? <><Loader size="sm" /> Analyzing...</> : "Analyze Custom Strategy"}
        </button>
      )}
    </div>
  );
};

export default CustomStrategyBuilder;
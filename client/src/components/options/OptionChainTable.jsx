import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { formatVolume } from "../../utils/formatters";
import Loader from "../common/Loader";

// ATM = within 0.5% of underlying, ITM/OTM based on option type
const getMoneyness = (strike, underlying, optionType) => {
  const pct = ((strike - underlying) / underlying) * 100;
  if (Math.abs(pct) < 0.5) return "ATM";
  if (optionType === "CE") return pct < 0 ? "ITM" : "OTM";
  return pct > 0 ? "ITM" : "OTM";
};

const OIBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1 bg-surfaceAlt rounded-full mt-0.5">
      <div className={`h-1 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const OptionChainTable = ({ onSelectOption }) => {
  const { chain, chainLoading, selectedExpiry } = useSelector((s) => s.options);
  const [atmRange, setAtmRange] = useState(10); // strikes above/below ATM to show

  const { rows, atm, maxCEOI, maxPEOI } = useMemo(() => {
    if (!chain) return { rows: [], atm: null, maxCEOI: 0, maxPEOI: 0 };

    const underlying = chain.underlyingValue;
    const filtered = selectedExpiry
      ? chain.strikes.filter((s) => s.expiryDate === selectedExpiry)
      : chain.strikes;

    // Find ATM strike
    const atm = filtered.reduce((closest, s) =>
      Math.abs(s.strikePrice - underlying) < Math.abs(closest.strikePrice - underlying)
        ? s : closest
    , filtered[0] || { strikePrice: 0 });

    // Filter to ±atmRange strikes
    const atmIdx = filtered.findIndex((s) => s.strikePrice === atm?.strikePrice);
    const start  = Math.max(0, atmIdx - atmRange);
    const end    = Math.min(filtered.length, atmIdx + atmRange + 1);
    const rows   = filtered.slice(start, end);

    const maxCEOI = Math.max(...rows.map((r) => r.CE?.openInterest || 0), 1);
    const maxPEOI = Math.max(...rows.map((r) => r.PE?.openInterest || 0), 1);

    return { rows, atm, maxCEOI, maxPEOI };
  }, [chain, selectedExpiry, atmRange]);

  if (chainLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader />
      </div>
    );
  }

  if (!chain) return null;

  const underlying = chain.underlyingValue;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[900px]">
        <thead>
          <tr className="border-b border-border">
            {/* CE headers */}
            <th colSpan={6} className="text-center py-2 text-success font-semibold bg-success/5 border-r border-border">
              CALLS (CE)
            </th>
            {/* Strike */}
            <th className="text-center py-2 px-4 text-textSecondary font-semibold w-28">
              STRIKE
            </th>
            {/* PE headers */}
            <th colSpan={6} className="text-center py-2 text-danger font-semibold bg-danger/5">
              PUTS (PE)
            </th>
          </tr>
          <tr className="border-b border-border text-textMuted">
            {["OI", "Vol", "IV", "LTP", "Chg", "Bid/Ask"].map((h) => (
              <th key={`ce-${h}`} className="text-right px-2 py-2 font-medium">{h}</th>
            ))}
            <th className="text-center px-4 py-2 font-semibold text-textSecondary">Price</th>
            {["Bid/Ask", "Chg", "LTP", "IV", "Vol", "OI"].map((h) => (
              <th key={`pe-${h}`} className="text-left px-2 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { strikePrice, CE, PE } = row;
            const moneynessCE = CE ? getMoneyness(strikePrice, underlying, "CE") : null;
            const moneynessLabel = moneynessCE;

            const isATM = moneynessLabel === "ATM";
            const isCEITM = moneynessCE === "ITM";
            const isPEITM = PE ? getMoneyness(strikePrice, underlying, "PE") === "ITM" : false;

            return (
              <tr
                key={strikePrice}
                className={`border-b border-border/50 transition-colors ${
                  isATM ? "bg-primary/5" : "hover:bg-surfaceAlt/50"
                }`}
              >
                {/* ── CE side ── */}
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <div className="text-textSecondary">{formatVolume(CE?.openInterest)}</div>
                  <OIBar value={CE?.openInterest || 0} max={maxCEOI} color="bg-success/50" />
                </td>
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <span className="text-textSecondary">{formatVolume(CE?.totalTradedVolume)}</span>
                </td>
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <span className="text-textMuted">{CE?.impliedVolatility?.toFixed(2) ?? "—"}</span>
                </td>
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <button
                    onClick={() => CE && onSelectOption({ ...row, optionType: "CE", premium: CE.lastPrice, underlying: chain.symbol })}
                    className="font-semibold text-textPrimary hover:text-success transition-colors"
                  >
                    {CE?.lastPrice?.toFixed(2) ?? "—"}
                  </button>
                </td>
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <span className={CE?.change >= 0 ? "text-success" : "text-danger"}>
                    {CE?.change >= 0 ? "+" : ""}{CE?.change?.toFixed(2) ?? "—"}
                  </span>
                </td>
                <td className={`px-2 py-2.5 text-right border-r border-border ${isCEITM ? "bg-success/5" : ""}`}>
                  <span className="text-textMuted">
                    {CE?.bidprice?.toFixed(1)} / {CE?.askPrice?.toFixed(1)}
                  </span>
                </td>

                {/* ── Strike cell ── */}
                <td className="px-4 py-2.5 text-center w-28">
                  <div className="flex flex-col items-center">
                    <span className={`font-bold text-sm ${isATM ? "text-primary" : "text-textPrimary"}`}>
                      {strikePrice.toLocaleString("en-IN")}
                    </span>
                    {isATM && (
                      <span className="text-primary text-xs font-semibold bg-primary/10 px-1.5 py-0.5 rounded mt-0.5">
                        ATM
                      </span>
                    )}
                    {!isATM && (
                      <span className={`text-xs px-1 rounded mt-0.5 ${
                        isCEITM ? "text-success/60" : "text-textMuted"
                      }`}>
                        {moneynessCE}
                      </span>
                    )}
                  </div>
                </td>

                {/* ── PE side ── */}
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <span className="text-textMuted">
                    {PE?.bidprice?.toFixed(1)} / {PE?.askPrice?.toFixed(1)}
                  </span>
                </td>
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <span className={PE?.change >= 0 ? "text-success" : "text-danger"}>
                    {PE?.change >= 0 ? "+" : ""}{PE?.change?.toFixed(2) ?? "—"}
                  </span>
                </td>
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <button
                    onClick={() => PE && onSelectOption({ ...row, optionType: "PE", premium: PE.lastPrice, underlying: chain.symbol })}
                    className="font-semibold text-textPrimary hover:text-danger transition-colors"
                  >
                    {PE?.lastPrice?.toFixed(2) ?? "—"}
                  </button>
                </td>
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <span className="text-textMuted">{PE?.impliedVolatility?.toFixed(2) ?? "—"}</span>
                </td>
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <span className="text-textSecondary">{formatVolume(PE?.totalTradedVolume)}</span>
                </td>
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <div className="text-textSecondary">{formatVolume(PE?.openInterest)}</div>
                  <OIBar value={PE?.openInterest || 0} max={maxPEOI} color="bg-danger/50" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OptionChainTable;
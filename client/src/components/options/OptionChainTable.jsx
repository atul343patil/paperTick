import { useMemo, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { formatVolume } from "../../utils/formatters";
import Loader from "../common/Loader";

const OIBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1 bg-surfaceAlt rounded-full mt-0.5">
      <div className={`h-1 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const OptionChainTable = ({ onSelectOption, onAddToBasket }) => {
  const { chain, chainLoading, selectedExpiry } = useSelector((s) => s.options);
  const atmRowRef = useRef(null);

  const { rows, maxCEOI, maxPEOI } = useMemo(() => {
    if (!chain) return { rows: [], maxCEOI: 0, maxPEOI: 0 };
    const filtered = selectedExpiry
      ? chain.strikes.filter((s) => s.expiryDate === selectedExpiry)
      : chain.strikes;
    const atmIdx = filtered.findIndex((s) => s.isATM);
    const atmRange = 10;
    const start = Math.max(0, atmIdx - atmRange);
    const end = Math.min(filtered.length, atmIdx + atmRange + 1);
    const rows = filtered.slice(start, end);
    const maxCEOI = Math.max(...rows.map((r) => r.CE?.openInterest || 0), 1);
    const maxPEOI = Math.max(...rows.map((r) => r.PE?.openInterest || 0), 1);
    return { rows, maxCEOI, maxPEOI };
  }, [chain, selectedExpiry]);

  useEffect(() => {
    if (atmRowRef.current) {
      atmRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [rows]);

  if (chainLoading) return <div className="flex items-center justify-center py-20"><Loader /></div>;
  if (!chain) return null;

  const BSButtons = ({ row, side }) => {
    const opt = side === "CE" ? row.CE : row.PE;
    return (
      <div className="opacity-0 group-hover/cell:opacity-100 flex gap-0.5 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onAddToBasket?.({ ...row, optionType: side, premium: opt?.lastPrice, underlying: chain.symbol }, "BUY"); }}
          className="px-1 py-0.5 rounded text-xs font-bold bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors">B</button>
        <button onClick={(e) => { e.stopPropagation(); onAddToBasket?.({ ...row, optionType: side, premium: opt?.lastPrice, underlying: chain.symbol }, "SELL"); }}
          className="px-1 py-0.5 rounded text-xs font-bold bg-danger/20 text-danger hover:bg-danger hover:text-white transition-colors">S</button>
      </div>
    );
  };

  const PctChg = ({ val }) => (
    <span className={!val || val === 0 ? "text-textMuted" : val > 0 ? "text-success" : "text-danger"}>
      {!val || val === 0 ? "—" : `${val > 0 ? "+" : ""}${val.toFixed(2)}%`}
    </span>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[900px]">
        <thead>
          <tr className="border-b border-border">
            <th colSpan={5} className="text-center py-2 text-success font-semibold bg-success/5 border-r border-border">CALLS (CE)</th>
            <th className="text-center py-2 px-4 text-textSecondary font-semibold w-28">STRIKE</th>
            <th colSpan={5} className="text-center py-2 text-danger font-semibold bg-danger/5">PUTS (PE)</th>
          </tr>
          <tr className="border-b border-border text-textMuted">
            {["OI", "Vol", "IV", "LTP", "Bid/Ask"].map((h) => (
              <th key={`ce-${h}`} className="text-right px-2 py-2 font-medium">{h}</th>
            ))}
            <th className="text-center px-4 py-2 font-semibold text-textSecondary">Price</th>
            {["Bid/Ask", "LTP", "IV", "Vol", "OI"].map((h) => (
              <th key={`pe-${h}`} className="text-left px-2 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { strikePrice, CE, PE } = row;
            const isATM = row.isATM;
            const isCEITM = row.ceMoneyness === "ITM";
            const isPEITM = row.peMoneyness === "ITM";
            return (
              <tr key={strikePrice} ref={isATM ? atmRowRef : null}
                className={`border-b border-border/50 transition-colors ${isATM ? "bg-primary/5" : "hover:bg-surfaceAlt/50"}`}>
                {/* CE OI */}
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <div className="text-textSecondary">{formatVolume(CE?.openInterest)}</div>
                  <OIBar value={CE?.openInterest || 0} max={maxCEOI} color="bg-success/50" />
                </td>
                {/* CE Vol */}
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <span className="text-textSecondary">{formatVolume(CE?.totalTradedVolume)}</span>
                </td>
                {/* CE IV */}
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <span className="text-textMuted">{CE?.impliedVolatility?.toFixed(2) ?? "—"}</span>
                </td>
                {/* CE LTP + B/S */}
                <td className={`px-2 py-2.5 text-right ${isCEITM ? "bg-success/5" : ""}`}>
                  <div className="flex items-center justify-end gap-1 group/cell">
                    <BSButtons row={row} side="CE" />
                    <button onClick={() => CE && onSelectOption({ ...row, optionType: "CE", premium: CE.lastPrice, underlying: chain.symbol, expiry: row.expiryDate || selectedExpiry })}
                      className="font-semibold text-textPrimary hover:text-success transition-colors text-right">
                      {CE?.lastPrice?.toFixed(2) ?? "—"}
                    </button>
                  </div>
                </td>

                {/* CE Bid/Ask */}
                <td className={`px-2 py-2.5 text-right border-r border-border ${isCEITM ? "bg-success/5" : ""}`}>
                  <span className="text-textMuted">{CE?.bidprice?.toFixed(1)} / {CE?.askPrice?.toFixed(1)}</span>
                </td>
                {/* Strike */}
                <td className="px-4 py-2.5 text-center w-28">
                  <span className={`font-bold text-sm ${isATM ? "text-primary" : "text-textPrimary"}`}>{strikePrice.toLocaleString("en-IN")}</span>
                </td>
                {/* PE Bid/Ask */}
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <span className="text-textMuted">{PE?.bidprice?.toFixed(1)} / {PE?.askPrice?.toFixed(1)}</span>
                </td>

                {/* PE LTP + B/S */}
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <div className="flex items-center gap-1 group/cell">
                    <button onClick={() => PE && onSelectOption({ ...row, optionType: "PE", premium: PE.lastPrice, underlying: chain.symbol, expiry: row.expiryDate || selectedExpiry })}
                      className="font-semibold text-textPrimary hover:text-danger transition-colors text-left">
                      {PE?.lastPrice?.toFixed(2) ?? "—"}
                    </button>
                    <BSButtons row={row} side="PE" />
                  </div>
                </td>
                {/* PE IV */}
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <span className="text-textMuted">{PE?.impliedVolatility?.toFixed(2) ?? "—"}</span>
                </td>
                {/* PE Vol */}
                <td className={`px-2 py-2.5 text-left ${isPEITM ? "bg-danger/5" : ""}`}>
                  <span className="text-textSecondary">{formatVolume(PE?.totalTradedVolume)}</span>
                </td>
                {/* PE OI */}
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
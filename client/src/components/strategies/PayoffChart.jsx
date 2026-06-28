import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { useSelector } from "react-redux";
import { formatINR } from "../../utils/formatters";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const payoff = payload.find((p) => p.dataKey === "payoff")?.value;
  if (payoff == null) return null;
  const isProfit = payoff >= 0;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl text-xs min-w-[140px]">
      <p className="text-textMuted mb-1">
        Spot: <span className="text-textPrimary font-semibold">
          ₹{Number(label).toLocaleString("en-IN")}
        </span>
      </p>
      <p className={`font-bold text-sm ${isProfit ? "text-success" : "text-danger"}`}>
        {isProfit ? "Profit: " : "Loss: "}{formatINR(Math.abs(payoff))}
      </p>
    </div>
  );
};

const PayoffChart = () => {
  const { result } = useSelector((s) => s.strategy);
  if (!result) return null;

  const { payoffCurve, metrics } = result;
  if (!payoffCurve || payoffCurve.length === 0) return null;

  // FIX: Use null instead of 0 so Recharts doesn't draw flat line at y=0
  const data = payoffCurve.map((p) => ({
    spot:       p.spot,
    payoff:     p.payoff,
    profitArea: p.payoff >= 0 ? p.payoff : null,
    lossArea:   p.payoff < 0  ? p.payoff : null,
  }));

  // FIX: Snap breakeven x-values to nearest data point
  const spotValues = data.map((d) => d.spot);
  const snapToData = (value) => {
    return spotValues.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
  };

  // Y axis domain with padding
  const payoffs   = data.map((d) => d.payoff);
  const minPayoff = Math.min(...payoffs);
  const maxPayoff = Math.max(...payoffs);
  const padding   = Math.abs(maxPayoff - minPayoff) * 0.15 || 1000;
  const yMin      = minPayoff - padding;
  const yMax      = maxPayoff + padding;

  const fmtY = (v) => {
    if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
    if (Math.abs(v) >= 1000)   return `${(v / 1000).toFixed(1)}K`;
    return `${v}`;
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
          Payoff at Expiry
        </p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-success/30 inline-block rounded border border-success/50" />
            <span className="text-textMuted">Profit zone</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-danger/30 inline-block rounded border border-danger/50" />
            <span className="text-textMuted">Loss zone</span>
          </span>
          {metrics.breakevens.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-warning inline-block" style={{ borderTop: "2px dashed #F59E0B" }} />
              <span className="text-textMuted">Breakeven</span>
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2236" />
          <XAxis
            dataKey="spot"
            tickFormatter={(v) => {
              if (v >= 100000) return `${(v/100000).toFixed(1)}L`;
              if (v >= 1000)   return `${(v/1000).toFixed(0)}K`;
              return `${v}`;
            }}
            tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "Poppins" }}
            axisLine={{ stroke: "#1F2D45" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={fmtY}
            tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "Poppins" }}
            axisLine={{ stroke: "#1F2D45" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Zero reference line */}
          <ReferenceLine y={0} stroke="#4B5563" strokeWidth={1.5} />

          {/* Breakeven lines snapped to nearest data point */}
          {metrics.breakevens.map((be, i) => (
            <ReferenceLine
              key={i}
              x={snapToData(be)}
              stroke="#F59E0B"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: `BE ₹${Math.round(be).toLocaleString("en-IN")}`,
                position: "top",
                fill: "#F59E0B",
                fontSize: 10,
                fontFamily: "Poppins",
                fontWeight: "600",
              }}
            />
          ))}

          {/* Current underlying reference line */}
          {result.underlyingPrice && (
            <ReferenceLine
              x={snapToData(result.underlyingPrice)}
              stroke="#3B82F6"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: "Current", position: "insideTopRight", fill: "#3B82F6", fontSize: 9, fontFamily: "Poppins" }}
            />
          )}

          {/* Profit/Loss areas with connectNulls=false */}
          <Area type="monotone" dataKey="profitArea" stroke="#22C55E" strokeWidth={0}
            fill="#22C55E" fillOpacity={0.18} connectNulls={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="lossArea" stroke="#EF4444" strokeWidth={0}
            fill="#EF4444" fillOpacity={0.18} connectNulls={false} isAnimationActive={false} />

          {/* Main payoff line */}
          <Line type="monotone" dataKey="payoff" stroke="#3B82F6" strokeWidth={2.5}
            dot={false} activeDot={{ r: 5, fill: "#3B82F6", stroke: "#111827", strokeWidth: 2 }}
            isAnimationActive={true} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Breakeven summary */}
      {metrics.breakevens.length > 0 && (
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          {metrics.breakevens.map((be, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" />
              <span className="text-textMuted">
                Breakeven{metrics.breakevens.length > 1 ? ` ${i + 1}` : ""}:
              </span>
              <span className="text-warning font-semibold">
                ₹{Math.round(be).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PayoffChart;
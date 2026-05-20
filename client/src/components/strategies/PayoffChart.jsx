import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend,
} from "recharts";
import { useSelector } from "react-redux";
import { formatINR } from "../../utils/formatters";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const payoff = payload[0]?.value;
  const isProfit = payoff >= 0;

  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-textMuted mb-1">Spot: <span className="text-textPrimary font-medium">₹{Number(label).toLocaleString("en-IN")}</span></p>
      <p className={`font-semibold ${isProfit ? "text-success" : "text-danger"}`}>
        P&L: {formatINR(payoff)}
      </p>
    </div>
  );
};

const PayoffChart = () => {
  const { result } = useSelector((s) => s.strategy);
  if (!result) return null;

  const { payoffCurve, metrics } = result;

  // Split into profit/loss zones for area shading
  const data = payoffCurve.map((p) => ({
    spot:   p.spot,
    payoff: p.payoff,
    profit: p.payoff >= 0 ? p.payoff : 0,
    loss:   p.payoff < 0  ? p.payoff : 0,
  }));

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
          Payoff at Expiry
        </p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-success inline-block rounded" />
            <span className="text-textMuted">Profit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-danger inline-block rounded" />
            <span className="text-textMuted">Loss</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2236" />

          <XAxis
            dataKey="spot"
            tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
            tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "Poppins" }}
            axisLine={{ stroke: "#1F2D45" }}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={(v) => `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(1)}K`}
            tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "Poppins" }}
            axisLine={{ stroke: "#1F2D45" }}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="#1F2D45" strokeWidth={1.5} />

          {/* Breakeven lines */}
          {metrics.breakevens.map((be, i) => (
            <ReferenceLine
              key={i}
              x={Math.round(be)}
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `BE: ${be.toFixed(0)}`,
                fill: "#F59E0B",
                fontSize: 9,
                fontFamily: "Poppins",
              }}
            />
          ))}

          {/* Profit area */}
          <Area
            type="monotone"
            dataKey="profit"
            stroke="none"
            fill="#22C55E"
            fillOpacity={0.12}
          />

          {/* Loss area */}
          <Area
            type="monotone"
            dataKey="loss"
            stroke="none"
            fill="#EF4444"
            fillOpacity={0.12}
          />

          {/* Main payoff line */}
          <Line
            type="monotone"
            dataKey="payoff"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#3B82F6", stroke: "#111827" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PayoffChart;
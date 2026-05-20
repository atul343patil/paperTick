import { useDispatch, useSelector } from "react-redux";
import { setChartInterval, setChartRange } from "../../store/slices/marketSlice";

const INTERVALS = [
  { label: "5m", value: "5m", range: "1d" },
  { label: "15m", value: "15m", range: "5d" },
  { label: "1H", value: "1h", range: "1mo" },
  { label: "1D", value: "1d", range: "3mo" },
  { label: "1W", value: "1wk", range: "1y" },
  { label: "1M", value: "1mo", range: "5y" },
];

const ChartControls = () => {
  const dispatch = useDispatch();
  const { chartInterval } = useSelector((s) => s.market);

  const handleSelect = (item) => {
    dispatch(setChartInterval(item.value));
    dispatch(setChartRange(item.range));
  };

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
      {INTERVALS.map((item) => (
        <button
          key={item.value}
          onClick={() => handleSelect(item)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            chartInterval === item.value
              ? "bg-primary text-white"
              : "text-textSecondary hover:text-textPrimary hover:bg-surfaceAlt"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ChartControls;
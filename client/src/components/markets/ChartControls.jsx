import { useDispatch, useSelector } from "react-redux";
import { setChartInterval, setChartRange } from "../../store/slices/marketSlice";

const INTERVALS = [
  { label: "1D",  value: "1d",  range: "1mo"  },
  { label: "1W",  value: "1wk", range: "6mo"  },
  { label: "1M",  value: "1mo", range: "2y"   },
  { label: "3M",  value: "1d",  range: "3mo"  },
  { label: "6M",  value: "1d",  range: "6mo"  },
  { label: "1Y",  value: "1d",  range: "1y"   },
];

const ChartControls = () => {
  const dispatch = useDispatch();
  const { chartInterval, chartRange } = useSelector((s) => s.market);

  const handleSelect = (item) => {
    dispatch(setChartInterval(item.value));
    dispatch(setChartRange(item.range));
  };

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
      {INTERVALS.map((item) => (
        <button
          key={item.label}
          onClick={() => handleSelect(item)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            chartInterval === item.value && chartRange === item.range
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
import { useEffect, useRef, useState } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import { useSelector } from "react-redux";
import { calculateEMA, calculateRSI } from "../../utils/indicators";
import Loader from "../common/Loader";

const THEME = {
  bg:      "#111827",
  text:    "#94A3B8",
  grid:    "#1A2236",
  border:  "#1F2D45",
  up:      "#22C55E",
  down:    "#EF4444",
  ma20:    "#3B82F6",
  ma50:    "#F59E0B",
  rsi:     "#A78BFA",
  volUp:   "#22C55E30",
  volDown: "#EF444430",
};

const CandlestickChart = ({ showMA = true, showVolume = true }) => {
  const mainRef = useRef(null);
  const rsiRef  = useRef(null);

  // Store chart instances AND all series in refs
  const mainChartRef = useRef(null);
  const rsiChartRef  = useRef(null);
  const seriesRef    = useRef({ candle: null, volume: null, ma20: null, ma50: null, rsi: null, ob: null, os: null });

  const [crosshair, setCrosshair] = useState(null);
  const [chartsReady, setChartsReady] = useState(false);

  const { chartData, chartLoading, activeSymbolName } = useSelector((s) => s.market);

  // ── Step 1: Initialize charts once on mount ──────────────
  useEffect(() => {
    if (!mainRef.current || !rsiRef.current) return;

    const chartOptions = (height) => ({
      width:  mainRef.current.clientWidth,
      height,
      layout: {
        background:  { color: THEME.bg },
        textColor:   THEME.text,
        fontFamily:  "Poppins, sans-serif",
        fontSize:    11,
      },
      grid: {
        vertLines: { color: THEME.grid },
        horzLines: { color: THEME.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#3B82F660", labelBackgroundColor: "#1A2236" },
        horzLine: { color: "#3B82F660", labelBackgroundColor: "#1A2236" },
      },
      rightPriceScale: { borderColor: THEME.border },
      timeScale: {
        borderColor:    THEME.border,
        timeVisible:    true,
        secondsVisible: false,
      },
    });

    // Main chart
    const mainChart = createChart(mainRef.current, chartOptions(380));
    mainChart.priceScale("right").applyOptions({
      scaleMargins: { top: 0.08, bottom: 0.28 },
    });

    // RSI chart
    const rsiChart = createChart(rsiRef.current, {
      ...chartOptions(110),
      crosshair: { mode: CrosshairMode.Normal },
    });
    rsiChart.priceScale("right").applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    // Create all series upfront
    const candleSeries = mainChart.addCandlestickSeries({
      upColor:        THEME.up,
      downColor:      THEME.down,
      borderUpColor:  THEME.up,
      borderDownColor:THEME.down,
      wickUpColor:    THEME.up,
      wickDownColor:  THEME.down,
    });

    const volumeSeries = mainChart.addHistogramSeries({
      priceFormat:   { type: "volume" },
      priceScaleId:  "vol",
    });
    mainChart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });

    const ma20Series = mainChart.addLineSeries({
      color:                  THEME.ma20,
      lineWidth:              2,
      priceLineVisible:       true,
      lastValueVisible:       true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  3,
      title:                  "EMA 20",
    });

    const ma50Series = mainChart.addLineSeries({
      color:                  THEME.ma50,
      lineWidth:              2,
      priceLineVisible:       true,
      lastValueVisible:       true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  3,
      title:                  "EMA 50",
    });

    const rsiSeries = rsiChart.addLineSeries({
      color:             THEME.rsi,
      lineWidth:         1.5,
      priceLineVisible:  false,
      lastValueVisible:  true,
    });

    const obSeries = rsiChart.addLineSeries({
      color:             "#EF444455",
      lineWidth:         1,
      lineStyle:         2,
      priceLineVisible:  false,
      lastValueVisible:  false,
      crosshairMarkerVisible: false,
    });

    const osSeries = rsiChart.addLineSeries({
      color:             "#22C55E55",
      lineWidth:         1,
      lineStyle:         2,
      priceLineVisible:  false,
      lastValueVisible:  false,
      crosshairMarkerVisible: false,
    });

    // Save refs
    mainChartRef.current = mainChart;
    rsiChartRef.current  = rsiChart;
    seriesRef.current = {
      candle: candleSeries,
      volume: volumeSeries,
      ma20:   ma20Series,
      ma50:   ma50Series,
      rsi:    rsiSeries,
      ob:     obSeries,
      os:     osSeries,
    };

    // Sync time scales
    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
    });
    rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) mainChart.timeScale().setVisibleLogicalRange(range);
    });

    // Crosshair
    candleSeries.subscribeCrosshairMove
      ? mainChart.subscribeCrosshairMove((param) => {
          const data = param.seriesData?.get(candleSeries);
          setCrosshair(data || null);
        })
      : null;

    // Resize
    const ro = new ResizeObserver(() => {
      if (mainRef.current) {
        mainChart.applyOptions({ width: mainRef.current.clientWidth });
        rsiChart.applyOptions({ width: mainRef.current.clientWidth });
      }
    });
    if (mainRef.current) ro.observe(mainRef.current);

    setChartsReady(true);

    return () => {
      ro.disconnect();
      mainChart.remove();
      rsiChart.remove();
      mainChartRef.current = null;
      rsiChartRef.current  = null;
      setChartsReady(false);
    };
  }, []);

  // ── Step 2: Update data whenever chartData changes ────────
  useEffect(() => {
    const s = seriesRef.current;
    if (!chartsReady || !s.candle || chartData.length === 0) return;

    try {
      // Candlestick
      s.candle.setData(chartData);

      // Volume
      if (showVolume) {
        s.volume.setData(
          chartData.map((d) => ({
            time:  d.time,
            value: d.volume,
            color: d.close >= d.open ? THEME.volUp : THEME.volDown,
          }))
        );
      }

      // ── MA indicators ────────────────────────────────────────
      // Use EMA instead of SMA for better visual continuity
      // EMA20 requires minimum 20 candles
      // EMA50 requires minimum 50 candles — fall back to EMA20 line if not enough data

      if (showMA) {
        // EMA 20 — show when >= 20 candles available
        if (chartData.length >= 20) {
          const ema20Data = calculateEMA(chartData, 20);
          if (ema20Data.length > 0) {
            s.ma20.setData(ema20Data);
          }
        } else {
          s.ma20.setData([]); // clear if not enough data
        }

        // EMA 50 — show when >= 50 candles, otherwise clear
        if (chartData.length >= 50) {
          const ema50Data = calculateEMA(chartData, 50);
          if (ema50Data.length > 0) {
            s.ma50.setData(ema50Data);
          }
        } else {
          s.ma50.setData([]); // not enough candles — clear gracefully
        }
      }

      // RSI
      if (chartData.length > 14) {
        const rsiData = calculateRSI(chartData, 14);
        s.rsi.setData(rsiData);

        const obData = rsiData.map((d) => ({ time: d.time, value: 70 }));
        const osData = rsiData.map((d) => ({ time: d.time, value: 30 }));
        s.ob.setData(obData);
        s.os.setData(osData);
      }

      mainChartRef.current?.timeScale().fitContent();
    } catch (err) {
      console.error("[CandlestickChart] setData error:", err.message);
    }
  }, [chartData, chartsReady, showMA, showVolume]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* OHLCV bar */}
      <div className="h-7 flex items-center gap-4 px-4 text-xs text-textSecondary border-b border-border flex-shrink-0">
        {crosshair ? (
          <>
            <span>O <span className="text-textPrimary">{crosshair.open?.toFixed(2)}</span></span>
            <span>H <span className="text-success">{crosshair.high?.toFixed(2)}</span></span>
            <span>L <span className="text-danger">{crosshair.low?.toFixed(2)}</span></span>
            <span>C <span className="text-textPrimary">{crosshair.close?.toFixed(2)}</span></span>
          </>
        ) : (
          <span className="text-textMuted">{activeSymbolName}</span>
        )}
        {showMA && (
          <>
            <span className="text-primary text-xs">— EMA 20</span>
            <span className="text-warning text-xs">— EMA 50</span>
          </>
        )}
        {showMA && chartData.length < 50 && chartData.length >= 20 && (
          <span className="text-textMuted text-xs ml-2">
            (EMA 50 needs {50 - chartData.length} more candles)
          </span>
        )}
        <span className="text-purple-400 text-xs">— RSI 14</span>
      </div>

      {/* Main chart — explicit pixel height, not flex */}
      <div className="relative w-full" style={{ height: "380px" }}>
        {chartLoading && (
          <div className="absolute inset-0 bg-surface/80 flex items-center justify-center z-10">
            <Loader />
          </div>
        )}
        <div ref={mainRef} style={{ width: "100%", height: "380px" }} />
      </div>

      {/* RSI panel — explicit pixel height */}
      <div className="border-t border-border flex-shrink-0" style={{ height: "130px" }}>
        <div className="flex items-center px-4 h-5 text-xs text-textMuted">RSI (14)</div>
        <div ref={rsiRef} style={{ width: "100%", height: "110px" }} />
      </div>
    </div>
  );
};

export default CandlestickChart;
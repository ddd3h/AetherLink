// ECharts time series: pressure, temperature, altitude
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../store';

export default function ChartsPanel() {
  const series = useStore((s) => s.series);
  const option = React.useMemo(() => {
    const times = series.map((s) => s.t);
    const p = series.map((s) => (s.pressure ?? null));
    const temp = series.map((s) => (s.temperature ?? null));
    const alt = series.map((s) => (s.altitude ?? null));
    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: { trigger: 'axis' },
      legend: { data: ['pressure', 'temperature', 'altitude'] },
      xAxis: { type: 'time' },
      yAxis: [{ type: 'value' }],
      grid: { left: 40, right: 10, top: 30, bottom: 35 },
      series: [
        { name: 'pressure', type: 'line', showSymbol: false, data: times.map((t, i) => [t, p[i]]) },
        { name: 'temperature', type: 'line', showSymbol: false, data: times.map((t, i) => [t, temp[i]]) },
        { name: 'altitude', type: 'line', showSymbol: false, data: times.map((t, i) => [t, alt[i]]) },
      ],
    } as any;
  }, [series]);
  return (
    <div className="card h-[260px] md:h-[320px]">
      <ReactECharts style={{ height: '100%' }} option={option} notMerge lazyUpdate />
    </div>
  );
}


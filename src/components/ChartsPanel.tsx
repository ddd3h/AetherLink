// ECharts: render pressure, temperature, altitude as separate graphs
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../store';

function MiniChart({ label, times, values, color }: { label: string; times: number[]; values: (number | null)[]; color?: string }) {
  const option = React.useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 12, top: 20, bottom: 28 },
    xAxis: { type: 'time', axisLabel: { show: true } },
    yAxis: { type: 'value', axisLabel: { show: true } },
    series: [
      { name: label, type: 'line', showSymbol: false, lineStyle: { color }, itemStyle: { color }, data: times.map((t, i) => [t, values[i]]) },
    ],
  }) as any, [label, times, values, color]);

  return <ReactECharts style={{ height: 120 }} option={option} notMerge lazyUpdate />;
}

export default function ChartsPanel() {
  const series = useStore((s) => s.series);
  const times = React.useMemo(() => series.map((s) => s.t), [series]);
  const p = React.useMemo(() => series.map((s) => s.pressure ?? null), [series]);
  const temp = React.useMemo(() => series.map((s) => s.temperature ?? null), [series]);
  const alt = React.useMemo(() => series.map((s) => s.altitude ?? null), [series]);

  return (
    <div className="card">
      <div className="text-xs font-medium text-neutral-500 mb-2">Pressure</div>
      <MiniChart label="pressure" times={times} values={p} color="#0ea5e9" />
      <div className="text-xs font-medium text-neutral-500 mt-2 mb-2">Temperature</div>
      <MiniChart label="temperature" times={times} values={temp} color="#f97316" />
      <div className="text-xs font-medium text-neutral-500 mt-2 mb-2">Altitude</div>
      <MiniChart label="altitude" times={times} values={alt} color="#22c55e" />
    </div>
  );
}

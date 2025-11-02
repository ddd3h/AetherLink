// ECharts: render charts dynamically based on CSV mapping (visual=chart)
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useStore } from '../store';

function MiniChart({ label, times, values, color, units }: { label: string; times: number[]; values: (number | null)[]; color?: string; units?: string }) {
  const option = React.useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 12, top: 20, bottom: 28 },
    xAxis: { type: 'time', axisLabel: { show: true } },
    yAxis: { type: 'value', axisLabel: { show: true }, name: units },
    series: [
      { name: label, type: 'line', showSymbol: false, lineStyle: { color }, itemStyle: { color }, data: times.map((t, i) => [t, values[i]]) },
    ],
  }) as any, [label, times, values, color, units]);

  return <ReactECharts style={{ height: 120 }} option={option} notMerge lazyUpdate />;
}

export default function ChartsPanel() {
  const series = useStore((s) => s.series);
  const config = useStore((s) => s.config);
  const times = React.useMemo(() => series.map((s) => s.t), [series]);
  const chartMappings = React.useMemo(() => {
    const arr = (config.csv.mapping || []).filter((m) => m.visual === 'chart');
    const map = new Map<string, typeof arr[number]>();
    for (const m of arr) map.set(m.key, m);
    return Array.from(map.values());
  }, [config.csv.mapping]);
  const palette = ['#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6'];

  return (
    <div className="card">
      {chartMappings.length === 0 && (
        <div className="text-xs text-neutral-500">No chart fields mapped. Set visual=chart in CSV mapping.</div>
      )}
      {chartMappings.map((m, i) => {
        const key = m.key;
        const vals = series.map((s) => {
          const v = (s as any)[key];
          const num = typeof v === 'number' ? v : Number(v);
          return Number.isFinite(num) ? num : null;
        });
        return (
          <div key={key} className={i === 0 ? '' : 'mt-2'}>
            <div className="text-xs font-medium text-neutral-500 mb-2">{key}</div>
            <MiniChart label={key} times={times} values={vals} color={palette[i % palette.length]} units={m.units} />
          </div>
        );
      })}
    </div>
  );
}

// Status cards: dynamically render fields marked as visual=label in mapping
import { useStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

function Stat({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value ?? '--'}</div>
      </CardContent>
    </Card>
  );
}

export default function StatusCards() {
  const last = useStore((s) => s.last);
  const mapping = useStore((s) => s.config.csv.mapping);
  const labelFields = (mapping || []).filter((m) => m.visual === 'label');
  if (!last || labelFields.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <Stat label="Mode" value={(last as any)?.mode} />
        <Stat label="GNSS" value={(last as any)?.gnssFix} />
        <Stat label="Battery" value={(last as any)?.battery !== undefined ? `${(last as any)?.battery}%` : undefined} />
        <Stat label="RSSI" value={(last as any)?.rssi !== undefined ? `${(last as any)?.rssi} dBm` : undefined} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
      {labelFields.map((m) => {
        let v = (last as any)[m.key];
        if (v == null) v = undefined;
        if (typeof v === 'number' && m.units) v = `${v} ${m.units}`;
        return <Stat key={m.key} label={m.key} value={v} />;
      })}
    </div>
  );
}

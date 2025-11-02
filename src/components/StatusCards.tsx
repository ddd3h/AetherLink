// Status cards: Mode, GNSS, Battery, RSSI
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
      <Stat label="Mode" value={last?.mode} />
      <Stat label="GNSS" value={last?.gnssFix} />
      <Stat label="Battery" value={last?.battery !== undefined ? `${last?.battery}%` : undefined} />
      <Stat label="RSSI" value={last?.rssi !== undefined ? `${last?.rssi} dBm` : undefined} />
    </div>
  );
}


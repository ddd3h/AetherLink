// Serial selection UI (mock)
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { listPorts, connect, disconnect, startAutodetect } from '../lib/api';
import { useStore } from '../store';
import { Button } from './ui/button';
import { Select, SelectItem } from './ui/select';
import { Switch } from './ui/switch';

export default function SerialSelector() {
  const { data: ports = [], refetch } = useQuery({ queryKey: ['ports'], queryFn: listPorts });
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const connected = useStore((s) => s.connected);
  const setConnected = useStore((s) => s.setConnected);

  async function onConnect() {
    if (!config.serial.selectedPortId || !config.serial.selectedBaud) return;
    await connect(config.serial.selectedPortId, config.serial.selectedBaud);
    setConnected(true);
  }
  async function onDisconnect() {
    await disconnect();
    setConnected(false);
  }
  async function onAutodetect(v: boolean) {
    setConfig({ autodetect: v });
    if (v) await startAutodetect();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="autodetect" className="text-sm">Autodetect</label>
        <Switch id="autodetect" checked={config.autodetect} onCheckedChange={onAutodetect} />
        <Button variant="outline" onClick={() => refetch()}>Rescan</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">Port</label>
          <Select
            value={config.serial.selectedPortId ?? undefined}
            onValueChange={(v) => setConfig({ serial: { ...config.serial, selectedPortId: v } })}
            placeholder="Select port"
          >
            {ports.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.path} {p.manufacturer ? `(${p.manufacturer})` : ''}</SelectItem>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm mb-1">Baud</label>
          <Select
            value={String(config.serial.selectedBaud ?? '')}
            onValueChange={(v) => setConfig({ serial: { ...config.serial, selectedBaud: Number(v) } })}
            placeholder="Select baud"
          >
            {config.serial.baudCandidates.map((b) => (
              <SelectItem key={b} value={String(b)}>{b}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2">
          {!connected ? (
            <Button onClick={onConnect} className="w-full">Connect</Button>
          ) : (
            <Button onClick={onDisconnect} variant="outline" className="w-full">Disconnect</Button>
          )}
        </div>
      </div>
    </div>
  );
}


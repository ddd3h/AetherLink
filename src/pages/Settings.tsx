// Settings: Connection / CSV Mapping / Display / Storage
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import SerialSelector from '../components/SerialSelector';
import CsvMapper from '../components/CsvMapper';
import { useStore } from '../store';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { listTilePacks, startTileDownload, deleteTilePack, setConfigCore } from '../lib/api';
import BboxPicker from '../components/BboxPicker';

export default function Settings() {
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);
  const [packs, setPacks] = React.useState<{ name: string; path: string }[]>([]);
  const [bbox, setBbox] = React.useState({ north: 35.8, south: 35.5, east: 139.9, west: 139.6 });
  const [zoom, setZoom] = React.useState({ min: 9, max: 12 });
  const [packName, setPackName] = React.useState('tokyo');

  async function refreshPacks() {
    if (!config.map?.offlineDir) return;
    try {
      const res = await listTilePacks(config.map.offlineDir);
      setPacks(res.map((p) => ({ name: p.name, path: p.path })));
    } catch {}
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { refreshPacks(); }, [config.map?.offlineDir]);
  // Push critical config to core (delimiter/header/mapping) when changed
  React.useEffect(() => {
    // Debounced push
    const id = setTimeout(() => { setConfigCore(useStore.getState().config as any).catch(()=>{}); }, 300);
    return () => clearTimeout(id);
  }, [config.csv.delimiter, config.csv.header, config.csv.mapping]);

  return (
    <div className="card">
      <Tabs defaultValue="conn">
        <TabsList>
          <TabsTrigger value="conn">接続</TabsTrigger>
          <TabsTrigger value="csv">CSVマッピング</TabsTrigger>
          <TabsTrigger value="disp">表示</TabsTrigger>
          <TabsTrigger value="store">保存</TabsTrigger>
        </TabsList>
        <TabsContent value="conn">
          <SerialSelector />
        </TabsContent>
        <TabsContent value="csv">
          <CsvMapper />
        </TabsContent>
        <TabsContent value="disp">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">地図追従</label>
              <Switch checked={config.ui.autoFollow} onCheckedChange={(v) => setConfig({ ui: { ...config.ui, autoFollow: v } })} />
            </div>
            <div>
              <label className="block text-sm mb-1">デバッグモード</label>
              <Switch checked={!!config.debug} onCheckedChange={(v) => setConfig({ debug: v })} />
              <div className="text-xs text-neutral-500 mt-1">ON: デモデータを毎秒受信 / OFF: 実機UARTのみ</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">タイルURL (XYZ)</label>
              <Input
                value={config.map?.providerUrl || ''}
                placeholder="https://.../{z}/{x}/{y}.png"
                onChange={(e) => setConfig({ map: { ...(config.map || {}), providerUrl: e.target.value } as any })}
              />
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => setConfig({ map: { ...(config.map || {}), providerUrl: 'http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&s=Ga' } as any })}>Google Satellite</Button>
                <Button variant="outline" onClick={() => setConfig({ map: { ...(config.map || {}), providerUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' } as any })}>OpenStreetMap</Button>
                <Button variant="outline" onClick={() => setConfig({ map: { ...(config.map || {}), providerUrl: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png' } as any })}>OpenTopo</Button>
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-sm mb-1">オフライン使用</label>
              <Switch checked={!!config.map?.useOffline} onCheckedChange={(v) => setConfig({ map: { ...(config.map || {}), useOffline: v } as any })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">オフライン保存先</label>
              <Input value={config.map?.offlineDir || ''} placeholder="/path/to/tiles" onChange={(e) => setConfig({ map: { ...(config.map || {}), offlineDir: e.target.value } as any })} />
            </div>
            <div className="md:col-span-3 card mt-2">
              <div className="text-sm font-medium mb-2">タイルパックのダウンロード</div>
              <BboxPicker bbox={bbox} onChange={setBbox} tiles={config.map?.providerUrl || ''} />
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div><label className="block text-xs">北(N)</label><Input type="number" value={bbox.north} onChange={e=>setBbox({...bbox, north: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-xs">南(S)</label><Input type="number" value={bbox.south} onChange={e=>setBbox({...bbox, south: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-xs">東(E)</label><Input type="number" value={bbox.east} onChange={e=>setBbox({...bbox, east: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-xs">西(W)</label><Input type="number" value={bbox.west} onChange={e=>setBbox({...bbox, west: parseFloat(e.target.value)})} /></div>
                <div><label className="block text-xs">Z最小</label><Input type="number" value={zoom.min} onChange={e=>setZoom({...zoom, min: parseInt(e.target.value)})} /></div>
                <div><label className="block text-xs">Z最大</label><Input type="number" value={zoom.max} onChange={e=>setZoom({...zoom, max: parseInt(e.target.value)})} /></div>
              </div>
              <div className="flex gap-2 mt-2">
                <Input placeholder="pack name" value={packName} onChange={(e)=>setPackName(e.target.value)} />
                <Button onClick={async ()=>{
                  if (!config.map?.offlineDir || !config.map?.providerUrl) return;
                  await startTileDownload({ name: packName, template: config.map.providerUrl, north: bbox.north, south: bbox.south, east: bbox.east, west: bbox.west, zmin: zoom.min, zmax: zoom.max, dir: config.map.offlineDir });
                  setTimeout(()=>refreshPacks(), 1000);
                }}>ダウンロード開始</Button>
              </div>
              <div className="mt-3">
                <div className="text-sm font-medium">ダウンロード済みパック</div>
                <ul className="mt-1 space-y-1">
                  {packs.map(p => (
                    <li key={p.path} className="flex items-center gap-2">
                      <Button variant="outline" onClick={()=> setConfig({ map: { ...(config.map || {}), activePack: p.path, useOffline: true } as any })}>使用</Button>
                      <span className="text-sm">{p.name}</span>
                      <Button variant="ghost" onClick={async ()=>{ await deleteTilePack(p.path); refreshPacks(); }}>削除</Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">チャート履歴長</label>
              <Input type="number" value={useStore.getState().seriesMaxLength}
                onChange={(e) => (useStore.setState({ seriesMaxLength: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm mb-1">更新間隔 (ms)</label>
              <Input type="number" value={1000} readOnly />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="store">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">保存先</label>
              <Input value={config.logging.directory} placeholder="/path/to/logs" onChange={(e) => setConfig({ logging: { ...config.logging, directory: e.target.value } })} />
            </div>
            <div>
              <label className="block text-sm mb-1">ローテーション(MB)</label>
              <Input type="number" value={config.logging.rotationMB} onChange={(e) => setConfig({ logging: { ...config.logging, rotationMB: Number(e.target.value) } })} />
            </div>
            <div className="flex items-end gap-2">
              <label className="text-sm">保存ON/OFF</label>
              <Switch checked={config.logging.enabled} onCheckedChange={(v) => setConfig({ logging: { ...config.logging, enabled: v } })} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

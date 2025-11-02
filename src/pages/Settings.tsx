// Settings: Connection / CSV Mapping / Display / Storage
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import SerialSelector from '../components/SerialSelector';
import CsvMapper from '../components/CsvMapper';
import { useStore } from '../store';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';

export default function Settings() {
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);

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


// TopBar: title, connection indicator, theme/lang toggles, record button
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Sun, Moon, Radio, Circle, CirclePause, Languages } from 'lucide-react';
import { useStore } from '../store';
import { startLogging, stopLogging } from '../lib/api';
import { addLog } from '../lib/logDb';
import { toCsvHeader, telemetryToCsv } from '../lib/logFormats';

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const connected = useStore((s) => s.connected);
  const playing = useStore((s) => s.playing);
  const theme = useStore((s) => s.config.theme);
  const setConfig = useStore((s) => s.setConfig);
  const setPlaying = useStore((s) => s.setPlaying);
  const config = useStore((s) => s.config);
  const recorderRef = (window as any)._recRef || { unsub: null as null | (()=>void), buffer: [] as any[] };
  (window as any)._recRef = recorderRef;

  function toggleTheme() {
    setConfig({ theme: theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark' });
  }
  function toggleLang() {
    const next = i18n.language === 'ja' ? 'en' : 'ja';
    i18n.changeLanguage(next);
    setConfig({ language: next as any });
  }
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2 font-semibold">
        <Radio className="text-neutral-500" size={18} /> {t('app.title')}
      </div>
      <div className="flex items-center gap-2" aria-live="polite">
        <span className="flex items-center gap-1 text-sm" aria-label={connected ? 'connected' : 'disconnected'}>
          <span className={"inline-block w-2.5 h-2.5 rounded-full " + (connected ? 'bg-green-500' : 'bg-neutral-400')} />
          {connected ? t('topbar.disconnect') : t('topbar.connect')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label={t('topbar.theme')} onClick={toggleTheme}>
          {theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <><Sun size={18} className="opacity-70" /><Moon size={18} className="-ml-2 opacity-70" /></>}
        </Button>
        <Button variant="ghost" size="icon" aria-label={t('topbar.language')} onClick={toggleLang}>
          <Languages size={18} />
        </Button>
        <Button onClick={async () => { 
            const next = !playing; 
            setPlaying(next); 
            const isTauri = typeof (window as any).__TAURI__ !== 'undefined'; 
            if (isTauri) { 
              if (next) await startLogging(config.logging.directory || '.', config.logging.rotationMB); else await stopLogging(); 
            }
            // Simple client-side recorder to logs DB
            if (next) {
              // start
              recorderRef.buffer = [];
              recorderRef.unsub = useStore.subscribe((s) => s.last, (last) => { if (last) recorderRef.buffer.push(last); });
            } else {
              // stop and persist to DB as CSV
              if (recorderRef.unsub) { recorderRef.unsub(); recorderRef.unsub = null; }
              const rows = [toCsvHeader(), ...recorderRef.buffer.map(telemetryToCsv)];
              const name = `session_${new Date().toISOString().replace(/[:.]/g,'-')}`;
              addLog(name, rows.join('\n'));
              recorderRef.buffer = [];
            }
          }} aria-label={playing ? t('topbar.stop') : t('topbar.record')}>
          {playing ? <CirclePause size={16} /> : <Circle size={16} />} {playing ? t('topbar.stop') : t('topbar.record')}
        </Button>
      </div>
    </header>
  );
}

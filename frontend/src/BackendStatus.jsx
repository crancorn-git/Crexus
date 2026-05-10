import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';

const statusStyles = {
  checking: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200',
  online: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  warning: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  offline: 'border-red-500/40 bg-red-500/10 text-red-200'
};

export default function BackendStatus() {
  const [status, setStatus] = useState({ state: 'checking', label: 'Checking backend...', detail: '' });

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const [healthRes, versionRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/health`, { timeout: 7000 }),
          axios.get(`${API_BASE}/api/version`, { timeout: 7000 })
        ]);

        if (cancelled) return;

        if (healthRes.status !== 'fulfilled') {
          setStatus({ state: 'offline', label: 'Backend offline', detail: 'Cranix Scout API is not responding.' });
          return;
        }

        const health = healthRes.value.data;
        const version = versionRes.status === 'fulfilled' ? versionRes.value.data : null;

        if (!health.riotKeyConfigured) {
          setStatus({
            state: 'warning',
            label: 'Backend online, Riot key missing',
            detail: `v${health.version || 'unknown'}${version?.ddragonVersion ? ` · Patch ${version.ddragonVersion}` : ''}`
          });
          return;
        }

        setStatus({
          state: 'online',
          label: 'Backend online',
          detail: `Riot key loaded · v${health.version || 'unknown'}${version?.ddragonVersion ? ` · Patch ${version.ddragonVersion}` : ''}`
        });
      } catch {
        if (!cancelled) {
          setStatus({ state: 'offline', label: 'Backend offline', detail: 'Cranix Scout API is not responding.' });
        }
      }
    };

    checkHealth();
    const timer = setInterval(checkHealth, 60000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <div className={`rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${statusStyles[status.state]}`}>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
          <span className={`h-2.5 w-2.5 rounded-full ${status.state === 'online' ? 'bg-emerald-400' : status.state === 'warning' ? 'bg-orange-400' : status.state === 'checking' ? 'bg-yellow-300 animate-pulse' : 'bg-red-500'}`} />
          {status.label}
        </div>
        {status.detail && <div className="mt-1 text-[11px] opacity-80">{status.detail}</div>}
      </div>
    </div>
  );
}

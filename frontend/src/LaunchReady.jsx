import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { BackButton } from './CrexusShell';

const launchPillars = [
  { title: 'Player Profiles', detail: 'Rank, champion pool, form, playstyle, lane phase, objectives, and recent matches.' },
  { title: 'Live & Lobby Scout', detail: 'Live reads, pasted lobby scouting, enemy matchup reads, and duo/synergy warnings.' },
  { title: 'Match Details', detail: 'Dedicated review pages with scoreboards, timeline reads, death heatmap, and turning points.' },
  { title: 'Comparison Tools', detail: 'Player A vs Player B, role edges, form edge, objective edge, and consistency edge.' },
  { title: 'Champion & Draft Tools', detail: 'Champion pages, matchup memory, suggested bans, comfort warnings, and team comp checks.' },
  { title: 'Saved Accounts', detail: 'Favourites, pinned dashboard, progress snapshots, quick refresh, and personal tracking.' },
  { title: 'Coaching Layer', detail: 'Strengths, weaknesses, role-specific advice, and next-game focus.' },
  { title: 'Community Features', detail: 'Shareable reports, public report links, streamer mode, and Discord command blueprint.' },
];

const readinessItems = [
  'Clean dark grey/red UI system',
  'Stable Riot-backed backend routes',
  'Player profiles and live scout',
  'Lobby scout and regional ladder',
  'Match detail pages and review tools',
  'Crexus Score and scouting reads',
  'Player compare and champion pool reads',
  'Objective control and lane phase cards',
  'Shareable reports and streamer pages',
  'Saved accounts, health diagnostics, and mobile layout',
];

function StatePill({ ok, children }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-orange-500/30 bg-orange-500/10 text-orange-200'}`}>
      {children}
    </span>
  );
}

export default function LaunchReady({ onBack }) {
  const [health, setHealth] = useState(null);
  const [version, setVersion] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [healthRes, versionRes, launchRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/health`, { timeout: 7000 }),
          axios.get(`${API_BASE}/api/version`, { timeout: 7000 }),
          axios.get(`${API_BASE}/api/launch-check`, { timeout: 7000 })
        ]);

        if (cancelled) return;

        if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
        if (versionRes.status === 'fulfilled') setVersion(versionRes.value.data);
        if (launchRes.status === 'fulfilled') setDiagnostics(launchRes.value.data);
        if (healthRes.status !== 'fulfilled') setError('Backend health route did not respond. Check the server before launch.');
      } catch {
        if (!cancelled) setError('Launch diagnostics could not be loaded.');
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const online = health?.server === 'online';
  const riotReady = Boolean(health?.riotKeyConfigured);

  return (
    <div className="crexus-page min-h-screen text-gray-200">
      <BackButton onClick={onBack} />

      <header className="mt-5 rounded-[30px] border border-red-500/15 bg-gradient-to-br from-red-500/12 via-[#12141b] to-[#090a0e] p-6 shadow-2xl md:p-8">
        <div className="crexus-kicker">v1.0.0 launch version</div>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="crexus-page-title">Crexus Launch Build</h1>
            <p className="crexus-copy mt-3 max-w-3xl">
              Crexus is now framed as a game stats and information platform, with League of Legends as the first supported game. This page pulls together launch readiness, diagnostics, and the full feature set for the first proper release.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatePill ok={online}>{online ? 'Backend online' : 'Backend check'}</StatePill>
            <StatePill ok={riotReady}>{riotReady ? 'Riot key loaded' : 'Riot key needed'}</StatePill>
            <StatePill ok>{health?.version ? `v${health.version}` : 'v1.0.0'}</StatePill>
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-5 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-100">
          {error}
        </div>
      )}

      <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="crexus-card rounded-[28px] p-6">
          <div className="crexus-kicker">Health diagnostics</div>
          <h2 className="mt-2 text-2xl font-black text-white">Launch status</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-4">
              <span className="text-gray-400">Backend</span>
              <span className="font-black text-white">{health?.server || 'checking'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-4">
              <span className="text-gray-400">App version</span>
              <span className="font-black text-white">v{health?.version || '1.0.0'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-4">
              <span className="text-gray-400">Riot key</span>
              <span className={riotReady ? 'font-black text-emerald-200' : 'font-black text-orange-200'}>{riotReady ? 'configured' : 'missing'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-4">
              <span className="text-gray-400">Data Dragon patch</span>
              <span className="font-black text-white">{version?.ddragonVersion || diagnostics?.ddragonVersion || 'checking'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-4">
              <span className="text-gray-400">Supported regions</span>
              <span className="font-black text-white">{diagnostics?.regions?.length || 11}</span>
            </div>
          </div>
        </div>

        <div className="crexus-card rounded-[28px] p-6">
          <div className="crexus-kicker">v1.0 scope</div>
          <h2 className="mt-2 text-2xl font-black text-white">Launch checklist</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {readinessItems.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-xs font-black text-red-200">✓</span>
                <span className="text-sm font-bold text-gray-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {launchPillars.map((pillar) => (
          <div key={pillar.title} className="rounded-[24px] border border-white/8 bg-[#12141b]/90 p-5 shadow-xl">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-red-300">Ready</div>
            <h3 className="mt-2 text-lg font-black text-white">{pillar.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">{pillar.detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-[28px] border border-white/8 bg-[#0d0f14]/95 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="crexus-kicker">Launch identity</div>
            <h2 className="mt-2 text-2xl font-black text-white">Game stats and information platform</h2>
            <p className="crexus-copy mt-2 max-w-3xl">
              The app is ready to move beyond the roadmap foundation: League support is complete enough for v1.0, while the sidebar, dashboard, reports, and shared card system leave room for future game modules.
            </p>
          </div>
          <button onClick={onBack} className="crexus-btn crexus-btn-primary">Start scouting</button>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { readLinkedAccount } from './accountLink';
import { getRegionLabel } from './regions';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', hint: 'Saved players', icon: '⌂' },
  { key: 'profile', label: 'Player Search', hint: 'Search Riot ID', icon: '⌕' },
  { key: 'lobby', label: 'Live Game', hint: 'Team read', icon: '▣' },
  { key: 'leaderboard', label: 'Ladder', hint: 'Top ranked', icon: '♙' },
  { key: 'compare', label: 'Compare', hint: 'Player vs player', icon: '⇄' },
  { key: 'champions', label: 'Champions', hint: 'Pools & matchups', icon: '◇' },
  { key: 'coach', label: 'Coach', hint: 'Improve faster', icon: '✦' },
  { key: 'community', label: 'Community', hint: 'Share & stream', icon: '↗' },
  { key: 'launch', label: 'Settings', hint: 'Diagnostics', icon: '⚙' },
];

const pageTitles = {
  profile: { title: 'Player Search', detail: 'Search, scout, compare, and track players.' },
  live: { title: 'Live Game', detail: 'Read active games with focused player cards.' },
  lobby: { title: 'Live Game', detail: 'Paste or load a lobby for a fast team read.' },
  dashboard: { title: 'Dashboard', detail: 'Pinned players, saved accounts, and progress.' },
  compare: { title: 'Compare', detail: 'Player versus player reads and role edges.' },
  champions: { title: 'Champions', detail: 'Champion pool and matchup memory.' },
  leaderboard: { title: 'Ladder', detail: 'Region-aware ranked leaders.' },
  coach: { title: 'Coach', detail: 'Strengths, weaknesses, and next-game focus.' },
  community: { title: 'Community', detail: 'Reports, streamer cards, and sharing tools.' },
  launch: { title: 'Settings', detail: 'Launch checks and platform diagnostics.' },
};

export function BackButton({ onClick, label = 'Back to Player Search' }) {
  if (!onClick) return null;

  return (
    <button onClick={onClick} className="crexus-back-btn" type="button">
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}

export default function CrexusShell({ activeView, onNavigate, children }) {
  const [linkedAccount, setLinkedAccount] = useState(() => readLinkedAccount());

  useEffect(() => {
    const syncLinkedAccount = () => setLinkedAccount(readLinkedAccount());
    window.addEventListener('crexus-linked-account-change', syncLinkedAccount);
    window.addEventListener('storage', syncLinkedAccount);
    return () => {
      window.removeEventListener('crexus-linked-account-change', syncLinkedAccount);
      window.removeEventListener('storage', syncLinkedAccount);
    };
  }, []);

  const page = pageTitles[activeView] || pageTitles.profile;

  return (
    <div className="crexus-app-shell min-h-screen text-gray-200 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="crexus-sidebar border-b border-white/10 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-4 lg:py-5">
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="crexus-brand-button"
          aria-label="Open Crexus player search"
        >
          <img src="/crexus-logo.png" alt="Crexus logo" className="h-10 w-10 object-contain" />
          <div className="min-w-0">
            <div className="text-base font-black uppercase tracking-[0.22em] text-white">Crexus</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">v1.1.2</div>
          </div>
        </button>

        {linkedAccount && (
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="mt-5 w-full rounded-2xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-left transition hover:border-red-400/40 hover:bg-red-500/15"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">Linked account</div>
            <div className="mt-1 truncate text-sm font-black text-white">{linkedAccount.name}<span className="text-gray-500">#{linkedAccount.tag}</span></div>
            <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">{getRegionLabel(linkedAccount.region)}</div>
          </button>
        )}

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-5 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Crexus tools">
          {navItems.map((item) => {
            const active = activeView === item.key || (activeView === 'live' && item.key === 'lobby');
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`crexus-nav-item ${active ? 'crexus-nav-item-active' : ''}`}
              >
                <span className="crexus-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-black uppercase tracking-[0.12em]">{item.label}</span>
                  <span className="mt-0.5 hidden truncate text-[11px] leading-4 text-gray-600 lg:block">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-5 hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3 lg:block">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.75)]" />
            Synced
          </div>
          <div className="mt-1 text-[11px] text-gray-500">All systems operational</div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="crexus-topbar sticky top-0 z-40">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Crexus Console</div>
            <div className="mt-0.5 truncate text-sm font-black text-white md:text-base">{page.title}</div>
          </div>
          <div className="hidden min-w-0 flex-1 justify-center px-5 md:flex">
            <div className="truncate text-xs text-gray-500">{page.detail}</div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <button type="button" onClick={() => onNavigate('profile')} className="crexus-topbar-icon" aria-label="Search">⌕</button>
            <span className="crexus-topbar-icon" aria-label="Notifications">●</span>
            <span className="crexus-topbar-icon" aria-hidden="true">•••</span>
          </div>
        </div>
        <div className="crexus-main-stage">
          {children}
        </div>
      </main>
    </div>
  );
}

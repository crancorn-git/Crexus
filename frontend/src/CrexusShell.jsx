import { useEffect, useState } from 'react';
import { readLinkedAccount } from './accountLink';
import { getRegionLabel } from './regions';

const navItems = [
  { key: 'profile', label: 'Player Search', hint: 'Search Riot ID' },
  { key: 'lobby', label: 'Live Game', hint: 'Team read' },
  { key: 'dashboard', label: 'Dashboard', hint: 'Saved players' },
  { key: 'compare', label: 'Compare', hint: 'Player vs player' },
  { key: 'champions', label: 'Champions', hint: 'Pools & matchups' },
  { key: 'leaderboard', label: 'Ladder', hint: 'Top ranked' },
];

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

  return (
    <div className="min-h-screen bg-[#08090c] text-gray-200 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-white/10 bg-[#08090c]/98 px-4 py-3 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-4 lg:py-5">
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-white/[0.03]"
          aria-label="Open Crexus player search"
        >
          <img src="/crexus-logo.png" alt="Crexus logo" className="h-9 w-9 object-contain" />
          <div className="min-w-0">
            <div className="text-base font-black uppercase tracking-[0.16em] text-white">Crexus</div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">v1.1.1</div>
          </div>
        </button>

        {linkedAccount && (
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-red-500/30 hover:bg-red-500/10"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Linked account</div>
            <div className="mt-1 truncate text-sm font-black text-white">{linkedAccount.name}<span className="text-gray-500">#{linkedAccount.tag}</span></div>
            <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-300">{getRegionLabel(linkedAccount.region)}</div>
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
                className={`min-w-max rounded-xl border px-3 py-2.5 text-left transition lg:min-w-0 ${
                  active
                    ? 'border-red-500/45 bg-red-500/14 text-white'
                    : 'border-transparent bg-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <div className="text-[12px] font-black uppercase tracking-[0.13em]">{item.label}</div>
                <div className="mt-0.5 hidden text-[11px] leading-4 text-gray-600 lg:block">{item.hint}</div>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0 bg-[#08090c]">
        {children}
      </main>
    </div>
  );
}

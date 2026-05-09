import { useMemo, useState } from 'react';
import { REGION_OPTIONS } from './regions';

import { BackButton } from './CrexusShell';
const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const accountKey = (account) => `${account.name}#${account.tag}:${account.region}`;

const formatRegion = (region) => REGION_OPTIONS.find((item) => item.value === region)?.label || region?.toUpperCase() || 'Region';

const getLatestSnapshot = (progress, account) => {
  const history = progress[accountKey(account)] || [];
  return history[0] || null;
};

const getChange = (history, field) => {
  if (!history || history.length < 2) return null;
  const newest = Number(history[0]?.[field]);
  const previous = Number(history[1]?.[field]);
  if (!Number.isFinite(newest) || !Number.isFinite(previous)) return null;
  return newest - previous;
};

function StatCard({ label, value, detail, accent = false }) {
  return (
    <div className={`rounded-3xl border p-5 ${accent ? 'border-red-500/20 bg-red-500/10' : 'border-white/10 bg-white/5'}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      {detail && <div className="mt-1 text-sm text-gray-400">{detail}</div>}
    </div>
  );
}

function AccountRow({ account, snapshot, onOpenAccount, onRemove, onPin, onSelect, pinned }) {
  const scoreChange = getChange(readStorage('crexus_progress', {})[accountKey(account)], 'crexusScore');
  return (
    <div onClick={onSelect} className="cursor-pointer rounded-[28px] border border-white/10 bg-[#11141b] p-4 transition hover:border-red-500/25">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <button onClick={(event) => { event.stopPropagation(); onOpenAccount(account); }} className="flex items-center gap-4 text-left">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-xl font-black text-red-200">
            {pinned ? '★' : account.name?.[0]?.toUpperCase() || 'C'}
          </div>
          <div>
            <div className="text-lg font-black text-white">{account.name}<span className="text-gray-500">#{account.tag}</span></div>
            <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-gray-500">{formatRegion(account.region)}</div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5 md:text-right">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Score</div>
            <div className="font-black text-white">{snapshot ? `${snapshot.crexusScore}/100` : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Rank</div>
            <div className="font-black text-white">{snapshot?.rank || 'Not checked'}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Winrate</div>
            <div className="font-black text-white">{snapshot ? `${snapshot.winRate}%` : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Change</div>
            <div className={`font-black ${scoreChange > 0 ? 'text-green-300' : scoreChange < 0 ? 'text-red-300' : 'text-gray-400'}`}>
              {scoreChange === null ? '—' : `${scoreChange > 0 ? '+' : ''}${scoreChange}`}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={(event) => { event.stopPropagation(); onOpenAccount(account); }} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white hover:bg-red-500">Refresh</button>
            <button onClick={(event) => { event.stopPropagation(); onPin(account); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-gray-300 hover:border-red-500/30 hover:text-white">Pin</button>
            <button onClick={(event) => { event.stopPropagation(); onRemove(account); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-gray-500 hover:border-red-500/30 hover:text-red-200">Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressHistory({ selectedKey, progress }) {
  const history = progress[selectedKey] || [];
  if (!selectedKey || history.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-6 text-gray-400">
        No progress snapshots yet. Open or refresh a saved player to capture their current score, rank, winrate, form, and champion pool.
      </div>
    );
  }

  const latest = history[0];
  const previous = history[1];
  const scoreChange = getChange(history, 'crexusScore');
  const winRateChange = getChange(history, 'winRate');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard label="Latest score" value={`${latest.crexusScore}/100`} detail={scoreChange === null ? 'First snapshot' : `${scoreChange > 0 ? '+' : ''}${scoreChange} since last check`} accent />
        <StatCard label="Rank" value={latest.rank} detail={`${latest.lp || 0} LP`} />
        <StatCard label="Winrate" value={`${latest.winRate}%`} detail={winRateChange === null ? `${latest.matches} matches` : `${winRateChange > 0 ? '+' : ''}${winRateChange}% since last check`} />
        <StatCard label="Form" value={latest.recentForm || 'Stable'} detail={`Tilt risk: ${latest.tiltRisk || 'Unknown'}`} />
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0d1017] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Progress Over Time</div>
            <h3 className="mt-1 text-xl font-black text-white">Recent snapshots</h3>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-gray-400">{history.length} saved</div>
        </div>
        <div className="mt-5 space-y-3">
          {history.slice(0, 8).map((entry) => (
            <div key={`${entry.date}-${entry.timestamp}`} className="grid grid-cols-2 gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm md:grid-cols-6">
              <div className="font-black text-white">{entry.date}</div>
              <div className="text-gray-300">Score <span className="font-black text-white">{entry.crexusScore}</span></div>
              <div className="text-gray-300">Rank <span className="font-black text-white">{entry.rank}</span></div>
              <div className="text-gray-300">WR <span className="font-black text-white">{entry.winRate}%</span></div>
              <div className="text-gray-300">Form <span className="font-black text-white">{entry.recentForm}</span></div>
              <div className="text-gray-300">Role <span className="font-black text-white">{entry.mainRole}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Champion Pool Changes</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(latest.topChampions || []).map((champ) => (
              <span key={champ.name} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-100">{champ.name} · {champ.games}</span>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Suggested Focus</div>
          <p className="mt-3 text-sm leading-6 text-gray-300">
            {latest.tiltRisk === 'High'
              ? 'Focus on stabilising early deaths and avoiding low-value fights before first recall.'
              : latest.winRate < 45
                ? 'Recent winrate is low. Review losses and reduce champion swapping for the next block.'
                : previous && latest.crexusScore < previous.crexusScore
                  ? 'Score dipped since last check. Compare objective control and lane phase before queueing.'
                  : 'Current trend is stable. Keep tracking form and use Compare or Live Scout for matchup preparation.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AccountDashboard({ onBack, onOpenAccount, onCompareClick }) {
  const [favorites, setFavorites] = useState(() => readStorage('crexus_favorites', []));
  const [pinned, setPinned] = useState(() => readStorage('crexus_pinned', null));
  const [progress, setProgress] = useState(() => readStorage('crexus_progress', {}));
  const [selectedKey, setSelectedKey] = useState(() => {
    const saved = readStorage('crexus_favorites', []);
    const pin = readStorage('crexus_pinned', null);
    return pin ? accountKey(pin) : saved[0] ? accountKey(saved[0]) : '';
  });

  const accounts = useMemo(() => {
    const all = [];
    if (pinned) all.push({ ...pinned, pinned: true });
    favorites.forEach((favorite) => {
      if (!all.some((item) => accountKey(item) === accountKey(favorite))) all.push(favorite);
    });
    return all;
  }, [favorites, pinned]);

  const dashboardStats = useMemo(() => {
    const snapshots = accounts.map((account) => getLatestSnapshot(progress, account)).filter(Boolean);
    const avgScore = snapshots.length ? Math.round(snapshots.reduce((sum, item) => sum + (item.crexusScore || 0), 0) / snapshots.length) : 0;
    const hotAccounts = snapshots.filter((item) => ['Hot', 'Positive'].includes(item.recentForm)).length;
    const highTilt = snapshots.filter((item) => item.tiltRisk === 'High').length;
    return { snapshots, avgScore, hotAccounts, highTilt };
  }, [accounts, progress]);

  const removeAccount = (account) => {
    const next = favorites.filter((item) => accountKey(item) !== accountKey(account));
    setFavorites(next);
    writeStorage('crexus_favorites', next);
    if (pinned && accountKey(pinned) === accountKey(account)) {
      setPinned(null);
      localStorage.removeItem('crexus_pinned');
    }
  };

  const pinAccount = (account) => {
    setPinned(account);
    writeStorage('crexus_pinned', account);
    setSelectedKey(accountKey(account));
  };

  const clearProgress = () => {
    if (!selectedKey) return;
    const next = { ...progress };
    delete next[selectedKey];
    setProgress(next);
    writeStorage('crexus_progress', next);
  };

  return (
    <div className="min-h-screen text-gray-200">
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between gap-4 px-1 py-2">
          <div className="flex items-center gap-4">
            <img src="/crexus-logo.png" alt="Crexus logo" className="h-12 w-12 rounded-2xl object-contain shadow-[0_0_28px_rgba(239,68,68,0.18)]" />
            <div>
              <h1 className="text-3xl font-black uppercase tracking-[0.18em] text-white md:text-4xl">Crexus</h1>
              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.28em] text-red-300">v0.8.0 · Account Tracking</div>
            </div>
          </div>
          <BackButton onClick={onBack} />
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Saved accounts" value={accounts.length} detail="Favourites and pinned players" accent />
          <StatCard label="Average score" value={dashboardStats.snapshots.length ? `${dashboardStats.avgScore}/100` : '—'} detail="Latest saved snapshots" />
          <StatCard label="Positive form" value={dashboardStats.hotAccounts} detail="Hot or positive accounts" />
          <StatCard label="High tilt risk" value={dashboardStats.highTilt} detail="Needs review before queue" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="crexus-card rounded-[32px] p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Saved Accounts</div>
                <h2 className="mt-1 text-2xl font-black text-white">Pinned dashboard</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">Open a saved account to quick refresh it. Each refresh records a progress snapshot for score, rank, winrate, form, and champion pool.</p>
              </div>
              <button onClick={onCompareClick} className="rounded-2xl bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_0_22px_rgba(239,68,68,0.3)] hover:bg-red-500">Compare</button>
            </div>

            <div className="mt-5 space-y-3">
              {accounts.length ? accounts.map((account) => (
                <AccountRow
                  key={accountKey(account)}
                  account={account}
                  snapshot={getLatestSnapshot(progress, account)}
                  onOpenAccount={onOpenAccount}
                  onRemove={removeAccount}
                  onPin={pinAccount}
                  onSelect={() => setSelectedKey(accountKey(account))}
                  pinned={pinned && accountKey(pinned) === accountKey(account)}
                />
              )) : (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm leading-6 text-gray-400">
                  No saved accounts yet. Search a player from the main page and press Save or Pin to add them here.
                </div>
              )}
            </div>
          </section>

          <section className="crexus-card rounded-[32px] p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Progress Over Time</div>
                <h2 className="mt-1 text-2xl font-black text-white">Form, rank, and focus</h2>
              </div>
              <button onClick={clearProgress} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-gray-400 hover:border-red-500/30 hover:text-red-200">Clear selected history</button>
            </div>
            <ProgressHistory selectedKey={selectedKey} progress={progress} />
          </section>
        </div>
      </div>
    </div>
  );
}

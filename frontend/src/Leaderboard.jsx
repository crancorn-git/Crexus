import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { REGION_OPTIONS, getRegionLabel } from './regions';

const PRO_PLAYERS = {
  'Hide on bush': 'Faker',
  Agurin: 'Agurin',
  Caps: 'G2 Caps',
  CoreJJ: 'TL CoreJJ',
  Santorin: 'Santorin',
  Humzh: 'Humzh',
  Doublelift: 'Doublelift',
};

export default function Leaderboard({ onBack }) {
  const [region, setRegion] = useState('kr');
  const [players, setPlayers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError('');
      setPlayers([]);
      setMeta(null);

      try {
        const res = await axios.get(`${API_BASE}/api/leaderboard?region=${region}&limit=100`);
        const payload = Array.isArray(res.data) ? { players: res.data } : res.data;
        setPlayers(payload.players || []);
        setMeta(payload.meta || null);
      } catch (err) {
        const message = err.response?.data?.error || 'Failed to load the ladder for this region.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [region]);

  return (
    <div className="min-h-screen text-gray-200">
      <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
        <div className="crexus-card mb-6 rounded-[32px] border border-red-500/10 p-5 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button onClick={onBack} className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-gray-400 transition hover:text-white">
                ← Back
              </button>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-red-300">Crexus Ladder</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">Top ranked players</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Region-aware ranked ladder for the broader Crexus game stats platform. Change region to pull the top players from that platform shard.
              </p>
            </div>

            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-2xl border border-white/10 bg-[#0b0d12] px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-white outline-none transition hover:border-red-500/30 focus:border-red-500/40"
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="crexus-card rounded-[28px] border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-white/10 bg-white/[0.03] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-red-300">{getRegionLabel(region)}</div>
              <div className="mt-1 text-sm text-gray-400">
                {meta?.queue ? `${meta.queue.replaceAll('_', ' ')} · ${players.length}/${meta.totalEntries || players.length} shown` : `${players.length} players loaded`}
              </div>
            </div>
            {meta?.tier && <div className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-200">{meta.tier}</div>}
          </div>

          {loading && <div className="p-12 text-center text-red-300 animate-pulse font-black uppercase tracking-[0.18em]">Loading ladder...</div>}

          {!loading && error && (
            <div className="p-10 text-center">
              <div className="text-lg font-black text-red-300">Ladder unavailable</div>
              <p className="mt-2 text-sm text-gray-400">{error}</p>
            </div>
          )}

          {!loading && !error && players.length === 0 && (
            <div className="p-10 text-center text-gray-400">No ranked players were returned for {getRegionLabel(region)}.</div>
          )}

          {!loading && !error && players.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead className="bg-[#0d0f14] text-gray-500 text-xs uppercase tracking-widest">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Player</th>
                    <th className="p-4">LP</th>
                    <th className="p-4">Winrate</th>
                    <th className="p-4 text-center">Streak</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {players.map((p, index) => {
                    const totalGames = (p.wins || 0) + (p.losses || 0);
                    const winrate = totalGames ? Math.round((p.wins / totalGames) * 100) : 0;
                    const tag = p.tagLine ? `#${p.tagLine}` : '';
                    const name = p.gameName ? `${p.gameName}${tag ? ` ${tag}` : ''}` : (p.summonerName || `Rank #${index + 1}`);
                    const isPro = PRO_PLAYERS[p.gameName];

                    return (
                      <tr key={p.summonerId || `${name}-${index}`} className="border-b border-white/5 transition hover:bg-white/[0.04]">
                        <td className="p-4 font-mono text-gray-400">#{index + 1}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-white">{name}</span>
                            {isPro && <span className="rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-yellow-200">Pro: {isPro}</span>}
                            {p.nameUnavailable && <span className="text-[10px] text-gray-500" title="Riot name lookup was unavailable, showing ladder rank fallback">Name lookup unavailable</span>}
                            {p.veteran && <span className="text-[10px] text-gray-500" title="Veteran">Veteran</span>}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-red-300 font-black">{(p.leaguePoints || 0).toLocaleString()} LP</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-white/10">
                              <div className={`h-full ${winrate >= 60 ? 'bg-red-500' : winrate >= 50 ? 'bg-red-400/70' : 'bg-gray-500'}`} style={{ width: `${winrate}%` }} />
                            </div>
                            <span className={winrate >= 60 ? 'text-red-300 font-black' : 'text-gray-300'}>{winrate}%</span>
                            <span className="text-xs text-gray-600">({totalGames})</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {p.hotStreak ? <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-200">Hot</span> : <span className="text-gray-600">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

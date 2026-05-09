import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { BackButton } from './CrexusShell';

const REGIONS = [
  ['na1', 'North America'], ['kr', 'Korea'], ['euw1', 'Europe West'], ['br1', 'Brazil']
];

const PRO_PLAYERS = {
  'Hide on bush': 'Faker', Agurin: 'Agurin', Caps: 'G2 Caps', CoreJJ: 'TL CoreJJ', Santorin: 'Santorin', Humzh: 'Humzh', Doublelift: 'Doublelift'
};

export default function Leaderboard({ onBack }) {
  const [region, setRegion] = useState('kr');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/leaderboard?region=${region}`);
        const list = Array.isArray(res.data) ? res.data : (res.data.players || []);
        setPlayers(list);
      } catch {
        setPlayers([]);
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, [region]);

  return (
    <div className="crexus-page min-h-screen text-gray-200">
      <BackButton onClick={onBack} />

      <header className="mt-5 mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="crexus-kicker">v1.1.0 · Ladder</div>
          <h1 className="crexus-page-title mt-2">Ranked Ladder</h1>
          <p className="crexus-copy mt-2 max-w-3xl">A cleaner regional ladder with fewer columns, clearer spacing, and readable player rows.</p>
        </div>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="crexus-input max-w-[260px] text-sm font-black uppercase tracking-[0.12em]">
          {REGIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </header>

      <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="crexus-card rounded-[24px] p-5"><div className="crexus-kicker">Region</div><div className="mt-2 text-2xl font-black text-white">{region.toUpperCase()}</div></div>
        <div className="crexus-card rounded-[24px] p-5"><div className="crexus-kicker">Queue</div><div className="mt-2 text-2xl font-black text-white">Solo/Duo</div></div>
        <div className="crexus-card rounded-[24px] p-5"><div className="crexus-kicker">Loaded</div><div className="mt-2 text-2xl font-black text-white">{players.length}</div></div>
      </section>

      <div className="crexus-card overflow-hidden rounded-[28px]">
        {loading ? (
          <div className="p-12 text-center text-red-300 animate-pulse font-black uppercase tracking-[0.18em]">Loading ladder...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead className="bg-[#0d0f14] text-gray-500 text-xs uppercase tracking-widest">
                <tr><th className="p-4">Rank</th><th className="p-4">Player</th><th className="p-4">LP</th><th className="p-4">Winrate</th><th className="p-4 text-center">Streak</th></tr>
              </thead>
              <tbody className="text-sm">
                {players.slice(0, 100).map((p, index) => {
                  const totalGames = (p.wins || 0) + (p.losses || 0);
                  const winrate = totalGames ? Math.round((p.wins / totalGames) * 100) : 0;
                  const name = p.gameName ? `${p.gameName}${p.tagLine ? ` #${p.tagLine}` : ''}` : (p.summonerName || `Rank #${index + 1}`);
                  const isPro = PRO_PLAYERS[p.gameName];
                  return (
                    <tr key={p.summonerId || `${name}-${index}`} className="border-b border-white/5 transition hover:bg-white/[0.04]">
                      <td className="p-4 font-mono text-gray-400">#{index + 1}</td>
                      <td className="p-4"><span className="font-black text-white">{name}</span>{isPro && <span className="ml-2 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-yellow-200">PRO: {isPro}</span>}</td>
                      <td className="p-4 font-mono font-black text-red-300">{(p.leaguePoints || 0).toLocaleString()} LP</td>
                      <td className="p-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-red-500" style={{ width: `${winrate}%` }} /></div><span className="font-bold text-gray-200">{winrate}%</span><span className="text-xs text-gray-600">({totalGames})</span></div></td>
                      <td className="p-4 text-center">{p.hotStreak ? <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-200">Hot</span> : <span className="text-gray-600">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

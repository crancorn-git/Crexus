import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { analyzePlayerIntelligence } from './intelligence';
import { IntelligencePills, IntelligenceMiniRead } from './IntelligencePills';
import { ScoutTeamRead } from './ScoutTeamRead';
import { BackButton } from './CrexusShell';

const REGION_OPTIONS = [
  ['na1', 'North America'], ['kr', 'Korea'], ['euw1', 'Europe West'], ['br1', 'Brazil'],
  ['eun1', 'Europe Nordic & East'], ['jp1', 'Japan'], ['la1', 'Latin America North'], ['la2', 'Latin America South'], ['tr1', 'Turkey'], ['ru', 'Russia']
];

export default function Lobby({ onBack }) {
  const [text, setText] = useState('');
  const [region, setRegion] = useState('na1');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const scoutLobby = async () => {
    setLoading(true);
    setResults([]);
    const lines = text.split(/[\n,]/).map((l) => l.replace(/ joined the lobby/gi, '').trim()).filter(Boolean);

    const data = await Promise.all(lines.map(async (line) => {
      const [name, tag] = line.split('#');
      if (!tag) return { name: line, error: 'Missing #Tag' };
      try {
        const res = await axios.get(`${API_BASE}/api/player/${encodeURIComponent(name.trim())}/${encodeURIComponent(tag.trim())}?region=${region}`);
        let matches = [];
        try {
          const matchRes = await axios.get(`${API_BASE}/api/matches/${res.data.account.puuid}?region=${region}`);
          matches = matchRes.data || [];
        } catch { matches = []; }
        const intelligence = analyzePlayerIntelligence({ matches, playerData: res.data });
        return { name: line, data: res.data, intelligence };
      } catch {
        return { name: line, error: 'Not found' };
      }
    }));

    setResults(data);
    setLoading(false);
  };

  return (
    <div className="crexus-page min-h-screen text-gray-200">
      <BackButton onClick={onBack} />

      <header className="mt-5 mb-6">
        <div className="crexus-kicker">v1.1.0 · Lobby Scout</div>
        <h1 className="crexus-page-title mt-2">Lobby Scout</h1>
        <p className="crexus-copy mt-2 max-w-3xl">Paste lobby chat or Riot IDs to build a clean team read without crowding the page.</p>
      </header>

      <section className="crexus-card mb-6 rounded-[28px] p-5 md:p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-start">
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="crexus-input text-sm font-black uppercase tracking-[0.12em]">
            {REGION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea
            className="crexus-input h-36 resize-none leading-6"
            placeholder="Paste lobby chat here, for example: Faker#KR1 joined the lobby"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button onClick={scoutLobby} disabled={loading || !text.trim()} className="crexus-btn crexus-btn-primary px-7 disabled:opacity-50">
            {loading ? 'Scouting...' : 'Scout Team'}
          </button>
        </div>
      </section>

      {results.length > 0 && <ScoutTeamRead entries={results} title="Lobby Team Read" />}

      <div className="grid gap-3">
        {results.map((res, i) => (
          <div key={`${res.name}-${i}`} className="rounded-[24px] border border-white/10 bg-[#11141b] p-4 shadow-md">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-black text-white">{res.name}</div>
                {res.error ? <p className="mt-1 text-sm font-bold text-red-300">{res.error}</p> : <><IntelligencePills intelligence={res.intelligence} /><IntelligenceMiniRead intelligence={res.intelligence} /></>}
              </div>
              {!res.error && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left md:text-right">
                  <div className="font-black text-red-200">{res.data.ranks[0] ? `${res.data.ranks[0].tier} ${res.data.ranks[0].rank}` : 'Unranked'}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-gray-500">Level {res.data.summoner.summonerLevel}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

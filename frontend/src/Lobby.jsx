import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { analyzePlayerIntelligence } from './intelligence';
import { IntelligencePills, IntelligenceMiniRead } from './IntelligencePills';
import { ScoutTeamRead } from './ScoutTeamRead';
import { REGION_OPTIONS } from './regions';

import { BackButton } from './CrexusShell';
export default function Lobby({ onBack }) {
  const [text, setText] = useState('');
  const [region, setRegion] = useState('na1');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const scoutLobby = async () => {
    setLoading(true);
    setResults([]);

    const lines = text
      .split(/[\n,]/)
      .map((line) => line.replace(/ joined the lobby/gi, '').trim())
      .filter(Boolean);

    const promises = lines.map(async (line) => {
      const [name, tag] = line.split('#');
      if (!tag) return { name: line, error: 'Missing #Tag' };

      try {
        const res = await axios.get(`${API_BASE}/api/player/${encodeURIComponent(name.trim())}/${encodeURIComponent(tag.trim())}?region=${region}`);
        let matches = [];
        try {
          const matchRes = await axios.get(`${API_BASE}/api/matches/${res.data.account.puuid}?region=${region}`);
          matches = matchRes.data || [];
        } catch {
          matches = [];
        }

        const intelligence = analyzePlayerIntelligence({ matches, playerData: res.data });
        return { name: line, data: res.data, intelligence };
      } catch (err) {
        return { name: line, error: err.response?.data?.error || 'Not found' };
      }
    });

    const data = await Promise.all(promises);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen text-gray-200">
      <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
        <div className="crexus-card mb-6 rounded-2xl border border-red-500/10 p-5 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <BackButton onClick={onBack} />
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-red-300">Crexus Live Game</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">Live game team read</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Paste Riot IDs from a lobby or live game to build a clean team read with ranks, recent form, and risk tags.
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

        <div className="crexus-card mb-6 rounded-2xl p-5 md:p-6">
          <textarea
            className="h-40 w-full resize-none rounded-2xl border border-white/10 bg-[#0b0d12] p-4 text-sm text-gray-200 outline-none placeholder:text-gray-600 transition focus:border-red-500/40"
            placeholder="Paste Riot IDs, one per line, for example: PlayerName#TAG"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={scoutLobby}
            disabled={loading || !text.trim()}
            className="mt-4 w-full rounded-2xl bg-red-600 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_0_26px_rgba(239,68,68,0.35)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500 disabled:shadow-none"
          >
            {loading ? 'Checking players...' : 'Check live game'}
          </button>
        </div>

        {results.length > 0 && <ScoutTeamRead entries={results} title="Live Game Read" />}

        <div className="grid gap-4">
          {results.map((res, i) => (
            <div key={`${res.name}-${i}`} className="crexus-card-soft rounded-xl border border-white/10 p-4 shadow-md">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="text-lg font-black text-white">{res.name}</div>
                  {res.error ? (
                    <p className="mt-1 text-sm font-bold text-red-300">{res.error}</p>
                  ) : (
                    <div className="mt-3">
                      <IntelligencePills intelligence={res.intelligence} />
                      <IntelligenceMiniRead intelligence={res.intelligence} />
                    </div>
                  )}
                </div>

                {!res.error && (
                  <div className="shrink-0 rounded-2xl border border-white/10 bg-[#0d1117] px-5 py-4 text-left md:text-right">
                    <div className="text-xl font-black text-red-300">
                      {res.data.ranks[0] ? `${res.data.ranks[0].tier} ${res.data.ranks[0].rank}` : 'Unranked'}
                    </div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                      Level {res.data.summoner.summonerLevel}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDDragonVersion } from './ddragon';

import { BackButton } from './CrexusShell';
const roleLabel = { TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'ADC', UTILITY: 'Support' };
const safePct = (wins, games) => (games ? Math.round((wins / games) * 100) : 0);
const kda = (p) => ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2);
const norm = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

function buildChampionStats(matches = [], puuid) {
  const map = new Map();
  matches.forEach((match) => {
    const participant = match.info?.participants?.find((p) => p.puuid === puuid);
    if (!participant) return;
    const key = participant.championName;
    const minutes = Math.max(1, (match.info.gameDuration || 1) / 60);
    const current = map.get(key) || {
      championName: key,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      damage: 0,
      cs: 0,
      vision: 0,
      roles: {},
      bestGame: null,
      worstGame: null
    };

    const score = participant.kills * 2 + participant.assists * 1.2 - participant.deaths * 1.6 + (participant.win ? 8 : 0) + participant.totalDamageDealtToChampions / minutes / 150;
    const gameLine = {
      matchId: match.metadata?.matchId,
      championName: key,
      win: participant.win,
      score,
      kda: kda(participant),
      line: `${participant.kills}/${participant.deaths}/${participant.assists}`,
      damage: participant.totalDamageDealtToChampions,
      csPerMin: (participant.totalMinionsKilled / minutes).toFixed(1),
      role: roleLabel[participant.teamPosition] || participant.teamPosition || 'Unknown'
    };

    current.games += 1;
    current.wins += participant.win ? 1 : 0;
    current.kills += participant.kills;
    current.deaths += participant.deaths;
    current.assists += participant.assists;
    current.damage += participant.totalDamageDealtToChampions;
    current.cs += participant.totalMinionsKilled;
    current.vision += participant.visionScore || 0;
    current.roles[participant.teamPosition || 'Unknown'] = (current.roles[participant.teamPosition || 'Unknown'] || 0) + 1;
    if (!current.bestGame || gameLine.score > current.bestGame.score) current.bestGame = gameLine;
    if (!current.worstGame || gameLine.score < current.worstGame.score) current.worstGame = gameLine;
    map.set(key, current);
  });

  return [...map.values()].map((stat) => ({
    ...stat,
    winRate: safePct(stat.wins, stat.games),
    avgKda: ((stat.kills + stat.assists) / Math.max(1, stat.deaths)).toFixed(2),
    avgDamage: Math.round(stat.damage / stat.games),
    avgCs: Math.round(stat.cs / stat.games),
    avgVision: Math.round(stat.vision / stat.games),
    mainRole: roleLabel[Object.entries(stat.roles).sort((a, b) => b[1] - a[1])[0]?.[0]] || 'Flex'
  })).sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

function buildMatchupMemory(matches = [], puuid) {
  const map = new Map();
  matches.forEach((match) => {
    const participant = match.info?.participants?.find((p) => p.puuid === puuid);
    if (!participant) return;
    const enemy = match.info.participants.find((p) => p.teamId !== participant.teamId && p.teamPosition === participant.teamPosition);
    if (!enemy) return;
    const key = enemy.championName;
    const current = map.get(key) || { championName: key, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, lane: roleLabel[participant.teamPosition] || 'Role' };
    current.games += 1;
    current.wins += participant.win ? 1 : 0;
    current.kills += participant.kills;
    current.deaths += participant.deaths;
    current.assists += participant.assists;
    map.set(key, current);
  });

  return [...map.values()].map((item) => ({
    ...item,
    winRate: safePct(item.wins, item.games),
    kda: ((item.kills + item.assists) / Math.max(1, item.deaths)).toFixed(2),
    label: item.games < 2 ? 'Low sample' : item.wins / item.games >= 0.6 ? 'Comfort matchup' : item.wins / item.games <= 0.4 ? 'Problem matchup' : 'Even matchup'
  })).sort((a, b) => b.games - a.games || a.winRate - b.winRate);
}

function inferChampionProfile(champion, stat) {
  if (!champion) return null;
  const tags = champion.tags || [];
  const isTank = tags.includes('Tank');
  const isCarry = tags.includes('Marksman') || tags.includes('Assassin') || tags.includes('Mage');
  const isSupport = tags.includes('Support');
  const strengths = [];
  const weaknesses = [];

  if (stat?.winRate >= 60) strengths.push('strong recent results for this player');
  if (stat?.avgKda >= 3) strengths.push('reliable fight impact');
  if (stat?.avgDamage >= 20000) strengths.push('high damage output');
  if (isTank) strengths.push('frontline and engage value');
  if (isCarry) strengths.push('carry threat when ahead');
  if (isSupport) strengths.push('utility and team setup');

  if (stat?.winRate < 45 && stat?.games >= 2) weaknesses.push('recent results are weak');
  if (stat?.avgKda < 2 && stat?.games >= 2) weaknesses.push('low survival or low impact games');
  if (tags.includes('Assassin')) weaknesses.push('can fall behind if early tempo fails');
  if (tags.includes('Marksman')) weaknesses.push('positioning and peel dependent');
  if (!weaknesses.length) weaknesses.push('no major weakness detected from the loaded sample');

  return {
    title: `${champion.name} Profile`,
    summary: `${champion.name} is a ${tags.join(' / ') || 'flex'} champion. ${champion.blurb}`,
    commonRoles: tags.includes('Marksman') ? ['ADC'] : tags.includes('Support') ? ['Support'] : tags.includes('Assassin') ? ['Mid', 'Jungle'] : tags.includes('Tank') ? ['Top', 'Jungle', 'Support'] : ['Top', 'Mid', 'Jungle'],
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4)
  };
}

function draftRead({ allies, enemies, selectedChampion, championStats, matchupMemory }) {
  const allyNames = allies.map(norm).filter(Boolean);
  const enemyNames = enemies.map(norm).filter(Boolean);
  const bestComfort = [...championStats].sort((a, b) => b.games - a.games || b.winRate - a.winRate)[0];
  const worstMatchup = [...matchupMemory].filter((m) => m.games >= 1).sort((a, b) => a.winRate - b.winRate || b.games - a.games)[0];
  const enemyProblem = matchupMemory.find((m) => enemyNames.includes(norm(m.championName)));
  const selectedStat = selectedChampion ? championStats.find((s) => norm(s.championName) === norm(selectedChampion.name)) : null;
  const notes = [];
  const bans = [];

  if (enemyProblem) bans.push({ championName: enemyProblem.championName, reason: `${enemyProblem.winRate}% WR into this matchup sample · ${enemyProblem.label}` });
  if (worstMatchup && !bans.some((b) => b.championName === worstMatchup.championName)) bans.push({ championName: worstMatchup.championName, reason: `lowest loaded matchup result (${worstMatchup.winRate}% WR)` });
  if (bestComfort && bestComfort.games >= 2) notes.push(`Comfort pick warning: ${bestComfort.championName} is this player's clearest comfort pattern (${bestComfort.games} games, ${bestComfort.winRate}% WR).`);
  if (selectedStat) notes.push(`${selectedChampion.name} personal read: ${selectedStat.games} games, ${selectedStat.winRate}% WR, ${selectedStat.avgKda} KDA.`);
  if (enemyProblem) notes.push(`Counterpick warning: loaded history shows trouble into ${enemyProblem.championName}.`);
  if (enemyNames.length >= 3 && allyNames.length < 3) notes.push('Enemy draft has more visible information than your side. Prioritise safe blind picks or deny their strongest comfort champion.');
  if (allyNames.length >= 4 && enemyNames.length >= 4) notes.push('Both drafts are mostly visible. Check damage mix, engage, disengage, and scaling before locking the final pick.');
  if (!notes.length) notes.push('Add allied and enemy picks to generate stronger pick-ban notes.');

  return { bans: bans.slice(0, 3), notes };
}

function StatBox({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      {detail && <div className="mt-1 text-xs text-gray-400">{detail}</div>}
    </div>
  );
}

function Chip({ children, tone = 'default' }) {
  const cls = tone === 'red' ? 'border-red-500/20 bg-red-500/10 text-red-200' : tone === 'green' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-gray-300';
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}

export default function ChampionInsights({ onBack, playerData = null, matches = [], region = 'kr' }) {
  const ddragonVersion = useDDragonVersion();
  const ddragonBase = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}`;
  const [champions, setChampions] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [allies, setAllies] = useState('');
  const [enemies, setEnemies] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await axios.get(`${ddragonBase}/data/en_US/champion.json`);
      const list = Object.values(res.data.data).sort((a, b) => a.name.localeCompare(b.name));
      setChampions(list);
      if (list[0]) setSelectedKey((current) => current || list[0].id);
    };
    load().catch((err) => console.error('Champion load failed', err));
  }, [ddragonBase]);

  const selectedChampion = champions.find((c) => c.id === selectedKey) || champions[0];
  const playerPuuid = playerData?.account?.puuid;
  const championStats = useMemo(() => buildChampionStats(matches, playerPuuid), [matches, playerPuuid]);
  const matchupMemory = useMemo(() => buildMatchupMemory(matches, playerPuuid), [matches, playerPuuid]);
  const selectedStat = selectedChampion ? championStats.find((s) => norm(s.championName) === norm(selectedChampion.name)) : null;
  const profile = inferChampionProfile(selectedChampion, selectedStat);
  const draft = draftRead({
    allies: allies.split(',').map((x) => x.trim()),
    enemies: enemies.split(',').map((x) => x.trim()),
    selectedChampion,
    championStats,
    matchupMemory
  });

  const filteredChampions = champions.filter((champ) => champ.name.toLowerCase().includes(query.toLowerCase())).slice(0, 24);
  const best = championStats.filter((c) => c.games >= 1).sort((a, b) => b.winRate - a.winRate || b.games - a.games)[0];
  const weakest = championStats.filter((c) => c.games >= 1).sort((a, b) => a.winRate - b.winRate || b.games - a.games)[0];

  return (
    <div className="min-h-screen text-gray-200">
      <div className="crexus-page">
        <header className="crexus-card mb-6 rounded-2xl p-5 md:p-7">
          <BackButton onClick={onBack} />
          <div className="mt-4">
            <div className="crexus-kicker">Cranix Scout Champions</div>
            <h1 className="crexus-page-title mt-2">Champions</h1>
            <p className="crexus-copy mt-2 max-w-3xl">Champion profiles, matchup notes, and draft checks for the selected player sample.</p>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="crexus-card rounded-2xl p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Champion Profiles</div>
            <h2 className="mt-2 text-2xl font-black text-white">Champion profiles</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Search a champion to view a clean profile, common roles, strength/weakness reads, and personal stats when a player sample is loaded.</p>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search champion" className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0b0d12] px-4 py-3 text-white outline-none focus:border-red-500/30" />
            <div className="mt-4 grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3">
              {filteredChampions.map((champ) => (
                <button key={champ.id} onClick={() => setSelectedKey(champ.id)} className={`flex items-center gap-2 rounded-2xl border p-2 text-left transition ${selectedChampion?.id === champ.id ? 'border-red-500/40 bg-red-500/15' : 'border-white/8 bg-white/[0.03] hover:border-red-500/20 hover:bg-red-500/10'}`}>
                  <img src={`${ddragonBase}/img/champion/${champ.image.full}`} alt={champ.name} className="h-9 w-9 rounded-xl" />
                  <div className="min-w-0 text-sm font-bold text-white">{champ.name}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedChampion && profile && (
            <div className="crexus-card rounded-2xl p-5 md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <img src={`${ddragonBase}/img/champion/${selectedChampion.image.full}`} alt={selectedChampion.name} className="h-24 w-24 rounded-3xl border border-red-500/20 shadow-[0_0_28px_rgba(239,68,68,0.18)]" />
                <div className="flex-1">
                  <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">{selectedChampion.title}</div>
                  <h2 className="mt-1 text-3xl font-black text-white">{selectedChampion.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{profile.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.commonRoles.map((role) => <Chip key={role}>{role}</Chip>)}
                    {(selectedChampion.tags || []).map((tag) => <Chip key={tag}>{tag}</Chip>)}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
                <StatBox label="Personal games" value={selectedStat?.games ?? 0} detail={playerData ? `${region.toUpperCase()} loaded sample` : 'Load a player profile for personal stats'} />
                <StatBox label="Winrate" value={selectedStat ? `${selectedStat.winRate}%` : '—'} detail={selectedStat ? `${selectedStat.wins}/${selectedStat.games} wins` : 'No sample yet'} />
                <StatBox label="Avg KDA" value={selectedStat?.avgKda ?? '—'} detail={selectedStat ? selectedStat.mainRole : 'No sample yet'} />
                <StatBox label="Avg damage" value={selectedStat?.avgDamage?.toLocaleString?.() ?? '—'} detail={selectedStat ? `${selectedStat.avgCs} avg CS · ${selectedStat.avgVision} vision` : 'No sample yet'} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">Strengths</div>
                  <ul className="mt-3 space-y-2 text-sm text-gray-300">{profile.strengths.map((x) => <li key={x}>• {x}</li>)}</ul>
                </div>
                <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">Weaknesses</div>
                  <ul className="mt-3 space-y-2 text-sm text-gray-300">{profile.weaknesses.map((x) => <li key={x}>• {x}</li>)}</ul>
                </div>
              </div>

              {selectedStat && (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Best example</div>
                    <div className="mt-2 font-black text-white">{selectedStat.bestGame?.line} · {selectedStat.bestGame?.kda} KDA</div>
                    <div className="mt-1 text-sm text-gray-400">{selectedStat.bestGame?.win ? 'Win' : 'Loss'} · {selectedStat.bestGame?.csPerMin} CS/m · {selectedStat.bestGame?.role}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Worst example</div>
                    <div className="mt-2 font-black text-white">{selectedStat.worstGame?.line} · {selectedStat.worstGame?.kda} KDA</div>
                    <div className="mt-1 text-sm text-gray-400">{selectedStat.worstGame?.win ? 'Win' : 'Loss'} · {selectedStat.worstGame?.csPerMin} CS/m · {selectedStat.worstGame?.role}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="crexus-card rounded-2xl p-5 md:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Matchup Memory</div>
            <h2 className="mt-2 text-2xl font-black text-white">Personal matchup memory</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Tracks who the player performed well into, struggled against, and which bans or counterpicks deserve attention.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <StatBox label="Best comfort" value={best?.championName || '—'} detail={best ? `${best.winRate}% WR · ${best.games} games` : 'Load a player sample'} />
              <StatBox label="Weakest comfort" value={weakest?.championName || '—'} detail={weakest ? `${weakest.winRate}% WR · ${weakest.games} games` : 'Load a player sample'} />
            </div>
            <div className="mt-5 space-y-3">
              {matchupMemory.length ? matchupMemory.slice(0, 8).map((m) => (
                <div key={m.championName} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div>
                    <div className="font-black text-white">vs {m.championName}</div>
                    <div className="mt-1 text-xs text-gray-500">{m.lane} · {m.games} games · {m.kda} KDA</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-black text-red-200">{m.winRate}%</div>
                    <div className="mt-1"><Chip tone={m.label === 'Problem matchup' ? 'red' : m.label === 'Comfort matchup' ? 'green' : 'default'}>{m.label}</Chip></div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm leading-6 text-gray-400">Load a player profile first. Cranix Scout will use their recent matches to build champion matchup memory.</div>
              )}
            </div>
          </div>

          <div className="crexus-card rounded-2xl p-5 md:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Draft Read</div>
            <h2 className="mt-2 text-2xl font-black text-white">Draft read</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Enter visible picks to get suggested bans, comfort pick warnings, counterpick warnings, and comp checks before lock-in.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Allied picks</span>
                <textarea value={allies} onChange={(e) => setAllies(e.target.value)} placeholder="Ahri, Vi, Jinx" className="mt-2 h-28 w-full rounded-2xl border border-white/10 bg-[#0b0d12] p-4 text-sm text-white outline-none focus:border-red-500/30" />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Enemy picks</span>
                <textarea value={enemies} onChange={(e) => setEnemies(e.target.value)} placeholder="Zed, Riven, Nautilus" className="mt-2 h-28 w-full rounded-2xl border border-white/10 bg-[#0b0d12] p-4 text-sm text-white outline-none focus:border-red-500/30" />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-red-500/15 bg-red-500/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">Suggested bans</div>
              <div className="mt-3 space-y-2">
                {draft.bans.length ? draft.bans.map((ban) => (
                  <div key={ban.championName} className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="font-black text-white">{ban.championName}</div>
                    <div className="mt-1 text-xs text-gray-400">{ban.reason}</div>
                  </div>
                )) : <div className="text-sm text-gray-400">No ban pattern yet. Add enemy picks or load player matchup history.</div>}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Draft notes</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                {draft.notes.map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatBox label="Damage check" value="Mixed" detail="Confirm AP/AD balance before lock" />
              <StatBox label="Engage check" value="Manual" detail="Look for reliable start tools" />
              <StatBox label="Scaling check" value="Manual" detail="Compare early pressure vs late game" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

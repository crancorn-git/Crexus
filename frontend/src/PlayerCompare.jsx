import { useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { REGION_OPTIONS } from './regions';
import { analyzePlayerIntelligence } from './intelligence';
import { buildLanePhaseRead } from './advancedIntelligence';
import { useDDragonVersion } from './ddragon';

import { BackButton } from './CrexusShell';
const parseRiotId = (value) => {
  const [name, tag] = value.split('#').map((part) => part?.trim());
  if (!name || !tag) return null;
  return { name, tag };
};

const getPrimaryRank = (ranks = []) => ranks.find((rank) => rank.queueType === 'RANKED_SOLO_5x5') || ranks.find((rank) => rank.queueType === 'RANKED_FLEX_SR') || ranks[0] || null;

const getPlayerRows = (matches = [], puuid) => matches
  .map((match) => match?.info?.participants?.find((participant) => participant.puuid === puuid))
  .filter(Boolean);

const round = (value, decimals = 1) => Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;
const clamp = (value) => Math.max(0, Math.min(100, Math.round(value || 0)));

const buildObjectiveRead = (matches = [], puuid) => {
  const rows = matches.map((match) => {
    const player = match?.info?.participants?.find((participant) => participant.puuid === puuid);
    if (!player) return null;
    const team = match.info.teams?.find((entry) => entry.teamId === player.teamId);
    const objectives = team?.objectives || {};
    return {
      dragons: objectives.dragon?.kills || 0,
      barons: objectives.baron?.kills || 0,
      heralds: objectives.riftHerald?.kills || 0,
      towers: objectives.tower?.kills || 0,
      vision: player.visionScore || 0
    };
  }).filter(Boolean);

  if (!rows.length) return { score: 0, dragons: 0, barons: 0, towers: 0, vision: 0 };

  const totals = rows.reduce((acc, row) => ({
    dragons: acc.dragons + row.dragons,
    barons: acc.barons + row.barons,
    heralds: acc.heralds + row.heralds,
    towers: acc.towers + row.towers,
    vision: acc.vision + row.vision
  }), { dragons: 0, barons: 0, heralds: 0, towers: 0, vision: 0 });

  const games = rows.length;
  const score = Math.min(100, Math.round(
    ((totals.dragons / games) * 16) +
    ((totals.barons / games) * 22) +
    ((totals.heralds / games) * 10) +
    ((totals.towers / games) * 4) +
    ((totals.vision / games) * 1.2)
  ));

  return {
    score,
    dragons: round(totals.dragons / games, 1),
    barons: round(totals.barons / games, 1),
    towers: round(totals.towers / games, 1),
    vision: round(totals.vision / games, 1)
  };
};

const buildMatchConsistency = (matches = [], puuid) => {
  const rows = getPlayerRows(matches, puuid);
  if (!rows.length) return { score: 0, label: 'Unknown', stableGames: 0 };

  const stableGames = rows.filter((p) => {
    const kda = ((p.kills || 0) + (p.assists || 0)) / Math.max(p.deaths || 0, 1);
    return kda >= 2.2 && (p.deaths || 0) <= 6;
  }).length;
  const score = Math.round((stableGames / rows.length) * 100);
  const label = score >= 70 ? 'Reliable' : score >= 45 ? 'Swingy' : 'Volatile';
  return { score, label, stableGames };
};

const buildCompareProfile = async ({ input, region }) => {
  const parsed = parseRiotId(input);
  if (!parsed) throw new Error('Use GameName#Tag format for both players.');

  const profileRes = await axios.get(`${API_BASE}/api/player/${encodeURIComponent(parsed.name)}/${encodeURIComponent(parsed.tag)}?region=${region}`);
  const profile = profileRes.data;
  const matchesRes = await axios.get(`${API_BASE}/api/matches/${profile.account.puuid}?region=${region}`);
  const matches = matchesRes.data || [];
  const insight = analyzePlayerIntelligence({ matches, playerData: profile });
  const lane = buildLanePhaseRead(matches, profile.account.puuid);
  const objective = buildObjectiveRead(matches, profile.account.puuid);
  const consistency = buildMatchConsistency(matches, profile.account.puuid);
  const rank = getPrimaryRank(profile.ranks);

  return {
    input,
    region,
    profile,
    matches,
    insight,
    lane,
    objective,
    consistency,
    rank
  };
};

const scoreDifference = (a, b) => Math.abs((a || 0) - (b || 0));

const winnerLabel = (a, b, higher = true) => {
  if (!a || !b) return 'Needs both players';
  if (scoreDifference(a, b) < 3) return 'Even';
  return (higher ? a > b : a < b) ? 'Player A' : 'Player B';
};

const edgeTone = (winner) => winner === 'Even' ? 'border-white/10 bg-white/[0.03] text-gray-300' : winner === 'Needs both players' ? 'border-white/10 bg-[#10131a] text-gray-500' : 'border-red-500/25 bg-red-500/10 text-red-100';

function EdgeBadge({ label, winner }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${edgeTone(winner)}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 text-lg font-black">{winner}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="crexus-card rounded-[28px] p-6">
      <div className="h-3 w-28 animate-pulse rounded-full bg-red-500/20" />
      <div className="mt-5 flex items-center gap-4">
        <div className="h-20 w-20 animate-pulse rounded-3xl bg-white/10" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-2/3 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
      <div className="mt-5 h-20 animate-pulse rounded-2xl bg-white/[0.06]" />
    </div>
  );
}

function MetricDuel({ title, a, b, detailA, detailB, higher = true }) {
  const winner = winnerLabel(a, b, higher);
  const aIsEdge = winner === 'Player A';
  const bIsEdge = winner === 'Player B';
  return (
    <div className="rounded-3xl border border-white/10 bg-[#10131a] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">{title}</div>
          <div className="mt-2 text-sm text-gray-400">Edge: <span className="font-black text-white">{winner}</span></div>
        </div>
        {a && b && <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-black text-gray-300">Δ {scoreDifference(a, b)}</div>}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={`rounded-2xl border p-4 ${aIsEdge ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Player A</div>
          <div className="mt-2 text-3xl font-black text-white">{a ?? '—'}</div>
          {detailA && <div className="mt-1 text-xs text-gray-400">{detailA}</div>}
        </div>
        <div className={`rounded-2xl border p-4 ${bIsEdge ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Player B</div>
          <div className="mt-2 text-3xl font-black text-white">{b ?? '—'}</div>
          {detailB && <div className="mt-1 text-xs text-gray-400">{detailB}</div>}
        </div>
      </div>
    </div>
  );
}

function PlayerSnapshot({ slot, data, ddragonBase }) {
  if (!data) {
    return (
      <div className="crexus-card rounded-[28px] p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Player {slot}</div>
        <div className="mt-3 text-2xl font-black text-white">Waiting for comparison</div>
        <p className="mt-2 text-sm leading-6 text-gray-400">Enter a Riot ID above to build side-by-side reads.</p>
      </div>
    );
  }

  const { profile, insight, rank } = data;
  return (
    <div className="crexus-card rounded-[28px] p-6">
      <div className="flex items-center gap-4">
        <img src={`${ddragonBase}/img/profileicon/${profile.summoner.profileIconId}.png`} alt="profile icon" className="h-20 w-20 rounded-3xl border border-white/10" />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Player {slot}</div>
          <h2 className="truncate text-2xl font-black text-white">{profile.account.gameName}<span className="text-gray-500">#{profile.account.tagLine}</span></h2>
          <p className="mt-1 text-sm text-gray-400">{rank ? `${rank.tier} ${rank.rank} · ${rank.leaguePoints} LP` : 'Unranked'} · {data.region.toUpperCase()} · {data.matches.length} games loaded</p>
        </div>
      </div>
      <p className="mt-5 rounded-2xl border border-white/10 bg-[#0d1016] p-4 text-sm leading-6 text-gray-300">{insight?.summary || 'Recent match data unavailable.'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(insight?.playstyleTags || []).map((tag) => (
          <span key={tag} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-200">{tag}</span>
        ))}
      </div>
    </div>
  );
}

function ChampionPoolDuel({ a, b, ddragonBase }) {
  const champsA = a?.insight?.championStats || [];
  const champsB = b?.insight?.championStats || [];
  const poolWinner = winnerLabel(champsA.length, champsB.length);
  return (
    <div className="crexus-card rounded-[28px] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Champion Pool Comparison</div>
          <h3 className="mt-2 text-2xl font-black text-white">Comfort picks and recent champion spread</h3>
        </div>
        <EdgeBadge label="Pool edge" winner={poolWinner} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[['A', champsA], ['B', champsB]].map(([label, champs]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-[#10131a] p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Player {label}</div>
            <div className="space-y-3">
              {champs.length ? champs.slice(0, 6).map((champ) => (
                <div key={champ.championName} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={`${ddragonBase}/img/champion/${champ.championName}.png`} alt={champ.championName} className="h-10 w-10 rounded-xl border border-white/10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div className="min-w-0">
                      <div className="truncate font-black text-white">{champ.championName}</div>
                      <div className="text-xs text-gray-500">{champ.games} games · {champ.kda} KDA</div>
                    </div>
                  </div>
                  <div className="text-right text-sm font-black text-red-200">{champ.winRate}%</div>
                </div>
              )) : <div className="rounded-2xl bg-white/[0.03] p-4 text-sm text-gray-500">No champion sample yet.</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonSummary({ a, b }) {
  const summary = useMemo(() => {
    if (!a || !b) {
      return {
        text: 'Run a comparison to generate the versus read.',
        edges: {
          overall: 'Needs both players',
          form: 'Needs both players',
          pool: 'Needs both players',
          objective: 'Needs both players',
          consistency: 'Needs both players'
        }
      };
    }

    const edges = {
      overall: winnerLabel(a.insight?.crexusScore, b.insight?.crexusScore),
      form: winnerLabel(a.insight?.winRate, b.insight?.winRate),
      pool: winnerLabel(a.insight?.championStats?.length, b.insight?.championStats?.length),
      objective: winnerLabel(a.objective?.score, b.objective?.score),
      consistency: winnerLabel(a.consistency?.score, b.consistency?.score)
    };

    const parts = [];
    parts.push(`${edges.overall} has the stronger overall Crexus Score profile.`);
    parts.push(`${edges.form} has the better recent form edge.`);
    parts.push(`${edges.pool} shows the broader recent champion pool.`);
    parts.push(`${edges.objective} controls objectives better in the recent sample.`);
    parts.push(`${edges.consistency} looks more stable across recent matches.`);
    const riskier = winnerLabel(a.insight?.tiltRisk?.score, b.insight?.tiltRisk?.score);
    parts.push(`${riskier} carries the higher tilt-risk warning.`);
    return { text: parts.join(' '), edges };
  }, [a, b]);

  return (
    <div className="crexus-card rounded-[28px] p-6">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Versus Summary</div>
      <h3 className="mt-2 text-2xl font-black text-white">Who has the edge?</h3>
      <p className="mt-3 text-sm leading-7 text-gray-300">{summary.text}</p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <EdgeBadge label="Overall edge" winner={summary.edges.overall} />
        <EdgeBadge label="Form edge" winner={summary.edges.form} />
        <EdgeBadge label="Pool edge" winner={summary.edges.pool} />
        <EdgeBadge label="Objective edge" winner={summary.edges.objective} />
        <EdgeBadge label="Consistency edge" winner={summary.edges.consistency} />
      </div>
    </div>
  );
}

export default function PlayerCompare({ onBack }) {
  const ddragonVersion = useDDragonVersion();
  const ddragonBase = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}`;
  const [region, setRegion] = useState(() => localStorage.getItem('crexus_region') || 'kr');
  const [playerA, setPlayerA] = useState('Faker#KR1');
  const [playerB, setPlayerB] = useState('');
  const [resultA, setResultA] = useState(null);
  const [resultB, setResultB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runCompare = async () => {
    setLoading(true);
    setError('');
    try {
      const [a, b] = await Promise.all([
        buildCompareProfile({ input: playerA, region }),
        buildCompareProfile({ input: playerB, region })
      ]);
      setResultA(a);
      setResultB(b);
      localStorage.setItem('crexus_region', region);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Comparison failed. Check both Riot IDs and region.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-4 text-gray-200 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <BackButton onClick={onBack} />
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-red-300">Crexus v0.8.0</div>
          <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">Player Compare</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">Compare two players side by side using Crexus Score, champion pool, recent form, lane phase, objective control, and match consistency.</p>
        </div>
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm leading-6 text-red-50">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">Ready for v0.8</div>
          <div className="mt-1 text-gray-200">v0.8.0 coaching layer baseline</div>
        </div>
      </div>

      <div className="crexus-card mb-6 rounded-[28px] p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_1fr_auto]">
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-2xl border border-white/10 bg-[#0b0d12] px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-white outline-none focus:border-red-500/30">
            {REGION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input value={playerA} onChange={(e) => setPlayerA(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runCompare()} placeholder="Player A — GameName#Tag" className="rounded-2xl border border-white/10 bg-transparent px-5 py-4 text-white outline-none placeholder:text-gray-500 focus:border-red-500/30" />
          <input value={playerB} onChange={(e) => setPlayerB(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runCompare()} placeholder="Player B — GameName#Tag" className="rounded-2xl border border-white/10 bg-transparent px-5 py-4 text-white outline-none placeholder:text-gray-500 focus:border-red-500/30" />
          <button onClick={runCompare} disabled={loading} className="rounded-2xl bg-red-600 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_0_26px_rgba(239,68,68,0.35)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Comparing...' : 'Compare'}</button>
        </div>
        {error && <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</div>}
        {!error && !resultA && !resultB && !loading && <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-400">Use exact Riot IDs with tags, for example <span className="font-bold text-gray-200">Faker#KR1</span>. Both players must be in the selected region.</div>}
      </div>

      <div className="mb-5">
        <ComparisonSummary a={resultA} b={resultB} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {loading ? <><LoadingSkeleton /><LoadingSkeleton /></> : <><PlayerSnapshot slot="A" data={resultA} ddragonBase={ddragonBase} /><PlayerSnapshot slot="B" data={resultB} ddragonBase={ddragonBase} /></>}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MetricDuel title="Crexus Score" a={resultA?.insight?.crexusScore} b={resultB?.insight?.crexusScore} detailA={resultA?.insight?.recentForm} detailB={resultB?.insight?.recentForm} />
        <MetricDuel title="Recent Form" a={resultA?.insight?.winRate} b={resultB?.insight?.winRate} detailA={`${resultA?.insight?.games ?? 0} games`} detailB={`${resultB?.insight?.games ?? 0} games`} />
        <MetricDuel title="Lane Phase" a={resultA?.lane?.score} b={resultB?.lane?.score} detailA={resultA?.lane?.label} detailB={resultB?.lane?.label} />
        <MetricDuel title="Objective Control" a={resultA?.objective?.score} b={resultB?.objective?.score} detailA={`${resultA?.objective?.dragons ?? 0} drakes · ${resultA?.objective?.vision ?? 0} vision`} detailB={`${resultB?.objective?.dragons ?? 0} drakes · ${resultB?.objective?.vision ?? 0} vision`} />
        <MetricDuel title="Match Consistency" a={resultA?.consistency?.score} b={resultB?.consistency?.score} detailA={resultA?.consistency?.label} detailB={resultB?.consistency?.label} />
        <MetricDuel title="Tilt Risk" a={resultA?.insight?.tiltRisk?.score} b={resultB?.insight?.tiltRisk?.score} detailA={resultA?.insight?.tiltRisk?.label} detailB={resultB?.insight?.tiltRisk?.label} higher={false} />
      </div>

      <div className="mt-5">
        <ChampionPoolDuel a={resultA} b={resultB} ddragonBase={ddragonBase} />
      </div>
    </div>
  );
}

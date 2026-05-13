const ROLE_SLOTS = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

const getDisplayName = (participant) => participant?.riotId || participant?.summonerName || 'Unknown Player';
const score = (participant) => participant?.intelligence?.crexusScore ?? 0;
const laneRead = (participant) => participant?.intelligence?.mainRole || 'Live role';
const riskScore = (participant) => participant?.intelligence?.tiltRisk?.score ?? 0;
const pairKey = (a, b) => [a, b].sort().join('::');

const roleFromIndex = (participants, participant) => {
  const team = participants.filter((p) => p.teamId === participant.teamId);
  const index = team.findIndex((p) => p.puuid === participant.puuid);
  return ROLE_SLOTS[index] || 'Flex';
};

const synergyType = (roleA, roleB) => {
  const roles = [roleA, roleB].sort().join('+');
  if (roles === 'ADC+Support') return 'Bot lane pair';
  if (roles === 'Jungle+Mid') return 'Mid/jungle link';
  if (roles === 'Jungle+Top') return 'Top-side setup';
  if (roles === 'Jungle+Support') return 'Roam/vision link';
  if (roles === 'ADC+Jungle') return 'Objective follow-up';
  return 'Repeated teammates';
};

function compareText(left, right, role) {
  const delta = score(left) - score(right);
  if (Math.abs(delta) <= 5) return `Even ${role.toLowerCase()} profile. Play the lane state, not just the nameplate.`;
  const stronger = delta > 0 ? left : right;
  const weaker = delta > 0 ? right : left;
  const risk = riskScore(stronger) >= 60 ? 'but can be punished if forced into early deaths' : 'and has the cleaner recent read';
  return `${getDisplayName(stronger)} has the stronger recent profile ${risk}. Look for pressure windows around ${getDisplayName(weaker)}.`;
}

export function EnemyMatchupRead({ participants = [] }) {
  const blue = participants.filter((p) => p.teamId === 100);
  const red = participants.filter((p) => p.teamId === 200);
  if (!blue.length || !red.length) return null;

  const roleReads = ROLE_SLOTS.map((role, index) => {
    const left = blue[index];
    const right = red[index];
    if (!left || !right) return null;
    const delta = score(left) - score(right);
    return { role, left, right, delta, close: Math.abs(delta) <= 5 };
  }).filter(Boolean);

  const biggestEdge = roleReads
    .filter((read) => !read.close)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  return (
    <div className="crexus-card mb-8 rounded-[28px] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Enemy Matchup Read</div>
          <h2 className="mt-2 text-2xl font-black text-white">Lane-by-lane live read</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">Compares matching live-game slots and highlights who has the stronger recent profile. Riot live data does not always expose exact assigned roles, so Cranix Scout treats this as a scouting read instead of a guaranteed draft order.</p>
        </div>
        {biggestEdge && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">Largest edge</div>
            <div className="mt-1 font-black">{biggestEdge.role}: {biggestEdge.delta > 0 ? 'Blue' : 'Red'} +{Math.abs(biggestEdge.delta)}</div>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3">
        {roleReads.map(({ role, left, right, delta, close }) => {
          const leftEdge = delta >= 0;
          return (
            <div key={role} className="rounded-3xl border border-white/10 bg-[#10131a] p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className={`rounded-2xl border p-4 ${leftEdge && !close ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Blue {role}</div>
                  <div className="mt-1 truncate text-lg font-black text-white">{getDisplayName(left)}</div>
                  <div className="mt-1 text-sm text-gray-400">Score {score(left) || '—'} · {laneRead(left)}</div>
                </div>
                <div className="text-center text-xs font-black uppercase tracking-[0.2em] text-red-300">{role}<br />vs<br /><span className="text-gray-500">{close ? 'even' : `${Math.abs(delta)} pt edge`}</span></div>
                <div className={`rounded-2xl border p-4 ${!leftEdge && !close ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Red {role}</div>
                  <div className="mt-1 truncate text-lg font-black text-white">{getDisplayName(right)}</div>
                  <div className="mt-1 text-sm text-gray-400">Score {score(right) || '—'} · {laneRead(right)}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-300">{compareText(left, right, role)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildPairReads(participants) {
  const current = new Map(participants.filter((p) => p.puuid).map((p) => [p.puuid, p]));
  const pairs = new Map();

  participants.forEach((player) => {
    (player.recentMatches || []).forEach((match) => {
      const matchId = match?.metadata?.matchId || match?.info?.gameId || Math.random().toString(36);
      const me = match?.info?.participants?.find((p) => p.puuid === player.puuid);
      if (!me) return;

      match.info.participants
        .filter((other) => other.teamId === me.teamId && other.puuid !== player.puuid && current.has(other.puuid))
        .forEach((other) => {
          const key = pairKey(player.puuid, other.puuid);
          const existing = pairs.get(key) || {
            players: [player.puuid, other.puuid],
            matchIds: new Set(),
            wins: 0,
            kills: 0,
            deaths: 0,
            assists: 0
          };

          if (!existing.matchIds.has(matchId)) {
            existing.matchIds.add(matchId);
            existing.wins += me.win ? 1 : 0;
            existing.kills += (me.kills || 0) + (other.kills || 0);
            existing.deaths += (me.deaths || 0) + (other.deaths || 0);
            existing.assists += (me.assists || 0) + (other.assists || 0);
          }

          pairs.set(key, existing);
        });
    });
  });

  return [...pairs.values()]
    .map((pair) => {
      const a = current.get(pair.players[0]);
      const b = current.get(pair.players[1]);
      const games = pair.matchIds.size;
      const winRate = Math.round((pair.wins / Math.max(games, 1)) * 100);
      const roleA = roleFromIndex(participants, a);
      const roleB = roleFromIndex(participants, b);
      const kda = ((pair.kills + pair.assists) / Math.max(pair.deaths, 1)).toFixed(2);
      const highThreat = games >= 3 && winRate >= 60;
      const mediumThreat = games >= 2 && winRate >= 50;
      const weakLink = games >= 2 && winRate <= 35;

      return {
        ...pair,
        a,
        b,
        games,
        winRate,
        roleA,
        roleB,
        kda,
        type: synergyType(roleA, roleB),
        tone: highThreat ? 'high' : weakLink ? 'weak' : mediumThreat ? 'medium' : 'low'
      };
    })
    .filter((pair) => pair.games >= 2)
    .sort((a, b) => {
      const toneWeight = { high: 3, medium: 2, weak: 1, low: 0 };
      return toneWeight[b.tone] - toneWeight[a.tone] || b.games - a.games || b.winRate - a.winRate;
    });
}

function TeamSynergySummary({ teamId, reads }) {
  const teamReads = reads.filter((pair) => pair.a?.teamId === teamId && pair.b?.teamId === teamId);
  const teamName = teamId === 100 ? 'Blue' : 'Red';
  const strongest = teamReads[0];

  return (
    <div className="rounded-3xl border border-white/10 bg-[#10131a] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{teamName} coordination</div>
      {strongest ? (
        <>
          <div className="mt-2 text-lg font-black text-white">{getDisplayName(strongest.a)} + {getDisplayName(strongest.b)}</div>
          <p className="mt-2 text-sm leading-6 text-gray-400">{strongest.type} · {strongest.games} shared games · {strongest.winRate}% winrate · {strongest.kda} combined KDA.</p>
          <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">{strongest.tone === 'high' ? 'Treat this as the main coordination threat. Avoid early fights around their strongest shared side.' : strongest.tone === 'weak' ? 'They have played together, but the recent shared result is weak. Pressure this pair if the game state allows it.' : 'Watch for coordinated movements, but the signal is not dominant yet.'}</div>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-gray-500">No repeated teammate pattern found for this side in the loaded sample.</p>
      )}
    </div>
  );
}

export function DuoSynergyRead({ participants = [] }) {
  const reads = buildPairReads(participants).slice(0, 8);
  const highThreats = reads.filter((read) => read.tone === 'high');

  return (
    <div className="crexus-card mb-8 rounded-[28px] p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Duo / Synergy Detection</div>
          <h2 className="mt-2 text-2xl font-black text-white">Live coordination signals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">Finds current live-game teammates who appeared together in recent match samples, then scores the pair by repeated games, shared winrate, role link, and combined KDA.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#10131a] px-4 py-3 text-sm text-gray-300">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Detected pairs</div>
          <div className="mt-1 text-2xl font-black text-white">{reads.length}</div>
        </div>
      </div>

      {highThreats.length > 0 && (
        <div className="mt-5 rounded-3xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-200">Main live warning</div>
          <p className="mt-2 text-sm leading-6 text-red-50">{highThreats.map((pair) => `${getDisplayName(pair.a)} + ${getDisplayName(pair.b)} (${pair.type})`).join(', ')} show strong recent coordination. Track early river, roam, and objective setups before committing to skirmishes.</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TeamSynergySummary teamId={100} reads={reads} />
        <TeamSynergySummary teamId={200} reads={reads} />
      </div>

      <div className="mt-5 space-y-3">
        {reads.length ? reads.map((pair) => {
          const toneClass = pair.tone === 'high'
            ? 'border-red-500/30 bg-red-500/10'
            : pair.tone === 'weak'
              ? 'border-yellow-500/25 bg-yellow-500/10'
              : 'border-white/10 bg-[#10131a]';
          const label = pair.tone === 'high' ? 'High coordination threat' : pair.tone === 'weak' ? 'Possible pressure target' : 'Synergy signal';

          return (
            <div key={pair.players.join('-')} className={`rounded-3xl border p-4 ${toneClass}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-lg font-black text-white">{getDisplayName(pair.a)} + {getDisplayName(pair.b)}</div>
                  <p className="mt-1 text-sm text-gray-300">{pair.roleA}/{pair.roleB} · {pair.type} · {pair.games} shared games · {pair.winRate}% winrate · {pair.kda} combined KDA.</p>
                </div>
                <div className="shrink-0 rounded-full border border-red-500/30 bg-[#0f1117] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-200">{label}</div>
              </div>
            </div>
          );
        }) : (
          <div className="rounded-3xl border border-white/10 bg-[#10131a] p-5 text-sm leading-6 text-gray-400">No repeated duo pattern found in the loaded sample. This does not mean there is no duo, only that Cranix Scout has not found enough recent overlap yet.</div>
        )}
      </div>
    </div>
  );
}

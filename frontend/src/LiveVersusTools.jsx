const ROLE_SLOTS = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

const getDisplayName = (participant) => participant.riotId || participant.summonerName || 'Unknown Player';
const score = (participant) => participant?.intelligence?.crexusScore ?? 0;
const laneRead = (participant) => participant?.intelligence?.mainRole || 'Live role';
const riskScore = (participant) => participant?.intelligence?.tiltRisk?.score ?? 0;

function compareText(left, right) {
  const delta = score(left) - score(right);
  if (Math.abs(delta) <= 5) return 'Even recent profile. Play the matchup, not the nameplate.';
  const stronger = delta > 0 ? left : right;
  const weaker = delta > 0 ? right : left;
  const risk = riskScore(stronger) >= 60 ? 'but carries a tilt warning if punished early' : 'and has the cleaner recent read';
  return `${getDisplayName(stronger)} has the stronger recent profile ${risk}. Pressure ${getDisplayName(weaker)} around early mistakes.`;
}

export function EnemyMatchupRead({ participants = [] }) {
  const blue = participants.filter((p) => p.teamId === 100);
  const red = participants.filter((p) => p.teamId === 200);
  if (!blue.length || !red.length) return null;

  return (
    <div className="crexus-card mb-8 rounded-[28px] p-5 md:p-6">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">v0.5.1 Enemy Matchup Read</div>
      <h2 className="mt-2 text-2xl font-black text-white">Lane-by-lane live read</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">Compares matching live-game slots and highlights who has the stronger recent profile. Riot live data does not always expose exact assigned roles, so Crexus treats this as a scouting read instead of a guaranteed draft order.</p>
      <div className="mt-5 grid grid-cols-1 gap-3">
        {ROLE_SLOTS.map((role, index) => {
          const left = blue[index];
          const right = red[index];
          if (!left || !right) return null;
          const leftEdge = score(left) >= score(right);
          return (
            <div key={role} className="rounded-3xl border border-white/10 bg-[#10131a] p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className={`rounded-2xl border p-4 ${leftEdge ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Blue {role}</div>
                  <div className="mt-1 truncate text-lg font-black text-white">{getDisplayName(left)}</div>
                  <div className="mt-1 text-sm text-gray-400">Score {score(left) || '—'} · {laneRead(left)}</div>
                </div>
                <div className="text-center text-xs font-black uppercase tracking-[0.2em] text-red-300">{role}<br />vs</div>
                <div className={`rounded-2xl border p-4 ${!leftEdge ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Red {role}</div>
                  <div className="mt-1 truncate text-lg font-black text-white">{getDisplayName(right)}</div>
                  <div className="mt-1 text-sm text-gray-400">Score {score(right) || '—'} · {laneRead(right)}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-300">{compareText(left, right)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const pairKey = (a, b) => [a, b].sort().join('::');

export function DuoSynergyRead({ participants = [] }) {
  const current = new Map(participants.map((p) => [p.puuid, p]));
  const pairs = new Map();

  participants.forEach((player) => {
    (player.recentMatches || []).forEach((match) => {
      const me = match?.info?.participants?.find((p) => p.puuid === player.puuid);
      if (!me) return;
      match.info.participants
        .filter((other) => other.teamId === me.teamId && other.puuid !== player.puuid && current.has(other.puuid))
        .forEach((other) => {
          const key = pairKey(player.puuid, other.puuid);
          const existing = pairs.get(key) || { players: [player.puuid, other.puuid], games: 0, wins: 0 };
          existing.games += 1;
          existing.wins += me.win ? 1 : 0;
          pairs.set(key, existing);
        });
    });
  });

  const reads = [...pairs.values()]
    .map((pair) => ({
      ...pair,
      winRate: Math.round((pair.wins / Math.max(pair.games, 1)) * 100),
      a: current.get(pair.players[0]),
      b: current.get(pair.players[1])
    }))
    .filter((pair) => pair.games >= 2)
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate)
    .slice(0, 5);

  return (
    <div className="crexus-card mb-8 rounded-[28px] p-5 md:p-6">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">v0.5.2 Duo / Synergy Detection</div>
      <h2 className="mt-2 text-2xl font-black text-white">Repeated teammate signals</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">Looks for current live-game teammates who also appeared together in the recent match samples Crexus loaded for this scout.</p>
      <div className="mt-5 space-y-3">
        {reads.length ? reads.map((pair) => (
          <div key={pair.players.join('-')} className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-black text-white">{getDisplayName(pair.a)} + {getDisplayName(pair.b)}</div>
                <p className="mt-1 text-sm text-gray-300">Played together in {pair.games} recent sampled games · {pair.winRate}% winrate in those games.</p>
              </div>
              <div className="rounded-full border border-red-500/30 bg-[#0f1117] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-200">Synergy warning</div>
            </div>
          </div>
        )) : (
          <div className="rounded-3xl border border-white/10 bg-[#10131a] p-5 text-sm leading-6 text-gray-400">No repeated duo pattern found in the loaded sample. This does not mean there is no duo, only that Crexus has not found enough recent overlap yet.</div>
        )}
      </div>
    </div>
  );
}

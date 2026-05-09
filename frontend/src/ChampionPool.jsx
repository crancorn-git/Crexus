const laneLabels = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  MID: 'Mid',
  BOTTOM: 'Bot',
  UTILITY: 'Support',
  NONE: 'Unknown',
};

const roleStyle = {
  TOP: 'border-orange-500/30 text-orange-300 bg-orange-500/10',
  JUNGLE: 'border-green-500/30 text-green-300 bg-green-500/10',
  MIDDLE: 'border-blue-500/30 text-blue-300 bg-blue-500/10',
  MID: 'border-blue-500/30 text-blue-300 bg-blue-500/10',
  BOTTOM: 'border-purple-500/30 text-purple-300 bg-purple-500/10',
  UTILITY: 'border-pink-500/30 text-pink-300 bg-pink-500/10',
  NONE: 'border-gray-600 text-gray-400 bg-gray-800/40',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pct(value) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function formatKda(kills, deaths, assists) {
  return ((kills + assists) / Math.max(1, deaths)).toFixed(2);
}

function getPlayer(match, puuid) {
  return match?.info?.participants?.find((p) => p.puuid === puuid);
}

function getChampionRows(matches, puuid) {
  const champions = new Map();

  matches.forEach((match) => {
    const p = getPlayer(match, puuid);
    if (!p) return;

    const key = p.championName || 'Unknown';
    const duration = Math.max(1, (match.info?.gameDuration || 0) / 60);
    const existing = champions.get(key) || {
      championName: key,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
      damage: 0,
      vision: 0,
      duration: 0,
      lanes: {},
    };

    existing.games += 1;
    existing.wins += p.win ? 1 : 0;
    existing.kills += p.kills || 0;
    existing.deaths += p.deaths || 0;
    existing.assists += p.assists || 0;
    existing.cs += (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
    existing.damage += p.totalDamageDealtToChampions || 0;
    existing.vision += p.visionScore || 0;
    existing.duration += duration;

    const lane = p.teamPosition || p.individualPosition || p.lane || 'NONE';
    existing.lanes[lane] = (existing.lanes[lane] || 0) + 1;

    champions.set(key, existing);
  });

  return Array.from(champions.values())
    .map((row) => {
      const primaryLane = Object.entries(row.lanes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NONE';
      const winrate = (row.wins / Math.max(1, row.games)) * 100;
      const kda = (row.kills + row.assists) / Math.max(1, row.deaths);
      const csPerMin = row.cs / Math.max(1, row.duration);
      const damagePerMin = row.damage / Math.max(1, row.duration);
      const visionPerGame = row.vision / Math.max(1, row.games);
      const reliability = clamp((winrate * 0.45) + (Math.min(kda, 6) * 8) + (Math.min(csPerMin, 10) * 2.5) + Math.min(row.games * 4, 16), 0, 100);

      return {
        ...row,
        primaryLane,
        winrate,
        kda,
        csPerMin,
        damagePerMin,
        visionPerGame,
        reliability,
      };
    })
    .sort((a, b) => b.reliability - a.reliability || b.games - a.games);
}

function getRoleRows(matches, puuid) {
  const roles = new Map();

  matches.forEach((match) => {
    const p = getPlayer(match, puuid);
    if (!p) return;

    const role = p.teamPosition || p.individualPosition || p.lane || 'NONE';
    const existing = roles.get(role) || { role, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
    existing.games += 1;
    existing.wins += p.win ? 1 : 0;
    existing.kills += p.kills || 0;
    existing.deaths += p.deaths || 0;
    existing.assists += p.assists || 0;
    roles.set(role, existing);
  });

  return Array.from(roles.values())
    .map((row) => ({
      ...row,
      label: laneLabels[row.role] || row.role,
      winrate: (row.wins / Math.max(1, row.games)) * 100,
      kda: (row.kills + row.assists) / Math.max(1, row.deaths),
      share: (row.games / Math.max(1, matches.length)) * 100,
    }))
    .sort((a, b) => b.games - a.games);
}

function getComfortRead(championRows, roleRows) {
  if (!championRows.length) return 'No recent match sample yet. Search a player with match history to build a comfort read.';

  const topChampion = championRows[0];
  const role = roleRows[0];
  const otpShare = (topChampion.games / championRows.reduce((sum, row) => sum + row.games, 0)) * 100;

  if (otpShare >= 55) {
    return `${topChampion.championName} is the clear comfort pick with ${topChampion.games} recent games. Ban or force them off it if you are scouting against them.`;
  }

  if (role && role.share >= 60) {
    return `Most recent games are concentrated around ${role.label}. The pool looks role-stable rather than one-champion dependent.`;
  }

  return 'Recent games are spread across multiple roles or champions. Treat this player as flexible, but less predictable.';
}

export default function ChampionPool({ matches = [], puuid, ddragonBase }) {
  const championRows = getChampionRows(matches, puuid);
  const roleRows = getRoleRows(matches, puuid);
  const totalGames = championRows.reduce((sum, row) => sum + row.games, 0);
  const topThreeShare = championRows.slice(0, 3).reduce((sum, row) => sum + row.games, 0) / Math.max(1, totalGames) * 100;
  const comfortRead = getComfortRead(championRows, roleRows);
  const best = championRows[0];
  const weak = [...championRows]
    .filter((row) => row.games >= 2 || championRows.length <= 3)
    .sort((a, b) => a.reliability - b.reliability)[0];

  if (!matches.length || !puuid) {
    return null;
  }

  return (
    <div className="bg-[#161d23] border border-gray-800 rounded-2xl p-5 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Champion Pool</h2>
          <p className="text-xs text-gray-500 mt-1">Recent comfort picks, role spread, and weak-pick warnings.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right">
          <div className="bg-[#0a0e13] border border-gray-800 rounded-xl px-3 py-2">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Pool Focus</div>
            <div className="text-emerald-300 font-black">{pct(topThreeShare)}</div>
          </div>
          <div className="bg-[#0a0e13] border border-gray-800 rounded-xl px-3 py-2">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Unique Picks</div>
            <div className="text-white font-black">{championRows.length}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="md:col-span-2 bg-[#0a0e13] border border-gray-800 rounded-xl p-4">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Crexus Read</div>
          <p className="text-sm text-gray-300 leading-relaxed">{comfortRead}</p>
        </div>

        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-4 space-y-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Quick Picks</div>
          {best && (
            <div className="text-xs text-gray-300">
              <span className="text-emerald-300 font-bold">Best:</span> {best.championName} · {pct(best.winrate)} WR
            </div>
          )}
          {weak && weak.championName !== best?.championName && (
            <div className="text-xs text-gray-300">
              <span className="text-red-300 font-bold">Weak:</span> {weak.championName} · {pct(weak.winrate)} WR
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Recent Champions</div>
          {championRows.slice(0, 6).map((row) => (
            <div key={row.championName} className="bg-[#0f141a] border border-gray-800 rounded-xl p-3 flex items-center gap-3">
              <img
                src={`${ddragonBase}/img/champion/${row.championName}.png`}
                className="w-12 h-12 rounded-xl border border-gray-700 bg-black/40"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-black text-white">{row.championName}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${roleStyle[row.primaryLane] || roleStyle.NONE}`}>
                    {laneLabels[row.primaryLane] || row.primaryLane}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {row.games} games · {row.wins}W {row.games - row.wins}L · {formatKda(row.kills, row.deaths, row.assists)} KDA
                </div>
                <div className="mt-2 h-1.5 bg-[#05080c] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400/80" style={{ width: `${clamp(row.reliability, 4, 100)}%` }} />
                </div>
              </div>
              <div className="text-right w-20 shrink-0">
                <div className="text-lg font-black text-white">{pct(row.winrate)}</div>
                <div className="text-[10px] text-gray-500 uppercase font-bold">Winrate</div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-[#0f141a] border border-gray-800 rounded-xl p-4 h-fit">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Role Spread</div>
          <div className="space-y-3">
            {roleRows.map((row) => (
              <div key={row.role}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-300 font-bold">{row.label}</span>
                  <span className="text-gray-500">{row.games} games · {pct(row.winrate)} WR</span>
                </div>
                <div className="h-2 bg-[#05080c] rounded-full overflow-hidden border border-gray-800">
                  <div className="h-full bg-gray-300/80" style={{ width: `${clamp(row.share, 4, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500 leading-relaxed">
            Pool Focus shows how much of the sample is concentrated in the top 3 champions. High focus usually means easier scouting and stronger comfort picks.
          </div>
        </div>
      </div>
    </div>
  );
}

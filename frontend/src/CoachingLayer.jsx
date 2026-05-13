const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value, decimals = 1) => Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

const roleLabels = {
  TOP: 'Top Lane',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid Lane',
  MID: 'Mid Lane',
  BOTTOM: 'ADC',
  ADC: 'ADC',
  UTILITY: 'Support',
  SUPPORT: 'Support'
};

const getParticipant = (match, puuid) => match?.info?.participants?.find((p) => p.puuid === puuid);
const minutes = (match) => Math.max((match?.info?.gameDuration || 1) / 60, 1);
const pct = (part, total) => total ? round((part / total) * 100, 0) : 0;

const getTeamObjectiveScore = (match, teamId) => {
  const team = match?.info?.teams?.find((t) => t.teamId === teamId);
  const o = team?.objectives || {};
  return ((o.dragon?.kills || 0) * 5) + ((o.baron?.kills || 0) * 9) + ((o.riftHerald?.kills || 0) * 4) + ((o.tower?.kills || 0) * 2) + ((o.inhibitor?.kills || 0) * 4);
};

const makeRows = (matches = [], puuid) => matches
  .map((match, index) => {
    const p = getParticipant(match, puuid);
    if (!p) return null;
    const mins = minutes(match);
    const team = match.info.participants.filter((x) => x.teamId === p.teamId);
    const teamKills = team.reduce((sum, x) => sum + (x.kills || 0), 0);
    const teamDamage = team.reduce((sum, x) => sum + (x.totalDamageDealtToChampions || 0), 0);
    const cs = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
    const kp = teamKills ? ((p.kills || 0) + (p.assists || 0)) / teamKills : 0;
    const objectiveDelta = getTeamObjectiveScore(match, p.teamId) - getTeamObjectiveScore(match, p.teamId === 100 ? 200 : 100);
    const kda = ((p.kills || 0) + (p.assists || 0)) / Math.max(p.deaths || 0, 1);
    return {
      index,
      matchId: match.metadata?.matchId,
      championName: p.championName,
      role: p.teamPosition || p.individualPosition || 'UNKNOWN',
      win: Boolean(p.win),
      kills: p.kills || 0,
      deaths: p.deaths || 0,
      assists: p.assists || 0,
      kda,
      csPerMin: cs / mins,
      vision: p.visionScore || 0,
      damagePerMin: (p.totalDamageDealtToChampions || 0) / mins,
      damageShare: pct(p.totalDamageDealtToChampions || 0, teamDamage),
      killParticipation: round(kp * 100, 0),
      firstBloodKill: Boolean(p.firstBloodKill),
      firstBloodVictim: Boolean(p.firstBloodVictim),
      objectiveDelta,
      duration: mins,
      earlyDeaths: p.challenges?.hadAfkTeammate ? 0 : (p.firstBloodVictim ? 1 : 0),
      goldDiffAt10: p.challenges?.laningPhaseGoldExpAdvantage ? 1 : 0,
      cs10: p.challenges?.laneMinionsFirst10Minutes || null
    };
  })
  .filter(Boolean);

const buildStats = (rows) => {
  const games = rows.length || 1;
  const wins = rows.filter((r) => r.win).length;
  const roleCounts = rows.reduce((acc, r) => {
    const role = r.role && r.role !== 'Invalid' ? r.role : 'UNKNOWN';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const mainRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UNKNOWN';
  const avg = (key) => rows.reduce((sum, r) => sum + (r[key] || 0), 0) / games;
  return {
    games,
    wins,
    losses: games - wins,
    winRate: round((wins / games) * 100, 0),
    mainRole,
    avgKda: round(avg('kda'), 2),
    avgDeaths: round(avg('deaths'), 1),
    avgCs: round(avg('csPerMin'), 1),
    avgVision: round(avg('vision'), 1),
    avgDpm: round(avg('damagePerMin'), 0),
    avgDamageShare: round(avg('damageShare'), 0),
    avgKp: round(avg('killParticipation'), 0),
    firstBloodVictimRate: round((rows.filter((r) => r.firstBloodVictim).length / games) * 100, 0),
    firstBloodKillRate: round((rows.filter((r) => r.firstBloodKill).length / games) * 100, 0),
    positiveObjectiveGames: rows.filter((r) => r.objectiveDelta > 0).length,
    avgObjectiveDelta: round(avg('objectiveDelta'), 1)
  };
};

const strengthPool = (stats) => [
  stats.winRate >= 58 && `Winning recent form: ${stats.winRate}% winrate over the loaded sample.`,
  stats.avgKda >= 3 && `Reliable fight output: ${stats.avgKda} average KDA.`,
  stats.avgDeaths <= 4.8 && `Controlled deaths: only ${stats.avgDeaths} deaths per game.`,
  stats.avgCs >= 7.2 && `Strong economy: ${stats.avgCs} CS/min.`,
  stats.avgVision >= 24 && `Active map setup: ${stats.avgVision} average vision score.`,
  stats.avgDpm >= 700 && `High damage pressure: ${stats.avgDpm} damage per minute.`,
  stats.avgKp >= 58 && `Teamfight involved: ${stats.avgKp}% kill participation.`,
  stats.positiveObjectiveGames >= Math.ceil(stats.games * 0.55) && `Objective-positive games: ahead on map objectives in ${stats.positiveObjectiveGames}/${stats.games}.`,
  stats.firstBloodKillRate >= 20 && `Early playmaker signal: first blood kill in ${stats.firstBloodKillRate}% of games.`
].filter(Boolean).slice(0, 3);

const weaknessPool = (stats) => [
  stats.winRate <= 45 && `Recent results are unstable: ${stats.winRate}% winrate.`,
  stats.avgDeaths >= 6.2 && `Too many deaths: ${stats.avgDeaths} per game is giving away tempo.`,
  stats.firstBloodVictimRate >= 20 && `Early deaths: first blood victim in ${stats.firstBloodVictimRate}% of games.`,
  stats.avgCs < 6.2 && `Low economy: ${stats.avgCs} CS/min limits item spikes.`,
  stats.avgVision < 14 && `Low vision control: ${stats.avgVision} average vision score.`,
  stats.avgKp < 42 && `Low involvement: ${stats.avgKp}% kill participation.`,
  stats.avgObjectiveDelta < -3 && `Objective pressure issue: average objective delta is ${stats.avgObjectiveDelta}.`,
  stats.avgDpm < 430 && `Low champion pressure: ${stats.avgDpm} damage per minute.`
].filter(Boolean).slice(0, 3);

const getRecommendedFocus = (stats) => {
  if (stats.firstBloodVictimRate >= 20 || stats.avgDeaths >= 6.2) return 'Reduce early deaths. Play the first two waves slower, ward one timing earlier, and avoid river fights before your first recall unless your lane has priority.';
  if (stats.avgCs < 6.2) return 'Improve economy. Set a 10-minute CS target and avoid roaming when a full wave is crashing into your tower.';
  if (stats.avgObjectiveDelta < -3) return 'Improve objective setup. Move 45 seconds before dragon/herald, reset earlier, and trade cross-map when the fight is not playable.';
  if (stats.avgVision < 14) return 'Improve information control. Spend unused trinkets, refresh control wards, and sweep before committing to fog plays.';
  if (stats.avgKp < 42) return 'Increase useful involvement. Play around the next objective timer and join fights when your wave state allows it.';
  return 'Keep the current base stable. The next upgrade is consistency: repeat the same safe early plan, then fight around completed item spikes.';
};

const roleAdvice = (stats) => {
  const role = stats.mainRole;
  const label = roleLabels[role] || 'Flex / Unknown Role';
  const common = {
    TOP: ['Track enemy jungle before pushing past river.', 'Use slow pushes to create recall windows instead of forcing coinflip fights.', 'Convert lane leads into herald, plates, or deep vision.'],
    JUNGLE: ['Path toward lanes with setup rather than only toward camps.', 'Ping objective timers early and reset before spawn windows.', 'Trade cross-map when lanes cannot move.'],
    MIDDLE: ['Protect the first three waves before forcing river movement.', 'Move with jungle when you have lane priority, not after losing tempo.', 'Look for roam timers after crash, cannon wave, or recall advantage.'],
    BOTTOM: ['Prioritise clean wave states before dragon fights.', 'Respect support roam timers and avoid isolated deaths.', 'Fight around completed item spikes instead of every skirmish.'],
    UTILITY: ['Refresh wards before objective setup, not after the fight starts.', 'Pair roams with wave states so ADC is not abandoned on a crash.', 'Sweep vision before forcing engages through fog.'],
    UNKNOWN: ['Pick one role focus for the next session so patterns become easier to track.', 'Review deaths before 10 minutes and remove the repeat cause.', 'Play around objective timers rather than random mid-game fights.']
  };
  return { label, tips: common[role] || common.UNKNOWN };
};

const matchReviews = (rows) => rows.slice(0, 5).map((r) => {
  const good = r.win
    ? `${r.championName}: won the game with ${r.killParticipation}% KP and ${round(r.kda, 2)} KDA.`
    : `${r.championName}: strongest point was ${r.damageShare >= 28 ? `${r.damageShare}% team damage share` : `${round(r.csPerMin, 1)} CS/min economy`}.`;
  const lost = r.deaths >= 7
    ? `Deaths were the main leak: ${r.deaths} deaths made the game harder to stabilise.`
    : r.objectiveDelta < 0
      ? `Objective control slipped: team objective delta was ${r.objectiveDelta}.`
      : !r.win
        ? 'The loss looks more like low conversion than one single stat failure.'
        : 'No major red flag; the key is repeating the same controlled setup.';
  const turning = r.firstBloodVictim
    ? 'Early turning point: first blood death likely gave away tempo.'
    : r.firstBloodKill
      ? 'Early turning point: first blood created a usable lead.'
      : r.duration < 24
        ? 'Fast-game turning point: early tempo decided the map quickly.'
        : 'Mid-game turning point: objective setup and death timing likely mattered most.';
  const pattern = r.deaths >= 7 ? 'Mistake pattern: over-staying or fighting without setup.' : r.killParticipation < 40 ? 'Mistake pattern: low involvement in team actions.' : 'Mistake pattern: mostly stable; review objective setup.';
  const focus = r.deaths >= 7 ? 'Next game focus: value survival over one extra wave or camp.' : r.killParticipation < 40 ? 'Next game focus: move earlier for the next objective fight.' : 'Next game focus: repeat the early plan and only fight with item/wave advantage.';
  return { ...r, good, lost, turning, pattern, focus };
});

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
    </div>
  );
}

function AdviceList({ title, items }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#101116] p-5">
      <h4 className="text-xs font-black uppercase tracking-[0.22em] text-red-300">{title}</h4>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-3 text-sm leading-6 text-gray-300">
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-black text-red-200">{index + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CoachingLayer({ playerData, matches = [] }) {
  const puuid = playerData?.account?.puuid;
  const rows = makeRows(matches, puuid);

  if (!puuid || !rows.length) {
    return (
      <div className="crexus-card rounded-[28px] p-6">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Crexus Coach</div>
        <h3 className="mt-2 text-2xl font-black text-white">Search a player to generate coaching reads</h3>
        <p className="mt-2 text-sm leading-6 text-gray-400">Crexus Coach uses the loaded match sample to produce strengths, weaknesses, role-specific advice, and recent match reviews.</p>
      </div>
    );
  }

  const stats = buildStats(rows);
  const strengths = strengthPool(stats);
  const weaknesses = weaknessPool(stats);
  const role = roleAdvice(stats);
  const reviews = matchReviews(rows);
  const focus = getRecommendedFocus(stats);
  const consistencyScore = clamp(100 - (Math.max(stats.avgDeaths - 4.5, 0) * 14) - (stats.firstBloodVictimRate * 0.45) + (stats.winRate - 50) * 0.25);

  return (
    <div className="space-y-4">
      <div className="crexus-card rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">v0.8 Coaching Layer</div>
            <h3 className="mt-2 text-3xl font-black text-white">Crexus Coach</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">Actionable advice built from recent match patterns, role habits, deaths, economy, vision, objective setup, and fight involvement.</p>
          </div>
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-left xl:min-w-[260px]">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">Recommended focus</div>
            <p className="mt-2 text-sm leading-6 text-gray-100">{focus}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatPill label="Role read" value={role.label} />
          <StatPill label="Winrate" value={`${stats.winRate}%`} />
          <StatPill label="Avg KDA" value={stats.avgKda} />
          <StatPill label="Consistency" value={`${Math.round(consistencyScore)}/100`} />
          <StatPill label="Deaths" value={`${stats.avgDeaths}/game`} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <AdviceList title="3 strengths" items={strengths.length ? strengths : ['No major standout strength yet; load more ranked games or review a larger sample.']} />
        <AdviceList title="3 weaknesses" items={weaknesses.length ? weaknesses : ['No major red flag in the loaded sample. Focus on making good habits repeatable.']} />
        <AdviceList title={`${role.label} advice`} items={role.tips} />
      </div>

      <div className="crexus-card rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Match Review Mode</div>
            <h3 className="mt-1 text-2xl font-black text-white">Recent match reviews</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">Quick post-game style reads for the latest loaded matches.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-gray-300">{reviews.length} reviews</div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {reviews.map((review) => (
            <div key={review.matchId} className="rounded-[24px] border border-white/10 bg-[#101116] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-black text-white">{review.championName}</div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{review.win ? 'Victory' : 'Defeat'} · {review.kills}/{review.deaths}/{review.assists} · {round(review.csPerMin, 1)} CS/min</div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${review.win ? 'bg-red-500/15 text-red-200' : 'bg-white/8 text-gray-300'}`}>{review.win ? 'Won' : 'Review'}</div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-gray-300">
                <p><span className="font-black text-gray-100">What went well:</span> {review.good}</p>
                <p><span className="font-black text-gray-100">What hurt the game:</span> {review.lost}</p>
                <p><span className="font-black text-gray-100">Key turning point:</span> {review.turning}</p>
                <p><span className="font-black text-gray-100">Pattern:</span> {review.pattern}</p>
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-50"><span className="font-black">Next-game focus:</span> {review.focus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value, decimals = 1) => Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

const getParticipant = (match, puuid) => match?.info?.participants?.find((participant) => participant.puuid === puuid);
const getTeam = (match, teamId) => match?.info?.teams?.find((team) => team.teamId === teamId);
const getObjectiveKills = (team, objectiveName) => team?.objectives?.[objectiveName]?.kills || 0;

function analyzeObjectiveControl(matches = [], puuid) {
  const games = matches
    .map((match) => {
      const participant = getParticipant(match, puuid);
      if (!participant) return null;

      const team = getTeam(match, participant.teamId);
      const enemyTeamId = participant.teamId === 100 ? 200 : 100;
      const enemyTeam = getTeam(match, enemyTeamId);
      const minutes = Math.max((match.info.gameDuration || 1) / 60, 1);

      const dragons = getObjectiveKills(team, 'dragon');
      const enemyDragons = getObjectiveKills(enemyTeam, 'dragon');
      const barons = getObjectiveKills(team, 'baron');
      const enemyBarons = getObjectiveKills(enemyTeam, 'baron');
      const heralds = getObjectiveKills(team, 'riftHerald');
      const enemyHeralds = getObjectiveKills(enemyTeam, 'riftHerald');
      const towers = getObjectiveKills(team, 'tower');
      const enemyTowers = getObjectiveKills(enemyTeam, 'tower');
      const inhibitors = getObjectiveKills(team, 'inhibitor');
      const enemyInhibitors = getObjectiveKills(enemyTeam, 'inhibitor');
      const teamKills = match.info.participants
        .filter((player) => player.teamId === participant.teamId)
        .reduce((sum, player) => sum + (player.kills || 0), 0);

      return {
        matchId: match.metadata?.matchId,
        championName: participant.championName,
        win: participant.win,
        minutes,
        dragons,
        enemyDragons,
        barons,
        enemyBarons,
        heralds,
        enemyHeralds,
        towers,
        enemyTowers,
        inhibitors,
        enemyInhibitors,
        visionScore: participant.visionScore || 0,
        controlWards: participant.visionWardsBoughtInGame || 0,
        killParticipation: teamKills > 0 ? (((participant.kills || 0) + (participant.assists || 0)) / teamKills) * 100 : 0,
        objectiveDelta: (dragons - enemyDragons) + ((barons - enemyBarons) * 1.7) + ((heralds - enemyHeralds) * 0.8) + ((towers - enemyTowers) * 0.4) + ((inhibitors - enemyInhibitors) * 1.2)
      };
    })
    .filter(Boolean);

  if (!games.length) return null;

  const wins = games.filter((game) => game.win).length;
  const objectiveWins = games.filter((game) => game.objectiveDelta > 0).length;
  const objectiveLosses = games.filter((game) => game.objectiveDelta < 0).length;
  const wonWithObjectiveLead = games.filter((game) => game.win && game.objectiveDelta > 0).length;
  const lostWithObjectiveDeficit = games.filter((game) => !game.win && game.objectiveDelta < 0).length;

  const totals = games.reduce((acc, game) => ({
    dragons: acc.dragons + game.dragons,
    enemyDragons: acc.enemyDragons + game.enemyDragons,
    barons: acc.barons + game.barons,
    enemyBarons: acc.enemyBarons + game.enemyBarons,
    heralds: acc.heralds + game.heralds,
    enemyHeralds: acc.enemyHeralds + game.enemyHeralds,
    towers: acc.towers + game.towers,
    enemyTowers: acc.enemyTowers + game.enemyTowers,
    inhibitors: acc.inhibitors + game.inhibitors,
    enemyInhibitors: acc.enemyInhibitors + game.enemyInhibitors,
    visionScore: acc.visionScore + game.visionScore,
    controlWards: acc.controlWards + game.controlWards,
    killParticipation: acc.killParticipation + game.killParticipation,
    objectiveDelta: acc.objectiveDelta + game.objectiveDelta
  }), {
    dragons: 0,
    enemyDragons: 0,
    barons: 0,
    enemyBarons: 0,
    heralds: 0,
    enemyHeralds: 0,
    towers: 0,
    enemyTowers: 0,
    inhibitors: 0,
    enemyInhibitors: 0,
    visionScore: 0,
    controlWards: 0,
    killParticipation: 0,
    objectiveDelta: 0
  });

  const avgVision = totals.visionScore / games.length;
  const avgControlWards = totals.controlWards / games.length;
  const avgObjectiveDelta = totals.objectiveDelta / games.length;
  const objectiveLeadRate = (objectiveWins / games.length) * 100;
  const conversionRate = objectiveWins > 0 ? (wonWithObjectiveLead / objectiveWins) * 100 : wins / games.length * 100;
  const collapseRate = objectiveLosses > 0 ? (lostWithObjectiveDeficit / objectiveLosses) * 100 : 0;

  const dragonShare = (totals.dragons + totals.enemyDragons) > 0
    ? (totals.dragons / (totals.dragons + totals.enemyDragons)) * 100
    : 50;
  const baronShare = (totals.barons + totals.enemyBarons) > 0
    ? (totals.barons / (totals.barons + totals.enemyBarons)) * 100
    : 50;
  const towerShare = (totals.towers + totals.enemyTowers) > 0
    ? (totals.towers / (totals.towers + totals.enemyTowers)) * 100
    : 50;

  const controlScore = Math.round(clamp(
    (objectiveLeadRate * 0.28) +
    (conversionRate * 0.22) +
    (dragonShare * 0.18) +
    (baronShare * 0.13) +
    (towerShare * 0.12) +
    (clamp(avgVision * 3, 0, 100) * 0.07)
  ));

  const tags = [];
  if (controlScore >= 75) tags.push('Objective strong');
  if (dragonShare >= 60) tags.push('Dragon control');
  if (baronShare >= 60 && totals.barons > 0) tags.push('Baron pressure');
  if (towerShare >= 60) tags.push('Map pressure');
  if (avgVision >= 28) tags.push('Vision active');
  if (conversionRate >= 70 && objectiveWins >= 2) tags.push('Lead converter');
  if (collapseRate >= 70 && objectiveLosses >= 2) tags.push('Falls behind hard');
  if (!tags.length) tags.push('Even objective profile');

  const bestObjectiveGame = [...games].sort((a, b) => b.objectiveDelta - a.objectiveDelta)[0];
  const weakestObjectiveGame = [...games].sort((a, b) => a.objectiveDelta - b.objectiveDelta)[0];

  const summary = controlScore >= 75
    ? `Strong map control profile: this player’s teams lead objectives in ${round(objectiveLeadRate, 0)}% of recent games and convert those leads well.`
    : controlScore >= 55
      ? `Stable objective profile: recent games show mostly even control with ${round(dragonShare, 0)}% dragon share and ${round(towerShare, 0)}% tower share.`
      : `Objective warning: this player’s teams are often behind on map control, especially when the game starts slipping.`;

  return {
    games: games.length,
    controlScore,
    objectiveLeadRate: round(objectiveLeadRate, 0),
    conversionRate: round(conversionRate, 0),
    collapseRate: round(collapseRate, 0),
    dragonShare: round(dragonShare, 0),
    baronShare: round(baronShare, 0),
    towerShare: round(towerShare, 0),
    avgVision: round(avgVision, 1),
    avgControlWards: round(avgControlWards, 1),
    avgObjectiveDelta: round(avgObjectiveDelta, 1),
    totals,
    tags: tags.slice(0, 4),
    bestObjectiveGame,
    weakestObjectiveGame,
    summary
  };
}

function Metric({ label, value, sublabel }) {
  return (
    <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</div>
      <div className="text-xl font-black text-white mt-1">{value}</div>
      {sublabel && <div className="text-[11px] text-gray-500 mt-1">{sublabel}</div>}
    </div>
  );
}

function ShareBar({ label, value }) {
  const safeValue = clamp(value);
  return (
    <div>
      <div className="flex justify-between text-[11px] uppercase tracking-widest font-bold text-gray-500 mb-1">
        <span>{label}</span>
        <span className="text-gray-300">{safeValue}%</span>
      </div>
      <div className="h-2 bg-[#0a0e13] rounded-full overflow-hidden border border-gray-800">
        <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export default function ObjectiveControl({ matches = [], puuid }) {
  const analysis = analyzeObjectiveControl(matches, puuid);

  if (!analysis) return null;

  const scoreTone = analysis.controlScore >= 75
    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    : analysis.controlScore >= 55
      ? 'text-blue-300 border-blue-500/30 bg-blue-500/10'
      : 'text-red-300 border-red-500/30 bg-red-500/10';

  return (
    <div className="bg-[#161d23] border border-gray-800 rounded-2xl p-5 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent" />

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-white font-black text-xl tracking-tight">Objective Control</h2>
          <p className="text-gray-500 text-sm mt-1">How this player’s recent games convert map pressure into wins.</p>
        </div>
        <div className={`border rounded-2xl px-4 py-3 text-center min-w-[128px] ${scoreTone}`}>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">Control Score</div>
          <div className="text-3xl font-black leading-none mt-1">{analysis.controlScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Metric label="Objective Lead" value={`${analysis.objectiveLeadRate}%`} sublabel={`${analysis.games} recent games`} />
        <Metric label="Lead Convert" value={`${analysis.conversionRate}%`} sublabel="wins with obj lead" />
        <Metric label="Avg Vision" value={analysis.avgVision} sublabel={`${analysis.avgControlWards} control wards`} />
        <Metric label="Obj Delta" value={analysis.avgObjectiveDelta > 0 ? `+${analysis.avgObjectiveDelta}` : analysis.avgObjectiveDelta} sublabel="per game estimate" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-3">
          <ShareBar label="Dragon Share" value={analysis.dragonShare} />
          <ShareBar label="Baron Share" value={analysis.baronShare} />
          <ShareBar label="Tower Share" value={analysis.towerShare} />
        </div>

        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {analysis.tags.map((tag) => (
              <span key={tag} className="text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
            <div className="text-gray-500">
              Best obj game
              <div className="text-white font-bold mt-1">{analysis.bestObjectiveGame?.championName || 'Unknown'} · {analysis.bestObjectiveGame?.objectiveDelta > 0 ? '+' : ''}{round(analysis.bestObjectiveGame?.objectiveDelta || 0, 1)}</div>
            </div>
            <div className="text-gray-500">
              Weak obj game
              <div className="text-white font-bold mt-1">{analysis.weakestObjectiveGame?.championName || 'Unknown'} · {analysis.weakestObjectiveGame?.objectiveDelta > 0 ? '+' : ''}{round(analysis.weakestObjectiveGame?.objectiveDelta || 0, 1)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

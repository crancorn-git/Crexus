const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value, decimals = 1) => Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

export const getPlayerParticipant = (match, puuid) => match?.info?.participants?.find((p) => p.puuid === puuid);
export const getMinutes = (match) => Math.max((match?.info?.gameDuration || 1) / 60, 1);

const getTeam = (match, teamId) => match?.info?.participants?.filter((p) => p.teamId === teamId) || [];

const getTeamObjectiveScore = (match, teamId) => {
  const team = match?.info?.teams?.find((t) => t.teamId === teamId);
  if (!team?.objectives) return 0;
  const objectives = team.objectives;
  return (
    (objectives.dragon?.kills || 0) * 5 +
    (objectives.baron?.kills || 0) * 9 +
    (objectives.riftHerald?.kills || 0) * 4 +
    (objectives.tower?.kills || 0) * 2 +
    (objectives.inhibitor?.kills || 0) * 4
  );
};

export function buildLanePhaseRead(matches = [], puuid) {
  const rows = matches
    .map((match) => {
      const p = getPlayerParticipant(match, puuid);
      if (!p) return null;
      const c = p.challenges || {};
      const minutes = getMinutes(match);
      const csPerMin = ((p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0)) / minutes;
      const laneCs10 = c.laneMinionsFirst10Minutes ?? c.laneMinionsFirst10MinutesEnemyJungle ?? null;
      const earlyAdvantage = Boolean(c.earlyLaningPhaseGoldExpAdvantage || c.laningPhaseGoldExpAdvantage);
      const soloKills = p.soloKills || c.soloKills || 0;
      const pressureScore = clamp(
        (earlyAdvantage ? 22 : 0) +
        (p.firstBloodKill ? 18 : 0) -
        (p.firstBloodVictim ? 20 : 0) +
        (soloKills * 10) +
        ((p.turretPlatesTaken || 0) * 8) +
        (laneCs10 ? (laneCs10 - 55) * 1.3 : (csPerMin - 6.5) * 9) -
        ((p.deaths || 0) > 7 ? 8 : 0) +
        45
      );

      return {
        matchId: match.metadata?.matchId,
        championName: p.championName,
        win: p.win,
        role: p.teamPosition || p.individualPosition || 'Unknown',
        firstBloodKill: Boolean(p.firstBloodKill),
        firstBloodVictim: Boolean(p.firstBloodVictim),
        earlyAdvantage,
        soloKills,
        turretPlates: p.turretPlatesTaken || 0,
        csPerMin,
        laneCs10,
        pressureScore
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return {
      ready: false,
      label: 'Unknown',
      score: 0,
      summary: 'Lane phase data will appear once recent matches are loaded.',
      tags: [],
      averages: {}
    };
  }

  const avgPressure = rows.reduce((sum, row) => sum + row.pressureScore, 0) / rows.length;
  const fbKills = rows.filter((row) => row.firstBloodKill).length;
  const fbVictims = rows.filter((row) => row.firstBloodVictim).length;
  const earlyAdvantages = rows.filter((row) => row.earlyAdvantage).length;
  const avgSoloKills = rows.reduce((sum, row) => sum + row.soloKills, 0) / rows.length;
  const avgPlates = rows.reduce((sum, row) => sum + row.turretPlates, 0) / rows.length;
  const avgCsPerMin = rows.reduce((sum, row) => sum + row.csPerMin, 0) / rows.length;
  const tags = [];

  if (avgPressure >= 72) tags.push('Lane Bully');
  if (avgPressure <= 42) tags.push('Low Pressure Lane');
  if ((fbVictims / rows.length) * 100 >= 30) tags.push('Early Death Risk');
  if ((earlyAdvantages / rows.length) * 100 >= 45) tags.push('Early Advantage');
  if (avgSoloKills >= 0.5) tags.push('Solo Kill Threat');
  if (avgPlates >= 1) tags.push('Plate Pressure');
  if (avgCsPerMin >= 7.5 && avgPressure < 65) tags.push('Safe Farmer');
  if (!tags.length) tags.push('Balanced Lane');

  const label = avgPressure >= 72 ? 'Dominant' : avgPressure >= 58 ? 'Positive' : avgPressure >= 43 ? 'Stable' : 'Vulnerable';
  const summary = `${label} lane read: averages ${round(avgCsPerMin, 1)} CS/min, creates early advantage in ${round((earlyAdvantages / rows.length) * 100, 0)}% of recent games, and is first blood victim in ${round((fbVictims / rows.length) * 100, 0)}%.`;

  return {
    ready: true,
    label,
    score: Math.round(avgPressure),
    summary,
    tags: tags.slice(0, 5),
    rows,
    averages: {
      firstBloodKillRate: round((fbKills / rows.length) * 100, 0),
      firstBloodVictimRate: round((fbVictims / rows.length) * 100, 0),
      earlyAdvantageRate: round((earlyAdvantages / rows.length) * 100, 0),
      soloKills: round(avgSoloKills, 1),
      plates: round(avgPlates, 1),
      csPerMin: round(avgCsPerMin, 1)
    }
  };
}

export function buildTimelineRead(matches = [], puuid) {
  const rows = matches
    .map((match, index) => {
      const p = getPlayerParticipant(match, puuid);
      if (!p) return null;
      const minutes = getMinutes(match);
      const team = getTeam(match, p.teamId);
      const teamKills = team.reduce((sum, participant) => sum + (participant.kills || 0), 0);
      const kda = ((p.kills || 0) + (p.assists || 0)) / Math.max(p.deaths || 0, 1);
      const csPerMin = ((p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0)) / minutes;
      const damagePerMin = (p.totalDamageDealtToChampions || 0) / minutes;
      const kp = teamKills ? (((p.kills || 0) + (p.assists || 0)) / teamKills) * 100 : 0;
      const objectiveDelta = getTeamObjectiveScore(match, p.teamId) - getTeamObjectiveScore(match, p.teamId === 100 ? 200 : 100);
      const impact = clamp(
        (p.win ? 15 : -5) +
        clamp(kda * 9, 0, 36) +
        clamp(csPerMin * 4, 0, 34) +
        clamp(damagePerMin / 35, 0, 28) +
        clamp(kp / 3, 0, 22) +
        clamp(objectiveDelta * 1.5, -10, 15) -
        Math.max((p.deaths || 0) - 6, 0) * 4
      );

      return {
        game: matches.length - index,
        matchId: match.metadata?.matchId,
        championName: p.championName,
        win: p.win,
        duration: minutes,
        phase: minutes < 23 ? 'Fast' : minutes < 32 ? 'Mid' : 'Late',
        kda: round(kda, 2),
        csPerMin: round(csPerMin, 1),
        damagePerMin: round(damagePerMin, 0),
        killParticipation: round(kp, 0),
        objectiveDelta,
        impact: Math.round(impact)
      };
    })
    .filter(Boolean)
    .reverse();

  if (!rows.length) {
    return {
      ready: false,
      label: 'Unknown',
      summary: 'Timeline read will appear once recent matches are loaded.',
      rows: []
    };
  }

  const firstHalf = rows.slice(0, Math.ceil(rows.length / 2));
  const secondHalf = rows.slice(Math.ceil(rows.length / 2));
  const avg = (items) => items.length ? items.reduce((sum, row) => sum + row.impact, 0) / items.length : 0;
  const earlyAvg = avg(firstHalf);
  const recentAvg = avg(secondHalf.length ? secondHalf : firstHalf);
  const delta = recentAvg - earlyAvg;
  const fastGames = rows.filter((row) => row.phase === 'Fast');
  const lateGames = rows.filter((row) => row.phase === 'Late');
  const best = [...rows].sort((a, b) => b.impact - a.impact)[0];
  const weakest = [...rows].sort((a, b) => a.impact - b.impact)[0];
  const label = delta >= 8 ? 'Rising' : delta <= -8 ? 'Dropping' : 'Stable';
  const summary = `${label} timeline: recent impact is ${delta >= 0 ? '+' : ''}${round(delta, 1)} compared with earlier games. Best spike was ${best?.championName} at ${best?.impact}/100; weakest dip was ${weakest?.championName} at ${weakest?.impact}/100.`;

  return {
    ready: true,
    label,
    delta: round(delta, 1),
    averageImpact: Math.round(avg(rows)),
    rows,
    best,
    weakest,
    fastWinRate: fastGames.length ? round((fastGames.filter((row) => row.win).length / fastGames.length) * 100, 0) : null,
    lateWinRate: lateGames.length ? round((lateGames.filter((row) => row.win).length / lateGames.length) * 100, 0) : null,
    summary
  };
}

export function buildMatchDetailRead(matches = [], puuid) {
  const rows = matches
    .map((match) => {
      const p = getPlayerParticipant(match, puuid);
      if (!p) return null;
      const minutes = getMinutes(match);
      const team = getTeam(match, p.teamId);
      const teamKills = team.reduce((sum, participant) => sum + (participant.kills || 0), 0);
      const kda = ((p.kills || 0) + (p.assists || 0)) / Math.max(p.deaths || 0, 1);
      const csPerMin = ((p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0)) / minutes;
      const kp = teamKills ? (((p.kills || 0) + (p.assists || 0)) / teamKills) * 100 : 0;
      const surrendered = match.info.participants.some((participant) => participant.gameEndedInSurrender);
      const objectiveDelta = getTeamObjectiveScore(match, p.teamId) - getTeamObjectiveScore(match, p.teamId === 100 ? 200 : 100);
      const carryScore = clamp((kda * 16) + (csPerMin * 6) + (kp * 0.35) + objectiveDelta + (p.win ? 10 : 0) - ((p.deaths || 0) * 2));
      let read = 'Balanced game';
      if (carryScore >= 78) read = 'Carry level impact';
      else if (p.win && carryScore >= 62) read = 'Reliable winning game';
      else if (!p.win && carryScore >= 62) read = 'Strong loss / ACE profile';
      else if ((p.deaths || 0) >= 8) read = 'Death-heavy game';
      else if (kp < 35 && !p.win) read = 'Low involvement loss';

      return {
        matchId: match.metadata?.matchId,
        championName: p.championName,
        win: p.win,
        surrendered,
        kda: round(kda, 2),
        csPerMin: round(csPerMin, 1),
        killParticipation: round(kp, 0),
        objectiveDelta,
        carryScore: Math.round(carryScore),
        read
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return {
      ready: false,
      summary: 'Match detail intelligence will appear once recent matches are loaded.',
      rows: []
    };
  }

  const wins = rows.filter((row) => row.win);
  const losses = rows.filter((row) => !row.win);
  const avgCarryScore = rows.reduce((sum, row) => sum + row.carryScore, 0) / rows.length;
  const surrenderRate = rows.filter((row) => row.surrendered).length / rows.length * 100;
  const strongLosses = losses.filter((row) => row.carryScore >= 62).length;
  const deathHeavyLosses = losses.filter((row) => row.read === 'Death-heavy game').length;
  const lowInvolvementLosses = losses.filter((row) => row.read === 'Low involvement loss').length;
  const signatureWin = [...wins].sort((a, b) => b.carryScore - a.carryScore)[0] || null;

  const lossPatterns = [];
  if (deathHeavyLosses) lossPatterns.push('death-heavy losses');
  if (lowInvolvementLosses) lossPatterns.push('low involvement losses');
  if (strongLosses) lossPatterns.push('ACE-style losses');
  if (!lossPatterns.length) lossPatterns.push('mixed loss patterns');

  return {
    ready: true,
    rows,
    averageCarryScore: Math.round(avgCarryScore),
    surrenderRate: round(surrenderRate, 0),
    signatureWin,
    strongLosses,
    lossPattern: lossPatterns.join(', '),
    summary: `Average match impact is ${Math.round(avgCarryScore)}/100. Wins usually peak through ${signatureWin?.championName || 'stable team impact'}, while losses are mostly ${lossPatterns.join(', ')}.`
  };
}

export function buildCrexusReport({ intelligence, laneRead, timelineRead, matchRead }) {
  if (!intelligence?.ready) {
    return 'Crexus needs recent match data before writing a scouting report.';
  }

  const strengths = [];
  const risks = [];
  const plan = [];

  if (intelligence.crexusScore >= 72) strengths.push('reliable recent impact');
  if (intelligence.averages?.csPerMin >= 7.5) strengths.push('strong economy');
  if (intelligence.averages?.damagePerMin >= 700) strengths.push('high damage pressure');
  if (laneRead?.score >= 65) strengths.push('positive lane phase');
  if (timelineRead?.label === 'Rising') strengths.push('improving momentum');
  if (intelligence.oneTrickRisk?.score >= 65 && intelligence.topChampion?.championName) strengths.push(`clear comfort on ${intelligence.topChampion.championName}`);

  if (intelligence.tiltRisk?.score >= 50) risks.push('tilt / forced-fight risk');
  if (intelligence.earlyDeathRisk?.score >= 45 || laneRead?.tags?.includes('Early Death Risk')) risks.push('early death vulnerability');
  if (intelligence.oneTrickRisk?.score >= 70) risks.push('narrow champion pool');
  if (timelineRead?.label === 'Dropping') risks.push('dropping recent impact');
  if (matchRead?.lossPattern?.includes('low involvement')) risks.push('can disappear in losses');

  if (laneRead?.score >= 65) plan.push('respect early trades and first wave pressure');
  else plan.push('pressure early lane and test stability before first objective');
  if (intelligence.oneTrickRisk?.score >= 70 && intelligence.topChampion?.championName) plan.push(`target or deny ${intelligence.topChampion.championName} where possible`);
  if (intelligence.tiltRisk?.score >= 50) plan.push('slow the game down after their mistakes instead of forcing coinflip fights');
  if (timelineRead?.lateWinRate !== null && timelineRead?.lateWinRate >= 60) plan.push('avoid giving them a clean scaling game');

  return `This player looks ${intelligence.recentForm.toLowerCase()} across ${intelligence.games} recent games with a Crexus Score of ${intelligence.crexusScore}/100. Their strongest signals are ${strengths.length ? strengths.join(', ') : 'balanced fundamentals'}. The main risks are ${risks.length ? risks.join(', ') : 'not strongly exposed in recent games'}. Recommended read: ${plan.join('; ')}.`;
}

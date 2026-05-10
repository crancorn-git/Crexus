const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value, decimals = 1) => Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

const RANK_BASE = {
  IRON: 16,
  BRONZE: 24,
  SILVER: 34,
  GOLD: 46,
  PLATINUM: 56,
  EMERALD: 64,
  DIAMOND: 74,
  MASTER: 84,
  GRANDMASTER: 90,
  CHALLENGER: 96
};

const RANK_DIVISION_BONUS = {
  IV: 0,
  III: 2,
  II: 4,
  I: 6
};

const getPrimaryParticipant = (match, puuid) => match?.info?.participants?.find((p) => p.puuid === puuid);

const safeMinutes = (match) => Math.max((match?.info?.gameDuration || 1) / 60, 1);

const getBestRank = (ranks = []) => {
  const solo = ranks.find((rank) => rank.queueType === 'RANKED_SOLO_5x5');
  const flex = ranks.find((rank) => rank.queueType === 'RANKED_FLEX_SR');
  return solo || flex || ranks[0] || null;
};

const classifyRisk = (score) => {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

const classifySignal = (score) => {
  if (score >= 70) return 'Strong';
  if (score >= 40) return 'Possible';
  return 'Low';
};

const classifyForm = (winRate, recentWins, recentLosses) => {
  if (recentWins >= 4 && winRate >= 65) return 'Hot';
  if (recentLosses >= 4 && winRate <= 35) return 'Cold';
  if (winRate >= 58) return 'Positive';
  if (winRate <= 42) return 'Negative';
  return 'Stable';
};

const getRankScore = (ranks = []) => {
  const rank = getBestRank(ranks);
  if (!rank) return 35;
  const base = RANK_BASE[rank.tier] ?? 35;
  const division = RANK_DIVISION_BONUS[rank.rank] ?? 0;
  const lp = clamp((rank.leaguePoints || 0) / 100, 0, 1) * 4;
  return clamp(base + division + lp);
};

const getChampionStats = (participants) => {
  const championMap = new Map();

  participants.forEach((participant) => {
    const existing = championMap.get(participant.championName) || {
      championName: participant.championName,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      csPerMin: 0,
      damagePerMin: 0
    };

    existing.games += 1;
    existing.wins += participant.win ? 1 : 0;
    existing.kills += participant.kills || 0;
    existing.deaths += participant.deaths || 0;
    existing.assists += participant.assists || 0;
    existing.csPerMin += participant.csPerMin || 0;
    existing.damagePerMin += participant.damagePerMin || 0;

    championMap.set(participant.championName, existing);
  });

  return [...championMap.values()]
    .map((champion) => ({
      ...champion,
      winRate: round((champion.wins / champion.games) * 100, 0),
      kda: round((champion.kills + champion.assists) / Math.max(champion.deaths, 1), 2),
      avgCsPerMin: round(champion.csPerMin / champion.games, 1),
      avgDamagePerMin: round(champion.damagePerMin / champion.games, 0)
    }))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
};

const getMainRole = (participants) => {
  const roleCounts = participants.reduce((acc, participant) => {
    const role = participant.teamPosition || participant.individualPosition || 'UNKNOWN';
    if (role && role !== 'Invalid' && role !== 'UNKNOWN') acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return { role: 'Unknown', rate: 0 };
  return { role: sorted[0][0], rate: round((sorted[0][1] / participants.length) * 100, 0) };
};

const getPlaystyleTags = ({ avgKills, avgDeaths, avgAssists, avgCsPerMin, avgVision, avgDamagePerMin, killParticipation, winRate }) => {
  const tags = [];

  if (avgKills >= 8 || avgDamagePerMin >= 850) tags.push('High damage threat');
  if (avgDeaths >= 7) tags.push('Feast or famine');
  if (avgDeaths <= 4 && avgCsPerMin >= 7) tags.push('Controlled scaler');
  if (avgCsPerMin >= 8) tags.push('Strong farmer');
  if (avgVision >= 28) tags.push('Vision active');
  if (avgAssists >= 10 || killParticipation >= 62) tags.push('Teamfight involved');
  if (winRate >= 65) tags.push('Winning form');
  if (winRate <= 35) tags.push('Unstable form');

  return tags.slice(0, 4);
};

const buildReasons = ({ tiltRiskScore, smurfScore, oneTrickScore, earlyDeathRisk, avgDeaths, lossStreak, winRate, games, topChampion, accountLevel, avgKda, avgCsPerMin, firstBloodVictimRate }) => {
  const reasons = [];

  if (tiltRiskScore >= 40) {
    reasons.push(`${classifyRisk(tiltRiskScore)} tilt risk: ${lossStreak >= 3 ? `${lossStreak} recent losses in a row` : `averaging ${round(avgDeaths, 1)} deaths`} across recent games.`);
  }

  if (smurfScore >= 40) {
    reasons.push(`${classifySignal(smurfScore)} smurf signal: ${winRate}% winrate with ${round(avgKda, 2)} KDA${accountLevel < 80 ? ` on a level ${accountLevel} account` : ''}.`);
  }

  if (oneTrickScore >= 40 && topChampion) {
    reasons.push(`${classifyRisk(oneTrickScore)} one-trick pattern: ${topChampion.championName} appears in ${topChampion.games}/${games} recent games.`);
  }

  if (earlyDeathRisk >= 40) {
    reasons.push(`${classifyRisk(earlyDeathRisk)} early risk: first blood victim in ${firstBloodVictimRate}% of recent games.`);
  }

  if (avgCsPerMin >= 8) {
    reasons.push(`Reliable economy: averages ${round(avgCsPerMin, 1)} CS/min recently.`);
  }

  return reasons.slice(0, 4);
};

export function analyzePlayerIntelligence({ matches = [], playerData = null }) {
  const puuid = playerData?.account?.puuid;
  const participants = matches
    .map((match) => {
      const participant = getPrimaryParticipant(match, puuid);
      if (!participant) return null;
      const minutes = safeMinutes(match);
      const team = match.info.participants.filter((p) => p.teamId === participant.teamId);
      const teamKills = team.reduce((sum, p) => sum + (p.kills || 0), 0);

      return {
        ...participant,
        matchId: match.metadata?.matchId,
        gameDuration: match.info.gameDuration,
        minutes,
        csPerMin: ((participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0)) / minutes,
        damagePerMin: (participant.totalDamageDealtToChampions || 0) / minutes,
        kda: ((participant.kills || 0) + (participant.assists || 0)) / Math.max(participant.deaths || 0, 1),
        killParticipation: teamKills > 0 ? (((participant.kills || 0) + (participant.assists || 0)) / teamKills) * 100 : 0
      };
    })
    .filter(Boolean);

  const games = participants.length;

  if (!games) {
    return {
      ready: false,
      crexusScore: 0,
      recentForm: 'Unknown',
      summary: 'Search a player with recent matches to generate Cranix Scout read.'
    };
  }

  const wins = participants.filter((p) => p.win).length;
  const losses = games - wins;
  const winRate = round((wins / games) * 100, 0);
  const avgKills = participants.reduce((sum, p) => sum + (p.kills || 0), 0) / games;
  const avgDeaths = participants.reduce((sum, p) => sum + (p.deaths || 0), 0) / games;
  const avgAssists = participants.reduce((sum, p) => sum + (p.assists || 0), 0) / games;
  const avgKda = participants.reduce((sum, p) => sum + p.kda, 0) / games;
  const avgCsPerMin = participants.reduce((sum, p) => sum + p.csPerMin, 0) / games;
  const avgVision = participants.reduce((sum, p) => sum + (p.visionScore || 0), 0) / games;
  const avgDamagePerMin = participants.reduce((sum, p) => sum + p.damagePerMin, 0) / games;
  const killParticipation = participants.reduce((sum, p) => sum + p.killParticipation, 0) / games;
  const firstBloodVictims = participants.filter((p) => p.firstBloodVictim).length;
  const firstBloodVictimRate = round((firstBloodVictims / games) * 100, 0);
  const shortLosses = participants.filter((p) => !p.win && p.gameDuration <= 20 * 60).length;
  const lossStreak = participants.reduce((streak, participant) => (streak.active && !participant.win ? { active: true, count: streak.count + 1 } : streak), { active: true, count: 0 }).count;

  const championStats = getChampionStats(participants);
  const topChampion = championStats[0] || null;
  const topChampionRate = topChampion ? (topChampion.games / games) * 100 : 0;
  const mainRole = getMainRole(participants);
  const rankScore = getRankScore(playerData?.ranks || []);
  const accountLevel = playerData?.summoner?.summonerLevel || 0;

  const performanceScore = clamp(
    (winRate * 0.35) +
    (clamp(avgKda * 16, 0, 100) * 0.22) +
    (clamp(avgCsPerMin * 10, 0, 100) * 0.18) +
    (clamp(avgDamagePerMin / 10, 0, 100) * 0.15) +
    (clamp(avgVision * 3, 0, 100) * 0.10)
  );

  const consistencyScore = clamp(
    100 -
    (Math.max(avgDeaths - 4.5, 0) * 10) -
    (firstBloodVictimRate * 0.35) -
    (shortLosses * 4)
  );

  const crexusScore = Math.round(clamp((performanceScore * 0.55) + (consistencyScore * 0.25) + (rankScore * 0.20)));

  const tiltRiskScore = Math.round(clamp(
    (losses >= 3 ? 16 : 0) +
    (lossStreak >= 3 ? 28 : lossStreak * 6) +
    (Math.max(avgDeaths - 5, 0) * 10) +
    (shortLosses * 8) +
    (winRate <= 35 ? 18 : 0) -
    (avgKda >= 3 ? 8 : 0)
  ));

  const smurfScore = Math.round(clamp(
    (winRate >= 70 ? 28 : winRate >= 60 ? 16 : 0) +
    (avgKda >= 4 ? 22 : avgKda >= 3 ? 12 : 0) +
    (avgCsPerMin >= 8 ? 16 : avgCsPerMin >= 7 ? 8 : 0) +
    (avgDamagePerMin >= 850 ? 18 : avgDamagePerMin >= 700 ? 10 : 0) +
    (accountLevel && accountLevel < 60 ? 20 : accountLevel < 100 ? 10 : 0) -
    (rankScore >= 80 ? 10 : 0)
  ));

  const oneTrickScore = Math.round(clamp(
    (topChampionRate * 0.9) +
    (topChampion?.games >= 6 ? 12 : 0) +
    (playerData?.mastery?.[0]?.championPoints >= 500000 ? 12 : 0)
  ));

  const earlyDeathRisk = Math.round(clamp(
    (firstBloodVictimRate * 1.35) +
    (Math.max(avgDeaths - 5.5, 0) * 10) +
    (shortLosses * 7)
  ));

  const recentForm = classifyForm(winRate, wins, losses);
  const playstyleTags = getPlaystyleTags({ avgKills, avgDeaths, avgAssists, avgCsPerMin, avgVision, avgDamagePerMin, killParticipation, winRate });
  const reasons = buildReasons({ tiltRiskScore, smurfScore, oneTrickScore, earlyDeathRisk, avgDeaths, lossStreak, winRate, games, topChampion, accountLevel, avgKda, avgCsPerMin, firstBloodVictimRate });

  const bestChampion = championStats
    .filter((champ) => champ.games >= 2)
    .sort((a, b) => b.winRate - a.winRate || b.kda - a.kda)[0] || topChampion;

  const weakestChampion = championStats
    .filter((champ) => champ.games >= 2)
    .sort((a, b) => a.winRate - b.winRate || b.deaths - a.deaths)[0] || null;

  const summaryParts = [];
  summaryParts.push(`${recentForm} recent form over ${games} games at ${winRate}% winrate.`);
  if (playstyleTags[0]) summaryParts.push(`Main read: ${playstyleTags[0].toLowerCase()}.`);
  if (tiltRiskScore >= 70) summaryParts.push('Watch for forced fights when behind.');
  else if (smurfScore >= 70) summaryParts.push('Performance profile is unusually dominant.');
  else if (oneTrickScore >= 70 && topChampion) summaryParts.push(`Champion pool heavily leans toward ${topChampion.championName}.`);

  return {
    ready: true,
    games,
    wins,
    losses,
    winRate,
    crexusScore,
    recentForm,
    mainRole,
    tiltRisk: { label: classifyRisk(tiltRiskScore), score: tiltRiskScore },
    smurfSignal: { label: classifySignal(smurfScore), score: smurfScore },
    oneTrickRisk: { label: classifyRisk(oneTrickScore), score: oneTrickScore },
    earlyDeathRisk: { label: classifyRisk(earlyDeathRisk), score: earlyDeathRisk },
    averages: {
      kda: round(avgKda, 2),
      kills: round(avgKills, 1),
      deaths: round(avgDeaths, 1),
      assists: round(avgAssists, 1),
      csPerMin: round(avgCsPerMin, 1),
      vision: round(avgVision, 1),
      damagePerMin: round(avgDamagePerMin, 0),
      killParticipation: round(killParticipation, 0)
    },
    topChampion,
    bestChampion,
    weakestChampion,
    championStats: championStats.slice(0, 5),
    playstyleTags,
    reasons,
    summary: summaryParts.join(' ')
  };
}

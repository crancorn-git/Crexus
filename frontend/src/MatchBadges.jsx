// frontend/src/MatchBadges.jsx

const BADGE_STYLES = {
  gold: 'bg-yellow-500/95 text-black border-yellow-300',
  purple: 'bg-purple-600/95 text-white border-purple-400',
  red: 'bg-red-600/95 text-white border-red-400',
  blue: 'bg-blue-600/95 text-white border-blue-400',
  green: 'bg-green-600/95 text-white border-green-400',
  gray: 'bg-gray-600/95 text-white border-gray-400',
  orange: 'bg-orange-600/95 text-white border-orange-400',
  cyan: 'bg-cyan-600/95 text-white border-cyan-400',
  emerald: 'bg-emerald-600/95 text-white border-emerald-400',
  pink: 'bg-pink-600/95 text-white border-pink-400',
  slate: 'bg-slate-700/95 text-white border-slate-500',
  danger: 'bg-red-950/95 text-red-100 border-red-600',
};

const safeDivide = (value, total) => (total > 0 ? value / total : 0);

const getTotalCs = (p) => (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);

const getKda = (p) => safeDivide((p.kills || 0) + (p.assists || 0), Math.max(1, p.deaths || 0));

const addBadge = (badges, badge) => {
  badges.push({
    priority: 50,
    tone: 'slate',
    ...badge,
  });
};

function getMatchBadges(match, puuid) {
  const participants = match?.info?.participants || [];
  const user = participants.find((p) => p.puuid === puuid);
  const gameDurationMinutes = (match?.info?.gameDuration || 0) / 60;

  if (!user || gameDurationMinutes <= 0) return [];

  const team = participants.filter((p) => p.teamId === user.teamId);
  const enemyTeam = participants.filter((p) => p.teamId !== user.teamId);

  const teamDamage = team.reduce((acc, p) => acc + (p.totalDamageDealtToChampions || 0), 0);
  const teamKills = team.reduce((acc, p) => acc + (p.kills || 0), 0);
  const teamVision = team.reduce((acc, p) => acc + (p.visionScore || 0), 0);
  const teamTurretDamage = team.reduce((acc, p) => acc + (p.damageDealtToTurrets || 0), 0);
  const enemyDamage = enemyTeam.reduce((acc, p) => acc + (p.totalDamageDealtToChampions || 0), 0);

  const damageShare = safeDivide(user.totalDamageDealtToChampions || 0, teamDamage);
  const killParticipation = safeDivide((user.kills || 0) + (user.assists || 0), teamKills);
  const visionShare = safeDivide(user.visionScore || 0, teamVision);
  const turretShare = safeDivide(user.damageDealtToTurrets || 0, teamTurretDamage);
  const csPerMinute = getTotalCs(user) / gameDurationMinutes;
  const visionPerMinute = (user.visionScore || 0) / gameDurationMinutes;
  const kda = getKda(user);
  const deathsPerTen = ((user.deaths || 0) / gameDurationMinutes) * 10;
  const badges = [];

  // Formula weights reliable solo queue impact without relying on any one stat.
  const getImpactScore = (p) => {
    const pTeam = participants.filter((x) => x.teamId === p.teamId);
    const pTeamDamage = pTeam.reduce((acc, x) => acc + (x.totalDamageDealtToChampions || 0), 0);
    const pTeamKills = pTeam.reduce((acc, x) => acc + (x.kills || 0), 0);
    const pDamageShare = safeDivide(p.totalDamageDealtToChampions || 0, pTeamDamage);
    const pKillParticipation = safeDivide((p.kills || 0) + (p.assists || 0), pTeamKills);

    return (
      (p.kills || 0) * 3 +
      (p.assists || 0) * 2 +
      getKda(p) * 2 +
      pDamageShare * 45 +
      pKillParticipation * 25 +
      ((p.visionScore || 0) / Math.max(1, gameDurationMinutes)) * 4 +
      (getTotalCs(p) / Math.max(1, gameDurationMinutes)) * 2 -
      (p.deaths || 0) * 3
    );
  };

  const sortedByImpact = [...participants].sort((a, b) => getImpactScore(b) - getImpactScore(a));
  const losingTeamBest = [...participants]
    .filter((p) => !p.win)
    .sort((a, b) => getImpactScore(b) - getImpactScore(a))[0];

  if (sortedByImpact[0]?.puuid === user.puuid) {
    addBadge(badges, {
      label: 'MVP',
      tone: 'gold',
      priority: 100,
      reason: 'Highest overall impact score in the match.',
    });
  } else if (losingTeamBest?.puuid === user.puuid) {
    addBadge(badges, {
      label: 'ACE',
      tone: 'purple',
      priority: 95,
      reason: 'Best impact score on the losing team.',
    });
  }

  if (damageShare >= 0.34) {
    addBadge(badges, {
      label: 'DAMAGE CARRY',
      tone: 'red',
      priority: 90,
      reason: `Dealt ${(damageShare * 100).toFixed(0)}% of team champion damage.`,
    });
  } else if (damageShare >= 0.28 && user.win) {
    addBadge(badges, {
      label: 'CARRY PRESSURE',
      tone: 'red',
      priority: 78,
      reason: `High damage share at ${(damageShare * 100).toFixed(0)}% in a win.`,
    });
  }

  if (killParticipation >= 0.72 && teamKills >= 8) {
    addBadge(badges, {
      label: 'TEAMFIGHT ENGINE',
      tone: 'cyan',
      priority: 86,
      reason: `${(killParticipation * 100).toFixed(0)}% kill participation.`,
    });
  }

  if (user.win && gameDurationMinutes < 22 && (damageShare >= 0.24 || killParticipation >= 0.6)) {
    addBadge(badges, {
      label: 'STOMPER',
      tone: 'blue',
      priority: 82,
      reason: `Fast ${Math.floor(gameDurationMinutes)} minute win with strong involvement.`,
    });
  }

  if (visionPerMinute >= 1.8 || (visionShare >= 0.28 && user.visionScore >= 20)) {
    addBadge(badges, {
      label: 'VISION GAP',
      tone: 'green',
      priority: 76,
      reason: `${user.visionScore || 0} vision score, ${visionPerMinute.toFixed(1)} per minute.`,
    });
  }

  if ((user.damageDealtToTurrets || 0) >= 5000 || turretShare >= 0.45) {
    addBadge(badges, {
      label: 'BREACH',
      tone: 'orange',
      priority: 74,
      reason: `${user.damageDealtToTurrets || 0} turret damage${turretShare ? `, ${(turretShare * 100).toFixed(0)}% of team turret damage` : ''}.`,
    });
  }

  if ((user.neutralMinionsKilled || 0) >= 80 || (user.dragonKills || 0) + (user.baronKills || 0) + (user.riftHeraldTakedowns || 0) >= 2) {
    addBadge(badges, {
      label: 'OBJECTIVE MONSTER',
      tone: 'emerald',
      priority: 73,
      reason: 'Strong neutral objective or jungle control impact.',
    });
  }

  if (user.deaths <= 1 && gameDurationMinutes >= 15) {
    addBadge(badges, {
      label: 'IMMORTAL',
      tone: 'gray',
      priority: 72,
      reason: `${user.deaths || 0} deaths over ${Math.floor(gameDurationMinutes)} minutes.`,
    });
  } else if (user.deaths <= 3 && kda >= 5 && gameDurationMinutes >= 20) {
    addBadge(badges, {
      label: 'CLEAN GAME',
      tone: 'gray',
      priority: 66,
      reason: `${kda.toFixed(1)} KDA with low deaths.`,
    });
  }

  if (csPerMinute >= 8.5 && gameDurationMinutes >= 15) {
    addBadge(badges, {
      label: 'FARM LEAD',
      tone: 'pink',
      priority: 65,
      reason: `${csPerMinute.toFixed(1)} CS/min.`,
    });
  }

  if (!user.win && damageShare >= 0.32 && kda >= 2.2) {
    addBadge(badges, {
      label: 'ELO HELD',
      tone: 'purple',
      priority: 84,
      reason: 'Strong damage and KDA despite losing.',
    });
  }

  if ((user.deaths || 0) >= 9 || deathsPerTen >= 3.4) {
    addBadge(badges, {
      label: 'HIGH DEATHS',
      tone: 'danger',
      priority: 62,
      reason: `${user.deaths || 0} deaths, ${deathsPerTen.toFixed(1)} per 10 minutes.`,
    });
  }

  if (!user.win && damageShare < 0.15 && killParticipation < 0.42 && gameDurationMinutes >= 18) {
    addBadge(badges, {
      label: 'INVISIBLE',
      tone: 'slate',
      priority: 60,
      reason: `Low damage share and ${(killParticipation * 100).toFixed(0)}% kill participation.`,
    });
  }

  if (!user.win && (user.gameEndedInSurrender || participants.some((p) => p.gameEndedInSurrender)) && (user.deaths || 0) >= 7) {
    addBadge(badges, {
      label: 'TILT GAME',
      tone: 'danger',
      priority: 70,
      reason: 'Surrender loss with high deaths.',
    });
  }

  if (user.win && enemyDamage > teamDamage && kda >= 3) {
    addBadge(badges, {
      label: 'COMEBACK FACTOR',
      tone: 'blue',
      priority: 68,
      reason: 'Won despite enemy team dealing more champion damage.',
    });
  }

  return badges.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

export default function MatchBadges({ match, puuid }) {
  const badges = getMatchBadges(match, puuid);

  if (badges.length === 0) return null;

  const primaryReason = badges[0]?.reason;

  return (
    <div className="mb-2">
      <div className="flex gap-1.5 flex-wrap">
        {badges.map((badge) => (
          <span
            key={`${badge.label}-${badge.reason}`}
            title={badge.reason}
            className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${BADGE_STYLES[badge.tone] || BADGE_STYLES.slate} shadow-sm tracking-wider`}
          >
            {badge.label}
          </span>
        ))}
      </div>
      {primaryReason && (
        <div className="text-[10px] text-gray-500 mt-1 max-w-[420px] truncate">
          {primaryReason}
        </div>
      )}
    </div>
  );
}

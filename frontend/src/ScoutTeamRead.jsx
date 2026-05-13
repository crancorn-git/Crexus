const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value, decimals = 0) => Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

const getName = (entry) => entry?.riotId || entry?.name || entry?.data?.account?.gameName || entry?.data?.name || 'Unknown player';
const getIntel = (entry) => entry?.intelligence || null;

function summarizeGroup(entries = []) {
  const players = entries
    .map((entry) => ({ ...entry, displayName: getName(entry), intelligence: getIntel(entry) }))
    .filter((entry) => entry.intelligence?.ready);

  if (!players.length) {
    return {
      ready: false,
      playerCount: 0,
      averageScore: 0,
      carryThreat: null,
      unstablePlayer: null,
      smurfSignal: null,
      oneTrick: null,
      riskCount: 0,
      read: 'Not enough recent match data to build a team read yet.'
    };
  }

  const averageScore = round(players.reduce((sum, player) => sum + (player.intelligence.crexusScore || 0), 0) / players.length);
  const carryThreat = [...players].sort((a, b) => (b.intelligence.crexusScore || 0) - (a.intelligence.crexusScore || 0))[0];
  const unstablePlayer = [...players].sort((a, b) => (b.intelligence.tiltRisk?.score || 0) - (a.intelligence.tiltRisk?.score || 0))[0];
  const smurfSignal = [...players].sort((a, b) => (b.intelligence.smurfSignal?.score || 0) - (a.intelligence.smurfSignal?.score || 0))[0];
  const oneTrick = [...players].sort((a, b) => (b.intelligence.oneTrickRisk?.score || 0) - (a.intelligence.oneTrickRisk?.score || 0))[0];
  const riskCount = players.filter((player) =>
    (player.intelligence.tiltRisk?.score || 0) >= 60 ||
    (player.intelligence.earlyDeathRisk?.score || 0) >= 60
  ).length;

  const reads = [];
  if (averageScore >= 72) reads.push('High-confidence group with strong recent form.');
  else if (averageScore >= 58) reads.push('Playable group with decent recent signals.');
  else if (averageScore >= 42) reads.push('Mixed group: look for the strongest player and avoid weak-side chaos.');
  else reads.push('Low-confidence group based on recent match signals.');

  if (carryThreat?.intelligence?.crexusScore >= 70) reads.push(`${carryThreat.displayName} is the main carry profile.`);
  if (unstablePlayer?.intelligence?.tiltRisk?.score >= 70) reads.push(`${unstablePlayer.displayName} has the highest tilt/instability risk.`);
  if (smurfSignal?.intelligence?.smurfSignal?.score >= 70) reads.push(`${smurfSignal.displayName} has a strong smurf/dominance signal.`);
  if (riskCount >= 2) reads.push(`${riskCount} players show elevated risk flags.`);

  return {
    ready: true,
    playerCount: players.length,
    averageScore,
    carryThreat,
    unstablePlayer,
    smurfSignal,
    oneTrick,
    riskCount,
    read: reads.join(' ')
  };
}

function Meter({ value }) {
  return (
    <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
      <div
        className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-400"
        style={{ width: `${clamp(value)}%` }}
      />
    </div>
  );
}

function Highlight({ label, player, metric }) {
  if (!player?.intelligence) return null;

  return (
    <div className="bg-black/25 border border-white/5 rounded-lg p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black mb-1">{label}</div>
      <div className="text-white font-black truncate">{player.displayName}</div>
      <div className="text-xs text-gray-400 mt-1">{metric}</div>
    </div>
  );
}

export function ScoutTeamRead({ entries = [], title = 'Scout Read' }) {
  const summary = summarizeGroup(entries);

  return (
    <div className="bg-[#111820] border border-emerald-500/20 rounded-2xl p-5 mb-6 shadow-xl shadow-emerald-950/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-black">Crexus Team Read</div>
          <h2 className="text-2xl font-black text-white italic">{title}</h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase font-black tracking-widest">Avg Score</div>
          <div className="text-3xl font-black text-emerald-300">{summary.ready ? summary.averageScore : '--'}</div>
        </div>
      </div>

      <Meter value={summary.averageScore} />

      <p className="text-sm text-gray-300 mt-4 leading-relaxed">{summary.read}</p>

      {summary.ready && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <Highlight
            label="Carry Profile"
            player={summary.carryThreat}
            metric={`Crexus ${summary.carryThreat.intelligence.crexusScore} · ${summary.carryThreat.intelligence.recentForm}`}
          />
          <Highlight
            label="Instability Risk"
            player={summary.unstablePlayer}
            metric={`${summary.unstablePlayer.intelligence.tiltRisk.label} tilt · ${summary.unstablePlayer.intelligence.tiltRisk.score}/100`}
          />
          <Highlight
            label="Dominance Signal"
            player={summary.smurfSignal}
            metric={`${summary.smurfSignal.intelligence.smurfSignal.label} smurf · ${summary.smurfSignal.intelligence.smurfSignal.score}/100`}
          />
          <Highlight
            label="Pool Warning"
            player={summary.oneTrick}
            metric={`${summary.oneTrick.intelligence.oneTrickRisk.label} OTP · ${summary.oneTrick.intelligence.oneTrickRisk.score}/100`}
          />
        </div>
      )}
    </div>
  );
}

export function LiveTeamComparison({ participants = [] }) {
  const blue = summarizeGroup(participants.filter((player) => player.teamId === 100));
  const red = summarizeGroup(participants.filter((player) => player.teamId === 200));
  const diff = blue.averageScore - red.averageScore;
  const leader = Math.abs(diff) < 5 ? 'Even read' : diff > 0 ? 'Blue advantage' : 'Red advantage';
  const leaderClass = Math.abs(diff) < 5 ? 'text-gray-300' : diff > 0 ? 'text-red-200' : 'text-red-300';

  return (
    <div className="bg-[#111820] border border-red-500/20 rounded-2xl p-5 mb-8 shadow-xl shadow-red-950/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-red-300 font-black">Live Draft Read</div>
          <h2 className="text-2xl font-black text-white italic">Team Advantage Read</h2>
        </div>
        <div className={`text-2xl font-black ${leaderClass}`}>{leader}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[['Blue Team', blue, 'text-red-200'], ['Red Team', red, 'text-red-300']].map(([name, summary, colorClass]) => (
          <div key={name} className="bg-black/25 border border-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`font-black uppercase tracking-wider ${colorClass}`}>{name}</div>
              <div className="text-white font-black text-2xl">{summary.ready ? summary.averageScore : '--'}</div>
            </div>
            <Meter value={summary.averageScore} />
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">{summary.read}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value, decimals = 1) => Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

const getParticipant = (match, puuid) => match?.info?.participants?.find((p) => p.puuid === puuid);

const buildTrendRows = (matches, puuid) => {
  return [...matches]
    .reverse()
    .map((match, index) => {
      const participant = getParticipant(match, puuid);
      if (!participant) return null;

      const minutes = Math.max((match.info.gameDuration || 1) / 60, 1);
      const team = match.info.participants.filter((p) => p.teamId === participant.teamId);
      const teamKills = team.reduce((sum, player) => sum + (player.kills || 0), 0);
      const kda = ((participant.kills || 0) + (participant.assists || 0)) / Math.max(participant.deaths || 0, 1);
      const cs = ((participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0)) / minutes;
      const damage = (participant.totalDamageDealtToChampions || 0) / minutes;
      const kp = teamKills > 0 ? (((participant.kills || 0) + (participant.assists || 0)) / teamKills) * 100 : 0;
      const impact = clamp(
        (participant.win ? 18 : 0) +
        clamp(kda * 11, 0, 32) +
        clamp(cs * 3.1, 0, 26) +
        clamp(damage / 35, 0, 20) +
        clamp(kp / 8, 0, 12) -
        Math.max((participant.deaths || 0) - 6, 0) * 3
      );

      return {
        index: index + 1,
        result: participant.win ? 'W' : 'L',
        champion: participant.championName,
        impact: Math.round(impact),
        kda: round(kda, 2),
        cs: round(cs, 1),
        damage: Math.round(damage),
        deaths: participant.deaths || 0,
        kills: participant.kills || 0,
        assists: participant.assists || 0
      };
    })
    .filter(Boolean);
};

const getMomentum = (rows) => {
  if (rows.length < 4) return { label: 'Building', detail: 'Not enough recent games for a strong trend.' };

  const split = Math.max(2, Math.floor(rows.length / 2));
  const older = rows.slice(0, split);
  const newer = rows.slice(split);
  const olderAvg = older.reduce((sum, row) => sum + row.impact, 0) / older.length;
  const newerAvg = newer.reduce((sum, row) => sum + row.impact, 0) / newer.length;
  const diff = newerAvg - olderAvg;

  if (diff >= 10) return { label: 'Rising', detail: `Impact is up ${Math.round(diff)} points compared with earlier games.` };
  if (diff <= -10) return { label: 'Dropping', detail: `Impact is down ${Math.abs(Math.round(diff))} points compared with earlier games.` };
  return { label: 'Stable', detail: 'Recent impact has stayed fairly consistent.' };
};

const getConsistency = (rows) => {
  if (rows.length < 3) return { label: 'Unknown', score: 0 };
  const avg = rows.reduce((sum, row) => sum + row.impact, 0) / rows.length;
  const variance = rows.reduce((sum, row) => sum + Math.pow(row.impact - avg, 2), 0) / rows.length;
  const deviation = Math.sqrt(variance);
  const score = Math.round(clamp(100 - deviation * 2.2));

  if (score >= 75) return { label: 'Reliable', score };
  if (score >= 50) return { label: 'Mixed', score };
  return { label: 'Volatile', score };
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="bg-[#10151b] border border-gray-700 rounded-xl shadow-2xl p-3 text-xs min-w-40">
      <div className="flex justify-between gap-4 mb-2">
        <span className="font-black text-white">Game {row.index}</span>
        <span className={row.result === 'W' ? 'text-blue-300 font-black' : 'text-red-300 font-black'}>{row.result}</span>
      </div>
      <div className="text-gray-400 font-bold mb-1">{row.champion}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-300">
        <span>Impact</span><span className="text-white font-mono text-right">{row.impact}</span>
        <span>KDA</span><span className="text-white font-mono text-right">{row.kda}</span>
        <span>CS/m</span><span className="text-white font-mono text-right">{row.cs}</span>
        <span>DMG/m</span><span className="text-white font-mono text-right">{row.damage}</span>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, detail }) => (
  <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">{label}</div>
    <div className="text-xl font-black text-white mt-1">{value}</div>
    {detail && <div className="text-[11px] text-gray-500 mt-0.5">{detail}</div>}
  </div>
);

export default function PerformanceTrends({ matches = [], puuid }) {
  const rows = buildTrendRows(matches, puuid);
  if (rows.length < 2) return null;

  const lastFive = rows.slice(-5);
  const lastFiveWins = lastFive.filter((row) => row.result === 'W').length;
  const avgImpact = Math.round(rows.reduce((sum, row) => sum + row.impact, 0) / rows.length);
  const momentum = getMomentum(rows);
  const consistency = getConsistency(rows);
  const bestGame = [...rows].sort((a, b) => b.impact - a.impact)[0];

  return (
    <div className="bg-[#161d23] rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
      <div className="p-5 border-b border-gray-800 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="text-xs text-blue-300 font-black uppercase tracking-[0.25em]">Performance Trends</div>
          <h2 className="text-2xl font-black text-white mt-1">Momentum Read</h2>
          <p className="text-sm text-gray-400 mt-2">{momentum.detail}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[45%]">
          <StatBox label="Momentum" value={momentum.label} />
          <StatBox label="Consistency" value={consistency.label} detail={`${consistency.score}/100`} />
          <StatBox label="Last 5" value={`${lastFiveWins}-${lastFive.length - lastFiveWins}`} detail="W-L" />
          <StatBox label="Avg Impact" value={avgImpact} detail="/100" />
        </div>
      </div>

      <div className="p-5">
        <div className="h-64 bg-[#0a0e13] border border-gray-800 rounded-xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="index" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={50} stroke="#374151" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="impact" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: '#0a0e13', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {bestGame && (
          <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-blue-300/80 font-black">Best Recent Spike</div>
              <div className="text-white font-black mt-1">{bestGame.champion} · {bestGame.kills}/{bestGame.deaths}/{bestGame.assists}</div>
            </div>
            <div className="text-sm text-gray-400">
              Impact <span className="text-blue-200 font-black">{bestGame.impact}/100</span> · {bestGame.cs} CS/m · {bestGame.damage} DMG/m
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

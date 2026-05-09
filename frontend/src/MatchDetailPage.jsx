import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import MatchTimeline from './MatchTimeline';
import DeathHeatmap from './DeathHeatmap';
import MatchBadges from './MatchBadges';
import MatchInsightMini from './MatchInsightMini';

import { BackButton } from './CrexusShell';
function StatChip({ label, value, tone = 'neutral' }) {
  const toneClass = {
    good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    bad: 'border-red-500/30 bg-red-500/10 text-red-200',
    neutral: 'border-white/10 bg-white/5 text-gray-200'
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

export default function MatchDetailPage({
  match,
  participant,
  puuid,
  region,
  ddragonBase,
  queues,
  getSpellIcon,
  getRuneIcon,
  onBack
}) {
  const isWin = participant.win;
  const queueName = queues[match.info.queueId] || 'Normal';
  const gameMinutes = Math.floor(match.info.gameDuration / 60);
  const gameSeconds = match.info.gameDuration % 60;
  const kda = ((participant.kills + participant.assists) / (participant.deaths || 1)).toFixed(2);
  const csPerMin = (participant.totalMinionsKilled / (match.info.gameDuration / 60)).toFixed(1);
  const allies = match.info.participants.filter((p) => p.teamId === participant.teamId);
  const enemies = match.info.participants.filter((p) => p.teamId !== participant.teamId);

  const damageData = match.info.participants.map((p) => ({
    name: p.championName,
    damage: p.totalDamageDealtToChampions,
    isUser: p.puuid === puuid,
    team: p.teamId === participant.teamId ? 'ally' : 'enemy'
  }));

  const teamDamage = allies.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0) || 1;
  const objectiveData = [
    { name: 'Team Damage Share', value: Number(((participant.totalDamageDealtToChampions / teamDamage) * 100).toFixed(1)) },
    { name: 'Kill Participation', value: Number((((participant.kills + participant.assists) / ((allies.reduce((sum, p) => sum + p.kills, 0)) || 1)) * 100).toFixed(1)) }
  ];

  const renderScoreboardRow = (p) => {
    const highlight = p.puuid === puuid;
    return (
      <div key={p.puuid} className={`grid grid-cols-[40px_1fr_84px_68px_72px] items-center gap-3 rounded-xl px-3 py-2 ${highlight ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/5'}`}>
        <img src={`${ddragonBase}/img/champion/${p.championName}.png`} alt={p.championName} className="h-10 w-10 rounded-lg border border-white/10" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{p.riotIdGameName || p.summonerName || p.championName}</div>
          <div className="text-[11px] text-gray-400">{p.championName} · {p.individualPosition || '—'}</div>
        </div>
        <div className="text-sm font-black text-white">{p.kills}/{p.deaths}/{p.assists}</div>
        <div className="text-xs text-gray-300">{((p.kills + p.assists) / (p.deaths || 1)).toFixed(2)} KDA</div>
        <div className="text-right text-xs text-gray-400">{(p.totalDamageDealtToChampions / 1000).toFixed(1)}k dmg</div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="crexus-card rounded-3xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <BackButton onClick={onBack} label="Back to matches" />
            <div className="text-xs uppercase tracking-[0.24em] text-gray-500">Focused Match Review</div>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">{queueName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${isWin ? 'bg-red-500/15 text-red-200' : 'bg-red-500/15 text-red-300'}`}>{isWin ? 'Victory' : 'Defeat'}</span>
              <span>{gameMinutes}m {gameSeconds}s</span>
              <span>·</span>
              <span>{participant.championName}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <StatChip label="KDA" value={kda} tone={Number(kda) >= 3 ? 'good' : 'neutral'} />
            <StatChip label="CS/m" value={csPerMin} tone={Number(csPerMin) >= 7 ? 'good' : 'neutral'} />
            <StatChip label="Vision" value={participant.visionScore} tone={participant.visionScore >= 20 ? 'good' : 'neutral'} />
            <StatChip label="Damage" value={`${(participant.totalDamageDealtToChampions / 1000).toFixed(1)}k`} tone={participant.totalDamageDealtToChampions >= 20000 ? 'good' : 'neutral'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <div className="crexus-card rounded-3xl p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex items-center gap-4">
                <img src={`${ddragonBase}/img/champion/${participant.championName}.png`} alt={participant.championName} className="h-20 w-20 rounded-2xl border border-white/10 shadow-xl" />
                <div>
                  <div className="text-xl font-black text-white">{participant.championName}</div>
                  <div className="mt-1 text-sm text-gray-400">Level {participant.champLevel} · {participant.individualPosition || 'Unknown role'}</div>
                  <div className="mt-3 flex gap-2">
                    <img src={`${ddragonBase}/img/spell/${getSpellIcon(participant.summoner1Id)}`} alt="Spell 1" className="h-9 w-9 rounded-lg border border-white/10" />
                    <img src={`${ddragonBase}/img/spell/${getSpellIcon(participant.summoner2Id)}`} alt="Spell 2" className="h-9 w-9 rounded-lg border border-white/10" />
                    <div className="ml-2 flex gap-2">
                      <div className="h-9 w-9 rounded-full border border-white/10 bg-black/40 p-1">
                        <img src={`https://ddragon.leagueoflegends.com/cdn/img/${getRuneIcon(participant.perks.styles[0].style, participant.perks.styles[0].selections[0].perk)}`} alt="Primary rune" className="h-full w-full" />
                      </div>
                      <div className="h-9 w-9 rounded-full border border-white/10 bg-black/40 p-1.5">
                        <img src={`https://ddragon.leagueoflegends.com/cdn/img/${getRuneIcon(participant.perks.styles[1].style)}`} alt="Secondary rune" className="h-full w-full opacity-90" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <MatchBadges match={match} puuid={puuid} />
                <div className="mt-3">
                  <MatchInsightMini matches={[match]} puuid={puuid} matchId={match.metadata.matchId} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5, participant.item6].map((item, index) => (
                    <div key={`${item}-${index}`} className="h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      {item !== 0 && <img src={`${ddragonBase}/img/item/${item}.png`} alt={`Item ${item}`} className="h-full w-full" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="crexus-card rounded-3xl p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-gray-400">Damage Distribution</h3>
              <div className="text-xs text-gray-500">White outline = selected player</div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={damageData} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#9ca3af', fontSize: 11 }} interval={0} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    formatter={(value) => [Number(value).toLocaleString(), 'Damage']}
                  />
                  <Bar dataKey="damage" radius={[0, 8, 8, 0]}>
                    {damageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.team === 'ally' ? '#3b82f6' : '#ef4444'} opacity={entry.isUser ? 1 : 0.5} stroke={entry.isUser ? '#ffffff' : 'none'} strokeWidth={entry.isUser ? 1.5 : 0} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="crexus-card rounded-3xl p-5 md:p-6">
              <h3 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-gray-400">Lane Timeline</h3>
              <MatchTimeline
                matchId={match.metadata.matchId}
                participantId={participant.participantId}
                participants={match.info.participants}
                region={region}
              />
            </div>
            <div className="crexus-card rounded-3xl p-5 md:p-6">
              <h3 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-gray-400">Death Map</h3>
              <DeathHeatmap matchId={match.metadata.matchId} participantId={participant.participantId} region={region} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="crexus-card rounded-3xl p-5 md:p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-gray-400">Match Snapshot</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
              {objectiveData.map((slice) => (
                <div key={slice.name} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{slice.name}</div>
                  <div className="mt-1 text-2xl font-black text-white">{slice.value}%</div>
                </div>
              ))}
            </div>
            <div className="mt-5 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={objectiveData} dataKey="value" nameKey="name" outerRadius={74} innerRadius={44} paddingAngle={2}>
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    formatter={(value) => [`${value}%`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="crexus-card rounded-3xl p-5 md:p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-gray-400">Allied Team</h3>
            <div className="space-y-2">{allies.map(renderScoreboardRow)}</div>
          </div>

          <div className="crexus-card rounded-3xl p-5 md:p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-gray-400">Enemy Team</h3>
            <div className="space-y-2">{enemies.map(renderScoreboardRow)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

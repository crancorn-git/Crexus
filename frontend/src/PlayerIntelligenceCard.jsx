const scoreColor = (score) => {
  if (score >= 80) return 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';
  if (score >= 65) return 'text-red-200 border-red-500/40 bg-red-500/10';
  if (score >= 45) return 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10';
  return 'text-red-300 border-red-500/40 bg-red-500/10';
};

const riskColor = (label) => {
  if (label === 'High' || label === 'Strong') return 'text-red-300 bg-red-500/10 border-red-500/30';
  if (label === 'Medium' || label === 'Possible') return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30';
  return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
};

const MetricPill = ({ label, value, detail }) => (
  <div className={`rounded-xl border px-3 py-2 ${riskColor(value)}`}>
    <div className="text-[10px] uppercase tracking-widest opacity-70 font-black">{label}</div>
    <div className="text-sm font-black mt-0.5">{value}</div>
    {detail !== undefined && <div className="text-[10px] opacity-70 mt-0.5">{detail}/100</div>}
  </div>
);

export default function PlayerIntelligenceCard({ intelligence }) {
  if (!intelligence?.ready) return null;

  return (
    <div className="bg-[#161d23] rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
      <div className="p-5 border-b border-gray-800 bg-gradient-to-r from-red-950/30 via-[#161d23] to-[#10151b]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs text-red-300 font-black uppercase tracking-[0.25em]">Crexus Player Read</div>
            <h2 className="text-2xl font-black text-white mt-1">Player Read</h2>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">{intelligence.summary}</p>
          </div>

          <div className={`min-w-32 text-center rounded-2xl border p-4 ${scoreColor(intelligence.crexusScore)}`}>
            <div className="text-[10px] uppercase tracking-widest font-black opacity-70">Crexus Score</div>
            <div className="text-4xl font-black leading-none mt-1">{intelligence.crexusScore}</div>
            <div className="text-xs opacity-70 mt-1">/ 100</div>
          </div>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricPill label="Form" value={intelligence.recentForm} detail={`${intelligence.winRate}% WR`} />
            <MetricPill label="Tilt Risk" value={intelligence.tiltRisk.label} detail={intelligence.tiltRisk.score} />
            <MetricPill label="Smurf Signal" value={intelligence.smurfSignal.label} detail={intelligence.smurfSignal.score} />
            <MetricPill label="One-Trick" value={intelligence.oneTrickRisk.label} detail={intelligence.oneTrickRisk.score} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0a0e13] rounded-xl border border-gray-800 p-3">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">KDA</div>
              <div className="text-xl font-black text-white mt-1">{intelligence.averages.kda}</div>
              <div className="text-[11px] text-gray-500">{intelligence.averages.kills}/{intelligence.averages.deaths}/{intelligence.averages.assists}</div>
            </div>
            <div className="bg-[#0a0e13] rounded-xl border border-gray-800 p-3">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">CS/min</div>
              <div className="text-xl font-black text-white mt-1">{intelligence.averages.csPerMin}</div>
              <div className="text-[11px] text-gray-500">Recent economy</div>
            </div>
            <div className="bg-[#0a0e13] rounded-xl border border-gray-800 p-3">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">KP</div>
              <div className="text-xl font-black text-white mt-1">{intelligence.averages.killParticipation}%</div>
              <div className="text-[11px] text-gray-500">Kill involvement</div>
            </div>
            <div className="bg-[#0a0e13] rounded-xl border border-gray-800 p-3">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Main Role</div>
              <div className="text-xl font-black text-white mt-1">{intelligence.mainRole.role}</div>
              <div className="text-[11px] text-gray-500">{intelligence.mainRole.rate}% recent games</div>
            </div>
          </div>

          {intelligence.playstyleTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {intelligence.playstyleTags.map((tag) => (
                <span key={tag} className="rounded-full border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {intelligence.reasons.length > 0 && (
            <div className="bg-[#0a0e13] rounded-xl border border-gray-800 p-4">
              <div className="text-xs text-gray-500 font-black uppercase tracking-widest mb-3">Why Crexus thinks this</div>
              <div className="space-y-2">
                {intelligence.reasons.map((reason) => (
                  <div key={reason} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-red-400 mt-0.5">◆</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {intelligence.topChampion && (
            <div className="bg-[#0a0e13] rounded-xl border border-gray-800 p-4">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">Most Played</div>
              <div className="text-lg font-black text-white mt-1">{intelligence.topChampion.championName}</div>
              <div className="text-sm text-gray-400 mt-1">{intelligence.topChampion.games}/{intelligence.games} games · {intelligence.topChampion.winRate}% WR</div>
            </div>
          )}

          {intelligence.bestChampion && (
            <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-4">
              <div className="text-[10px] uppercase tracking-widest text-emerald-300/80 font-black">Best Recent Pick</div>
              <div className="text-lg font-black text-emerald-100 mt-1">{intelligence.bestChampion.championName}</div>
              <div className="text-sm text-emerald-200/70 mt-1">{intelligence.bestChampion.winRate}% WR · {intelligence.bestChampion.kda} KDA</div>
            </div>
          )}

          {intelligence.weakestChampion && intelligence.weakestChampion.championName !== intelligence.bestChampion?.championName && (
            <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-4">
              <div className="text-[10px] uppercase tracking-widest text-red-300/80 font-black">Weak Recent Pick</div>
              <div className="text-lg font-black text-red-100 mt-1">{intelligence.weakestChampion.championName}</div>
              <div className="text-sm text-red-200/70 mt-1">{intelligence.weakestChampion.winRate}% WR · {intelligence.weakestChampion.kda} KDA</div>
            </div>
          )}

          <div className="bg-[#0a0e13] rounded-xl border border-gray-800 p-4">
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black mb-3">Champion Pool</div>
            <div className="space-y-2">
              {intelligence.championStats.slice(0, 4).map((champion) => (
                <div key={champion.championName} className="flex justify-between text-sm">
                  <span className="text-gray-300 font-bold">{champion.championName}</span>
                  <span className="text-gray-500">{champion.games}g · {champion.winRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

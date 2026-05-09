import { buildLanePhaseRead } from './advancedIntelligence';

const Stat = ({ label, value }) => (
  <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</div>
    <div className="text-lg font-black text-white mt-1">{value}</div>
  </div>
);

export default function LanePhaseAnalysis({ matches, puuid }) {
  const read = buildLanePhaseRead(matches, puuid);

  return (
    <div className="bg-[#161d23] rounded-2xl border border-gray-800 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide">Lane Phase Analysis</h2>
          <p className="text-sm text-gray-400 mt-1">Early pressure, first blood patterns, plates and lane stability.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Lane Score</div>
          <div className="text-3xl font-black text-red-400">{read.score}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {read.tags.map((tag) => (
          <span key={tag} className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
            {tag}
          </span>
        ))}
      </div>

      <p className="text-sm text-gray-300 leading-relaxed mb-5">{read.summary}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Early Advantage" value={`${read.averages.earlyAdvantageRate || 0}%`} />
        <Stat label="First Blood Kill" value={`${read.averages.firstBloodKillRate || 0}%`} />
        <Stat label="First Blood Victim" value={`${read.averages.firstBloodVictimRate || 0}%`} />
        <Stat label="Solo Kills" value={read.averages.soloKills ?? 0} />
        <Stat label="Plates" value={read.averages.plates ?? 0} />
        <Stat label="CS / Min" value={read.averages.csPerMin ?? 0} />
      </div>
    </div>
  );
}

import { buildCrexusReport, buildLanePhaseRead, buildTimelineRead, buildMatchDetailRead } from './advancedIntelligence';

export default function CrexusReport({ intelligence, matches, puuid }) {
  const laneRead = buildLanePhaseRead(matches, puuid);
  const timelineRead = buildTimelineRead(matches, puuid);
  const matchRead = buildMatchDetailRead(matches, puuid);
  const report = buildCrexusReport({ intelligence, laneRead, timelineRead, matchRead });

  return (
    <div className="bg-gradient-to-br from-red-950/30 via-[#161d23] to-[#0a0e13] rounded-2xl border border-red-500/20 p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-70" />
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide">Crexus AI Scout Report</h2>
          <p className="text-sm text-gray-400 mt-1">Plain-English read combining profile, lane, timeline and match patterns.</p>
        </div>
        <div className="text-3xl">🧠</div>
      </div>
      <p className="text-gray-200 leading-relaxed text-sm md:text-base">{report}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
        <div className="bg-black/20 border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Lane Read</div>
          <div className="text-white font-bold mt-1">{laneRead.label} · {laneRead.score}/100</div>
        </div>
        <div className="bg-black/20 border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Timeline</div>
          <div className="text-white font-bold mt-1">{timelineRead.label} · {timelineRead.averageImpact || 0}/100</div>
        </div>
        <div className="bg-black/20 border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Match Pattern</div>
          <div className="text-white font-bold mt-1">{matchRead.averageCarryScore || 0}/100 impact</div>
        </div>
      </div>
    </div>
  );
}

import { buildMatchDetailRead } from './advancedIntelligence';

export default function MatchDetailRead({ matches, puuid }) {
  const read = buildMatchDetailRead(matches, puuid);

  return (
    <div className="bg-[#161d23] rounded-2xl border border-gray-800 p-6 shadow-xl mb-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide">Previous Matches Read</h2>
          <p className="text-sm text-gray-400 mt-1">A quick Crexus read for the match history page.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Avg Impact</div>
          <div className="text-3xl font-black text-yellow-300">{read.averageCarryScore || 0}</div>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed mb-4">{read.summary}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Signature Win</div>
          <div className="text-white font-bold mt-1">{read.signatureWin?.championName || 'Not enough wins'}</div>
        </div>
        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Loss Pattern</div>
          <div className="text-white font-bold mt-1 capitalize">{read.lossPattern || 'Unknown'}</div>
        </div>
        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Surrender Rate</div>
          <div className="text-white font-bold mt-1">{read.surrenderRate || 0}%</div>
        </div>
      </div>
    </div>
  );
}

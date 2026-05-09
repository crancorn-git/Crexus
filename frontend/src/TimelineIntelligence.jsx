import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { buildTimelineRead } from './advancedIntelligence';

const TooltipBox = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-[#0a0e13] border border-gray-700 rounded-lg p-3 shadow-xl text-xs">
      <div className="text-white font-bold mb-1">{row.championName} · {row.win ? 'Win' : 'Loss'}</div>
      <div className="text-gray-300">Impact: <span className="text-red-300 font-bold">{row.impact}/100</span></div>
      <div className="text-gray-400">KDA {row.kda} · {row.csPerMin} CS/m · KP {row.killParticipation}%</div>
    </div>
  );
};

export default function TimelineIntelligence({ matches, puuid }) {
  const read = buildTimelineRead(matches, puuid);

  return (
    <div className="bg-[#161d23] rounded-2xl border border-gray-800 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide">Timeline Intelligence</h2>
          <p className="text-sm text-gray-400 mt-1">Impact direction, game length tendencies and recent momentum.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Momentum</div>
          <div className="text-2xl font-black text-blue-300">{read.label}</div>
        </div>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed mb-5">{read.summary}</p>

      <div className="h-56 bg-[#0a0e13] rounded-xl border border-gray-800 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={read.rows} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis dataKey="game" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip content={<TooltipBox />} />
            <Line type="monotone" dataKey="impact" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Avg Impact</div>
          <div className="text-lg font-black text-white mt-1">{read.averageImpact || 0}</div>
        </div>
        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Trend Delta</div>
          <div className="text-lg font-black text-white mt-1">{read.delta > 0 ? '+' : ''}{read.delta || 0}</div>
        </div>
        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Fast WR</div>
          <div className="text-lg font-black text-white mt-1">{read.fastWinRate ?? '—'}{read.fastWinRate !== null ? '%' : ''}</div>
        </div>
        <div className="bg-[#0a0e13] border border-gray-800 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Late WR</div>
          <div className="text-lg font-black text-white mt-1">{read.lateWinRate ?? '—'}{read.lateWinRate !== null ? '%' : ''}</div>
        </div>
      </div>
    </div>
  );
}

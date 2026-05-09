import { buildMatchDetailRead } from './advancedIntelligence';

export default function MatchInsightMini({ matches, puuid, matchId }) {
  const read = buildMatchDetailRead(matches, puuid);
  const row = read.rows?.find((item) => item.matchId === matchId);
  if (!row) return null;

  return (
    <div className="mt-3 text-xs text-gray-300 bg-[#0a0e13] border border-gray-800 rounded-lg p-3">
      <span className="text-red-300 font-bold uppercase tracking-wide">Crexus read:</span>{' '}
      {row.read} · impact {row.carryScore}/100 · KP {row.killParticipation}% · objective delta {row.objectiveDelta > 0 ? '+' : ''}{row.objectiveDelta}
    </div>
  );
}

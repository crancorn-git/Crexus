const riskTone = (label) => {
  if (!label) return 'bg-gray-800 text-gray-300 border-gray-700';
  if (['High', 'Strong', 'Cold', 'Negative'].includes(label)) return 'bg-red-500/15 text-red-300 border-red-500/30';
  if (['Medium', 'Possible', 'Stable'].includes(label)) return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  if (['Hot', 'Positive'].includes(label)) return 'bg-green-500/15 text-green-300 border-green-500/30';
  return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
};

const compactScoreTone = (score) => {
  if (score >= 78) return 'text-green-300 border-green-500/40 bg-green-500/10';
  if (score >= 58) return 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10';
  return 'text-red-300 border-red-500/40 bg-red-500/10';
};

export function IntelligencePills({ intelligence, compact = false }) {
  if (!intelligence?.ready) {
    return (
      <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wider">
        <span className="px-2 py-1 rounded border bg-gray-800 text-gray-400 border-gray-700">Insufficient Data</span>
      </div>
    );
  }

  const pills = [
    { label: intelligence.recentForm, title: 'Form' },
    { label: `${intelligence.tiltRisk.label} Tilt`, title: 'Tilt Risk', tone: intelligence.tiltRisk.label },
    { label: `${intelligence.oneTrickRisk.label} OTP`, title: 'One-Trick Risk', tone: intelligence.oneTrickRisk.label }
  ];

  if (intelligence.smurfSignal.score >= 40) {
    pills.splice(2, 0, { label: `${intelligence.smurfSignal.label} Smurf`, title: 'Smurf Signal', tone: intelligence.smurfSignal.label });
  }

  if (intelligence.earlyDeathRisk.score >= 40) {
    pills.push({ label: `${intelligence.earlyDeathRisk.label} Early Death`, title: 'Early Death Risk', tone: intelligence.earlyDeathRisk.label });
  }

  return (
    <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wider">
      <span className={`px-2 py-1 rounded border ${compactScoreTone(intelligence.crexusScore)}`} title="Crexus Score">
        CXS {intelligence.crexusScore}
      </span>
      {!compact && intelligence.mainRole?.role && intelligence.mainRole.role !== 'Unknown' && (
        <span className="px-2 py-1 rounded border bg-purple-500/10 text-purple-300 border-purple-500/30" title="Detected Main Role">
          {intelligence.mainRole.role}
        </span>
      )}
      {pills.slice(0, compact ? 3 : 5).map((pill) => (
        <span key={`${pill.title}-${pill.label}`} className={`px-2 py-1 rounded border ${riskTone(pill.tone || pill.label)}`} title={pill.title}>
          {pill.label}
        </span>
      ))}
    </div>
  );
}

export function IntelligenceMiniRead({ intelligence }) {
  if (!intelligence?.ready) return null;

  const mainTag = intelligence.playstyleTags?.[0];
  const warning = intelligence.tiltRisk.score >= 70
    ? 'High tilt risk'
    : intelligence.smurfSignal.score >= 70
      ? 'Strong smurf signal'
      : intelligence.earlyDeathRisk.score >= 70
        ? 'Early death risk'
        : intelligence.oneTrickRisk.score >= 70
          ? 'One-trick profile'
          : null;

  return (
    <div className="mt-2 text-xs text-gray-400 leading-snug">
      {mainTag && <span className="text-gray-300">{mainTag}</span>}
      {mainTag && warning && <span> · </span>}
      {warning && <span className="text-red-300 font-bold">{warning}</span>}
    </div>
  );
}

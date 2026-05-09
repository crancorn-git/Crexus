function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  );
}

export default function ShareableReportCard({
  player,
  region,
  intelligence,
  displayRank,
  onClose,
  onCopy,
  onPrint,
  shareText
}) {
  if (!player || !intelligence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl crexus-card rounded-3xl border border-red-500/20 p-6 shadow-[0_0_60px_rgba(239,68,68,0.18)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
              <img src="/crexus-logo.png" alt="Crexus" className="h-12 w-12 rounded-xl object-contain" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.25em] text-red-300">Shareable Scout Report</div>
              <h3 className="mt-1 text-2xl font-black text-white">{player.account.gameName}<span className="text-gray-500">#{player.account.tagLine}</span></h3>
              <div className="mt-1 text-sm text-gray-400">Region: {region.toUpperCase()} · {displayRank ? `${displayRank.tier} ${displayRank.rank}` : 'Unranked'}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-gray-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white">Close</button>
        </div>

        <div id="crexus-share-card" className="rounded-[28px] border border-white/8 bg-gradient-to-br from-[#120b0b] via-[#13151c] to-[#0e1116] p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-red-300">Crexus v0.6</div>
              <div className="mt-2 text-3xl font-black text-white">Player Read Snapshot</div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300">{intelligence.summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Crexus Score" value={`${intelligence.crexusScore}/100`} />
              <InfoRow label="Recent Form" value={intelligence.recentForm} />
              <InfoRow label="Tilt Risk" value={intelligence.tiltRisk} />
              <InfoRow label="Smurf Signal" value={intelligence.smurfSignal} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Playstyle Tags</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {intelligence.playstyleTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-red-200">{tag}</span>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/8 bg-white/5 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Key Reads</div>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li>• One-Trick Risk: <span className="font-bold text-white">{intelligence.oneTrickRisk}</span></li>
                <li>• Early Death Risk: <span className="font-bold text-white">{intelligence.earlyDeathRisk}</span></li>
                <li>• Main Role: <span className="font-bold text-white">{intelligence.mainRole}</span></li>
                <li>• Pool Read: <span className="font-bold text-white">{intelligence.championPoolSummary}</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/8 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Share Text Preview</div>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-200">{shareText}</pre>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={onCopy} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_24px_rgba(239,68,68,0.35)] transition hover:bg-red-500">Copy report text</button>
          <button onClick={onPrint} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-gray-200 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white">Open print/share view</button>
          <div className="self-center text-xs text-gray-500">Good for Discord, socials, or a quick scout summary.</div>
        </div>
      </div>
    </div>
  );
}

import { decodeReportPayload } from './reportLinks';

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value || 'Unknown'}</div>
    </div>
  );
}

export default function PublicReport({ encodedReport, onBack }) {
  const report = decodeReportPayload(encodedReport);

  if (!report) {
    return (
      <div className="crexus-page">
        <div className="crexus-card rounded-3xl p-8 text-center">
          <div className="crexus-kicker">Public Report</div>
          <h1 className="crexus-page-title mt-2">Report link could not be opened</h1>
          <p className="crexus-copy mx-auto mt-3 max-w-xl">The shared report data is missing or invalid. Open Crexus and generate a fresh public report link from a player profile.</p>
          <button type="button" onClick={onBack} className="crexus-btn crexus-btn-primary mt-6">Back to Crexus</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200">
      <div className="crexus-page">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/crexus-logo.png" alt="Crexus" className="h-12 w-12 rounded-2xl object-contain shadow-[0_0_28px_rgba(239,68,68,0.24)]" />
            <div>
              <div className="text-xl font-black uppercase tracking-[0.16em] text-white">Crexus</div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">Public Report · v1.0.0</div>
            </div>
          </div>
          <button type="button" onClick={onBack} className="crexus-btn crexus-btn-secondary">Open App</button>
        </div>

        <section className="crexus-card rounded-[32px] border-red-500/15 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="crexus-kicker">Shareable Scout Report</div>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                {report.playerName}<span className="text-gray-500">#{report.tagLine}</span>
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300">{report.summary}</p>
              <div className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-gray-500">{report.region?.toUpperCase()} · {report.rank || 'Unranked'}</div>
            </div>
            <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-center shadow-[0_0_32px_rgba(239,68,68,0.18)]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-200">Crexus Score</div>
              <div className="mt-1 text-6xl font-black text-white">{report.crexusScore}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-red-100/70">out of 100</div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Recent Form" value={report.recentForm} />
            <StatCard label="Main Role" value={report.mainRole} />
            <StatCard label="Tilt Risk" value={report.tiltRisk} />
            <StatCard label="One-Trick Risk" value={report.oneTrickRisk} />
          </div>

          {report.playstyleTags?.length > 0 && (
            <div className="mt-8 rounded-3xl border border-white/8 bg-black/20 p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Playstyle Tags</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.playstyleTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-red-200">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {report.reasons?.length > 0 && (
            <div className="mt-6 rounded-3xl border border-white/8 bg-white/[0.03] p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Key Reads</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                {report.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

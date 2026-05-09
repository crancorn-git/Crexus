import { decodeReportPayload } from './reportLinks';

export default function StreamerMode({ encodedReport, onBack }) {
  const report = decodeReportPayload(encodedReport) || null;

  if (!report) {
    return (
      <div className="crexus-page">
        <div className="crexus-card rounded-3xl p-8 text-center">
          <div className="crexus-kicker">Streamer Mode</div>
          <h1 className="crexus-page-title mt-2">No streamer card selected</h1>
          <p className="crexus-copy mx-auto mt-3 max-w-xl">Generate an OBS-safe streamer card from a loaded player profile or open the Community page for setup notes.</p>
          <button type="button" onClick={onBack} className="crexus-btn crexus-btn-primary mt-6">Back to Crexus</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 text-gray-100">
      <div className="w-[420px] rounded-[30px] border border-red-500/30 bg-[#090a0e]/92 p-5 shadow-[0_0_45px_rgba(239,68,68,0.28)] backdrop-blur">
        <div className="flex items-center gap-3">
          <img src="/crexus-logo.png" alt="Crexus" className="h-11 w-11 rounded-2xl object-contain" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">Crexus Scout Card</div>
            <div className="text-xl font-black text-white">{report.playerName}<span className="text-gray-500">#{report.tagLine}</span></div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-red-200">Score</div>
            <div className="text-3xl font-black text-white">{report.crexusScore}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3 text-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Form</div>
            <div className="mt-1 text-sm font-black text-white">{report.recentForm}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3 text-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Role</div>
            <div className="mt-1 text-sm font-black text-white">{report.mainRole}</div>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-gray-300">{report.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(report.playstyleTags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-200">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

import { BackButton } from './CrexusShell';

export default function CoachLanding({ onBack, onScoutClick }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <BackButton onClick={onBack} />
      <div className="crexus-card mt-5 rounded-[32px] p-6 md:p-8">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">v0.8 Coaching Layer</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Crexus Coach</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">Search a player first, then open the Coach tab on their profile. Crexus will turn their recent games into strengths, weaknesses, role-specific advice, and match review notes.</p>
        <button type="button" onClick={onScoutClick} className="mt-6 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_22px_rgba(239,68,68,0.24)] transition hover:bg-red-500">
          Open Player Search
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          ['Crexus Coach', '3 strengths, 3 weaknesses, recommended focus, champion pool advice, lane phase advice, and objective advice.'],
          ['Role-Specific Coaching', 'Top, Jungle, Mid, ADC, and Support advice changes based on the player role detected from recent games.'],
          ['Match Review Mode', 'Recent matches get post-game style notes: what went well, what hurt the game, key turning point, mistake pattern, and next-game focus.']
        ].map(([title, body]) => (
          <div key={title} className="rounded-[28px] border border-white/10 bg-[#101116] p-5">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-red-300">{title}</div>
            <p className="mt-3 text-sm leading-6 text-gray-400">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

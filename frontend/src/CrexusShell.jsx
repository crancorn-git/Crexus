const navItems = [
  { key: 'profile', label: 'Scout Search', hint: 'Find players' },
  { key: 'dashboard', label: 'Dashboard', hint: 'Saved accounts' },
  { key: 'compare', label: 'Compare', hint: 'Versus tools' },
  { key: 'champions', label: 'Champions', hint: 'Champion reads' },
  { key: 'coach', label: 'Coach', hint: 'Actionable advice' },
  { key: 'lobby', label: 'Lobby Scout', hint: 'Paste lobby' },
  { key: 'leaderboard', label: 'Ladder', hint: 'Top players' },
];

export function BackButton({ onClick, label = 'Back to Scout Search' }) {
  if (!onClick) return null;

  return (
    <button onClick={onClick} className="crexus-back-btn" type="button">
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}

export default function CrexusShell({ activeView, onNavigate, children }) {
  return (
    <div className="min-h-screen text-gray-200 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 bg-[#090a0e]/95 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex items-center gap-3">
          <img src="/crexus-logo.png" alt="Crexus logo" className="h-10 w-10 rounded-xl object-contain shadow-[0_0_22px_rgba(239,68,68,0.18)]" />
          <div className="min-w-0">
            <div className="text-lg font-black uppercase tracking-[0.16em] text-white">Crexus</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">v0.8.0</div>
          </div>
        </div>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Crexus tools">
          {navItems.map((item) => {
            const active = activeView === item.key || (activeView === 'live' && item.key === 'profile');
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`min-w-max rounded-2xl border px-4 py-3 text-left transition lg:min-w-0 ${
                  active
                    ? 'border-red-500/35 bg-red-500/12 text-white shadow-[0_0_22px_rgba(239,68,68,0.16)]'
                    : 'border-white/8 bg-white/[0.03] text-gray-300 hover:border-red-500/25 hover:bg-red-500/8 hover:text-white'
                }`}
              >
                <div className="text-xs font-black uppercase tracking-[0.14em]">{item.label}</div>
                <div className="mt-1 hidden text-[11px] leading-4 text-gray-500 lg:block">{item.hint}</div>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0">
        {children}
      </main>
    </div>
  );
}

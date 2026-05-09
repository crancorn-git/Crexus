import { BackButton } from './CrexusShell';

const commandRows = [
  ['/crexus player Ciaran#EUW', 'Show a public-ready player report.'],
  ['/crexus live Ciaran#EUW', 'Open live scout for a player currently in game.'],
  ['/crexus compare PlayerA#EUW PlayerB#EUW', 'Compare two players side by side.'],
  ['/crexus report PlayerName#TAG', 'Generate a shareable report link.']
];

function FeatureCard({ title, eyebrow, children }) {
  return (
    <div className="crexus-card rounded-3xl p-6">
      <div className="crexus-kicker">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-gray-400">{children}</div>
    </div>
  );
}

export default function CommunityHub({ onBack, onScoutClick }) {
  return (
    <div className="crexus-page">
      <BackButton onClick={onBack} />
      <header className="mt-5 mb-8">
        <div className="crexus-kicker">v1.1.0 · Community & Content</div>
        <h1 className="crexus-page-title mt-2">Share Crexus outside the app</h1>
        <p className="crexus-copy mt-3 max-w-3xl">Public report links, streamer-friendly cards, and Discord command planning are now wired into the product so Crexus is ready for the v1.0 launch pass.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <FeatureCard eyebrow="v1.1.0" title="Public Report Links">
          Generate shareable player reports from a loaded profile. Links encode a clean report snapshot so they can be copied into Discord, socials, or sent directly to someone without needing them to search the player again.
          <button type="button" onClick={onScoutClick} className="crexus-btn crexus-btn-primary mt-5">Open Player Search</button>
        </FeatureCard>

        <FeatureCard eyebrow="v0.9.1" title="Streamer Mode">
          Player profiles can now create a compact OBS-safe scout card URL. It is designed for browser sources, hides unnecessary account detail, and keeps the card readable on stream.
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold uppercase tracking-[0.14em] text-red-100">Generate from a profile share panel</div>
        </FeatureCard>

        <FeatureCard eyebrow="v0.9.2" title="Discord Bot Blueprint">
          The app now includes the command shape for a future Discord bot. The backend also exposes command metadata, which gives the bot implementation a stable contract to build against.
          <div className="mt-5 space-y-2">
            {commandRows.map(([command, description]) => (
              <div key={command} className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <code className="text-red-200">{command}</code>
                <div className="mt-1 text-xs text-gray-500">{description}</div>
              </div>
            ))}
          </div>
        </FeatureCard>
      </div>

      <section className="mt-6 crexus-card rounded-3xl p-6">
        <div className="crexus-kicker">Ready for v1.0</div>
        <h2 className="mt-2 text-2xl font-black text-white">Launch-prep checklist</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {['Public profile reports', 'Match report sharing path', 'OBS-friendly live cards', 'Discord command contract'].map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-sm font-bold text-gray-200">✓ {item}</div>
          ))}
        </div>
      </section>
    </div>
  );
}

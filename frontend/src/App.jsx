import { useState } from 'react';
import PlayerProfile from './PlayerProfile';
import LiveGame from './LiveGame';
import Lobby from './Lobby';
import Leaderboard from './Leaderboard';
import PlayerCompare from './PlayerCompare';
import ChampionInsights from './ChampionInsights';
import AccountDashboard from './AccountDashboard';
import CoachLanding from './CoachLanding';
import CommunityHub from './CommunityHub';
import LaunchReady from './LaunchReady';
import PublicReport from './PublicReport';
import StreamerMode from './StreamerMode';
import BackendStatus from './BackendStatus';
import CrexusShell from './CrexusShell';

function App() {
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('report')) return 'publicReport';
    if (params.get('streamer')) return 'streamer';
    return 'profile';
  }); // profile, live, lobby, leaderboard, compare, champions, dashboard, coach, community, launch
  const [liveData, setLiveData] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null); 

  const handleOpenLive = (puuid, region) => {
    setLiveData({ puuid, region });
    setView('live');
  };

  const openTrackedAccount = (account) => {
    setProfileTarget(account);
    setView('profile');
  };

  const navigate = (target) => {
    if (target === 'profile') setProfileTarget(null);
    setView(target);
  };

  const clearSharedView = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setView('profile');
  };

  if (view === 'publicReport') {
    const params = new URLSearchParams(window.location.search);
    return <PublicReport encodedReport={params.get('report')} onBack={clearSharedView} />;
  }

  if (view === 'streamer') {
    const params = new URLSearchParams(window.location.search);
    return <StreamerMode encodedReport={params.get('streamer')} onBack={clearSharedView} />;
  }

  return (
    <CrexusShell activeView={view} onNavigate={navigate}>
      <BackendStatus />
      {view === 'profile' && (
        <PlayerProfile 
            onLiveClick={handleOpenLive} 
            initialAccount={profileTarget}
        />
      )}

      {view === 'live' && liveData && (
        <LiveGame 
            puuid={liveData.puuid} 
            region={liveData.region} 
            onBack={() => setView('profile')} 
        />
      )}

      {(view === 'lobby' || (view === 'live' && !liveData)) && <Lobby onBack={() => setView('profile')} />}
      
      {/* NEW VIEW */}
      {view === 'leaderboard' && <Leaderboard onBack={() => setView('profile')} />}

      {view === 'compare' && <PlayerCompare onBack={() => setView('profile')} />}

      {view === 'champions' && <ChampionInsights onBack={() => setView('profile')} />}

      {view === 'dashboard' && (
        <AccountDashboard
          onBack={() => setView('profile')}
          onOpenAccount={openTrackedAccount}
          onCompareClick={() => setView('compare')}
        />
      )}

      {view === 'coach' && (
        <CoachLanding
          onBack={() => setView('profile')}
          onScoutClick={() => setView('profile')}
        />
      )}

      {view === 'community' && (
        <CommunityHub
          onBack={() => setView('profile')}
          onScoutClick={() => setView('profile')}
        />
      )}

      {view === 'launch' && (
        <LaunchReady onBack={() => setView('profile')} />
      )}
    </CrexusShell>
  );
}

export default App;
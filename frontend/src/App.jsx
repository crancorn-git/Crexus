import { useState } from 'react';
import PlayerProfile from './PlayerProfile';
import LiveGame from './LiveGame';
import Lobby from './Lobby';
import Leaderboard from './Leaderboard';
import PlayerCompare from './PlayerCompare';
import ChampionInsights from './ChampionInsights';
import AccountDashboard from './AccountDashboard';
import BackendStatus from './BackendStatus';
import CrexusShell from './CrexusShell';

function App() {
  const [view, setView] = useState('profile'); // profile, live, lobby, leaderboard, compare, champions, dashboard
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

  return (
    <CrexusShell activeView={view} onNavigate={navigate}>
      <BackendStatus />
      {view === 'profile' && (
        <PlayerProfile 
            onLiveClick={handleOpenLive} 
            onLobbyClick={() => setView('lobby')}
            onLeaderboardClick={() => setView('leaderboard')}
            onCompareClick={() => setView('compare')}
            onChampionsClick={() => setView('champions')}
            onDashboardClick={() => setView('dashboard')}
            initialAccount={profileTarget}
        />
      )}

      {view === 'live' && (
        <LiveGame 
            puuid={liveData.puuid} 
            region={liveData.region} 
            onBack={() => setView('profile')} 
        />
      )}

      {view === 'lobby' && <Lobby onBack={() => setView('profile')} />}
      
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
    </CrexusShell>
  );
}

export default App;
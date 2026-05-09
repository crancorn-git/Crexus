import { useState } from 'react';
import PlayerProfile from './PlayerProfile';
import LiveGame from './LiveGame';
import Lobby from './Lobby';
import Leaderboard from './Leaderboard';
import BackendStatus from './BackendStatus';

function App() {
  const [view, setView] = useState('profile'); // profile, live, lobby, leaderboard
  const [liveData, setLiveData] = useState(null); 

  const handleOpenLive = (puuid, region) => {
    setLiveData({ puuid, region });
    setView('live');
  };

  return (
    <div>
      <BackendStatus />
      {view === 'profile' && (
        <PlayerProfile 
            onLiveClick={handleOpenLive} 
            onLobbyClick={() => setView('lobby')}
            onLeaderboardClick={() => setView('leaderboard')} // <-- Pass new prop
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
    </div>
  );
}

export default App;
import { useState } from 'react';
import PlayerProfile from './PlayerProfile';
import LiveGame from './LiveGame';
import Lobby from './Lobby'; // Import the new component

function App() {
  const [view, setView] = useState('profile'); // 'profile', 'live', 'lobby'
  const [liveData, setLiveData] = useState(null); 

  // Function to switch to Live Game view
  const handleOpenLive = (puuid, region) => {
    setLiveData({ puuid, region });
    setView('live');
  };

  return (
    <div>
      {/* 1. PROFILE VIEW */}
      {view === 'profile' && (
        <PlayerProfile 
            onLiveClick={handleOpenLive} 
            onLobbyClick={() => setView('lobby')} // Pass the switch function down
        />
      )}

      {/* 2. LIVE GAME VIEW */}
      {view === 'live' && (
        <LiveGame 
            puuid={liveData.puuid} 
            region={liveData.region} 
            onBack={() => setView('profile')} 
        />
      )}

      {/* 3. LOBBY SCOUT VIEW */}
      {view === 'lobby' && (
        <Lobby onBack={() => setView('profile')} />
      )}
    </div>
  );
}

export default App;
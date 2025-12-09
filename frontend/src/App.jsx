import { useState } from 'react';
import PlayerProfile from './PlayerProfile';
import LiveGame from './LiveGame';

function App() {
  const [view, setView] = useState('profile'); // 'profile' or 'live'
  const [liveData, setLiveData] = useState(null); // Store { puuid, region } to pass to LiveGame

  // Function to switch to Live Game view
  const handleOpenLive = (puuid, region) => {
    setLiveData({ puuid, region });
    setView('live');
  };

  return (
    <div>
      {/* If view is 'profile', show Profile and pass the 'openLive' function */}
      {view === 'profile' && (
        <PlayerProfile onLiveClick={handleOpenLive} />
      )}

      {/* If view is 'live', show LiveGame component */}
      {view === 'live' && (
        <LiveGame 
            puuid={liveData.puuid} 
            region={liveData.region} 
            onBack={() => setView('profile')} 
        />
      )}
    </div>
  );
}

export default App;
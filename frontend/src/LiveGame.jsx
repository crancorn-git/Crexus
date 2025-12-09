import { useState, useEffect } from 'react';
import axios from 'axios';

const DDRAGON_IMG = "https://ddragon.leagueoflegends.com/cdn/14.3.1/img";

export default function LiveGame({ puuid, region, onBack }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spells, setSpells] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Spells for icons
        const spellsRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/14.3.1/data/en_US/summoner.json`);
        setSpells(spellsRes.data.data);

        // 2. Fetch Live Game
        const res = await axios.get(`https://crexus-backend.vercel.app/api/live/${puuid}?region=${region}`);
        setGame(res.data);
      } catch (err) {
        setError(err.response?.status === 404 ? "Player is not in a game right now." : "Failed to load live game.");
      }
      setLoading(false);
    };
    fetchData();
  }, [puuid, region]);

  const getSpellIcon = (spellId) => {
    const spell = Object.values(spells).find(s => s.key == spellId);
    return spell ? spell.image.full : null;
  };

  if (loading) return <div className="text-center text-blue-400 animate-pulse mt-10">Scouting Live Game...</div>;
  if (error) return (
    <div className="text-center mt-10">
      <div className="text-red-500 text-xl font-bold mb-4">{error}</div>
      <button onClick={onBack} className="bg-gray-700 px-4 py-2 rounded text-white hover:bg-gray-600">Go Back</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 animate-in fade-in zoom-in duration-300">
      <button onClick={onBack} className="mb-6 text-gray-400 hover:text-white flex items-center gap-2">
        ← Back to Profile
      </button>

      <div className="flex justify-between items-end mb-6 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-black text-white">LIVE GAME</h1>
        <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold animate-pulse">
            {game.gameMode} ({Math.floor(game.gameLength / 60)}m)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Blue Team (100) */}
        <TeamList teamId={100} participants={game.participants} color="blue" spells={spells} getSpellIcon={getSpellIcon} />
        
        {/* Red Team (200) */}
        <TeamList teamId={200} participants={game.participants} color="red" spells={spells} getSpellIcon={getSpellIcon} />
      </div>
    </div>
  );
}

// Sub-component for a Team List
function TeamList({ teamId, participants, color, getSpellIcon }) {
  const team = participants.filter(p => p.teamId === teamId);
  const borderColor = color === 'blue' ? 'border-blue-500' : 'border-red-500';
  const textColor = color === 'blue' ? 'text-blue-400' : 'text-red-400';

  return (
    <div className="space-y-2">
      <h2 className={`text-xl font-bold ${textColor} mb-4 uppercase tracking-wider`}>
        {color === 'blue' ? 'Blue Team' : 'Red Team'}
      </h2>
      {team.map((p) => (
        <div key={p.puuid} className={`bg-[#161d23] p-3 rounded-lg border-l-4 ${borderColor} flex items-center gap-3 shadow-lg`}>
          
          {/* Champion Icon */}
          <div className="relative">
             {/* Note: Spectator API gives championId (number), not Name. 
                 Real apps fetch champion.json to map ID->Name. 
                 For now, we use a placeholder or assume you'd add that mapping logic. 
                 Since mapping 160 IDs is long, we'll use a generic placeholder if map is missing. */}
             <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">
                Champ {p.championId}
             </div>
          </div>

          {/* Spells */}
          <div className="flex flex-col gap-1">
             <img src={`${DDRAGON_IMG}/spell/${getSpellIcon(p.spell1Id)}`} className="w-5 h-5 rounded" />
             <img src={`${DDRAGON_IMG}/spell/${getSpellIcon(p.spell2Id)}`} className="w-5 h-5 rounded" />
          </div>

          {/* Name */}
          <div className="flex-1 overflow-hidden">
            <div className="text-white font-bold truncate">{p.riotId}</div>
            <div className="text-gray-500 text-xs">Level ?</div> 
          </div>

          {/* Perks (Runes) */}
           <div className="flex gap-1">
               {/* Just showing main rune ID for now */}
               <div className="text-xs text-gray-600 bg-black px-1 rounded">{p.perks.perkIds[0]}</div>
           </div>
        </div>
      ))}
    </div>
  );
}
import { useState, useEffect } from 'react';
import axios from 'axios';

const VERSION = "14.3.1";
const DDRAGON_IMG = `https://ddragon.leagueoflegends.com/cdn/${VERSION}/img`;

// Use your smart API_BASE logic
const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://crexusback.vercel.app";

export default function LiveGame({ puuid, region, onBack }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spells, setSpells] = useState({});
  const [champs, setChamps] = useState({}); // New: To map Ban IDs to Images

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Spells
        const spellsRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/en_US/summoner.json`);
        setSpells(spellsRes.data.data);

        // 2. Fetch Champions (For Bans)
        const champRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/en_US/champion.json`);
        const champMap = {};
        Object.values(champRes.data.data).forEach(c => champMap[c.key] = c.id);
        setChamps(champMap);

        // 3. Fetch Live Game
        const res = await axios.get(`${API_BASE}/api/live/${puuid}?region=${region}`);
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

  const getChampId = (key) => champs[key] || "Aatrox"; // Default fallback

  if (loading) return <div className="text-center text-blue-400 animate-pulse mt-10 text-2xl font-bold">SCOUTING RIFT...</div>;
  if (error) return (
    <div className="text-center mt-20">
      <div className="text-red-500 text-3xl font-black mb-6">{error}</div>
      <button onClick={onBack} className="bg-gray-800 px-6 py-3 rounded-lg text-white hover:bg-gray-700 font-bold border border-gray-600">
        ← RETURN TO BASE
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in zoom-in duration-300">
      <button onClick={onBack} className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 font-bold transition">
        ← Back to Profile
      </button>

      {/* HEADER WITH BANS */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter">LIVE GAME</h1>
            <div className="flex items-center gap-3 mt-2">
                <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold animate-pulse shadow-[0_0_10px_red]">
                    {game.gameMode}
                </span>
                <span className="text-gray-500 text-sm font-mono">
                    {Math.floor(game.gameLength / 60)}:{(game.gameLength % 60).toString().padStart(2, '0')}
                </span>
            </div>
        </div>

        {/* BANS DISPLAY */}
        <div className="flex gap-8">
            <BanList teamId={100} bans={game.bannedChampions} champs={champs} color="blue" />
            <BanList teamId={200} bans={game.bannedChampions} champs={champs} color="red" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <TeamList teamId={100} participants={game.participants} color="blue" spells={spells} getSpellIcon={getSpellIcon} champs={champs} />
        <TeamList teamId={200} participants={game.participants} color="red" spells={spells} getSpellIcon={getSpellIcon} champs={champs} />
      </div>
    </div>
  );
}

// Sub-component for Bans
function BanList({ teamId, bans, champs, color }) {
    const teamBans = bans.filter(b => b.teamId === teamId);
    const borderColor = color === 'blue' ? 'border-blue-500' : 'border-red-500';

    return (
        <div className="flex flex-col items-center">
            <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>
                {color} Bans
            </span>
            <div className="flex gap-1">
                {teamBans.map(ban => (
                    <div key={ban.pickTurn} className={`w-8 h-8 rounded border ${borderColor} overflow-hidden bg-black`}>
                        {/* Ban ID -1 means no ban */}
                        {ban.championId !== -1 && (
                            <img 
                                src={`${DDRAGON_IMG}/champion/${champs[ban.championId]}.png`} 
                                className="w-full h-full grayscale opacity-70" 
                                alt="Ban"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TeamList({ teamId, participants, color, getSpellIcon, champs }) {
  const team = participants.filter(p => p.teamId === teamId);
  const borderColor = color === 'blue' ? 'border-blue-500' : 'border-red-500';
  const textColor = color === 'blue' ? 'text-blue-400' : 'text-red-400';

  return (
    <div className="space-y-3">
      <h2 className={`text-2xl font-black ${textColor} mb-4 uppercase tracking-wider border-b border-gray-800 pb-2`}>
        {color === 'blue' ? 'Blue Team' : 'Red Team'}
      </h2>
      {team.map((p) => (
        <div key={p.puuid} className={`bg-[#161d23] p-3 rounded-lg border-l-4 ${borderColor} flex items-center gap-4 shadow-lg transition hover:bg-[#1e252d]`}>
          
          <div className="relative">
             <div className="w-14 h-14 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                <img 
                    src={`${DDRAGON_IMG}/champion/${champs[p.championId]}.png`} 
                    className="w-full h-full object-cover scale-110" 
                />
             </div>
             {/* Small Spell Icons overlaying the champ image */}
             <div className="absolute -bottom-2 -right-2 flex">
                <img src={`${DDRAGON_IMG}/spell/${getSpellIcon(p.spell1Id)}`} className="w-5 h-5 rounded border border-black" />
                <img src={`${DDRAGON_IMG}/spell/${getSpellIcon(p.spell2Id)}`} className="w-5 h-5 rounded border border-black" />
             </div>
          </div>

          <div className="flex-1 overflow-hidden pl-2">
            <div className="text-white font-bold text-lg truncate flex items-center gap-2">
                {p.riotId}
            </div>
            
            <div className="flex gap-1 mt-1">
                {p.tags && p.tags.map(tag => (
                    <span key={tag} className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider ${tag === 'SMURF' ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-blue-900 text-blue-100'}`}>
                        {tag}
                    </span>
                ))}
            </div>
          </div>

          <div className="text-right">
               <div className="text-lg font-bold text-gray-200">{p.rank || "Unranked"}</div>
               {/* Main Rune */}
               <div className="text-xs text-gray-500 mt-1">
                    {p.perks?.perkIds && (
                       <span className="bg-[#0a0e13] px-2 py-1 rounded text-gray-400 border border-gray-700">Rune: {p.perks.perkIds[0]}</span>
                    )}
               </div>
          </div>
        </div>
      ))}
    </div>
  );
}
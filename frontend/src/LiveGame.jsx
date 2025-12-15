import { useState, useEffect } from 'react';
import axios from 'axios';
import { getMatchupTip } from './MatchupTips'; // Import your tips

const VERSION = "14.3.1";
const DDRAGON_IMG = `https://ddragon.leagueoflegends.com/cdn/${VERSION}/img`;

const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://crexusback.vercel.app";

export default function LiveGame({ puuid, region, onBack }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spells, setSpells] = useState({});
  const [champs, setChamps] = useState({});
  const [userChampName, setUserChampName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const spellsRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/en_US/summoner.json`);
        setSpells(spellsRes.data.data);

        // Fetch Champs to map IDs -> Names (Needed for Tips)
        const champRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/en_US/champion.json`);
        const champMap = {};
        const idToNameMap = {};
        Object.values(champRes.data.data).forEach(c => {
            champMap[c.key] = c.id; 
            idToNameMap[c.key] = c.name; // ID "266" -> "Aatrox"
        });
        setChamps(champMap);

        const res = await axios.get(`${API_BASE}/api/live/${puuid}?region=${region}`);
        setGame(res.data);

        // Find USER Champion Name for Tips
        const me = res.data.participants.find(p => p.puuid === puuid);
        if (me) setUserChampName(idToNameMap[me.championId]);

      } catch (err) {
        setError(err.response?.status === 404 ? "Player is not in a game." : "Failed to load live game.");
      }
      setLoading(false);
    };
    fetchData();
  }, [puuid, region]);

  const getSpellIcon = (spellId) => {
    const spell = Object.values(spells).find(s => s.key == spellId);
    return spell ? spell.image.full : null;
  };

  // --- RENDER ---
  if (loading) return <div className="text-center text-blue-400 animate-pulse mt-20 text-2xl font-bold">SCOUTING RIFT...</div>;
  if (error) return <div className="text-center mt-20 text-red-500 font-bold text-xl">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in zoom-in duration-300">
      <button onClick={onBack} className="mb-6 text-gray-400 hover:text-white flex items-center gap-2">← Back</button>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-800 pb-6">
        <div>
            <h1 className="text-4xl font-black text-white italic">LIVE GAME</h1>
            <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold animate-pulse">{game.gameMode}</span>
        </div>
      </div>

      {/* MATCHUP TIPS SECTION */}
      <MatchupTipsBox participants={game.participants} userChamp={userChampName} champs={champs} />

      {/* TEAMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <TeamList teamId={100} participants={game.participants} color="blue" spells={spells} getSpellIcon={getSpellIcon} champs={champs} />
        <TeamList teamId={200} participants={game.participants} color="red" spells={spells} getSpellIcon={getSpellIcon} champs={champs} />
      </div>
    </div>
  );
}

// NEW: Component to find and display the Tip
function MatchupTipsBox({ participants, userChamp, champs }) {
    if (!userChamp) return null;

    // Find likely opponent (Same position isn't always available in API, so we check for 'likely' matchups manually or just display general tips)
    // For now, let's look for a specific enemy that matches our Tip Database keys
    const enemies = participants.filter(p => p.teamId !== participants.find(u => u.championId.toString() === Object.keys(champs).find(k => champs[k] === userChamp))?.teamId);
    
    let activeTip = null;
    let enemyChampName = "";

    // Check all enemies to see if we have a tip for UserChamp vs EnemyChamp
    enemies.forEach(e => {
        const eName = Object.keys(champs).find(k => champs[k] === e.championId.toString()) ? champs[e.championId.toString()] : ""; // Map ID to Name
        // Note: Our champ map in parent was Key->ID. We need Name. 
        // Simpler: Just rely on the hardcoded Tip Keys
        // Let's assume champs[id] returns "Aatrox" (The ID string from DDragon)
        const tip = getMatchupTip(userChamp, champs[e.championId]);
        if (tip) {
            activeTip = tip;
            enemyChampName = champs[e.championId];
        }
    });

    if (!activeTip) return null;

    return (
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-4 rounded-xl mb-8 flex items-start gap-4">
            <div className="text-2xl">💡</div>
            <div>
                <h3 className="text-blue-300 font-bold text-sm uppercase tracking-widest mb-1">Matchup Tip: vs {enemyChampName}</h3>
                <p className="text-white font-medium">{activeTip}</p>
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
      <h2 className={`text-2xl font-black ${textColor} mb-4 uppercase tracking-wider`}>{color === 'blue' ? 'Blue Team' : 'Red Team'}</h2>
      {team.map((p) => (
        <div key={p.puuid} className={`bg-[#161d23] p-3 rounded-lg border-l-4 ${borderColor} flex items-center gap-4 shadow-lg`}>
          <div className="relative">
             <img src={`${DDRAGON_IMG}/champion/${champs[p.championId]}.png`} className="w-14 h-14 rounded-lg border border-gray-600" />
             <div className="absolute -bottom-2 -right-2 flex">
                <img src={`${DDRAGON_IMG}/spell/${getSpellIcon(p.spell1Id)}`} className="w-5 h-5 rounded border border-black" />
                <img src={`${DDRAGON_IMG}/spell/${getSpellIcon(p.spell2Id)}`} className="w-5 h-5 rounded border border-black" />
             </div>
          </div>

          <div className="flex-1 pl-2">
            <div className="text-white font-bold text-lg truncate">{p.riotId}</div>
            
            {/* NEW: DANGER TAGS */}
            <div className="flex gap-1 mt-1 flex-wrap">
                {p.tags && p.tags.map(tag => {
                    let colorClass = "bg-gray-700 text-gray-300";
                    if (tag === "SMURF") colorClass = "bg-blue-600 text-white";
                    if (tag === "GOD" || tag === "OTP") colorClass = "bg-yellow-600 text-black";
                    if (tag === "TILTED") colorClass = "bg-red-600 text-white animate-pulse";
                    if (tag === "NEW") colorClass = "bg-green-600 text-white";

                    return (
                        <span key={tag} className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider ${colorClass}`}>
                            {tag}
                        </span>
                    );
                })}
            </div>
          </div>

          <div className="text-right">
               <div className="text-lg font-bold text-gray-200">{p.rank || "Unranked"}</div>
               {p.mastery > 0 && <div className="text-xs text-gray-500 font-mono">{(p.mastery / 1000).toFixed(0)}k pts</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
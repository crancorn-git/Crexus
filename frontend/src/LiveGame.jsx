import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { useDDragonVersion } from './ddragon';
import { getMatchupTip } from './MatchupTips'; // Import your tips
import { analyzePlayerIntelligence } from './intelligence';
import { IntelligencePills, IntelligenceMiniRead } from './IntelligencePills';
import { LiveTeamComparison } from './ScoutTeamRead';
import { EnemyMatchupRead, DuoSynergyRead } from './LiveVersusTools';



import { BackButton } from './CrexusShell';
export default function LiveGame({ puuid, region, onBack }) {
  const ddragonVersion = useDDragonVersion();
  const ddragonImg = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img`;

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spells, setSpells] = useState({});
  const [champs, setChamps] = useState({});
  const [champNames, setChampNames] = useState({});
  const [userChampName, setUserChampName] = useState("");
  const [scoutStatus, setScoutStatus] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const spellsRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/summoner.json`);
        setSpells(spellsRes.data.data);

        // Fetch Champs to map IDs -> Names (Needed for Tips)
        const champRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`);
        const champMap = {};
        const idToNameMap = {};
        Object.values(champRes.data.data).forEach(c => {
            champMap[c.key] = c.id; 
            idToNameMap[c.key] = c.name; // ID "266" -> "Aatrox"
        });
        setChamps(champMap);
        setChampNames(idToNameMap);

        const res = await axios.get(`${API_BASE}/api/live/${puuid}?region=${region}`);
        setScoutStatus("Building player tags...");

        const enrichedParticipants = await Promise.all(res.data.participants.map(async (participant) => {
          try {
            const matchRes = await axios.get(`${API_BASE}/api/matches/${participant.puuid}?region=${region}`);
            const playerData = {
              summoner: { summonerLevel: participant.summonerLevel || null },
              ranks: participant.ranks || [],
              mastery: participant.mastery ? [{ championPoints: participant.mastery }] : []
            };
            const recentMatches = matchRes.data || [];
            const intelligence = analyzePlayerIntelligence({ matches: recentMatches, playerData });
            return { ...participant, intelligence, recentMatches };
          } catch {
            return { ...participant, intelligence: null };
          }
        }));

        const enrichedGame = { ...res.data, participants: enrichedParticipants };
        setGame(enrichedGame);
        setScoutStatus("");

        // Find USER Champion Name for Tips
        const me = enrichedGame.participants.find(p => p.puuid === puuid);
        if (me) setUserChampName(idToNameMap[me.championId]);

      } catch (err) {
        setError(err.response?.status === 404 ? "Player is not in a game." : "Failed to load live game.");
      }
      setLoading(false);
    };
    fetchData();
  }, [puuid, region, ddragonVersion]);

  const getSpellIcon = (spellId) => {
    const spell = Object.values(spells).find(s => s.key == spellId);
    return spell ? spell.image.full : null;
  };

  // --- RENDER ---
  if (loading) return <div className="text-center text-red-300 animate-pulse mt-20 text-2xl font-bold">CHECKING LIVE GAME...{scoutStatus && <div className="text-sm text-gray-400 mt-2">{scoutStatus}</div>}</div>;
  if (error) return <div className="text-center mt-20 text-red-500 font-bold text-xl">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 animate-in fade-in zoom-in duration-300">
      <BackButton onClick={onBack} />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-800 pb-6">
        <div>
            <h1 className="text-4xl font-black text-white italic">LIVE GAME</h1>
            <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold animate-pulse">{game.gameMode}</span>
        </div>
      </div>

      {/* MATCHUP TIPS SECTION */}
      <MatchupTipsBox participants={game.participants} userPuuid={puuid} userChamp={userChampName} champs={champs} champNames={champNames} ddragonImg={ddragonImg} />

      <LiveTeamComparison participants={game.participants} />

      <EnemyMatchupRead participants={game.participants} />
      <DuoSynergyRead participants={game.participants} />

      {/* TEAMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <TeamList teamId={100} participants={game.participants} color="blue" getSpellIcon={getSpellIcon} champs={champs} ddragonImg={ddragonImg} />
        <TeamList teamId={200} participants={game.participants} color="red" getSpellIcon={getSpellIcon} champs={champs} ddragonImg={ddragonImg} />
      </div>
    </div>
  );
}

// NEW: Component to find and display the Tip
function MatchupTipsBox({ participants, userPuuid, userChamp, champNames }) {
    if (!userChamp || !userPuuid) return null;

    const me = participants.find((p) => p.puuid === userPuuid);
    if (!me) return null;

    const enemies = participants.filter((p) => p.teamId !== me.teamId);
    const tipRead = enemies
      .map((enemy) => {
        const enemyChampName = champNames[enemy.championId] || '';
        const tip = getMatchupTip(userChamp, enemyChampName);
        return tip ? { enemyChampName, tip } : null;
      })
      .find(Boolean);

    if (!tipRead) return null;

    return (
        <div className="mb-8 flex items-start gap-4 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/40 to-[#181b22] p-4">
            <div className="text-2xl">◆</div>
            <div>
                <h3 className="mb-1 text-sm font-black uppercase tracking-widest text-red-200">Matchup Tip: {userChamp} vs {tipRead.enemyChampName}</h3>
                <p className="font-medium text-white">{tipRead.tip}</p>
            </div>
        </div>
    );
}

function TeamList({ teamId, participants, color, getSpellIcon, champs, ddragonImg }) {
  const team = participants.filter(p => p.teamId === teamId);
  const borderColor = color === 'blue' ? 'border-red-500' : 'border-red-500';
  const textColor = color === 'blue' ? 'text-red-300' : 'text-red-400';

  return (
    <div className="space-y-3">
      <h2 className={`text-2xl font-black ${textColor} mb-4 uppercase tracking-wider`}>{color === 'blue' ? 'Blue Team' : 'Red Team'}</h2>
      {team.map((p) => (
        <div key={p.puuid} className={`bg-[#161d23] p-3 rounded-lg border-l-4 ${borderColor} flex items-center gap-4 shadow-lg`}>
          <div className="relative">
             <img src={`${ddragonImg}/champion/${champs[p.championId]}.png`} className="w-14 h-14 rounded-lg border border-gray-600" />
             <div className="absolute -bottom-2 -right-2 flex">
                <img src={`${ddragonImg}/spell/${getSpellIcon(p.spell1Id)}`} className="w-5 h-5 rounded border border-black" />
                <img src={`${ddragonImg}/spell/${getSpellIcon(p.spell2Id)}`} className="w-5 h-5 rounded border border-black" />
             </div>
          </div>

          <div className="flex-1 pl-2 min-w-0">
            <div className="text-white font-bold text-lg truncate">{p.riotId}</div>
            <div className="mt-2">
              <IntelligencePills intelligence={p.intelligence} compact />
              <IntelligenceMiniRead intelligence={p.intelligence} />
            </div>
            
            <div className="flex gap-1 mt-2 flex-wrap">
                {p.tags && p.tags.map(tag => {
                    let colorClass = "bg-gray-700 text-gray-300";
                    if (tag === "SMURF") colorClass = "bg-red-600 text-white";
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

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const VERSION = "14.3.1"; 
const DDRAGON_BASE = `https://ddragon.leagueoflegends.com/cdn/${VERSION}`;
const DDRAGON_IMG = `https://ddragon.leagueoflegends.com/cdn/img`;

// UPDATE 1: Added onLobbyClick to props
export default function PlayerProfile({ onLiveClick, onLobbyClick }) {
  const [input, setInput] = useState("Faker#KR1"); 
  const [region, setRegion] = useState("kr"); 
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  // Static Data
  const [queues, setQueues] = useState({});
  const [runes, setRunes] = useState([]);
  const [spells, setSpells] = useState({});
  const [champs, setChamps] = useState({}); 

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const runesRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/en_US/runesReforged.json`);
        setRunes(runesRes.data);

        const spellsRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/en_US/summoner.json`);
        setSpells(spellsRes.data.data);

        const queuesRes = await axios.get("https://static.developer.riotgames.com/docs/lol/queues.json");
        const queueMap = {};
        queuesRes.data.forEach(q => queueMap[q.queueId] = q.description);
        setQueues(queueMap);

        const champRes = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${VERSION}/data/en_US/champion.json`);
        const champMap = {};
        Object.values(champRes.data.data).forEach(c => champMap[c.key] = c.id);
        setChamps(champMap);
      } catch (err) {
        console.error("Failed to load static assets:", err);
      }
    };
    const saved = JSON.parse(localStorage.getItem('crexus_recents') || '[]');
    setRecentSearches(saved);
    fetchStaticData();
  }, []);

  // --- HELPERS ---
  const getRuneIcon = (styleId, runeId) => {
    const style = runes.find(r => r.id === styleId);
    if (!style) return null;
    if (runeId) {
      const keystone = style.slots[0].runes.find(r => r.id === runeId);
      return keystone ? keystone.icon : null;
    } 
    return style.icon;
  };

  const getSpellIcon = (spellKey) => {
    const spellName = Object.keys(spells).find(name => spells[name].key == spellKey);
    return spellName ? spells[spellName].image.full : null;
  };

  const formatPoints = (points) => {
    if (points > 1000000) return (points / 1000000).toFixed(1) + "M";
    if (points > 1000) return (points / 1000).toFixed(0) + "k";
    return points;
  };

  const toggleMatch = (matchId) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };

  const addToHistory = (name, tag, region, iconId) => {
      const newEntry = { name, tag, region, iconId };
      const updated = [newEntry, ...recentSearches.filter(i => i.name !== name)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('crexus_recents', JSON.stringify(updated));
  };

  // --- NEW: SMART RANK SELECTOR ---
  const getBestRank = (ranks) => {
    if (!ranks || ranks.length === 0) return null;
    const solo = ranks.find(r => r.queueType === "RANKED_SOLO_5x5");
    const flex = ranks.find(r => r.queueType === "RANKED_FLEX_SR");
    const arena = ranks.find(r => r.queueType === "CHERRY");
    return solo || flex || arena || ranks[0];
  };

  const formatQueueType = (type) => {
    if (type === "RANKED_SOLO_5x5") return "Ranked Solo";
    if (type === "RANKED_FLEX_SR") return "Ranked Flex";
    if (type === "CHERRY") return "Arena";
    return type.replace(/_/g, " ");
  };

  const searchPlayer = async () => {
    setLoading(true);
    setExpandedMatch(null); 
    const [name, tag] = input.split("#").map(s => s?.trim());
    
    if (!name || !tag) { 
        alert("Please use Name#Tag format!");
        setLoading(false);
        return;
    }

    try {
      const playerRes = await axios.get(`https://crexusback.vercel.app/api/player/${name}/${tag}?region=${region}`);
      setData(playerRes.data);
      addToHistory(playerRes.data.account.gameName, playerRes.data.account.tagLine, region, playerRes.data.summoner.profileIconId);
      

      if (playerRes.data.account.puuid) {
        const matchRes = await axios.get(`https://crexusback.vercel.app/api/matches/${playerRes.data.account.puuid}?region=${region}`);
        setMatches(matchRes.data);
      }
    } catch (err) {
      console.error(err);
      alert("Player not found (check region or spelling)");
    }
    setLoading(false);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1c2329] border border-gray-600 p-2 rounded shadow-xl text-xs">
          <p className="font-bold text-white mb-1">{payload[0].payload.name}</p>
          <p className="text-gray-300">Damage: <span className="text-yellow-400 font-mono">{payload[0].value.toLocaleString()}</span></p>
        </div>
      );
    }
    return null;
  };

  const displayRank = data ? getBestRank(data.ranks) : null;
  const copyLink = () => {
    const url = `${window.location.origin}?s=${input}&r=${region}`;
    // Since we don't have URL routing set up yet, we'll just copy the text for now
    // Or simpler: Just copy the player name
    navigator.clipboard.writeText(`${input} (${region})`);
    alert("Player Name copied to clipboard!");
};
  return (
    <div className="min-h-screen bg-[#0a0e13] text-gray-200 font-sans p-8">
      {/* NAVBAR */}
      <div className="flex gap-4 mb-12 max-w-3xl mx-auto bg-[#161d23] p-2 rounded-xl shadow-2xl border border-gray-800">
        <select 
          value={region} 
          onChange={(e) => setRegion(e.target.value)}
          className="bg-[#0a0e13] border-r border-gray-700 p-4 rounded-l-lg text-white font-bold focus:outline-none cursor-pointer hover:bg-gray-900 transition"
        >
          <option value="na1">NA</option>
          <option value="kr">KR</option>
          <option value="euw1">EUW</option>
          <option value="br1">BR</option>
        </select>
        <input 
          className="w-full bg-transparent p-4 text-white focus:outline-none text-lg placeholder-gray-500"
          placeholder="GameName #Tag"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchPlayer()}
        />
        
        {/* EXISTING SEARCH BUTTON */}
        <button onClick={searchPlayer} className="bg-red-600 hover:bg-red-700 text-white px-8 rounded-lg font-bold transition shadow-[0_0_15px_rgba(220,38,38,0.5)]">
          SCOUT
        </button>

        {/* UPDATE 2: NEW LOBBY BUTTON */}
        <button 
            onClick={onLobbyClick} 
            className="bg-[#1f2933] hover:bg-gray-700 text-gray-300 px-4 rounded-lg font-bold transition border border-gray-700 whitespace-nowrap"
            title="Multi-Search"
        >
            📋 LOBBY
        </button>
      </div>

      {loading && <div className="text-center text-xl text-red-500 animate-pulse font-mono tracking-widest">SCOUTING RIFT...</div>}
      
      {!data && !loading && (
        <div className="max-w-2xl mx-auto mt-10">
            <h3 className="text-gray-500 font-bold mb-4 uppercase tracking-widest text-sm">Recent Scouts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentSearches.map((item, idx) => (
                    <div key={idx} 
                        onClick={() => { setInput(`${item.name}#${item.tag}`); setRegion(item.region); searchPlayer(); }}
                        className="bg-[#161d23] p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-[#1f2933] border border-gray-800 transition"
                    >
                        <img src={`${DDRAGON_BASE}/img/profileicon/${item.iconId}.png`} className="w-10 h-10 rounded-full" />
                        <div>
                            <div className="text-white font-bold">{item.name} <span className="text-gray-500">#{item.tag}</span></div>
                            <div className="text-xs text-gray-500 uppercase">{item.region}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {data && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT COL: PROFILE */}
          <div className="bg-[#161d23] p-8 rounded-2xl shadow-xl text-center h-fit border border-gray-800 sticky top-8 z-10">
            <div className="relative inline-block group">
                <img 
                  src={`${DDRAGON_BASE}/img/profileicon/${data.summoner.profileIconId}.png`} 
                  className="w-32 h-32 rounded-3xl mx-auto border-4 border-[#1c2329] shadow-lg group-hover:border-red-500 transition duration-300"
                />
                <span className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#202830] text-sm px-3 py-1 rounded-full border border-gray-700 font-bold shadow">
                    Level {data.summoner.summonerLevel}
                </span>
            </div>
            
            <h1 className="text-3xl font-black text-white mt-6 tracking-tight">
              {data.account.gameName}
              <span className="text-gray-500 font-medium text-xl ml-1">#{data.account.tagLine}</span>
            </h1>

            <button 
                onClick={() => onLiveClick(data.account.puuid, region)}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/30 transition border border-blue-500/50 flex items-center justify-center gap-2 group"
            >
                LIVE SCOUT
            </button>
            {/* SHARE BUTTON */}
<button 
    onClick={copyLink}
    className="mt-2 w-full bg-[#1f2933] hover:bg-gray-700 text-gray-400 font-bold py-2 rounded-lg transition border border-gray-700 text-sm flex items-center justify-center gap-2"
>
    <span>🔗</span> SHARE PROFILE
</button>
            
            {/* RANK CARD */}
            {displayRank ? (
              <div className="mt-8 bg-[#0a0e13] p-6 rounded-xl border border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">
                    {formatQueueType(displayRank.queueType)}
                </div>
                <p className="text-2xl font-black text-gray-100 tracking-wider">
                    {displayRank.tier} {displayRank.rank}
                </p>
                <p className="text-sm text-gray-400 font-mono mt-1">{displayRank.leaguePoints} LP</p>
                <div className="mt-3 text-xs text-gray-500 uppercase tracking-widest font-bold">
                    Winrate: <span className="text-white">{(displayRank.wins / (displayRank.wins + displayRank.losses) * 100).toFixed(0)}%</span>
                </div>
              </div>
            ) : (
               <p className="mt-8 text-gray-500 italic bg-[#0a0e13] p-6 rounded-xl border border-gray-800">Unranked</p>
            )}

            {/* MASTERY */}
            {data.mastery && data.mastery.length > 0 && (
              <div className="mt-8">
                 <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-4">Top Champions</h3>
                 <div className="flex justify-center gap-4">
                    {data.mastery.map((champ) => (
                        <div key={champ.championId} className="flex flex-col items-center group cursor-pointer">
                            <div className="relative">
                                <img 
                                    src={champs[champ.championId] ? `${DDRAGON_BASE}/img/champion/${champs[champ.championId]}.png` : "https://via.placeholder.com/48"}
                                    className="w-12 h-12 rounded-full border-2 border-gray-700 group-hover:border-yellow-500 transition"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-gray-900 text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-gray-600 text-yellow-500 font-bold">
                                    {champ.championLevel}
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 font-mono group-hover:text-yellow-400 transition">
                                {formatPoints(champ.championPoints)}
                            </p>
                        </div>
                    ))}
                 </div>
              </div>
            )}
          </div>

          {/* RIGHT COL: MATCH HISTORY */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xl font-bold mb-4 text-gray-400 uppercase tracking-wider pl-1">Recent Matches</h2>
            
            {matches.map((match) => {
              const participant = match.info.participants.find(p => p.puuid === data.account.puuid);
              if (!participant) return null;
              
              const isWin = participant.win;
              const queueName = queues[match.info.queueId] || "Normal";
              const formatQueue = (name) => name.replace("5v5 Ranked Solo games", "Ranked Solo").replace("5v5 Ranked Flex games", "Ranked Flex").replace("games", "");
              
              const isExpanded = expandedMatch === match.metadata.matchId;
              const chartData = match.info.participants.map(p => ({
                name: p.championName,
                damage: p.totalDamageDealtToChampions,
                team: p.teamId === 100 ? 'blue' : 'red',
                isUser: p.puuid === data.account.puuid
              }));

              const cardClasses = isWin 
                ? "border-l-blue-400 bg-gradient-to-r from-blue-900/10 to-[#161d23]" 
                : "border-l-red-500 bg-gradient-to-r from-red-900/10 to-[#161d23]";
              const textClasses = isWin ? "text-blue-300" : "text-red-300";

              return (
                <div key={match.metadata.matchId} className="transition-all duration-300">
                    <div 
                        onClick={() => toggleMatch(match.metadata.matchId)}
                        className={`relative flex flex-col md:flex-row items-center p-4 rounded-xl border-l-[6px] shadow-md cursor-pointer hover:bg-gray-800/40 border-y border-r border-gray-800/50 ${cardClasses}`}
                    >
                        <div className="w-full md:w-24 text-left md:text-left mb-2 md:mb-0 ml-2">
                            <div className={`font-bold text-xs uppercase tracking-wider mb-1 opacity-80 ${isWin ? 'text-blue-400' : 'text-red-400'}`}>
                                {formatQueue(queueName)}
                            </div>
                            <div className={`font-black text-lg ${textClasses}`}>
                                {isWin ? "VICTORY" : "DEFEAT"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{Math.floor(match.info.gameDuration / 60)}m {match.info.gameDuration % 60}s</div>
                        </div>

                        <div className="flex items-center gap-3 mx-4">
                            <div className="relative">
                            <img src={`${DDRAGON_BASE}/img/champion/${participant.championName}.png`} className="w-14 h-14 rounded-lg shadow-lg" />
                            <div className="absolute -bottom-2 -right-2 bg-[#0a0e13] text-gray-300 text-[10px] w-6 h-6 flex items-center justify-center rounded-full border border-gray-700 font-bold">
                                {participant.champLevel}
                            </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex gap-1">
                                <img src={`${DDRAGON_BASE}/img/spell/${getSpellIcon(participant.summoner1Id)}`} className="w-6 h-6 rounded md:w-5 md:h-5" />
                                <img src={`${DDRAGON_BASE}/img/spell/${getSpellIcon(participant.summoner2Id)}`} className="w-6 h-6 rounded md:w-5 md:h-5" />
                                </div>
                                <div className="flex gap-1 justify-center">
                                <div className="w-6 h-6 md:w-5 md:h-5 bg-black/50 rounded-full overflow-hidden p-[2px]">
                                    <img src={`${DDRAGON_IMG}/${getRuneIcon(participant.perks.styles[0].style, participant.perks.styles[0].selections[0].perk)}`} className="w-full h-full scale-110" />
                                </div>
                                <div className="w-6 h-6 md:w-5 md:h-5 bg-black/50 rounded-full overflow-hidden p-[3px]">
                                    <img src={`${DDRAGON_IMG}/${getRuneIcon(participant.perks.styles[1].style)}`} className="w-full h-full opacity-80" />
                                </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 text-center md:text-left pl-4">
                            <div className="text-white font-bold text-xl tracking-wide">
                            {participant.kills} <span className="text-gray-600">/</span> <span className="text-red-400">{participant.deaths}</span> <span className="text-gray-600">/</span> {participant.assists}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                CS {(participant.totalMinionsKilled / (match.info.gameDuration / 60)).toFixed(1)}/m
                            </div>
                        </div>

                        <div className="flex gap-2 items-center mt-3 md:mt-0">
                            <div className="grid grid-cols-3 gap-1">
                                {[participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5].map((item, i) => (
                                    <div key={i} className="w-8 h-8 bg-[#0a0e13] rounded-[4px] overflow-hidden border border-gray-800/60 relative">
                                        {item !== 0 && <img src={`${DDRAGON_BASE}/img/item/${item}.png`} className="w-full h-full" />}
                                    </div>
                                ))}
                            </div>
                            <div className="w-8 h-8 bg-[#0a0e13] rounded-full overflow-hidden border border-gray-800/60 ml-1">
                                {participant.item6 !== 0 && <img src={`${DDRAGON_BASE}/img/item/${participant.item6}.png`} className="w-full h-full" />}
                            </div>
                        </div>
                        <div className="absolute top-2 right-2 text-gray-600 text-xs">
                           {isExpanded ? '▲' : '▼'}
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="bg-[#11161d] p-4 rounded-b-xl border-x border-b border-gray-800 animate-in slide-in-from-top-2 duration-200">
                            <h3 className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Damage Dealt to Champions</h3>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fill: '#9ca3af', fontSize: 10}} interval={0} />
                                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="damage" radius={[0, 4, 4, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.team === 'blue' ? '#3b82f6' : '#ef4444'} 
                                                    opacity={entry.isUser ? 1 : 0.4}
                                                    stroke={entry.isUser ? '#ffffff' : 'none'}
                                                    strokeWidth={entry.isUser ? 1 : 0}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import axios from 'axios';

// A manual list of Pros to highlight (Name -> Real Name)
// Note: Riot IDs change, so this requires maintenance, but it looks cool for the demo!
const PRO_PLAYERS = {
    "Hide on bush": "Faker",
    "Agurin": "Agurin",
    "Caps": "G2 Caps",
    "CoreJJ": "TL CoreJJ",
    "Santorin": "Santorin",
    "Humzh": "Humzh",
    "Doublelift": "Doublelift"
};

const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://crexusback.vercel.app";

export default function Leaderboard({ onBack }) {
  const [region, setRegion] = useState("kr"); // Default to Korea (for Faker)
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/leaderboard?region=${region}`);
        setPlayers(res.data);
      } catch (err) {
        console.error("Failed to load ladder");
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, [region]);

  return (
    <div className="min-h-screen bg-[#0a0e13] text-gray-200 p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-2 font-bold">
            ← Back
        </button>
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
            Challenger Ladder
        </h1>
        <select 
            value={region} 
            onChange={(e) => setRegion(e.target.value)}
            className="bg-[#161d23] border border-gray-700 p-2 rounded text-white text-sm font-bold focus:outline-none"
        >
            <option value="na1">North America</option>
            <option value="kr">Korea</option>
            <option value="euw1">Europe West</option>
        </select>
      </div>

      {/* Table */}
      <div className="max-w-4xl mx-auto bg-[#161d23] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
        {loading ? (
            <div className="p-10 text-center text-blue-400 animate-pulse font-bold">LOADING LADDER...</div>
        ) : (
            <table className="w-full text-left border-collapse">
                <thead className="bg-[#0f1519] text-gray-500 text-xs uppercase tracking-widest">
                    <tr>
                        <th className="p-4">Rank</th>
                        <th className="p-4">Summoner</th>
                        <th className="p-4">LP</th>
                        <th className="p-4">Winrate</th>
                        <th className="p-4 text-center">Streak</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {players
                        .filter(p => p.gameName !== "Unknown User" && p.gameName !== "Hidden User")
                        .map((p, index) => {
                        const totalGames = p.wins + p.losses;
                        const winrate = Math.round((p.wins / totalGames) * 100);
                        
                        const name = p.gameName ? `${p.gameName} #${p.tagLine}` : (p.summonerName || "Hidden User");
                        const isPro = PRO_PLAYERS[p.gameName]; // Check against GameName

                        return (
                            <tr key={p.summonerId || index} className="border-b border-gray-800 hover:bg-[#1f2933] transition">
                                <td className="p-4 font-mono text-gray-400">
                                    #{index + 1}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {/* If Pro, show Gold Text & Tag */}
                                        {isPro ? (
                                            <div>
                                                <span className="text-yellow-400 font-bold">{name}</span>
                                                <span className="ml-2 text-[10px] bg-yellow-900 text-yellow-200 px-1 rounded border border-yellow-700">PRO: {isPro}</span>
                                            </div>
                                        ) : (
                                            <span className="font-bold text-white">{name}</span>
                                        )}
                                        {/* Veteran Badge */}
                                        {p.veteran && <span className="text-[10px] text-gray-600" title="Veteran">🛡️</span>}
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-blue-300 font-bold">
                                    {p.leaguePoints.toLocaleString()} LP
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                            <div className={`h-full ${winrate >= 60 ? 'bg-red-500' : winrate >= 50 ? 'bg-blue-500' : 'bg-gray-500'}`} style={{ width: `${winrate}%` }}></div>
                                        </div>
                                        <span className={winrate >= 60 ? "text-red-400 font-bold" : "text-gray-400"}>{winrate}%</span>
                                        <span className="text-xs text-gray-600">({totalGames})</span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    {p.hotStreak && <span className="text-xl animate-pulse" title="On a Hot Streak!">🔥</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
}
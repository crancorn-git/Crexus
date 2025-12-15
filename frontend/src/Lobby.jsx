import { useState } from 'react';
import axios from 'axios';

// Smart URL detection for localhost vs production
const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://crexusback.vercel.app";

export default function Lobby({ onBack }) {
  const [text, setText] = useState("");
  const [region, setRegion] = useState("na1");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const scoutLobby = async () => {
    setLoading(true);
    setResults([]);
    
    // 1. Extract names using Regex (Matches: "PlayerName joined the lobby")
    // Or simpler: Split by newline/comma if user pastes a list
    const lines = text.split(/[\n,]/).map(l => l.replace(" joined the lobby", "").trim()).filter(l => l.length > 0);
    
    // 2. Fetch all sequentially (Promise.all)
    const promises = lines.map(async (line) => {
        // Handle "Name#Tag"
        const [name, tag] = line.split("#");
        if(!tag) return { name: line, error: "Missing #Tag" };

        try {
            // FIXED URL HERE:
            const res = await axios.get(`${API_BASE}/api/player/${name.trim()}/${tag.trim()}?region=${region}`);
            return { name: line, data: res.data };
        } catch (err) {
            return { name: line, error: "Not Found" };
        }
    });

    const data = await Promise.all(promises);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0e13] text-white p-8">
      <button onClick={onBack} className="mb-4 text-gray-400 hover:text-white flex items-center gap-2 font-bold">
        ← Back
      </button>
      <h1 className="text-3xl font-bold mb-4 text-red-500 uppercase tracking-tighter">LOBBY SCOUT</h1>
      
      <div className="flex gap-4 mb-6">
        <textarea 
            className="w-full h-32 bg-[#161d23] p-4 rounded border border-gray-700 text-sm text-gray-200 focus:outline-none focus:border-red-500"
            placeholder="Paste lobby chat here... (e.g. 'Faker#KR1 joined the lobby')"
            value={text}
            onChange={(e) => setText(e.target.value)}
        />
      </div>
      <button onClick={scoutLobby} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded font-bold w-full mb-8 transition shadow-lg shadow-red-900/50">
        {loading ? "SCOUTING..." : "ANALYZE TEAM"}
      </button>

      <div className="grid gap-4">
        {results.map((res, i) => (
            <div key={i} className="bg-[#161d23] p-4 rounded border border-gray-700 flex justify-between items-center shadow-md">
                <div className="font-bold text-lg text-white">{res.name}</div>
                {res.error ? (
                    <span className="text-red-500 font-bold">{res.error}</span>
                ) : (
                    <div className="text-right">
                        <div className="text-green-400 font-bold text-xl">
                            {res.data.ranks[0] ? `${res.data.ranks[0].tier} ${res.data.ranks[0].rank}` : "Unranked"}
                        </div>
                        <div className="text-xs text-gray-500">
                            Level {res.data.summoner.summonerLevel}
                        </div>
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
}
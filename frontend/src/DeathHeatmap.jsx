import { useEffect, useState } from 'react';
import axios from 'axios';

// Official Map Image (Summoner's Rift)
const MAP_IMG = "https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map11.png";
const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://crexusback.vercel.app";

export default function DeathHeatmap({ matchId, participantId, region }) {
  const [deaths, setDeaths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/match/${matchId}/timeline?region=${region}`);
        const frames = res.data.info.frames;
        
        const deathEvents = [];

        // Loop through every minute of the game
        frames.forEach(frame => {
            frame.events.forEach(event => {
                // If it's a kill, and the VICTIM is our user
                if (event.type === "CHAMPION_KILL" && event.victimId === participantId) {
                    deathEvents.push(event.position);
                }
            });
        });

        setDeaths(deathEvents);
        setLoading(false);
      } catch (err) {
        console.error("No timeline data");
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [matchId, participantId]);

  if (loading) return <div className="text-xs text-gray-500 animate-pulse">Loading Map...</div>;
  if (deaths.length === 0) return <div className="text-xs text-green-500">Perfect Game! (0 Deaths)</div>;

  return (
    <div className="flex flex-col items-center">
        <h4 className="text-xs text-gray-500 font-bold mb-2 uppercase text-center">Death Map</h4>
        <div className="relative w-40 h-40 border-2 border-gray-700 rounded-lg overflow-hidden bg-black">
            {/* The Map Image */}
            <img src={MAP_IMG} className="absolute inset-0 w-full h-full opacity-60" alt="Rift" />
            
            {/* The Death Dots */}
            {deaths.map((pos, i) => {
                // Riot Map Size is roughly 14820x14820. 
                // (0,0) is Bottom-Left.
                const left = (pos.x / 14820) * 100;
                const bottom = (pos.y / 14820) * 100;
                
                return (
                    <div 
                        key={i}
                        className="absolute w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_red] border border-white"
                        style={{ left: `${left}%`, bottom: `${bottom}%`, transform: 'translate(-50%, 50%)' }}
                        title={`Death at ${pos.x},${pos.y}`}
                    />
                );
            })}
        </div>
        <span className="text-[10px] text-gray-500 mt-1">{deaths.length} Deaths</span>
    </div>
  );
}
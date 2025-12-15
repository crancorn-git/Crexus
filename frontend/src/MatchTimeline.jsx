import { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const API_BASE = window.location.hostname === "localhost" 
  ? "http://localhost:5000" 
  : "https://crexusback.vercel.app";

export default function MatchTimeline({ matchId, participantId, participants, region }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opponentName, setOpponentName] = useState("Opponent");

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/match/${matchId}/timeline?region=${region}`);
        const frames = res.data.info.frames;

        // 1. Identify User and Opponent
        const userPart = participants.find(p => p.participantId === participantId);
        
        // Logic: Find enemy in same position (TOP vs TOP, MID vs MID)
        // Note: This works best for Ranked Solo/Flex. ARAM/Arena might fail to find a direct match.
        const opponent = participants.find(p => 
            p.teamId !== userPart.teamId && 
            p.individualPosition === userPart.individualPosition && 
            p.individualPosition !== "Invalid"
        );

        if (opponent) setOpponentName(opponent.championName);

        // 2. Build Delta Data
        const chartData = frames.map((frame, index) => {
            const userFrame = frame.participantFrames[participantId];
            const oppFrame = opponent ? frame.participantFrames[opponent.participantId] : null;

            if (!userFrame || !oppFrame) return { minute: index, goldDiff: 0, xpDiff: 0 };

            return {
                minute: index,
                goldDiff: userFrame.totalGold - oppFrame.totalGold,
                xpDiff: userFrame.xp - oppFrame.xp,
            };
        });

        setData(chartData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [matchId, participantId, participants]);

  if (loading) return <div className="text-xs text-gray-500 animate-pulse mt-4">Analyzing Lane Phase...</div>;
  if (data.length === 0) return null;

  // Calculate Gradient offset for color switch (Green above 0, Red below 0)
  const gradientOffset = () => {
    const dataMax = Math.max(...data.map((i) => i.goldDiff));
    const dataMin = Math.min(...data.map((i) => i.goldDiff));
  
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
  
    return dataMax / (dataMax - dataMin);
  };
  
  const off = gradientOffset();

  return (
    <div className="h-48 w-full mt-2 bg-[#0f1519] rounded-lg p-2 border border-gray-800">
        <h4 className="text-xs text-gray-500 font-bold mb-2 uppercase text-center flex justify-between px-4">
            <span>Gold Diff</span>
            <span className="text-gray-600">vs {opponentName}</span>
        </h4>
        
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <XAxis dataKey="minute" hide />
                <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1c2329', border: '1px solid #374151' }} 
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(value) => [value > 0 ? `+${value}` : value, "Gold Lead"]}
                    labelStyle={{ display: 'none' }}
                />
                <defs>
                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={off} stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset={off} stopColor="#ef4444" stopOpacity={0.3} />
                    </linearGradient>
                </defs>
                <Area 
                    type="monotone" 
                    dataKey="goldDiff" 
                    stroke="#6b7280" 
                    strokeWidth={1}
                    fill="url(#splitColor)" 
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
  );
}
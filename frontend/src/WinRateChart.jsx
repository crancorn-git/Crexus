import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function WinRateChart({ matches, puuid }) {
    // 1. Bucket the matches
    const buckets = [
        { label: '0-25m', wins: 0, total: 0 },
        { label: '25-35m', wins: 0, total: 0 },
        { label: '35m+', wins: 0, total: 0 }
    ];

    matches.forEach(m => {
        const mins = m.info.gameDuration / 60;
        const isWin = m.info.participants.find(p => p.puuid === puuid)?.win;
        
        let bucketIndex = 0; // Early
        if (mins >= 25 && mins < 35) bucketIndex = 1; // Mid
        if (mins >= 35) bucketIndex = 2; // Late

        buckets[bucketIndex].total++;
        if (isWin) buckets[bucketIndex].wins++;
    });

    // 2. Calculate Percentages for Graph
    const data = buckets.map(b => ({
        name: b.label,
        winrate: b.total > 0 ? Math.round((b.wins / b.total) * 100) : 0,
        count: b.total
    }));

    if (matches.length === 0) return null;

    return (
        <div className="mt-8 bg-[#0a0e13] p-4 rounded-xl border border-gray-800 h-48">
            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest text-center mb-2">Winrate by Time</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10 }}>
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ backgroundColor: '#1c2329', border: '1px solid #374151', fontSize: '12px' }}
                        formatter={(value, name, props) => [`${value}% (${props.payload.count} games)`, 'Winrate']}
                    />
                    <Bar dataKey="winrate" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.winrate >= 50 ? '#10b981' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
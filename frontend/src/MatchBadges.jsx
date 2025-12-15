// frontend/src/MatchBadges.jsx

export default function MatchBadges({ match, puuid }) {
    const participants = match.info.participants;
    const user = participants.find(p => p.puuid === puuid);
    const gameDurationMinutes = match.info.gameDuration / 60;

    if (!user) return null;

    // --- 1. CALCULATE OP SCORES FOR MVP/ACE ---
    // Formula: (K*3) + (A*2) - (D*2) + (Vision) + (CS/10)
    const getScore = (p) => {
        return (p.kills * 3) + (p.assists * 2) - (p.deaths * 2) + (p.visionScore) + (p.totalMinionsKilled / 10);
    };

    let mvpScore = -999;
    let mvpPuuid = "";
    
    // Split teams to find ACE (Best player on losing team)
    let losingTeamMaxScore = -999;
    let losingTeamAcePuuid = "";

    participants.forEach(p => {
        const score = getScore(p);
        
        // Check Global MVP
        if (score > mvpScore) {
            mvpScore = score;
            mvpPuuid = p.puuid;
        }

        // Check ACE (Must be on losing team)
        if (!p.win && score > losingTeamMaxScore) {
            losingTeamMaxScore = score;
            losingTeamAcePuuid = p.puuid;
        }
    });

    // --- 2. GENERATE BADGES FOR USER ---
    const badges = [];

    // MVP / ACE
    if (user.puuid === mvpPuuid) {
        badges.push({ label: "MVP", color: "bg-yellow-500 text-black border-yellow-300" });
    } else if (user.puuid === losingTeamAcePuuid) {
        badges.push({ label: "ACE", color: "bg-purple-600 text-white border-purple-400" });
    }

    // STOMPER (Won quickly with high damage share)
    if (user.win && gameDurationMinutes < 20) {
        badges.push({ label: "STOMPER", color: "bg-blue-600 text-white border-blue-400" });
    }

    // CARRY (High Damage Share > 30%)
    const teamDamage = participants.filter(p => p.teamId === user.teamId).reduce((acc, curr) => acc + curr.totalDamageDealtToChampions, 0);
    const damageShare = user.totalDamageDealtToChampions / teamDamage;
    if (damageShare > 0.30) {
        badges.push({ label: "CARRY", color: "bg-red-600 text-white border-red-400" });
    }

    // VISIONARY (Support/Vision focus)
    if (user.visionScore > (1.5 * gameDurationMinutes)) {
        badges.push({ label: "VISIONARY", color: "bg-green-600 text-white border-green-400" });
    }

    // IMMORTAL (Very low deaths in long game)
    if (user.deaths <= 1 && gameDurationMinutes > 15) {
        badges.push({ label: "IMMORTAL", color: "bg-gray-600 text-white border-gray-400" });
    }

    // TURRET DESTROYER
    if (user.damageDealtToTurrets > 5000) {
        badges.push({ label: "BREACH", color: "bg-orange-600 text-white border-orange-400" });
    }

    if (badges.length === 0) return null;

    return (
        <div className="flex gap-1 mb-1 flex-wrap">
            {badges.map((b, i) => (
                <span key={i} className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${b.color} shadow-sm tracking-wider`}>
                    {b.label}
                </span>
            ))}
        </div>
    );
}
// A mini-database of specific matchup advice
// Format: "MY_CHAMPION|ENEMY_CHAMPION": "Tip"

export const MATCHUP_TIPS = {
    // MID LANE
    "Ahri|Zed": "Rush Seeker's Armguard. Save Charm (E) for when he ults (he always lands behind you).",
    "Ahri|Yasuo": "Auto-attack him to break passive shield before using spells. Do not Charm when his Windwall is up.",
    "Zed|Sylas": "Buy Executioner's Calling early. His W heal is massive.",
    "Sylas|TwistedFate": "Hard engage at level 3. TF is weak early. Take Cleanse for his Gold Card.",
    
    // TOP LANE
    "Darius|Garen": "Short trades only. Do not let Garen passive heal back up. Kite his E spin.",
    "Riven|Fiora": "Skill matchup. Do not use 3rd Q when her Parry (W) is up or you get stunned.",
    "Nasus|Teemo": "Survive until level 6. Buy Mercury's Treads. E max can help push him out.",
    
    // BOT LANE
    "Vayne|Caitlyn": "You lose lane hard. Give up CS to stay healthy. All-in at level 6.",
    "Ezreal|Draven": "Do not trade autos. Poke with Q. If he drops an axe, punish him.",
    
    // GENERAL TIPS (Fallback)
    "Generic|Assassin": "Enemy is an Assassin. Buy Stopwatch/Zhonya's and stay with your team.",
    "Generic|Healer": "Enemy has high sustain. Buy Grievous Wounds (800g) early.",
};

// Helper to find the tip
export const getMatchupTip = (myChamp, enemyChamp) => {
    const key = `${myChamp}|${enemyChamp}`;
    if (MATCHUP_TIPS[key]) return MATCHUP_TIPS[key];
    return null; // No specific tip found
};
const express = require('express');
const app = express();
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "OPTIONS"], 
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// PASTE YOUR KEY HERE
const API_KEY = "RGAPI-93f5dd6c-7247-4ca2-99ff-4c15bf0e23ee"; 

const getBroadRegion = (platform) => {
    const map = {
        'na1': 'americas', 'br1': 'americas', 'la1': 'americas', 'la2': 'americas',
        'kr': 'asia', 'jp1': 'asia',
        'euw1': 'europe', 'eun1': 'europe', 'tr1': 'europe', 'ru': 'europe'
    };
    return map[platform.toLowerCase()] || 'americas';
};

const riotRequest = async (url) => {
    try {
        const fullUrl = `${url}${url.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
        const response = await axios.get(fullUrl);
        return response.data;
    } catch (err) {
        console.error("Riot API Error:", err.response?.status, err.config?.url);
        throw err;
    }
};

// API 1: Get Player Profile
app.get('/api/player/:name/:tag', async (req, res) => {
    const { name, tag } = req.params;
    const platform = req.query.region || 'na1';
    const region = getBroadRegion(platform);

    try {
        console.log(`\n--- Searching for ${name}#${tag} ---`);

        // 1. Account-V1 (Get PUUID)
        const accountUrl = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}`;
        const accountData = await riotRequest(accountUrl);

        // 2. Summoner-V4 (Try LOL Endpoint)
        let summonerUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`;
        let summonerData = await riotRequest(summonerUrl);
        
        let encryptedSummonerId = summonerData.id;

        // 3. Fallback Level 1: TFT
        if (!encryptedSummonerId) {
            console.log("⚠️ LOL ID missing. Trying TFT...");
            try {
                const tftUrl = `https://${platform}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${accountData.puuid}`;
                const tftData = await riotRequest(tftUrl);
                if (tftData.id) encryptedSummonerId = tftData.id;
            } catch (e) { /* Ignore */ }
        }

        // 4. Fallback Level 2: CLASH (The Hail Mary)
        if (!encryptedSummonerId) {
            console.log("⚠️ TFT ID missing. Trying CLASH...");
            try {
                const clashUrl = `https://${platform}.api.riotgames.com/lol/clash/v1/players/by-puuid/${accountData.puuid}`;
                const clashData = await riotRequest(clashUrl);
                if (clashData && clashData.length > 0 && clashData[0].summonerId) {
                    encryptedSummonerId = clashData[0].summonerId;
                    console.log("✅ Recovered ID via Clash!");
                }
            } catch (e) { /* Ignore */ }
        }

        // 5. Rank (League-V4)
        let rankData = [];
        if (encryptedSummonerId) {
            try {
                const rankUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encryptedSummonerId}`;
                rankData = await riotRequest(rankUrl);
            } catch (rankError) {
                console.log("⚠️ Rank lookup failed (403/404).");
            }
        } else {
            console.log("❌ CRITICAL: ID not found in LOL, TFT, or CLASH. Displaying Unranked.");
        }

        // 6. Mastery
        const masteryUrl = `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${accountData.puuid}`;
        const masteryAll = await riotRequest(masteryUrl);
        const topMastery = masteryAll.slice(0, 3);

        res.json({ 
            account: accountData, 
            summoner: summonerData, 
            ranks: rankData,
            mastery: topMastery 
        });

    } catch (error) {
        console.error("Search failed:", error.message);
        res.status(500).json({ error: "Player not found" });
    }
});

// API 2: Matches
app.get('/api/matches/:puuid', async (req, res) => {
    const { puuid } = req.params;
    const platform = req.query.region || 'na1'; 
    const region = getBroadRegion(platform);

    try {
        const matchesUrl = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`;
        const matchIds = await riotRequest(matchesUrl);
        
        const matchDetails = await Promise.all(
            matchIds.map(id => riotRequest(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`))
        );
        res.json(matchDetails);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});

// API 3: Live Game
app.get('/api/live/:puuid', async (req, res) => {
    const { puuid } = req.params;
    const platform = req.query.region || 'na1';
    
    try {
        const url = `https://${platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
        const gameData = await riotRequest(url);
        
        const participantsWithStats = await Promise.all(gameData.participants.map(async (p) => {
            let rank = "Unranked";
            let tags = [];
            let mastery = 0;

            try {
                const rankUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${p.summonerId}`;
                const ranks = await riotRequest(rankUrl);
                const solo = ranks.find(r => r.queueType === "RANKED_SOLO_5x5");
                if (solo) {
                    rank = `${solo.tier} ${solo.rank}`;
                    const wr = (solo.wins / (solo.wins + solo.losses)) * 100;
                    if (wr > 70 && (solo.wins + solo.losses) > 10) tags.push("SMURF");
                }
            } catch (e) {}

            try {
                const masteryUrl = `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${p.puuid}/by-champion/${p.championId}`;
                const masteryData = await riotRequest(masteryUrl);
                mastery = masteryData.championPoints;
                if (mastery > 1000000) tags.push("GOD"); 
                else if (mastery > 500000) tags.push("OTP"); 
                else if (mastery < 5000) tags.push("NEW"); 
            } catch (e) {}

            return { ...p, rank, tags, mastery };
        }));

        gameData.participants = participantsWithStats;
        res.json(gameData);

    } catch (error) {
        if (error.response?.status === 404) return res.status(404).json({ error: "Not in game" });
        res.status(500).json({ error: "Failed" });
    }
});

// API 4: Server Status & Free Rotation
app.get('/api/status', async (req, res) => {
    const platform = req.query.region || 'na1'; 
    try {
        const statusUrl = `https://${platform}.api.riotgames.com/lol/status/v4/platform-data`;
        const statusData = await riotRequest(statusUrl);

        const rotationUrl = `https://${platform}.api.riotgames.com/lol/platform/v3/champion-rotations`;
        const rotationData = await riotRequest(rotationUrl);

        res.json({
            status: statusData,
            rotation: rotationData.freeChampionIds
        });
    } catch (error) {
        console.error("Status check failed");
        res.status(500).json({ error: "Failed to fetch status" });
    }
});

// API 5: Challenger Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    const platform = req.query.region || 'na1';
    const region = getBroadRegion(platform);
    
    try {
        const url = `https://${platform}.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`;
        const data = await riotRequest(url);
        
        const topPlayers = data.entries
            .sort((a, b) => b.leaguePoints - a.leaguePoints)
            .slice(0, 10);

        const enrichedPlayers = await Promise.all(topPlayers.map(async (player) => {
            if (!player.summonerId) {
                return { ...player, gameName: "Unknown User", tagLine: "???" };
            }

            try {
                const sumUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/${player.summonerId}`;
                const sumData = await riotRequest(sumUrl);
                
                const accUrl = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${sumData.puuid}`;
                const accData = await riotRequest(accUrl);

                return {
                    ...player,
                    gameName: accData.gameName,
                    tagLine: accData.tagLine
                };
            } catch (err) {
                return { ...player, gameName: "Hidden User", tagLine: "" };
            }
        }));

        res.json(enrichedPlayers);
    } catch (error) {
        console.error("Leaderboard error:", error.message);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

// API 6: Match Timeline
app.get('/api/match/:matchId/timeline', async (req, res) => {
    const { matchId } = req.params;
    const platform = req.query.region || 'na1'; 
    const region = getBroadRegion(platform);
    
    try {
        const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
        const timelineData = await riotRequest(url);
        res.json(timelineData);
    } catch (error) {
        console.error("Timeline failed:", error.message);
        res.status(500).json({ error: "Timeline not found" });
    }
});

app.get('/', (req, res) => {
    res.send('Crexus Backend is Online!');
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

module.exports = app;
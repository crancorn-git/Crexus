const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();


app.use(cors({
    origin: "*", // Allow any website to connect (Easiest fix)
    methods: ["GET", "POST", "OPTIONS"], // Allow these connection types
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// PASTE YOUR KEY HERE
const API_KEY = "RGAPI-893c883c-59ec-4413-9672-15abf30b634c"; 

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
        // console.log(`Fetching: ${fullUrl}`); // Commented out to reduce noise
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
                // Clash returns an array of registrations. Take the first one.
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
        res.json(gameData);
    } catch (error) {
        if (error.response?.status === 404) return res.status(404).json({ error: "Not in game" });
        res.status(500).json({ error: "Failed" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
module.exports = app;
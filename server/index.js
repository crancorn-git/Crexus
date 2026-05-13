const express = require('express');
const app = express();
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 204
}));

const API_KEY = process.env.RIOT_API_KEY;

const APP_VERSION = process.env.APP_VERSION || '1.1.5';
const DEPLOY_TIME = process.env.VERCEL_GIT_COMMIT_SHA ? 'vercel' : new Date().toISOString();
const DEBUG_TOKEN = process.env.CRANIX_SCOUT_DEBUG_TOKEN || process.env.CREXUS_DEBUG_TOKEN;

if (!API_KEY) {
    console.warn('RIOT_API_KEY is missing. Riot-backed routes will fail until it is configured.');
}


const getDataDragonVersion = async () => {
    try {
        const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json', { timeout: 5000 });
        if (Array.isArray(response.data) && response.data[0]) return response.data[0];
    } catch (err) {
        console.error('Data Dragon version check failed:', err.message);
    }
    return 'unknown';
};

const getUptimeSeconds = () => Math.round(process.uptime());


const PLATFORM_REGIONS = new Set(['na1', 'br1', 'la1', 'la2', 'kr', 'jp1', 'euw1', 'eun1', 'tr1', 'ru', 'oc1']);
const normalizePlatform = (region, fallback = 'na1') => {
    const platform = String(region || fallback).toLowerCase();
    return PLATFORM_REGIONS.has(platform) ? platform : fallback;
};

const getBroadRegion = (platform) => {
    const map = {
        'na1': 'americas', 'br1': 'americas', 'la1': 'americas', 'la2': 'americas',
        'kr': 'asia', 'jp1': 'asia',
        'euw1': 'europe', 'eun1': 'europe', 'tr1': 'europe', 'ru': 'europe',
        'oc1': 'sea'
    };
    return map[platform.toLowerCase()] || 'americas';
};


const getRiotErrorPayload = (error, fallbackMessage) => {
    const status = error.response?.status || error.statusCode || 500;

    const messages = {
        400: 'Bad request sent to Riot. Check the supplied player name, tag, match ID, or region.',
        401: 'Riot API key is invalid or missing. Rotate the key and set RIOT_API_KEY in the backend environment.',
        403: 'Riot API key is expired, invalid, or does not have access to this endpoint.',
        404: fallbackMessage,
        429: 'Riot API rate limit reached. Wait a moment and try again.',
        500: fallbackMessage,
        502: 'Riot service returned a bad gateway response.',
        503: 'Riot service is temporarily unavailable.',
        504: 'Riot service timed out.'
    };

    return {
        status,
        error: messages[status] || fallbackMessage
    };
};

const sendRiotError = (res, error, fallbackMessage) => {
    const payload = getRiotErrorPayload(error, fallbackMessage);
    return res.status(payload.status).json(payload);
};

const riotRequest = async (url) => {
    try {
        if (!API_KEY) {
            const missingKeyError = new Error('Missing RIOT_API_KEY');
            missingKeyError.statusCode = 500;
            throw missingKeyError;
        }

        const response = await axios.get(url, {
            headers: { 'X-Riot-Token': API_KEY }
        });
        return response.data;
    } catch (err) {
        console.error("Riot API Error:", err.response?.status || err.statusCode, err.config?.url || url);
        throw err;
    }
};


app.get('/api/health', (req, res) => {
    res.json({
        server: 'online',
        version: APP_VERSION,
        riotKeyConfigured: Boolean(API_KEY),
        environment: process.env.NODE_ENV || 'development',
        uptimeSeconds: getUptimeSeconds(),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/version', async (req, res) => {
    const ddragonVersion = await getDataDragonVersion();
    res.json({
        app: 'Cranix Scout',
        version: APP_VERSION,
        ddragonVersion,
        deploy: {
            commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
            branch: process.env.VERCEL_GIT_COMMIT_REF || null,
            url: process.env.VERCEL_URL || null,
            time: DEPLOY_TIME
        },
        timestamp: new Date().toISOString()
    });
});



app.get('/api/launch-check', async (req, res) => {
    const ddragonVersion = await getDataDragonVersion();
    res.json({
        app: 'Cranix Scout',
        version: APP_VERSION,
        status: 'launch-ready',
        identity: 'Game stats and information platform',
        firstSupportedGame: 'League of Legends',
        riotKeyConfigured: Boolean(API_KEY),
        ddragonVersion,
        regions: Array.from(PLATFORM_REGIONS),
        modules: [
            'player_profiles',
            'live_game',
            'live_game_read',
            'ladder',
            'match_details',
            'cranix_scout_score',
            'player_compare',
            'champion_insights',
            'draft_tools',
            'saved_accounts',
            'coaching_layer',
            'public_reports',
            'streamer_mode',
            'health_diagnostics'
        ],
        checks: {
            backend: true,
            riotKey: Boolean(API_KEY),
            versionPinned: APP_VERSION === '1.1.4',
            regionRouting: true,
            publicReports: true,
            streamerMode: true
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/discord/commands', (req, res) => {
    res.json({
        app: 'Cranix Scout',
        version: APP_VERSION,
        commands: [
            { name: '/scout player', usage: '/scout player Ciaran#EUW', description: 'Return a player scout summary and public report link.' },
            { name: '/scout live', usage: '/scout live Ciaran#EUW', description: 'Return live-game scout details when the player is currently in game.' },
            { name: '/scout compare', usage: '/scout compare PlayerA#EUW PlayerB#EUW', description: 'Compare two players side by side.' },
            { name: '/scout report', usage: '/scout report PlayerName#TAG', description: 'Generate a clean public report card for sharing.' }
        ]
    });
});

app.get('/api/debug/riot', async (req, res) => {
    if (DEBUG_TOKEN && req.query.token !== DEBUG_TOKEN) {
        return res.status(401).json({ error: 'Debug token required.' });
    }

    const platform = normalizePlatform(req.query.region, 'kr');

    try {
        const statusUrl = `https://${platform}.api.riotgames.com/lol/status/v4/platform-data`;
        const statusData = await riotRequest(statusUrl);
        res.json({
            ok: true,
            region: platform,
            riotKeyConfigured: Boolean(API_KEY),
            riotStatusName: statusData.name,
            message: 'Riot API key is accepted for this endpoint.'
        });
    } catch (error) {
        const payload = getRiotErrorPayload(error, 'Riot debug check failed.');
        res.status(payload.status).json({
            ok: false,
            region: platform,
            riotKeyConfigured: Boolean(API_KEY),
            ...payload
        });
    }
});

// API 1: Get Player Profile
app.get('/api/player/:name/:tag', async (req, res) => {
    const { name, tag } = req.params;
    const platform = normalizePlatform(req.query.region, 'na1');
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
            } catch { /* Ignore */ }
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
            } catch { /* Ignore */ }
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
        sendRiotError(res, error, "Player not found. Check the Riot ID, tag, and selected region.");
    }
});

// API 2: Matches
app.get('/api/matches/:puuid', async (req, res) => {
    const { puuid } = req.params;
    const platform = normalizePlatform(req.query.region, 'na1'); 
    const region = getBroadRegion(platform);

    try {
        const matchesUrl = `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`;
        const matchIds = await riotRequest(matchesUrl);
        
        const matchDetails = await Promise.all(
            matchIds.map(id => riotRequest(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`))
        );
        res.json(matchDetails);
    } catch (error) {
        sendRiotError(res, error, "Failed to fetch recent matches.");
    }
});

// API 3: Live Game
app.get('/api/live/:puuid', async (req, res) => {
    const { puuid } = req.params;
    const platform = normalizePlatform(req.query.region, 'na1');
    
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
            } catch {}

            try {
                const masteryUrl = `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${p.puuid}/by-champion/${p.championId}`;
                const masteryData = await riotRequest(masteryUrl);
                mastery = masteryData.championPoints;
                if (mastery > 1000000) tags.push("GOD"); 
                else if (mastery > 500000) tags.push("OTP"); 
                else if (mastery < 5000) tags.push("NEW"); 
            } catch {}

            return { ...p, rank, tags, mastery };
        }));

        gameData.participants = participantsWithStats;
        res.json(gameData);

    } catch (error) {
        if (error.response?.status === 404) return res.status(404).json({ error: "Not in game" });
        sendRiotError(res, error, "Failed to load live game.");
    }
});

// API 4: Server Status & Free Rotation
app.get('/api/status', async (req, res) => {
    const platform = normalizePlatform(req.query.region, 'na1'); 
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
        sendRiotError(res, error, "Failed to fetch server status or champion rotation.");
    }
});

// API 5: Region-aware ranked ladder
app.get('/api/leaderboard', async (req, res) => {
    const platform = normalizePlatform(req.query.region, 'na1');
    const region = getBroadRegion(platform);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
    const queue = req.query.queue || 'RANKED_SOLO_5x5';
    const tier = req.query.tier || 'challenger';

    try {
        const url = `https://${platform}.api.riotgames.com/lol/league/v4/${tier}leagues/by-queue/${queue}`;
        const data = await riotRequest(url);
        const entries = Array.isArray(data.entries) ? data.entries : [];
        
        const topPlayers = entries
            .sort((a, b) => b.leaguePoints - a.leaguePoints)
            .slice(0, limit);

        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const enrichPlayer = async (player, index) => {
            const fallbackName = player.gameName || player.riotIdGameName || player.summonerName || `Rank #${index + 1}`;
            const fallbackTag = player.tagLine || player.riotIdTagline || '';

            try {
                let puuid = player.puuid;

                // Newer Riot ladder payloads can include puuid directly. Older payloads only include
                // encrypted summonerId, so keep that route as a fallback.
                if (!puuid && player.summonerId) {
                    const sumUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/${player.summonerId}`;
                    const sumData = await riotRequest(sumUrl);
                    puuid = sumData.puuid;
                }

                if (!puuid) {
                    return { ...player, gameName: fallbackName, tagLine: fallbackTag, nameUnavailable: true };
                }

                const accUrl = `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
                const accData = await riotRequest(accUrl);

                return {
                    ...player,
                    puuid,
                    gameName: accData.gameName || fallbackName,
                    tagLine: accData.tagLine || fallbackTag
                };
            } catch (err) {
                console.warn(`Leaderboard name lookup failed for ${platform} rank ${index + 1}:`, err.response?.status || err.message);
                return { ...player, gameName: fallbackName, tagLine: fallbackTag, nameUnavailable: true };
            }
        };

        // Avoid firing 200 Riot requests at once. That caused name lookups to fail and the UI
        // showed every row as Unknown User. Small batches are slower but reliable.
        const enrichedPlayers = [];
        const batchSize = 5;
        for (let i = 0; i < topPlayers.length; i += batchSize) {
            const batch = topPlayers.slice(i, i + batchSize);
            const enrichedBatch = await Promise.all(batch.map((player, offset) => enrichPlayer(player, i + offset)));
            enrichedPlayers.push(...enrichedBatch);
            if (i + batchSize < topPlayers.length) await sleep(150);
        }

        res.json({
            meta: {
                region: platform,
                broadRegion: region,
                queue,
                tier: String(tier).toUpperCase(),
                totalEntries: entries.length,
                returned: enrichedPlayers.length
            },
            players: enrichedPlayers
        });
    } catch (error) {
        console.error("Leaderboard error:", error.message);
        sendRiotError(res, error, `Failed to fetch ${tier} ladder for ${platform.toUpperCase()}.`);
    }
});

// API 6: Match Timeline
app.get('/api/match/:matchId/timeline', async (req, res) => {
    const { matchId } = req.params;
    const platform = normalizePlatform(req.query.region, 'na1'); 
    const region = getBroadRegion(platform);
    
    try {
        const url = `https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
        const timelineData = await riotRequest(url);
        res.json(timelineData);
    } catch (error) {
        console.error("Timeline failed:", error.message);
        sendRiotError(res, error, "Match timeline not found.");
    }
});

app.get('/', (req, res) => {
    res.send('Cranix Scout Backend is Online!');
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

module.exports = app;
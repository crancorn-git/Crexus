import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from './config';
import { useDDragonVersion } from './ddragon';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

import MatchTimeline from './MatchTimeline';
import MatchBadges from './MatchBadges';
import DeathHeatmap from './DeathHeatmap';
import WinRateChart from './WinRateChart';
import PlayerIntelligenceCard from './PlayerIntelligenceCard';
import PerformanceTrends from './PerformanceTrends';
import ChampionPool from './ChampionPool';
import ObjectiveControl from './ObjectiveControl';
import LanePhaseAnalysis from './LanePhaseAnalysis';
import TimelineIntelligence from './TimelineIntelligence';
import CrexusReport from './CrexusReport';
import MatchDetailRead from './MatchDetailRead';
import MatchInsightMini from './MatchInsightMini';
import MatchDetailPage from './MatchDetailPage';
import ShareableReportCard from './ShareableReportCard';
import ChampionInsights from './ChampionInsights';
import CoachingLayer from './CoachingLayer';
import { analyzePlayerIntelligence } from './intelligence';
import { REGION_OPTIONS } from './regions';

const DDRAGON_IMG = 'https://ddragon.leagueoflegends.com/cdn/img';
const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export default function PlayerProfile({ onLiveClick, onLobbyClick, onLeaderboardClick, onCompareClick, onChampionsClick, onDashboardClick, initialAccount }) {
  const ddragonVersion = useDDragonVersion();
  const ddragonBase = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}`;

  const [input, setInput] = useState('Faker#KR1');
  const [region, setRegion] = useState(() => localStorage.getItem('crexus_region') || 'kr');
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [detailMatchId, setDetailMatchId] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => readStorage('crexus_recents', []));
  const [favoritePlayers, setFavoritePlayers] = useState(() => readStorage('crexus_favorites', []));
  const [pinnedPlayer, setPinnedPlayer] = useState(() => readStorage('crexus_pinned', null));
  const [serverData, setServerData] = useState(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [showShareCard, setShowShareCard] = useState(false);
  const profileContentRef = useRef(null);

  const jumpToProfileTab = (tab) => {
    setProfileTab(tab);
    if (tab === 'overview') setDetailMatchId(null);
    requestAnimationFrame(() => {
      profileContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const [queues, setQueues] = useState({});
  const [runes, setRunes] = useState([]);
  const [spells, setSpells] = useState({});
  const [champs, setChamps] = useState({});

  useEffect(() => {
    localStorage.setItem('crexus_region', region);
  }, [region]);

  useEffect(() => {
    if (!initialAccount?.name || !initialAccount?.tag) return;
    setInput(`${initialAccount.name}#${initialAccount.tag}`);
    setRegion(initialAccount.region || region);
    searchPlayer(initialAccount.name, initialAccount.tag, initialAccount.region || region);
  }, [initialAccount]);

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [runesRes, spellsRes, queuesRes, champRes] = await Promise.all([
          axios.get(`${ddragonBase}/data/en_US/runesReforged.json`),
          axios.get(`${ddragonBase}/data/en_US/summoner.json`),
          axios.get('https://static.developer.riotgames.com/docs/lol/queues.json'),
          axios.get(`${ddragonBase}/data/en_US/champion.json`)
        ]);

        setRunes(runesRes.data);
        setSpells(spellsRes.data.data);

        const queueMap = {};
        queuesRes.data.forEach((q) => {
          queueMap[q.queueId] = q.description;
        });
        setQueues(queueMap);

        const champMap = {};
        Object.values(champRes.data.data).forEach((c) => {
          champMap[c.key] = c.id;
        });
        setChamps(champMap);
      } catch (err) {
        console.error('Failed to load static assets:', err);
      }
    };

    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/status?region=${region}`);
        setServerData(res.data);
      } catch {
        console.error('Status offline');
      }
    };

    fetchStaticData();
    fetchStatus();
  }, [region, ddragonBase]);

  const getRuneIcon = (styleId, runeId) => {
    const style = runes.find((r) => r.id === styleId);
    if (!style) return null;
    if (runeId) {
      const keystone = style.slots[0].runes.find((r) => r.id === runeId);
      return keystone ? keystone.icon : null;
    }
    return style.icon;
  };

  const getSpellIcon = (spellKey) => {
    const spellName = Object.keys(spells).find((name) => spells[name].key == spellKey);
    return spellName ? spells[spellName].image.full : null;
  };

  const formatPoints = (points) => {
    if (points > 1000000) return `${(points / 1000000).toFixed(1)}M`;
    if (points > 1000) return `${(points / 1000).toFixed(0)}k`;
    return points;
  };

  const toggleMatch = (matchId) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };

  const addToHistory = (name, tag, currentRegion, iconId) => {
    const newEntry = { name, tag, region: currentRegion, iconId };
    const updated = [newEntry, ...recentSearches.filter((i) => `${i.name}#${i.tag}:${i.region}` !== `${name}#${tag}:${currentRegion}`)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('crexus_recents', JSON.stringify(updated));
  };

  const getCsColor = (csPerMin) => {
    if (csPerMin >= 9) return 'text-yellow-400 font-bold drop-shadow-md';
    if (csPerMin >= 7.5) return 'text-red-300 font-bold';
    if (csPerMin >= 6) return 'text-green-400';
    return 'text-gray-500';
  };

  const calculateRadarData = () => {
    if (!matches?.length || !data?.account?.puuid) return [];

    let totalKDA = 0;
    let totalCS = 0;
    let totalVision = 0;
    let totalDamage = 0;
    let count = 0;

    matches.forEach((m) => {
      const participant = m.info.participants.find((p) => p.puuid === data.account.puuid);
      if (!participant) return;
      const kda = (participant.kills + participant.assists) / (participant.deaths || 1);
      const csPerMin = participant.totalMinionsKilled / (m.info.gameDuration / 60);
      totalKDA += kda;
      totalCS += csPerMin;
      totalVision += participant.visionScore;
      totalDamage += participant.totalDamageDealtToChampions;
      count += 1;
    });

    if (count === 0) return [];

    return [
      { subject: 'Combat', A: Math.min((totalKDA / count) * 20, 100), fullMark: 100 },
      { subject: 'Farming', A: Math.min((totalCS / count) * 10, 100), fullMark: 100 },
      { subject: 'Vision', A: Math.min((totalVision / count) * 2.5, 100), fullMark: 100 },
      { subject: 'Survival', A: 100 - matches.filter((m) => !m.info.participants.find((p) => p.puuid === data.account.puuid)?.win).length * 20, fullMark: 100 },
      { subject: 'Aggression', A: Math.min(totalDamage / count / 300, 100), fullMark: 100 }
    ];
  };

  const getBestRank = (ranks) => {
    if (!ranks || ranks.length === 0) return null;
    const solo = ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
    const flex = ranks.find((r) => r.queueType === 'RANKED_FLEX_SR');
    const arena = ranks.find((r) => r.queueType === 'CHERRY');
    return solo || flex || arena || ranks[0];
  };

  const formatQueueType = (type) => {
    if (type === 'RANKED_SOLO_5x5') return 'Ranked Solo';
    if (type === 'RANKED_FLEX_SR') return 'Ranked Flex';
    if (type === 'CHERRY') return 'Arena';
    return type.replace(/_/g, ' ');
  };

  const searchPlayer = async (manualName, manualTag, manualRegion) => {
    setLoading(true);
    setExpandedMatch(null);
    setDetailMatchId(null);
    setProfileTab('overview');

    let searchName;
    let searchTag;
    let searchRegion;

    if (manualName && manualTag) {
      searchName = manualName;
      searchTag = manualTag;
      searchRegion = manualRegion || region;
      setInput(`${manualName}#${manualTag}`);
      setRegion(searchRegion);
    } else {
      const [n, t] = input.split('#').map((s) => s?.trim());
      searchName = n;
      searchTag = t;
      searchRegion = region;
    }

    if (!searchName || !searchTag) {
      alert('Please use Name#Tag format!');
      setLoading(false);
      return;
    }

    try {
      const playerRes = await axios.get(`${API_BASE}/api/player/${searchName}/${searchTag}?region=${searchRegion}`);
      setData(playerRes.data);
      addToHistory(playerRes.data.account.gameName, playerRes.data.account.tagLine, searchRegion, playerRes.data.summoner.profileIconId);

      if (playerRes.data.account.puuid) {
        const matchRes = await axios.get(`${API_BASE}/api/matches/${playerRes.data.account.puuid}?region=${searchRegion}`);
        setMatches(matchRes.data);
      }
    } catch (err) {
      console.error(err);
      alert('Player not found (check region or spelling)');
    }

    setLoading(false);
  };

  const currentIdentity = data
    ? {
        name: data.account.gameName,
        tag: data.account.tagLine,
        region,
        iconId: data.summoner.profileIconId
      }
    : null;

  const isCurrentFavorite = currentIdentity
    ? favoritePlayers.some((entry) => `${entry.name}#${entry.tag}:${entry.region}` === `${currentIdentity.name}#${currentIdentity.tag}:${currentIdentity.region}`)
    : false;

  const toggleFavoriteCurrent = () => {
    if (!currentIdentity) return;

    const exists = favoritePlayers.some((entry) => `${entry.name}#${entry.tag}:${entry.region}` === `${currentIdentity.name}#${currentIdentity.tag}:${currentIdentity.region}`);
    const updated = exists
      ? favoritePlayers.filter((entry) => `${entry.name}#${entry.tag}:${entry.region}` !== `${currentIdentity.name}#${currentIdentity.tag}:${currentIdentity.region}`)
      : [currentIdentity, ...favoritePlayers].slice(0, 12);

    setFavoritePlayers(updated);
    localStorage.setItem('crexus_favorites', JSON.stringify(updated));
  };

  const pinCurrentPlayer = () => {
    if (!currentIdentity) return;
    const nextPinned = pinnedPlayer && `${pinnedPlayer.name}#${pinnedPlayer.tag}:${pinnedPlayer.region}` === `${currentIdentity.name}#${currentIdentity.tag}:${currentIdentity.region}`
      ? null
      : currentIdentity;
    setPinnedPlayer(nextPinned);
    localStorage.setItem('crexus_pinned', JSON.stringify(nextPinned));
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('crexus_recents');
  };

  const openFavorite = (entry) => searchPlayer(entry.name, entry.tag, entry.region);

  const buildShareText = (displayRank, intelligence) => {
    if (!data || !intelligence) return '';
    return [
      `Crexus Scout Report — ${data.account.gameName}#${data.account.tagLine} (${region.toUpperCase()})`,
      displayRank ? `Rank: ${displayRank.tier} ${displayRank.rank} · ${displayRank.leaguePoints} LP` : 'Rank: Unranked',
      `Crexus Score: ${intelligence.crexusScore}/100`,
      `Recent Form: ${intelligence.recentForm}`,
      `Tilt Risk: ${intelligence.tiltRisk?.label || intelligence.tiltRisk}`,
      `Smurf Signal: ${intelligence.smurfSignal?.label || intelligence.smurfSignal}`,
      `One-Trick Risk: ${intelligence.oneTrickRisk?.label || intelligence.oneTrickRisk}`,
      `Early Death Risk: ${intelligence.earlyDeathRisk?.label || intelligence.earlyDeathRisk}`,
      `Main Role: ${intelligence.mainRole?.role || intelligence.mainRole}`,
      `Playstyle Tags: ${intelligence.playstyleTags.join(', ')}`,
      '',
      `Summary: ${intelligence.summary}`
    ].join('\n');
  };

  const openPrintShareView = (displayRank, intelligence) => {
    const shareText = buildShareText(displayRank, intelligence).replace(/\n/g, '<br/>');
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Crexus Report</title>
          <style>
            body { background: #0b0b0d; color: #e5e7eb; font-family: Inter, Arial, sans-serif; margin: 0; padding: 32px; }
            .card { max-width: 820px; margin: 0 auto; background: linear-gradient(180deg, #13151c, #0f1117); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 32px; box-shadow: 0 24px 60px rgba(0,0,0,0.45); }
            .brand { display:flex; align-items:center; gap: 16px; margin-bottom: 24px; }
            .brand img { width: 58px; height: 58px; border-radius: 16px; background: rgba(239,68,68,0.12); padding: 10px; }
            .eyebrow { color: #fca5a5; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 800; }
            h1 { font-size: 34px; margin: 8px 0 0; }
            p { line-height: 1.7; color: #d1d5db; }
            .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 22px 0; }
            .stat { border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 16px; background: rgba(255,255,255,0.04); }
            .label { font-size: 11px; color: #9ca3af; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 800; }
            .value { margin-top: 6px; font-size: 24px; font-weight: 900; color: white; }
            .block { border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 20px; margin-top: 18px; background: rgba(255,255,255,0.03); }
            .chip { display:inline-block; margin: 8px 8px 0 0; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; color: #fecaca; border: 1px solid rgba(239,68,68,0.25); background: rgba(239,68,68,0.1); text-transform: uppercase; }
            @media print { body { background: white; color: #111827; } .card { box-shadow:none; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">
              <img src="${window.location.origin}/crexus-logo.png" alt="Crexus" />
              <div>
                <div class="eyebrow">Crexus Shareable Report</div>
                <h1>${data.account.gameName}#${data.account.tagLine}</h1>
                <p>${displayRank ? `${displayRank.tier} ${displayRank.rank} · ${displayRank.leaguePoints} LP` : 'Unranked'} · ${region.toUpperCase()}</p>
              </div>
            </div>
            <p>${intelligence.summary}</p>
            <div class="grid">
              <div class="stat"><div class="label">Crexus Score</div><div class="value">${intelligence.crexusScore}/100</div></div>
              <div class="stat"><div class="label">Recent Form</div><div class="value">${intelligence.recentForm}</div></div>
              <div class="stat"><div class="label">Tilt Risk</div><div class="value">${intelligence.tiltRisk}</div></div>
              <div class="stat"><div class="label">Smurf Signal</div><div class="value">${intelligence.smurfSignal}</div></div>
            </div>
            <div class="block">
              <div class="label">Playstyle Tags</div>
              <div>${intelligence.playstyleTags.map((tag) => `<span class="chip">${tag}</span>`).join('')}</div>
            </div>
            <div class="block">
              <div class="label">Report Text</div>
              <p>${shareText}</p>
            </div>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-white/10 bg-[#1c2329] p-3 text-xs shadow-xl">
          <p className="mb-1 font-bold text-white">{payload[0].payload.name}</p>
          <p className="text-gray-300">Damage: <span className="font-mono font-bold text-yellow-400">{payload[0].value.toLocaleString()}</span></p>
        </div>
      );
    }
    return null;
  };

  const displayRank = data ? getBestRank(data.ranks) : null;
  const intelligence = data ? analyzePlayerIntelligence({ matches, playerData: data }) : null;
  const detailMatch = useMemo(() => matches.find((m) => m.metadata.matchId === detailMatchId) || null, [detailMatchId, matches]);

  useEffect(() => {
    if (!data?.account?.gameName || !data?.account?.tagLine || !intelligence || !matches.length) return;

    const rank = getBestRank(data.ranks);
    const participants = matches
      .map((match) => match.info.participants.find((p) => p.puuid === data.account.puuid))
      .filter(Boolean);
    const wins = participants.filter((p) => p.win).length;
    const winRate = participants.length ? Math.round((wins / participants.length) * 100) : 0;
    const championCounts = participants.reduce((acc, participant) => {
      acc[participant.championName] = (acc[participant.championName] || 0) + 1;
      return acc;
    }, {});
    const topChampions = Object.entries(championCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, games]) => ({ name, games }));
    const key = `${data.account.gameName}#${data.account.tagLine}:${region}`;
    const allProgress = readStorage('crexus_progress', {});
    const existing = allProgress[key] || [];
    const today = new Date().toISOString().slice(0, 10);
    const snapshot = {
      date: today,
      timestamp: Date.now(),
      name: data.account.gameName,
      tag: data.account.tagLine,
      region,
      iconId: data.summoner.profileIconId,
      crexusScore: intelligence.crexusScore,
      rank: rank ? `${rank.tier} ${rank.rank}` : 'Unranked',
      lp: rank?.leaguePoints || 0,
      winRate,
      matches: participants.length,
      recentForm: intelligence.recentForm,
      tiltRisk: intelligence.tiltRisk?.label || intelligence.tiltRisk,
      mainRole: intelligence.mainRole?.role || intelligence.mainRole || 'Unknown',
      topChampions
    };
    const updated = [snapshot, ...existing.filter((entry) => entry.date !== today)].slice(0, 30);
    localStorage.setItem('crexus_progress', JSON.stringify({ ...allProgress, [key]: updated }));
  }, [data, matches, intelligence, region]);

  return (
    <div className="min-h-screen text-gray-200">
      <div className="crexus-page">
        <header className="mb-5 px-1 py-2">
          <div className="crexus-kicker">v0.8.0 · Game Stats & Information</div>
          <h1 className="crexus-page-title mt-2">Scout Search</h1>
          <p className="crexus-copy mt-2 max-w-3xl">Search a player, review their profile, then use the sidebar for Dashboard, Compare, Champions, Lobby Scout, and Ladder.</p>
        </header>

        <div className="mb-8 rounded-[24px] border border-white/8 bg-[#12141b]/95 p-4 shadow-2xl md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="crexus-kicker">Scout search</div>
              <div className="mt-1 text-sm text-gray-500">This is separated from the app navigation so the buttons do not crowd the search bar.</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_auto] md:items-center">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="crexus-input text-sm font-black uppercase tracking-[0.12em]"
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <input
              className="crexus-input"
              placeholder="Search a player using GameName#Tag"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPlayer()}
            />

            <button onClick={() => searchPlayer()} className="crexus-btn crexus-btn-primary px-7">
              Scout
            </button>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <div className="crexus-card animate-pulse rounded-3xl p-6">
              <div className="mx-auto h-28 w-28 rounded-3xl bg-white/10" />
              <div className="mx-auto mt-5 h-6 w-40 rounded bg-white/10" />
              <div className="mx-auto mt-2 h-4 w-28 rounded bg-white/10" />
              <div className="mt-6 space-y-3">
                <div className="h-12 rounded-2xl bg-white/10" />
                <div className="h-12 rounded-2xl bg-white/10" />
                <div className="h-32 rounded-2xl bg-white/10" />
              </div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="crexus-card animate-pulse rounded-3xl p-6">
                  <div className="h-5 w-48 rounded bg-white/10" />
                  <div className="mt-4 h-20 rounded-2xl bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!data && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="crexus-card rounded-3xl p-6 md:p-8">
                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-red-300">Get Started</div>
                <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Search, pin, favourite, and report</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Crexus now includes saved accounts, a pinned dashboard, progress snapshots, quick refresh controls, profile reports, live tools, and champion/draft reads.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-red-500/15 bg-red-500/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">0.4.1</div>
                    <div className="mt-2 text-lg font-black text-white">UI Polish</div>
                    <div className="mt-1 text-sm text-gray-300">Cleaner layout, mobile-friendly spacing, loading and empty states.</div>
                  </div>
                  <div className="rounded-2xl border border-red-500/15 bg-red-500/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">0.4.2</div>
                    <div className="mt-2 text-lg font-black text-white">Match Detail</div>
                    <div className="mt-1 text-sm text-gray-300">Open a focused match page with timeline, death map, and scoreboards.</div>
                  </div>
                  <div className="rounded-2xl border border-red-500/15 bg-red-500/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200">0.7</div>
                    <div className="mt-2 text-lg font-black text-white">Account Tracking</div>
                    <div className="mt-1 text-sm text-gray-300">Saved accounts, progress history, pinned dashboard, and weekly focus cards are ready before coaching.</div>
                  </div>
                </div>
              </div>

              <div className="crexus-card rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-[0.24em] text-gray-400">Pinned Player</h3>
                  {pinnedPlayer && (
                    <button onClick={() => { setPinnedPlayer(null); localStorage.removeItem('crexus_pinned'); }} className="text-xs font-bold text-red-300 hover:text-red-200">Clear</button>
                  )}
                </div>
                {pinnedPlayer ? (
                  <button onClick={() => searchPlayer(pinnedPlayer.name, pinnedPlayer.tag, pinnedPlayer.region)} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-4 text-left transition hover:border-red-500/30 hover:bg-red-500/10">
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-black text-white">★</div>
                    <div>
                      <div className="font-black text-white">{pinnedPlayer.name} <span className="text-gray-500">#{pinnedPlayer.tag}</span></div>
                      <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{pinnedPlayer.region}</div>
                    </div>
                  </button>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm leading-6 text-gray-400">
                    No pinned player yet. Search someone and pin them from their profile for quick access.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="crexus-card rounded-3xl p-6 xl:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.24em] text-gray-400">Recent Searches</h3>
                  {recentSearches.length > 0 && (
                    <button onClick={clearHistory} className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 hover:text-red-300">Clear history</button>
                  )}
                </div>
                {recentSearches.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {recentSearches.map((item, idx) => (
                      <button
                        key={`${item.name}-${item.tag}-${item.region}-${idx}`}
                        onClick={() => searchPlayer(item.name, item.tag, item.region)}
                        className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-3 text-left transition hover:border-red-500/30 hover:bg-red-500/10"
                      >
                        <img src={`${ddragonBase}/img/profileicon/${item.iconId}.png`} alt={`${item.name} icon`} className="h-11 w-11 rounded-2xl border border-white/10" />
                        <div>
                          <div className="font-bold text-white">{item.name} <span className="text-gray-500">#{item.tag}</span></div>
                          <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{item.region}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-gray-400">Your last searches will show up here for quick repeat scouting.</div>
                )}
              </div>

              <div className="crexus-card rounded-3xl p-6">
                <h3 className="text-sm font-black uppercase tracking-[0.24em] text-gray-400">Favourites</h3>
                {favoritePlayers.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {favoritePlayers.slice(0, 6).map((item) => (
                      <div key={`${item.name}-${item.tag}-${item.region}`} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 p-3">
                        <button onClick={() => openFavorite(item)} className="text-left">
                          <div className="font-bold text-white">{item.name} <span className="text-gray-500">#{item.tag}</span></div>
                          <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{item.region}</div>
                        </button>
                        <button
                          onClick={() => {
                            const updated = favoritePlayers.filter((entry) => `${entry.name}#${entry.tag}:${entry.region}` !== `${item.name}#${item.tag}:${item.region}`);
                            setFavoritePlayers(updated);
                            localStorage.setItem('crexus_favorites', JSON.stringify(updated));
                          }}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-gray-400">Favourite players will show here for faster daily use.</div>
                )}
              </div>
            </div>

            {serverData && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="crexus-card rounded-3xl p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.24em] text-gray-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Server Status ({region.toUpperCase()})
                  </h3>
                  {serverData.status.maintenances.length === 0 && serverData.status.incidents.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200">
                      <div className="font-black uppercase tracking-[0.18em]">All Systems Operational</div>
                      <div className="mt-1 text-sm text-emerald-100/80">No current incidents or maintenance affecting the selected region.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {serverData.status.maintenances.map((m, i) => (
                        <div key={i} className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-200">
                          <div className="font-black uppercase tracking-[0.18em]">Maintenance</div>
                          <div className="mt-1 text-sm text-yellow-100/90">{m.titles[0]?.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="crexus-card rounded-3xl p-6">
                  <h3 className="mb-4 text-sm font-black uppercase tracking-[0.24em] text-gray-400">Free Rotation</h3>
                  <div className="flex flex-wrap gap-2">
                    {serverData.rotation.slice(0, 14).map((id) => (
                      <img key={id} src={champs[id] ? `${ddragonBase}/img/champion/${champs[id]}.png` : ''} alt={champs[id] || 'Champion'} className="h-12 w-12 rounded-xl border border-white/10" />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {data && !loading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="space-y-6 lg:sticky lg:top-6 lg:col-span-1 lg:h-fit">
              <div className="crexus-card rounded-[28px] p-6 text-center">
                <div className="relative inline-block">
                  <img src={`${ddragonBase}/img/profileicon/${data.summoner.profileIconId}.png`} alt={`${data.account.gameName} icon`} className="mx-auto h-28 w-28 rounded-[24px] border-4 border-white/10 shadow-2xl" />
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#1f232d] px-3 py-1 text-xs font-bold text-gray-200 shadow-lg">
                    Level {data.summoner.summonerLevel}
                  </span>
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-tight text-white">
                  {data.account.gameName}
                  <span className="ml-1 text-xl font-medium text-gray-500">#{data.account.tagLine}</span>
                </h2>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300">{region.toUpperCase()} scout target</div>

                <div className="mt-6 grid grid-cols-1 gap-2">
                  <button onClick={() => onLiveClick(data.account.puuid, region)} className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_22px_rgba(239,68,68,0.35)] transition hover:bg-red-500">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-200 opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
                    </span>
                    Live Scout
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={toggleFavoriteCurrent} className={`rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${isCurrentFavorite ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200' : 'border-white/10 bg-white/5 text-gray-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-white'}`}>
                      {isCurrentFavorite ? '★ Saved' : '☆ Save'}
                    </button>
                    <button onClick={pinCurrentPlayer} className={`rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${pinnedPlayer && currentIdentity && `${pinnedPlayer.name}#${pinnedPlayer.tag}:${pinnedPlayer.region}` === `${currentIdentity.name}#${currentIdentity.tag}:${currentIdentity.region}` ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-white/10 bg-white/5 text-gray-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-white'}`}>
                      Pin
                    </button>
                    <button onClick={() => setShowShareCard(true)} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-gray-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white">
                      Share
                    </button>
                  </div>
                </div>

                {displayRank ? (
                  <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-inner">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">{formatQueueType(displayRank.queueType)}</div>
                    <p className="mt-2 text-2xl font-black tracking-wider text-white">{displayRank.tier} {displayRank.rank}</p>
                    <p className="mt-1 font-mono text-sm text-gray-400">{displayRank.leaguePoints} LP</p>
                    <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                      Winrate <span className="text-white">{((displayRank.wins / (displayRank.wins + displayRank.losses)) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-8 rounded-2xl border border-white/10 bg-[#0d1117] p-6 italic text-gray-500">Unranked</p>
                )}

                {data.mastery && data.mastery.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-gray-400">Top Champions</h3>
                    <div className="flex justify-center gap-4">
                      {data.mastery.map((champ) => (
                        <div key={champ.championId} className="flex flex-col items-center">
                          <div className="relative">
                            <img src={champs[champ.championId] ? `${ddragonBase}/img/champion/${champs[champ.championId]}.png` : 'https://via.placeholder.com/48'} alt={champs[champ.championId] || 'Champion'} className="h-12 w-12 rounded-full border-2 border-white/10" />
                            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-gray-900 text-[10px] font-bold text-yellow-400">{champ.championLevel}</div>
                          </div>
                          <p className="mt-2 text-xs text-gray-400">{formatPoints(champ.championPoints)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {matches.length > 0 && (
                  <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d1117] p-2 h-64">
                    <h3 className="mb-2 text-center text-xs font-black uppercase tracking-[0.22em] text-gray-500">Playstyle Analysis</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={calculateRadarData()}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Player" dataKey="A" stroke="#ef4444" strokeWidth={2} fill="#ef4444" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <WinRateChart matches={matches} puuid={data.account.puuid} />
              </div>
            </div>

            <div ref={profileContentRef} className="scroll-mt-6 lg:col-span-3 space-y-4">
              <div className="crexus-card rounded-[28px] p-2 sticky top-4 z-20 flex flex-wrap gap-2">
                <button
                  onClick={() => jumpToProfileTab('overview')}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${profileTab === 'overview' ? 'bg-red-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.35)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  Player Overview
                </button>
                <button
                  onClick={() => jumpToProfileTab('matches')}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${profileTab === 'matches' ? 'bg-red-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.35)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  Previous Matches
                </button>
                <button
                  onClick={() => jumpToProfileTab('champions')}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${profileTab === 'champions' ? 'bg-red-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.35)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  Champion Insights
                </button>
                <button
                  onClick={() => jumpToProfileTab('coach')}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${profileTab === 'coach' ? 'bg-red-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.35)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  Coach
                </button>
              </div>

              {profileTab === 'overview' && (
                <div className="space-y-4">
                  <CrexusReport intelligence={intelligence} matches={matches} puuid={data.account.puuid} />
                  <PlayerIntelligenceCard intelligence={intelligence} />
                  <LanePhaseAnalysis matches={matches} puuid={data.account.puuid} />
                  <TimelineIntelligence matches={matches} puuid={data.account.puuid} />
                  <PerformanceTrends matches={matches} puuid={data.account.puuid} />
                  <ChampionPool matches={matches} puuid={data.account.puuid} ddragonBase={ddragonBase} />
                  <ObjectiveControl matches={matches} puuid={data.account.puuid} />
                </div>
              )}

              {profileTab === 'champions' && (
                <ChampionInsights playerData={data} matches={matches} region={region} />
              )}

              {profileTab === 'coach' && (
                <CoachingLayer playerData={data} matches={matches} />
              )}

              {profileTab === 'matches' && (
                <div className="space-y-4">
                  {!detailMatch && (
                    <>
                      <div className="crexus-card rounded-[28px] p-5 md:p-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-300">Match Detail Page</div>
                            <h3 className="mt-1 text-2xl font-black text-white">Previous Matches</h3>
                            <p className="mt-2 text-sm text-gray-400">Open any match to drill into a dedicated review page with lane timeline, death heatmap, and team scoreboards.</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                            {matches.length} recent matches loaded
                          </div>
                        </div>
                      </div>

                      <MatchDetailRead matches={matches} puuid={data.account.puuid} />
                    </>
                  )}

                  {detailMatch ? (
                    <MatchDetailPage
                      match={detailMatch}
                      participant={detailMatch.info.participants.find((p) => p.puuid === data.account.puuid)}
                      puuid={data.account.puuid}
                      region={region}
                      ddragonBase={ddragonBase}
                      queues={queues}
                      getSpellIcon={getSpellIcon}
                      getRuneIcon={getRuneIcon}
                      onBack={() => setDetailMatchId(null)}
                    />
                  ) : (
                    matches.map((match) => {
                      const participant = match.info.participants.find((p) => p.puuid === data.account.puuid);
                      if (!participant) return null;

                      const isWin = participant.win;
                      const isSurrender = match.info.participants.some((p) => p.gameEndedInSurrender);
                      const queueName = queues[match.info.queueId] || 'Normal';
                      const formatQueue = (name) => name.replace('5v5 Ranked Solo games', 'Ranked Solo').replace('5v5 Ranked Flex games', 'Ranked Flex').replace('games', '');

                      const isExpanded = expandedMatch === match.metadata.matchId;
                      const chartData = match.info.participants.map((p) => ({
                        name: p.championName,
                        damage: p.totalDamageDealtToChampions,
                        team: p.teamId === 100 ? 'blue' : 'red',
                        isUser: p.puuid === data.account.puuid
                      }));

                      const cardClasses = isWin
                        ? 'border-l-blue-400 bg-gradient-to-r from-red-950/10 to-[#161d23]'
                        : 'border-l-red-500 bg-gradient-to-r from-red-900/10 to-[#161d23]';
                      const textClasses = isWin ? 'text-red-200' : 'text-red-300';

                      return (
                        <div key={match.metadata.matchId} className="transition-all duration-300">
                          <div className={`relative cursor-pointer rounded-2xl border-l-[6px] border-y border-r border-white/6 p-4 shadow-md hover:bg-white/[0.03] ${cardClasses}`} onClick={() => toggleMatch(match.metadata.matchId)}>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                              <div className="w-full md:w-28 text-left">
                                <div className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] opacity-80 ${isWin ? 'text-red-300' : 'text-red-400'}`}>{formatQueue(queueName)}</div>
                                <div className={`flex items-center gap-2 text-lg font-black ${textClasses}`}>
                                  {isWin ? 'VICTORY' : 'DEFEAT'}
                                  {isSurrender && <span className="rounded bg-gray-700 px-1 text-[9px] text-gray-300">FF</span>}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">{Math.floor(match.info.gameDuration / 60)}m {match.info.gameDuration % 60}s</div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <img src={`${ddragonBase}/img/champion/${participant.championName}.png`} alt={participant.championName} className="h-14 w-14 rounded-lg shadow-lg" />
                                  <div className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#0a0e13] text-[10px] font-bold text-gray-300">{participant.champLevel}</div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex gap-1">
                                    <img src={`${ddragonBase}/img/spell/${getSpellIcon(participant.summoner1Id)}`} alt="Spell 1" className="h-6 w-6 rounded md:h-5 md:w-5" />
                                    <img src={`${ddragonBase}/img/spell/${getSpellIcon(participant.summoner2Id)}`} alt="Spell 2" className="h-6 w-6 rounded md:h-5 md:w-5" />
                                  </div>
                                  <div className="flex gap-1">
                                    <div className="h-6 w-6 overflow-hidden rounded-full bg-black/50 p-[2px] md:h-5 md:w-5">
                                      <img src={`${DDRAGON_IMG}/${getRuneIcon(participant.perks.styles[0].style, participant.perks.styles[0].selections[0].perk)}`} alt="Primary rune" className="h-full w-full scale-110" />
                                    </div>
                                    <div className="h-6 w-6 overflow-hidden rounded-full bg-black/50 p-[3px] md:h-5 md:w-5">
                                      <img src={`${DDRAGON_IMG}/${getRuneIcon(participant.perks.styles[1].style)}`} alt="Secondary rune" className="h-full w-full opacity-80" />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1 pl-0 md:pl-4">
                                <MatchBadges match={match} puuid={data.account.puuid} />
                                <MatchInsightMini matches={matches} puuid={data.account.puuid} matchId={match.metadata.matchId} />
                                <div className="mt-2 text-xl font-bold text-white">
                                  {participant.kills} <span className="text-gray-600">/</span> <span className="text-red-400">{participant.deaths}</span> <span className="text-gray-600">/</span> {participant.assists}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                  <span className="text-gray-500">KDA: </span>
                                  <span className={((participant.kills + participant.assists) / (participant.deaths || 1)) > 3 ? 'font-bold text-red-200' : 'text-gray-300'}>
                                    {((participant.kills + participant.assists) / (participant.deaths || 1)).toFixed(2)}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs font-mono">
                                  <span className={getCsColor(participant.totalMinionsKilled / (match.info.gameDuration / 60))}>
                                    {(participant.totalMinionsKilled / (match.info.gameDuration / 60)).toFixed(1)} CS/m
                                  </span>
                                  <span className="ml-1 text-gray-600">({participant.totalMinionsKilled})</span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-3">
                                <div className="grid grid-cols-3 gap-1">
                                  {[participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5].map((item, i) => (
                                    <div key={i} className="relative h-8 w-8 overflow-hidden rounded-[4px] border border-white/6 bg-[#0a0e13]">
                                      {item !== 0 && <img src={`${ddragonBase}/img/item/${item}.png`} alt={`Item ${item}`} className="h-full w-full" />}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 overflow-hidden rounded-full border border-white/6 bg-[#0a0e13]">
                                    {participant.item6 !== 0 && <img src={`${ddragonBase}/img/item/${participant.item6}.png`} alt={`Item ${participant.item6}`} className="h-full w-full" />}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDetailMatchId(match.metadata.matchId); }}
                                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-red-200 transition hover:bg-red-500/20"
                                  >
                                    Detail
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="absolute right-3 top-3 text-xs text-gray-600">{isExpanded ? '▲' : '▼'}</div>
                          </div>

                          {isExpanded && (
                            <div className="animate-in slide-in-from-top-2 rounded-b-2xl border-x border-b border-white/6 bg-[#11161d] p-4 duration-200">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                  <h3 className="mb-2 text-center text-xs font-black uppercase tracking-[0.22em] text-gray-500">Damage Dealt</h3>
                                  <div className="mb-6 h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="damage" radius={[0, 4, 4, 0]}>
                                          {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.team === 'blue' ? '#3b82f6' : '#ef4444'} opacity={entry.isUser ? 1 : 0.4} stroke={entry.isUser ? '#ffffff' : 'none'} strokeWidth={entry.isUser ? 1 : 0} />
                                          ))}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <MatchTimeline matchId={match.metadata.matchId} participantId={participant.participantId} participants={match.info.participants} region={region} />
                                </div>
                                <div className="flex flex-col items-center justify-start">
                                  <DeathHeatmap matchId={match.metadata.matchId} participantId={participant.participantId} region={region} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showShareCard && data && intelligence && (
        <ShareableReportCard
          player={data}
          region={region}
          intelligence={intelligence}
          displayRank={displayRank}
          shareText={buildShareText(displayRank, intelligence)}
          onClose={() => setShowShareCard(false)}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(buildShareText(displayRank, intelligence));
              alert('Crexus report copied.');
            } catch {
              alert('Could not copy report text.');
            }
          }}
          onPrint={() => openPrintShareView(displayRank, intelligence)}
        />
      )}
    </div>
  );
}

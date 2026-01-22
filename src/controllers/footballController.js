// import axios from 'axios';

// /* ===============================
//    AXIOS CLIENT
// ================================ */
// const api = axios.create({
//   baseURL: 'https://v3.football.api-sports.io',
//   timeout: 25000,
//   headers: {
//     'x-apisports-key': process.env.RAPIDAPI_KEY,
//     'x-rapidapi-host': 'v3.football.api-sports.io',
//   },
// });

// /* ===============================
//    HELPERS
// ================================ */
// const percent = (v) => (v ? parseInt(v.replace('%', ''), 10) : 0);

// const parseForm = (form) =>
//   form ? form.split('').slice(0, 5) : [];

// /* ===============================
//    BTTS ESTIMATION
// ================================ */
// const estimateBTTS = ({ homeWin, awayWin, over25Goals }) => {
//   const yes = Math.round(((homeWin + awayWin) / 2) * (over25Goals / 100));
//   return {
//     yes: Math.min(Math.max(yes, 0), 100),
//     no: Math.min(Math.max(100 - yes, 0), 100),
//   };
// };

// /* ===============================
//    MOST LIKELY SCORE ESTIMATION
// ================================ */
// const estimateLikelyScore = ({ homeWin, awayWin, draw, over25Goals }) => {
//   let homeXG = 1.1 + (homeWin - awayWin) / 45;
//   let awayXG = 1.1 - (homeWin - awayWin) / 45;

//   if (over25Goals >= 70) {
//     homeXG += 0.8;
//     awayXG += 0.8;
//   } else if (over25Goals <= 35) {
//     homeXG -= 0.5;
//     awayXG -= 0.5;
//   }

//   if (draw >= 45) {
//     homeXG -= 0.3;
//     awayXG -= 0.3;
//   }

//   homeXG = Math.max(0, Math.min(homeXG, 4));
//   awayXG = Math.max(0, Math.min(awayXG, 4));

//   const bucket = (x) => (x < 0.7 ? 0 : x < 1.4 ? 1 : x < 2.2 ? 2 : x < 3.2 ? 3 : 4);

//   return `${bucket(homeXG)}-${bucket(awayXG)}`;
// };

// /* ===============================
//    MAP PREDICTION → UI
// ================================ */
// const mapPredictionToUI = (r) => {
//   if (!r?.predictions) return null;

//   const homeWin = percent(r.predictions.percent?.home);
//   const draw = percent(r.predictions.percent?.draw);
//   const awayWin = percent(r.predictions.percent?.away);

//   const confidence = Math.max(homeWin, awayWin);

//   const isUnder25 = r.predictions.under_over?.includes('2.5');
//   const under25Goals = isUnder25 ? confidence : 100 - confidence;
//   const over25Goals = 100 - under25Goals;

//   const btts = estimateBTTS({ homeWin, awayWin, over25Goals });
//   const likelyScore = estimateLikelyScore({ homeWin, awayWin, draw, over25Goals });

//   return {
//     predictions: {
//       homeWin,
//       draw,
//       awayWin,
//       over25Goals,
//       under25Goals,
//       bttsYes: btts.yes,
//       bttsNo: btts.no,
//       confidence,
//       mostLikelyScore: likelyScore,
//     },
//     aiInsights: r.predictions.advice ? [r.predictions.advice] : [],
//     recentForm: {
//       home: parseForm(r.teams?.home?.last_5?.form),
//       away: parseForm(r.teams?.away?.last_5?.form),
//     },
//   };
// };

// /* ===============================
//    FETCH PREDICTION
// ================================ */
// const fetchPrediction = async (fixtureId) => {
//   try {
//     const { data } = await api.get('/predictions', {
//       params: { fixture: fixtureId },
//     });

//     const r = data.response?.[0];
//     if (!r) return null;

//     return mapPredictionToUI(r);
//   } catch (err) {
//     console.error(`❌ Prediction failed for ${fixtureId}`, err.message);
//     return null;
//   }
// };

// /* ===============================
//    DETERMINE TOP EVENT
//    Using a dynamic priority score
// ================================ */
// const calculateTopEventScore = (predictions, match) => {
//   if (!predictions) return 0;

//   const { confidence, over25Goals, bttsYes } = predictions;
//   let score = 0;

//   // Weight factors
//   score += confidence * 2;      // AI confidence
//   score += over25Goals * 1.5;   // High-scoring match
//   score += bttsYes * 1;          // Likely both teams score

//   // Popular leagues/teams bonus
//   const popularLeagues = ['Champions League', 'Premier League', 'La Liga', 'Africa Cup of Nations'];
//   const popularTeams = ['Barcelona', 'Real Madrid', 'Manchester United', 'Liverpool'];

//   if (popularLeagues.includes(match.league)) score += 20;
//   if (popularTeams.includes(match.team1.name) || popularTeams.includes(match.team2.name)) score += 15;

//   return score;
// };

// /* ===============================
//    FORMAT MATCH → UI
// ================================ */
// const formatMatch = async (fixture) => {
//   const ai = await fetchPrediction(fixture.fixture.id);
//   const kickoff = new Date(fixture.fixture.date);

//   // Calculate top event score
//   const topScore = ai ? calculateTopEventScore(ai.predictions, {
//     league: fixture.league.name,
//     team1: fixture.teams.home,
//     team2: fixture.teams.away
//   }) : 0;

//   return {
//     id: String(fixture.fixture.id),
//     league: fixture.league.name,
//     leagueLogo: fixture.league.logo,
//     matchDay: fixture.league.round,
//     date: kickoff.toISOString().split('T')[0],
//     time: kickoff.toISOString().split('T')[1].slice(0, 5),
//     status: fixture.fixture.status.short,
//     venue: fixture.fixture.venue?.name || null,
//     team1: {
//       name: fixture.teams.home.name,
//       shortName: fixture.teams.home.name.slice(0, 3).toUpperCase(),
//       logo: fixture.teams.home.logo,
//       score: fixture.goals.home,
//       form: ai?.recentForm?.home?.join('-') || null,
//     },
//     team2: {
//       name: fixture.teams.away.name,
//       shortName: fixture.teams.away.name.slice(0, 3).toUpperCase(),
//       logo: fixture.teams.away.logo,
//       score: fixture.goals.away,
//       form: ai?.recentForm?.away?.join('-') || null,
//     },
//     currentTime: null,
//     predictions: ai?.predictions || null,
//     aiInsights: ai?.aiInsights || [],
//     topEventScore: topScore, // for frontend sorting
//   };
// };

// /* ===============================
//    GET UPCOMING MATCHES
// ================================ */
// export const getMatchesForUI = async (req, res) => {
//   try {
//     const { data } = await api.get('/fixtures', {
//       params: {
//         status: 'NS',
//         next: 15,   // fetch more to allow carousel selection
//         timezone: 'Africa/Douala',
//       },
//     });

//     const now = new Date();

//     const fixtures = data.response?.filter(
//       (f) => f.fixture.status.short === 'NS' && new Date(f.fixture.date) > now
//     ) || [];

//     const matches = [];
//     for (const fixture of fixtures) {
//       matches.push(await formatMatch(fixture));
//     }

//     // Sort descending by topEventScore
//     const sortedMatches = matches.sort((a, b) => (b.topEventScore || 0) - (a.topEventScore || 0));

//     res.json({
//       success: true,
//       count: matches.length,
//       data: sortedMatches,
//     });
//   } catch (err) {
//     console.error('❌ Matches error:', err.message);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch matches',
//     });
//   }
// };

// /* ===============================
//    GET MATCH DETAILS
// ================================ */
// export const getMatchDetailsForUI = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const { data } = await api.get('/fixtures', { params: { id } });

//     if (!data.response?.length) {
//       return res.status(404).json({ success: false, error: 'Match not found' });
//     }

//     const match = await formatMatch(data.response[0]);
//     res.json({ success: true, data: match });
//   } catch {
//     res.status(500).json({ success: false, error: 'Failed to fetch match' });
//   }
// };






import axios from 'axios';

/* ===============================
   AXIOS CLIENT
================================ */
const api = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  timeout: 60000,
  headers: {
    'x-apisports-key': process.env.RAPIDAPI_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  },
});

/* ===============================
   IN-MEMORY CACHE
================================ */
const teamStatsCache = new Map();

/* ===============================
   HELPERS
================================ */
const pct = (v) =>
  typeof v === 'string' ? parseInt(v.replace('%', ''), 10) : 0;

const clamp = (v, min = 0, max = 100) =>
  Math.min(Math.max(v, min), max);

/* ===============================
   FETCH TEAM STATS (REAL CLEAN SHEET)
================================ */
const fetchTeamStats = async (teamId, leagueId, season) => {
  const key = `${teamId}-${leagueId}-${season}`;
  if (teamStatsCache.has(key)) return teamStatsCache.get(key);

  const { data } = await api.get('/teams/statistics', {
    params: { team: teamId, league: leagueId, season },
  });

  const stats = data.response;
  teamStatsCache.set(key, stats);
  return stats;
};

const calcCleanSheetPercent = (stats) => {
  if (!stats?.fixtures?.played?.total) return null;
  return Math.round(
    (stats.clean_sheet.total / stats.fixtures.played.total) * 100
  );
};

/* ===============================
   BTTS RESOLVER
================================ */
const resolveBTTS = (pred) => {
  if (pred.btts?.yes && pred.btts?.no) {
    return {
      yes: pct(pred.btts.yes),
      no: pct(pred.btts.no),
    };
  }

  const base = (pct(pred.percent.home) + pct(pred.percent.away)) / 2;
  const modifier = pred.goals?.over?.includes('2.5') ? 1.15 : 0.85;
  const yes = clamp(Math.round(base * modifier));
  return { yes, no: 100 - yes };
};

/* ===============================
   MOST LIKELY SCORE ENGINE
================================ */
const generateLikelyScore = ({
  homeWin,
  awayWin,
  draw,
  over25,
  csHome,
  csAway,
}) => {
  let homeXG = 1.25;
  let awayXG = 1.25;

  const diff = homeWin - awayWin;
  homeXG += diff / 35;
  awayXG -= diff / 45;

  if (over25 >= 65) {
    homeXG += 0.7;
    awayXG += 0.6;
  } else if (over25 <= 35) {
    homeXG -= 0.5;
    awayXG -= 0.5;
  }

  if (csHome >= 55) awayXG -= 0.6;
  if (csAway >= 55) homeXG -= 0.6;

  if (draw >= 40) {
    homeXG -= 0.25;
    awayXG -= 0.25;
  }

  homeXG = Math.max(0, Math.min(homeXG, 4.5));
  awayXG = Math.max(0, Math.min(awayXG, 4.5));

  const roundSmart = (x) => {
    const base = Math.floor(x);
    return Math.random() < x - base ? base + 1 : base;
  };

  return `${roundSmart(homeXG)}-${roundSmart(awayXG)}`;
};

/* ===============================
   FETCH PREDICTION
================================ */
const fetchPrediction = async (fixtureId) => {
  try {
    const { data } = await api.get('/predictions', {
      params: { fixture: fixtureId },
    });

    return data.response?.[0] || null;
  } catch (err) {
    console.error(`❌ Prediction failed for ${fixtureId}`);
    return null;
  }
};

/* ===============================
   FORMAT MATCH → UI
================================ */
const formatMatch = async (fixture) => {
  const prediction = await fetchPrediction(fixture.fixture.id);

  const homeWin = pct(prediction?.predictions?.percent?.home);
  const draw = pct(prediction?.predictions?.percent?.draw);
  const awayWin = pct(prediction?.predictions?.percent?.away);

  const confidence = Math.max(homeWin, awayWin);
  const isUnder = prediction?.predictions?.under_over?.includes('2.5');
  const under25Goals = isUnder ? confidence : 100 - confidence;
  const over25Goals = 100 - under25Goals;

  const homeStats = await fetchTeamStats(
    fixture.teams.home.id,
    fixture.league.id,
    fixture.league.season
  );
  const awayStats = await fetchTeamStats(
    fixture.teams.away.id,
    fixture.league.id,
    fixture.league.season
  );

  const cleanSheetHome = calcCleanSheetPercent(homeStats);
  const cleanSheetAway = calcCleanSheetPercent(awayStats);

  const btts = resolveBTTS(prediction?.predictions || {});
  const mostLikelyScore = generateLikelyScore({
    homeWin,
    awayWin,
    draw,
    over25: over25Goals,
    csHome: cleanSheetHome || 0,
    csAway: cleanSheetAway || 0,
  });

  const kickoff = new Date(fixture.fixture.date);

  return {
    id: String(fixture.fixture.id),

    league: fixture.league.name,
    leagueLogo: fixture.league.logo,
    matchDay: fixture.league.round,

    date: kickoff.toISOString().split('T')[0],
    time: kickoff.toISOString().split('T')[1].slice(0, 5),
    status: fixture.fixture.status.short,

    venue: fixture.fixture.venue?.name || null,

    team1: {
      name: fixture.teams.home.name,
      shortName: fixture.teams.home.name.slice(0, 3).toUpperCase(),
      logo: fixture.teams.home.logo,
      score: fixture.goals.home,
      form: prediction?.teams?.home?.last_5?.form || null,
    },

    team2: {
      name: fixture.teams.away.name,
      shortName: fixture.teams.away.name.slice(0, 3).toUpperCase(),
      logo: fixture.teams.away.logo,
      score: fixture.goals.away,
      form: prediction?.teams?.away?.last_5?.form || null,
    },

    predictions: {
      homeWin,
      draw,
      awayWin,
      over25Goals,
      under25Goals,
      bttsYes: btts.yes,
      bttsNo: btts.no,
      cleanSheetHome,
      cleanSheetAway,
      confidence,
      mostLikelyScore,
    },

    aiInsights: prediction?.predictions?.advice
      ? [prediction.predictions.advice]
      : [],

    isTopEvent: confidence >= 75,
  };
};

/* ===============================
   GET UPCOMING MATCHES
================================ */
export const getMatchesForUI = async (req, res) => {
  console.log('🔍 Attempting to fetch matches...');
  console.log('API Key exists:', !!process.env.RAPIDAPI_KEY);
  console.log('API URL:', api.defaults.baseURL);
  
  try {
    console.log('📡 Making API request to /fixtures...');
    const { data } = await api.get('/fixtures', {
      params: {
        status: 'NS',
        next: 25,
      },
    });
    
    console.log('✅ API Response received:', data?.response?.length || 0, 'fixtures');

    const now = Date.now();
    const fixtures = data.response?.filter(
      (f) => f.fixture.status.short === 'NS' && new Date(f.fixture.date).getTime() > now
    ) || [];

    console.log('📊 Filtered fixtures:', fixtures.length);

    // Limit processing to avoid timeouts
    const limitedFixtures = fixtures.slice(0, 25); // Start with just 10
    
    const matches = [];
    for (const fixture of limitedFixtures) {
      console.log(`Processing fixture ${fixture.fixture.id}...`);
      matches.push(await formatMatch(fixture));
    }

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (err) {
    console.error('❌ Matches error details:', {
      message: err.message,
      code: err.code,
      hostname: err.hostname,
      address: err.address,
      port: err.port,
      config: {
        url: err.config?.url,
        baseURL: err.config?.baseURL,
        timeout: err.config?.timeout,
      }
    });
    
    // Check if it's a DNS issue
    if (err.code === 'ENOTFOUND') {
      console.error('🔴 DNS ERROR: Cannot resolve v3.football.api-sports.io');
      console.error('Please check:');
      console.error('1. Your internet connection');
      console.error('2. DNS settings on your server');
      console.error('3. Firewall restrictions');
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      details: err.message,
    });
  }
};


/* ===============================
   GET MATCH DETAILS
================================ */
// ✅ Fetch upcoming matches for a specific league
export const getMatchesByLeagueForUI = async (req, res) => {
  try {
    const { leagueId } = req.params;

    // 🚨 FILTER BY LEAGUE AT API LEVEL
    const { data } = await api.get('/fixtures', {
      params: {
        league: leagueId, // ✅ THIS IS THE KEY FIX
        status: 'NS',
        next: 25,
      },
    });

    const matches = [];

    for (const fixture of data.response || []) {
      matches.push(await formatMatch(fixture));
    }

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (err) {
    console.error('❌ Matches by league error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches for league',
    });
  }
};

// controllers/footballController.js

// controllers/footballController.js

// controllers/footballController.js

const CURRENT_SEASON = 2025; // API-Football season = end year

export const getUpcomingMatchesByTeamName = async (req, res) => {
  try {
    const { team } = req.query;

    if (!team || team.trim().length < 2) {
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    /* =================================================
       1️⃣ SEARCH TEAM BY NAME
    ================================================= */
    const teamSearch = await api.get('/teams', {
      params: { search: team },
    });

    const foundTeam = teamSearch.data.response?.[0];

    if (!foundTeam) {
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const teamId = foundTeam.team.id;

    /* =================================================
       2️⃣ FETCH UPCOMING FIXTURES FOR THAT TEAM
       🚨 season IS REQUIRED BY API-FOOTBALL
    ================================================= */
    const fixturesRes = await api.get('/fixtures', {
      params: {
        team: teamId,
        season: CURRENT_SEASON,
        status: 'NS',
        next: 20,
      },
    });

    const fixtures = fixturesRes.data.response || [];

    /* =================================================
       3️⃣ FORMAT USING SAME PIPELINE AS UI
    ================================================= */
    const matches = [];
    for (const fixture of fixtures) {
      matches.push(await formatMatch(fixture));
    }

    /* =================================================
       4️⃣ RESPONSE (SAME STRUCTURE AS OTHERS)
    ================================================= */
    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (err) {
    console.error('❌ Team search error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches by team',
    });
  }
};





export const getMatchDetailsForUI = async (req, res) => {
  try {
    const { id } = req.params;

    const { data } = await api.get('/fixtures', {
      params: { id },
    });

    if (!data.response?.length) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
      });
    }

    const match = await formatMatch(data.response[0]);

    res.json({
      success: true,
      data: match,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match',
    });
  }
};

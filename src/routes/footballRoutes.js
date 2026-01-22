// import express from 'express';
// import {
//   getMatches,
//   getMatchDetails,
//   getUpcomingPremierLeagueMatches,
//   getPremierLeagueMatchDetails,
//   getPremierLeagueMatchesByDate
// } from '../controllers/footballController.js';

// const router = express.Router();

// // Existing routes
// router.get('/matches', getMatches);
// router.get('/match/:id', getMatchDetails);

// // New Premier League specific routes
// router.get('/premier-league/upcoming', getUpcomingPremierLeagueMatches);
// router.get('/premier-league/match/:id', getPremierLeagueMatchDetails);
// router.get('/premier-league/by-date', getPremierLeagueMatchesByDate);

// export default router;


import express from 'express';
import {
  getMatchesForUI,
  getMatchesByLeagueForUI,
  getMatchDetailsForUI,
 getUpcomingMatchesByTeamName
} from '../controllers/footballController.js';

const router = express.Router();

// Existing route for all matches
router.get('/matches', getMatchesForUI);

// ✅ New route for matches by league
router.get('/matches/league/:leagueId', getMatchesByLeagueForUI);

// Existing route for match details
router.get('/matches/:id', getMatchDetailsForUI);

// routes/footballRoutes.js
// routes/footballRoutes.js

router.get(
  '/matches/search',
  getUpcomingMatchesByTeamName
);



export default router;

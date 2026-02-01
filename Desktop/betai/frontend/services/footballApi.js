import axios from 'axios';

const API_BASE_URL = 'https://betai-backend-uxt5.onrender.com/api/football'; // your backend

// Fetch all upcoming matches (existing)
export const fetchMatches = async () => {
  const res = await axios.get(`${API_BASE_URL}/matches`);
  return res.data;
};

// ✅ New: fetch upcoming matches for a specific league
export const fetchMatchesByLeague = async (leagueId) => {
  const res = await axios.get(`${API_BASE_URL}/matches/league/${leagueId}`);
  return res.data;
};

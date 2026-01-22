import axios from "axios";
import dotenv from "dotenv";
import Fixture from "./src/models/fixtures.js";
import connectDB from "./src/lib/db.js";

dotenv.config();
await connectDB();

/* ===============================
   AXIOS CLIENT (OFFICIAL API)
================================ */
const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  timeout: 15000,
  headers: {
    "x-apisports-key": process.env.RAPIDAPI_KEY,
  },
});

/* ===============================
   HELPERS
================================ */
function isFutureFixture(fixtureDate) {
  return new Date(fixtureDate) > new Date();
}

/* ===============================
   FETCH MARKETS
================================ */
const fetchMarkets = async () => {
  try {
    console.log("📡 Fetching upcoming fixtures from API-Football (Official)...");

    const excludedIndexes = [0, 1, 2, 8, 9, 10, 11, 13, 16, 17, 28, 29, 30, 31];
    const collectedFixtures = [];
    let dayOffset = 0;

    while (collectedFixtures.length < 15 && dayOffset < 7) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dateStr = targetDate.toISOString().split("T")[0];

      console.log(`📅 Checking fixtures for ${dateStr}...`);

      /* ===============================
         FETCH ODDS
      ================================ */
      const oddsRes = await api.get("/odds", {
        params: {
          date: dateStr,
          bookmaker: 11,
        },
      });

      for (const item of oddsRes.data.response) {
        if (collectedFixtures.length >= 15) break;

        const fixtureId = item.fixture.id;

        /* ===============================
           FETCH FIXTURE DETAILS
        ================================ */
        const fixtureRes = await api.get("/fixtures", {
          params: { id: fixtureId },
        });

        const fixtureData = fixtureRes.data.response[0];
        if (!fixtureData) continue;

        const fixtureDate = fixtureData.fixture?.date;
        if (!isFutureFixture(fixtureDate)) continue;

        const homeTeam = fixtureData.teams.home.name;
        const awayTeam = fixtureData.teams.away.name;

        const bets = item.bookmakers?.[0]?.bets || [];
        const filteredBets = bets.filter(
          (_, index) => !excludedIndexes.includes(index)
        );

        collectedFixtures.push({
          fixture_id: fixtureId,
          homeTeam,
          awayTeam,
          league: fixtureData.league.name,
          season: fixtureData.league.season,
          starting_at: fixtureDate,
          status: fixtureData.fixture.status.short,
          bets: filteredBets,
          bookmaker_id: 11,
          source: "api-football",
          updatedAt: new Date(),
        });

        console.log(
          `📥 Collected: ${homeTeam} vs ${awayTeam} (${new Date(
            fixtureDate
          ).toLocaleString()})`
        );
      }

      dayOffset++;
    }

    if (collectedFixtures.length === 0) {
      console.warn("⚠️ No fixtures collected — DB untouched.");
      return;
    }

    /* ===============================
       DB UPDATE
    ================================ */
    console.log("🗑️ Clearing old fixtures...");
    const del = await Fixture.deleteMany({});
    console.log(`✅ Deleted ${del.deletedCount} fixtures`);

    await Fixture.insertMany(collectedFixtures);
    console.log(`🎯 Inserted ${collectedFixtures.length} fresh fixtures`);
  } catch (error) {
    console.error("❌ API-Football Error:", error.message);

    if (error.response) {
      console.error("   - Status:", error.response.status);
      console.error("   - Data:", error.response.data);
    }
  } finally {
    process.exit(0);
  }
};

fetchMarkets();

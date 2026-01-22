// Import OpenAI SDK for DeepSeek
import OpenAI from "openai";
import Fixture from '../models/fixtures.js';
import User from '../models/user.js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the DeepSeek client
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Constants for credit system
const GENERATION_COST = 100; // Credits required per generation
const ADMIN_EXEMPT = true; // Admins can generate without credits

/**
 * Check if user has enough credits and deduct if they do
 * @param {string} userId - User ID
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {Object} { hasEnough: boolean, newCredits: number, message: string }
 */
const checkAndDeductCredits = async (userId, isAdmin = false) => {
  try {
    // Admins can bypass credit check if ADMIN_EXEMPT is true
    if (isAdmin && ADMIN_EXEMPT) {
      console.log(`👑 Admin user ${userId} exempt from credit check`);
      return {
        hasEnough: true,
        newCredits: -1, // -1 indicates admin/not applicable
        message: 'Admin access granted'
      };
    }

    // Find user and check credits
    const user = await User.findById(userId);
    if (!user) {
      return {
        hasEnough: false,
        newCredits: 0,
        message: 'User not found'
      };
    }

    const currentCredits = user.credits || 0;
    
    if (currentCredits < GENERATION_COST) {
      return {
        hasEnough: false,
        newCredits: currentCredits,
        message: `Insufficient credits. Need ${GENERATION_COST}, have ${currentCredits}`
      };
    }

    // Deduct credits
    const newCredits = currentCredits - GENERATION_COST;
    user.credits = newCredits;
    await user.save();

    console.log(`💰 Credits deducted: User ${userId} had ${currentCredits}, now has ${newCredits}`);
    
    return {
      hasEnough: true,
      newCredits: newCredits,
      message: `Credits deducted: ${GENERATION_COST}. Remaining: ${newCredits}`
    };

  } catch (error) {
    console.error('❌ Error in checkAndDeductCredits:', error);
    return {
      hasEnough: false,
      newCredits: 0,
      message: 'Server error processing credits'
    };
  }
};

/**
 * Generate betslips with DeepSeek AI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateBetslips = async (req, res) => {
  try {
    console.log("🤖 Generating betslips with DeepSeek...");
    
    // Check authentication
    if (!req.userId) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required",
        betslips: [] 
      });
    }

    // Get targetOdd from request body
    const { targetOdd } = req.body;

    if (!targetOdd || isNaN(parseFloat(targetOdd))) {
      return res.status(400).json({ 
        success: false,
        error: "Valid targetOdd is required in request body",
        betslips: [] 
      });
    }

    const targetOddValue = parseFloat(targetOdd);

    // Check user credits
    const creditCheck = await checkAndDeductCredits(req.userId, req.user?.isAdmin);
    
    if (!creditCheck.hasEnough) {
      return res.status(403).json({ 
        success: false,
        error: creditCheck.message,
        betslips: [],
        credits: creditCheck.newCredits,
        required: GENERATION_COST
      });
    }

    // 1️⃣ Get current date and time in UTC
    const now = new Date();
    console.log(`⏰ Current server time: ${now.toISOString()}`);

    // 2️⃣ Get ALL fixtures first
    const allFixtures = await Fixture.find({}).lean();
    console.log(`📊 Total fixtures in DB: ${allFixtures.length}`);

    if (!allFixtures || allFixtures.length === 0) {
      // Refund credits if no fixtures found
      if (!req.user?.isAdmin || !ADMIN_EXEMPT) {
        await refundCredits(req.userId, GENERATION_COST);
      }
      
      return res.status(404).json({ 
        success: false,
        error: "No fixtures found in DB.",
        betslips: [],
        credits: creditCheck.newCredits
      });
    }

    // 3️⃣ Filter future fixtures using starting_at field
    const futureFixtures = allFixtures.filter(fixture => {
      try {
        if (!fixture.starting_at) {
          console.log(`⏩ Skipping fixture with no starting_at: ${fixture._id}`);
          return false;
        }
        
        const fixtureDate = new Date(fixture.starting_at);
        const isFuture = fixtureDate > now;
        
        return isFuture;
      } catch (error) {
        console.error(`❌ Error processing fixture: ${fixture._id}`, error);
        return false;
      }
    });

    console.log(`✅ Found ${futureFixtures.length} future fixtures after filtering`);

    if (futureFixtures.length === 0) {
      // Refund credits if no future fixtures
      if (!req.user?.isAdmin || !ADMIN_EXEMPT) {
        await refundCredits(req.userId, GENERATION_COST);
      }
      
      return res.status(404).json({ 
        success: false,
        error: "No future fixtures found. Please check fixture dates and times.",
        betslips: [],
        credits: creditCheck.newCredits
      });
    }

    // 4️⃣ Create minimal fixtures data to avoid token limits
    console.log(`📝 Preparing fixtures data for AI...`);
    
    // Sort fixtures by date (closest first) and limit to 30
    const sortedFixtures = [...futureFixtures].sort((a, b) => {
      return new Date(a.starting_at) - new Date(b.starting_at);
    });
    
    const fixturesToInclude = sortedFixtures.slice(0, Math.min(30, sortedFixtures.length));
    
    // Create minimal version for AI
    const minimalFixtures = fixturesToInclude.map(fixture => ({
      match: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      starting_at: fixture.starting_at,
      date: fixture.date || new Date(fixture.starting_at).toISOString().split('T')[0],
      time: fixture.time || new Date(fixture.starting_at).toISOString().split('T')[1]?.substring(0, 8) || "20:00:00",
    }));
    
    const fixturesJson = JSON.stringify(minimalFixtures);
    console.log(`📦 Fixtures data size: ${fixturesJson.length} characters`);

    // 5️⃣ Build optimized prompt for DeepSeek
    const prompt = `TU ES UN EXPERT EN PARIS SPORTIFS FRANÇAIS. 
    TRÈS IMPORTANT : TOUS LES MARCHÉS DOIVENT ÊTRE EN FRANÇAIS SEULEMENT.

    🎯 OBJECTIF PRINCIPAL : Créer exactement 5 billets de pari avec une cote totale de ${targetOddValue}
    
    ⚠️ CALCUL DES COTES - CE N'EST PAS UNE SUGGESTION, C'EST UNE RÈGLE :
    La cote totale d'un billet = PRODUIT des cotes individuelles
    Exemple : Si tu as 3 paris avec cotes 1.50, 1.80 et 2.00 → 1.50 × 1.80 × 2.00 = 5.40
    La coteTotale DOIT être exactement égale à ce calcul

    🕐 CONTRAINTE TEMPORELLE CRITIQUE :
    - N'UTILISE EXCLUSIVEMENT QUE LES MATCHS FUTURS FOURNIS DANS LES DONNÉES
    - TOUS LES MATCHS FOURNIS SONT DÉJÀ DANS LE FUTUR

    📈 STRATÉGIE :
    - Utilise 2 à 4 paris par billet
    - Combine des paris sécurisés (cotes 1.10-1.60) avec quelques paris plus risqués (1.70-2.50)
    - Varie les types de marchés

    🚫 MARCHÉS INTERDITS : Score exact, premier/marqueur, cartons, penalties
    ✅ MARCHÉS AUTORISÉS (en français seulement) :
    - "Plus de X buts" / "Moins de X buts"
    - "Les deux équipes marquent" / "Une seule équipe marque"
    - "Double chance : 1X" / "Double chance : X2" / "Double chance : 12"
    - "Handicap asiatique +0.5" / "Handicap asiatique -1.5"

    📋 EXEMPLE DE BILLET :
    {
      "coteTotale": 6.24,
      "paris": [
        {
          "match": "Team A vs Team B",
          "marche": "Plus de 1.5 buts",
          "cote": 1.30,
          "confiance": "80%",
          "date": "2025-08-29",
          "time": "19:00:00"
        }
      ]
    }

    DONNÉES DES MATCHS FUTURS DISPONIBLES :
    ${fixturesJson}

    🔴 TRÈS IMPORTANT : 
    - RÉPONDS UNIQUEMENT EN JSON VALIDE SANS AUCUN TEXTE SUPPLÉMENTAIRE
    - Format exact : {"billetsDePari": [{"coteTotale": X, "paris": [{"match": "...", "marche": "...", "cote": X, "confiance": "X%"}]}]}
    - Génère exactement 5 billets`;

    // 6️⃣ Send to DeepSeek API
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are an expert French sports betting analyst. Always respond in valid JSON format without any additional text." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" } // Force JSON response
      });
    } catch (aiError) {
      console.error("❌ DeepSeek API error:", aiError);
      
      // Refund credits on AI error
      if (!req.user?.isAdmin || !ADMIN_EXEMPT) {
        await refundCredits(req.userId, GENERATION_COST);
      }
      
      return res.status(500).json({ 
        success: false,
        error: "AI service unavailable. Please try again later.",
        betslips: [],
        credits: await getUserCredits(req.userId)
      });
    }

    // 7️⃣ Parse AI response
    const rawOutput = response.choices[0]?.message?.content;

    if (!rawOutput) {
      // Refund credits if no AI response
      if (!req.user?.isAdmin || !ADMIN_EXEMPT) {
        await refundCredits(req.userId, GENERATION_COST);
      }
      
      return res.status(500).json({ 
        success: false,
        error: "No response from AI.",
        betslips: [],
        credits: await getUserCredits(req.userId)
      });
    }

    console.log("📨 Raw AI response received, length:", rawOutput.length);

    // Extract and clean JSON from response
    let jsonResponse = rawOutput;
    jsonResponse = jsonResponse.replace(/```json\n?/g, '').replace(/\n```/g, '').trim();
    jsonResponse = jsonResponse.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');

    // Ensure it's valid JSON
    let betslips;
    try {
      betslips = JSON.parse(jsonResponse);
      console.log("✅ Successfully parsed JSON from AI");
    } catch (err) {
      console.error("❌ Invalid JSON from AI:", err.message);
      
      // Try to fix common JSON issues
      try {
        let fixedJson = jsonResponse
          .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
          .replace(/'/g, '"');
        betslips = JSON.parse(fixedJson);
        console.log("✅ Successfully parsed after cleaning");
      } catch (secondErr) {
        console.error("❌ Failed to parse even after cleaning");
        
        // Refund credits on invalid JSON
        if (!req.user?.isAdmin || !ADMIN_EXEMPT) {
          await refundCredits(req.userId, GENERATION_COST);
        }
        
        return res.status(500).json({ 
          success: false,
          error: "AI did not return valid JSON. Please try again.",
          betslips: [],
          credits: await getUserCredits(req.userId)
        });
      }
    }

    // 8️⃣ Extract billetsDePari from response
    let billetsDePari = [];
    
    if (betslips.billetsDePari && Array.isArray(betslips.billetsDePari)) {
      billetsDePari = betslips.billetsDePari.slice(0, 5); // Take up to 5 as requested
    } else if (Array.isArray(betslips)) {
      billetsDePari = betslips.slice(0, 5);
    } else if (betslips.betslips && Array.isArray(betslips.betslips)) {
      billetsDePari = betslips.betslips.slice(0, 5);
    } else {
      console.error("❌ Unexpected response structure:", Object.keys(betslips));
      
      // Refund credits on unexpected structure
      if (!req.user?.isAdmin || !ADMIN_EXEMPT) {
        await refundCredits(req.userId, GENERATION_COST);
      }
      
      return res.status(500).json({ 
        success: false,
        error: "Unexpected response structure from AI",
        betslips: [],
        credits: await getUserCredits(req.userId)
      });
    }

    // If no betslips were generated
    if (billetsDePari.length === 0) {
      return res.json({ 
        success: true,
        betslips: [],
        message: "No betslips generated from the available fixtures",
        metadata: {
          fixturesCount: minimalFixtures.length,
          targetOdd: targetOddValue,
          generatedAt: new Date().toISOString(),
        },
        credits: creditCheck.newCredits
      });
    }

    // 9️⃣ Verify and fix odds calculations
    billetsDePari.forEach((betslip) => {
      if (betslip.paris && Array.isArray(betslip.paris)) {
        // Calculate actual total odds
        let actualTotalOdds = 1;
        betslip.paris.forEach(bet => {
          if (bet.cote && !isNaN(parseFloat(bet.cote))) {
            actualTotalOdds *= parseFloat(bet.cote);
          }
          
          // Ensure confidence field exists
          if (!bet.confiance) {
            bet.confiance = "75%";
          }
          
          // Extract date and time from match data if not provided
          if (!bet.date || !bet.time) {
            const fixtureMatch = minimalFixtures.find(f => 
              `${f.homeTeam} vs ${f.awayTeam}` === bet.match
            );
            if (fixtureMatch) {
              bet.date = fixtureMatch.date;
              bet.time = fixtureMatch.time;
            }
          }
        });
        
        // Update the total odds
        betslip.coteTotale = parseFloat(actualTotalOdds.toFixed(2));
      }
    });

    // 🔟 Format for frontend and return
    const responseData = formatForFrontend(billetsDePari, minimalFixtures.length, targetOddValue);
    
    // Add credit information to response
    responseData.credits = creditCheck.newCredits;
    responseData.cost = GENERATION_COST;
    responseData.isAdmin = req.user?.isAdmin || false;
    
    res.json(responseData);
    console.log(`✅ Successfully generated ${billetsDePari.length} betslips. User credits: ${creditCheck.newCredits}`);
    
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    
    // Refund credits on unexpected error
    if (req.userId && (!req.user?.isAdmin || !ADMIN_EXEMPT)) {
      await refundCredits(req.userId, GENERATION_COST);
    }
    
    res.status(500).json({ 
      success: false,
      error: "Internal server error: " + error.message,
      betslips: [],
      credits: await getUserCredits(req.userId)
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Refund credits to user
 * @param {string} userId - User ID
 * @param {number} amount - Amount to refund
 */
const refundCredits = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ User ${userId} not found for refund`);
      return;
    }
    
    const currentCredits = user.credits || 0;
    user.credits = currentCredits + amount;
    await user.save();
    
    console.log(`💰 Credits refunded: User ${userId} refunded ${amount}. New total: ${user.credits}`);
  } catch (error) {
    console.error('❌ Error refunding credits:', error);
  }
};

/**
 * Get user's current credits
 * @param {string} userId - User ID
 * @returns {number} Current credits
 */
const getUserCredits = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user ? (user.credits || 0) : 0;
  } catch (error) {
    console.error('❌ Error getting user credits:', error);
    return 0;
  }
};

/**
 * Categorize French market type for frontend
 */
function categorizeMarket(marche) {
  if (marche.includes('Plus de')) return 'over25';
  if (marche.includes('Moins de')) return 'under25';
  if (marche.includes('Les deux équipes marquent')) return 'bttsYes';
  if (marche.includes('Une seule équipe marque')) return 'bttsNo';
  if (marche.includes('Double chance')) return 'doubleChance';
  if (marche.includes('Handicap')) return 'handicap';
  return 'other';
}

/**
 * Parse confidence percentage from string
 */
function parseConfidence(confianceStr) {
  if (!confianceStr) return 75;
  const match = confianceStr.match(/(\d+)%/);
  return match ? parseInt(match[1]) : 75;
}

/**
 * Format data for React Native frontend compatibility
 */
function formatForFrontend(billetsDePari, fixturesCount, targetOdd) {
  const betslips = billetsDePari.map((betslip, index) => {
    const selections = betslip.paris.map((parisItem, idx) => {
      const matchParts = parisItem.match.split(' vs ');
      const team1 = matchParts[0] || 'Team A';
      const team2 = matchParts[1] || 'Team B';
      
      return {
        matchId: `match-${index}-${idx}`,
        team1: team1,
        team2: team2,
        league: 'Football Match',
        prediction: parisItem.marche,
        odd: parseFloat(parisItem.cote) || 1.5,
        confidence: parseConfidence(parisItem.confiance),
        matchTime: `${parisItem.date || '2024-12-22'} ${parisItem.time || '20:00:00'}`,
        status: 'UPCOMING',
        type: categorizeMarket(parisItem.marche),
      };
    });

    // Calculate average confidence
    const aiConfidence = selections.length > 0 
      ? Math.round(selections.reduce((sum, s) => sum + s.confidence, 0) / selections.length)
      : 75;

    // Calculate success rate (based on your frontend formula)
    const successRate = Math.min(95, Math.round(
      aiConfidence * Math.pow(0.92, selections.length - 1)
    ));

    const totalOdd = parseFloat(betslip.coteTotale) || 1.0;
    const stake = 10;

    return {
      id: `betslip-${index + 1}-${Date.now()}`,
      selections,
      totalOdd: totalOdd,
      aiConfidence: aiConfidence,
      successRate: successRate,
      potentialReturn: parseFloat((stake * totalOdd).toFixed(2)),
      stake: stake,
      timestamp: new Date().toISOString(),
      matchCount: selections.length,
    };
  });

  return {
    success: true,
    betslips: betslips,
    message: `${betslips.length} betslips generated from ${fixturesCount} matches`,
    metadata: {
      fixturesCount: fixturesCount,
      targetOdd: targetOdd,
      generatedAt: new Date().toISOString(),
    }
  };
}


/* ===============================
   SAVE BETSLIP
   POST /api/betslips
================================ */
export const saveBetslip = async (req, res) => {
    try {
        if (!req.user || !req.userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userId = req.userId;
        const {
            title,
            matches,
            selections, // ✅ Accept both matches and selections
            totalOdds,
            stake,
            potentialWin,
            source,
            aiConfidence,
            successRate
        } = req.body;

        // ✅ Use matches or selections (whichever is provided)
        const matchData = matches || selections || [];
        
        if (!Array.isArray(matchData) || matchData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Betslip must contain at least one match'
            });
        }

        // ✅ Transform matches to ensure all required fields
        const formattedMatches = matchData.map(match => {
            // Start with existing match data
            const formattedMatch = {
                fixtureId: match.fixtureId || match.matchId || Math.floor(Math.random() * 10000),
                homeTeam: match.homeTeam || match.team1 || 'Home Team',
                awayTeam: match.awayTeam || match.team2 || 'Away Team',
                pick: match.pick || match.predictionType || '1',
                
                // ✅ ADD THE NEW PREDICTION FIELDS:
                predictionValue: match.predictionValue || match.prediction || '',
                predictionType: match.predictionType || match.pick || '',
                fullPrediction: match.fullPrediction || 
                    (match.pick && match.predictionValue ? 
                        `${match.pick} ${match.predictionValue}` : 
                        match.pick || 'No prediction'),
                
                odd: match.odd || 1.5,
                status: match.status || 'pending',
                
                // Optional fields
                team1: match.team1 || match.homeTeam,
                team2: match.team2 || match.awayTeam,
                league: match.league || 'Unknown League',
                confidence: match.confidence || 70,
                matchTime: match.matchTime || 'TBD',
                source: match.source || 'ai'
            };
            
            return formattedMatch;
        });

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const newBetslip = {
            title: title || 'AI BetSlip',
            matches: formattedMatches, // ✅ Use formatted matches with all fields
            totalOdds: totalOdds || 1.0,
            stake: stake || 10,
            potentialWin: potentialWin || stake * totalOdds || 0,
            source: source || 'ai',
            status: 'pending',
            createdAt: new Date(),
            
            // ✅ Add AI metrics if provided
            ...(aiConfidence !== undefined && { aiConfidence }),
            ...(successRate !== undefined && { successRate })
        };

        user.betslips.unshift(newBetslip);
        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Betslip saved successfully',
            betslip: user.betslips[0],
            credits: user.credits // Return updated credits
        });

    } catch (error) {
        console.error('❌ Save betslip error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save betslip',
            error: error.message
        });
    }
};
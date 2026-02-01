import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

const AuthContext = createContext({});

// API Configuration
const API_CONFIG = {
  development: {
    android: 'https://betai-backend-uxt5.onrender.com/api',
    ios: 'https://betai-backend-uxt5.onrender.com/api',
    web: 'https://betai-backend-uxt5.onrender.com/api',
  },
  production: {
    default: 'https://betai-backend-uxt5.onrender.com/api',
  },
};

// Get the correct API URL
const getApiUrl = () => {
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android') {
      return API_CONFIG.development.android;
    } else if (Platform.OS === 'ios') {
      return API_CONFIG.development.ios;
    } else {
      return API_CONFIG.development.web;
    }
  } else {
    // Production environment
    return API_CONFIG.production.default;
  }
};

const API_URL = getApiUrl();

console.log(`🌐 Using API URL: ${API_URL} (Platform: ${Platform.OS})`);

// Helper function for API calls with better error handling
const apiFetch = async (endpoint, options = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add token to headers if available
  const token = await AsyncStorage.getItem('@footai_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: defaultHeaders,
  };

  try {
    console.log(`📡 API Request: ${endpoint}`, {
      method: config.method || 'GET',
      url: `${API_URL}${endpoint}`,
      headers: config.headers,
      body: config.body ? JSON.parse(config.body) : null, // Log the body
    });

    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // Parse response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error('Invalid server response');
    }

    console.log(`📡 API Response: ${endpoint}`, {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    if (!response.ok) {
      // Handle specific HTTP errors
      let errorMessage = data.message || `HTTP ${response.status}`;
      
      switch (response.status) {
        case 400:
          errorMessage = data.message || 'Bad request';
          break;
        case 401:
          errorMessage = data.message || 'Unauthorized - Please login again';
          break;
        case 403:
          errorMessage = data.message || 'Access forbidden';
          break;
        case 404:
          errorMessage = data.message || 'Endpoint not found';
          break;
        case 422:
          errorMessage = data.message || 'Validation failed';
          break;
        case 500:
          errorMessage = data.message || 'Server error';
          break;
        case 503:
          errorMessage = data.message || 'Service unavailable';
          break;
        default:
          errorMessage = data.message || `Error ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }

    return { success: true, data, status: response.status };
  } catch (error) {
    console.error(`❌ API Error (${endpoint}):`, error);
    console.error(`❌ Full error:`, error.message);
    
    // Handle network errors
    if (error.message === 'Network request failed' || error.message.includes('fetch')) {
      throw new Error('Network error - Please check your internet connection');
    }
    
    throw error;
  }
};

// Test API connection
const testConnection = async () => {
  try {
    const response = await apiFetch('/');
    return { connected: true, message: response.data.message };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState(null);
  const [registerError, setRegisterError] = useState(null);
  const [apiStatus, setApiStatus] = useState({ connected: false, testing: true });

  // ✅ BETSLIPS ARE PART OF USER - Access via user?.betslips
  const betslips = user?.betslips || [];

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Test API connection first
      const connectionTest = await testConnection();
      setApiStatus({
        connected: connectionTest.connected,
        testing: false,
        message: connectionTest.connected ? 'API connected' : connectionTest.error
      });

      if (!connectionTest.connected) {
        console.warn('⚠️ API connection failed:', connectionTest.error);
        Alert.alert(
          'Connection Issue',
          'Cannot connect to server. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }

      // Load stored auth data
      await loadStoredAuth();
    } catch (err) {
      console.error('Initialization error:', err);
      setLoginError('Failed to initialize app');
    } finally {
      setLoading(false);
    }
  };

const loadStoredAuth = async () => {
  try {
    const [storedToken, storedUser] = await Promise.all([
      AsyncStorage.getItem('@footai_token'),
      AsyncStorage.getItem('@footai_user'),
    ]);

    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      
      // 1. Set token and user immediately (fast app start)
      setToken(storedToken);
      setUser(parsedUser);
      console.log('✅ Loaded stored auth data with betslips:', parsedUser?.betslips?.length || 0);
      
      // 2. CRITICAL FIX: Fetch fresh data from backend (fixes credit mismatch)
      // Do this in background after app loads
      setTimeout(async () => {
        try {
          console.log('🔄 Fetching fresh credits from backend...');
          const response = await fetch(`${API_URL}/users/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              console.log(`✅ Credits: ${parsedUser.credits} (stored) → ${data.user.credits} (backend)`);
              
              // Update user with fresh credits
              const updatedUser = {
                ...parsedUser,
                credits: data.user.credits || parsedUser.credits,
              };
              
              setUser(updatedUser);
              await AsyncStorage.setItem('@footai_user', JSON.stringify(updatedUser));
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not refresh credits:', error.message);
        }
      }, 1000); // Wait 1 second after app loads
      
    } else {
      console.log('ℹ️ No stored auth data found');
    }
  } catch (err) {
    console.error('Failed to load auth data:', err);
    setLoginError('Failed to load authentication data');
    // Clear corrupted data
    await AsyncStorage.multiRemove(['@footai_token', '@footai_user']);
  }
};

  // ✅ Enhanced Register function - ensures betslips are included
  const register = async (username, email, password, referralCode = '') => {
    try {
      setRegisterError(null);
      
      const result = await apiFetch('/users/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
          referralCode
        }),
      });

      if (result.data.success && result.data.token && result.data.user) {
        // ✅ Ensure betslips are included in user data (default to empty array)
        const userData = {
          ...result.data.user,
          betslips: result.data.user.betslips || [],
          subscription: result.data.user.subscription || 'free',
          credits: result.data.user.credits || 0,
          isPro: result.data.user.isPro || false,
          isAffiliate: result.data.user.isAffiliate || false,
          promoCode: result.data.user.promoCode || null,
        };

        // Store auth data
        await Promise.all([
          AsyncStorage.setItem('@footai_token', result.data.token),
          AsyncStorage.setItem('@footai_user', JSON.stringify(userData)),
        ]);
        
        // Update state
        setToken(result.data.token);
        setUser(userData);
        
        console.log('✅ Registration successful with betslips:', userData.betslips.length);
        return { success: true, data: result.data, user: userData };
      } else {
        throw new Error(result.data.message || 'Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setRegisterError(errorMessage);
      console.error('Registration error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // ✅ Enhanced Login function - ensures betslips are included
  const login = async (email, password) => {
    try {
      setLoginError(null);
      
      const result = await apiFetch('/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (result.data.success && result.data.token && result.data.user) {
        // ✅ Ensure betslips are included in user data (default to empty array)
        const userData = {
          ...result.data.user,
          betslips: result.data.user.betslips || [],
          subscription: result.data.user.subscription || 'free',
          credits: result.data.user.credits || 0,
          isPro: result.data.user.isPro || false,
          isAffiliate: result.data.user.isAffiliate || false,
          promoCode: result.data.user.promoCode || null,
        };

        // Store auth data
        await Promise.all([
          AsyncStorage.setItem('@footai_token', result.data.token),
          AsyncStorage.setItem('@footai_user', JSON.stringify(userData)),
        ]);
        
        // Update state
        setToken(result.data.token);
        setUser(userData);
        
        console.log('✅ Login successful with betslips:', userData.betslips.length);
        return { success: true, data: result.data, user: userData };
      } else {
        throw new Error(result.data.message || 'Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setLoginError(errorMessage);
      console.error('Login error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  };



// In authContext.jsx - REPLACE the becomeAffiliate function with this:

const becomeAffiliate = async (promoCode) => {
  try {
    console.log('🟢 Becoming affiliate with promo code:', promoCode);
    
    const result = await apiFetch('/affiliate/become-affiliate', {
      method: 'POST',
      body: JSON.stringify({ promoCode }),
    });

    if (result.data.success && result.data.user) {
      console.log('✅ Affiliate registration successful:', result.data.user);
      
      // ✅ CRITICAL: Update ALL user data, not just isAffiliate
      const updatedUser = {
        ...user,
        ...result.data.user, // Merge all updated fields from server
        isAffiliate: true,
        promoCode: promoCode,
        // Ensure all affiliate fields are set
        affiliateTier: result.data.user.affiliateTier || 'basic',
        affiliateCommission: result.data.user.affiliateCommission || 10,
        affiliateEarnings: result.data.user.affiliateEarnings || {
          total: 0,
          pending: 0,
          paid: 0,
          available: 0
        },
        affiliateStats: result.data.user.affiliateStats || {
          totalReferrals: 0,
          activeReferrals: 0,
          conversionRate: 0,
          averageCommission: 0,
          lastPayoutDate: null,
          nextPayoutDate: null
        },
        minimumPayout: result.data.user.minimumPayout || 50
      };
      
      console.log('🟢 Updated user object:', {
        isAffiliate: updatedUser.isAffiliate,
        promoCode: updatedUser.promoCode,
        affiliateTier: updatedUser.affiliateTier
      });
      
      // Store updated user
      setUser(updatedUser);
      await AsyncStorage.setItem('@footai_user', JSON.stringify(updatedUser));
      
      console.log('✅ User data saved to AsyncStorage');
      return { success: true, user: updatedUser };
    } else {
      throw new Error(result.data.message || 'Failed to become affiliate');
    }
  } catch (err) {
    console.error('❌ Become affiliate error:', err);
    return { success: false, error: err.message };
  }
};

// ALSO ADD THIS FUNCTION FOR VALIDATING PROMO CODE:
const validatePromoCode = async (promoCode) => {
  try {
    const result = await apiFetch(`/affiliate/validate-promocode/${promoCode}`);
    return {
      success: result.data.success,
      available: result.data.available,
      message: result.data.message
    };
  } catch (err) {
    console.error('Validate promo code error:', err);
    return { success: false, error: err.message };
  }
};


  // ✅ Enhanced Logout function
  const logout = async () => {
    try {
      // Call logout endpoint if we have a token
      if (token) {
        try {
          await apiFetch('/users/logout', { method: 'POST' });
        } catch (logoutError) {
          console.warn('Logout API call failed:', logoutError.message);
          // Continue with local logout even if API call fails
        }
      }
      
      // Clear local storage
      await AsyncStorage.multiRemove(['@footai_token', '@footai_user']);
      
      // Reset state
      setToken(null);
      setUser(null);
      setLoginError(null);
      setRegisterError(null);
      
      console.log('✅ Logout successful');
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ Enhanced Get user profile - fetches complete user data including betslips
  const getProfile = async (forceRefresh = false) => {
    try {
      const result = await apiFetch('/users/profile');
      
      if (result.data.success && result.data.user) {
        // ✅ Merge existing betslips with new data if not forcing refresh
        const existingBetslips = user?.betslips || [];
        const newBetslips = result.data.user.betslips || [];
        
        const userData = {
          ...result.data.user,
          betslips: forceRefresh ? newBetslips : [...existingBetslips, ...newBetslips].filter((b, i, a) => 
            a.findIndex(t => t.id === b.id) === i
          ),
          subscription: result.data.user.subscription || user?.subscription || 'free',
          credits: result.data.user.credits || user?.credits || 0,
          isPro: result.data.user.isPro || user?.isPro || false,
          isAffiliate: result.data.user.isAffiliate || user?.isAffiliate || false,
          promoCode: result.data.user.promoCode || user?.promoCode || null,
        };

        // Update stored user data
        await AsyncStorage.setItem('@footai_user', JSON.stringify(userData));
        setUser(userData);
        
        console.log('✅ Profile fetched with betslips:', userData.betslips.length);
        return { success: true, user: userData };
      } else {
        throw new Error(result.data.message || 'Failed to get profile');
      }
    } catch (err) {
      // If token is invalid, logout
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        await logout();
      }
      
      setLoginError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ✅ Get user's betslips specifically
  const getBetslips = async () => {
    try {
      const result = await apiFetch('/users/betslips');
      
      if (result.data.success && result.data.betslips) {
        // Update user with new betslips
        const updatedUser = {
          ...user,
          betslips: result.data.betslips || [],
        };
        
        setUser(updatedUser);
        await AsyncStorage.setItem('@footai_user', JSON.stringify(updatedUser));
        
        console.log('✅ Betslips fetched:', result.data.betslips.length);
        return { success: true, betslips: result.data.betslips };
      } else {
        throw new Error(result.data.message || 'Failed to get betslips');
      }
    } catch (err) {
      console.error('Get betslips error:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ FIXED: Save a new betslip - UPDATED TO MATCH USER SCHEMA
// ✅ FIXED: Save a new betslip - UPDATED TO INCLUDE ALL PREDICTION DATA
const saveBetslip = async (betslipData) => {
  try {
    console.log('📤 Preparing to save betslip data:', betslipData);
    
    // Transform selections to matches format with ALL prediction data
    const matches = (betslipData.selections || []).map((selection, index) => {
      // Extract numeric ID from matchId or generate one
      let fixtureId = 0;
      if (selection.matchId) {
        // Extract numbers from matchId like "match-0-0"
        const numbers = selection.matchId.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          fixtureId = parseInt(numbers[0]) || index + 1;
        }
      }
      
      // Get the full prediction from selection
      const getFullPrediction = () => {
        // If we have fullPrediction, use it
        if (selection.fullPrediction) {
          return selection.fullPrediction;
        }
        
        // If we have predictionType and predictionValue, construct it
        if (selection.predictionType && selection.predictionValue) {
          const type = selection.predictionType.toUpperCase();
          const value = selection.predictionValue;
          
          switch(type) {
            case 'OVER':
              return `Over ${value}`;
            case 'UNDER':
              return `Under ${value}`;
            case 'BTTS':
              return `BTTS ${value === 'yes' ? 'Yes' : 'No'}`;
            case '1X2':
              if (value === '1') return 'Home Win';
              if (value === '2') return 'Away Win';
              if (value === 'X') return 'Draw';
              return `${value}`;
            case 'DC':
              return `Double Chance: ${value}`;
            default:
              return type;
          }
        }
        
        // Fallback to pick or prediction
        return selection.pick || selection.prediction || '1';
      };
      
      const fullPredictionText = getFullPrediction();
      
      return {
        fixtureId: fixtureId || index + 1,
        homeTeam: selection.team1 || selection.homeTeam || 'Home Team',
        awayTeam: selection.team2 || selection.awayTeam || 'Away Team',
        
        // ✅ SEND ALL PREDICTION DATA
        pick: selection.pick || selection.predictionType || '1',
        predictionValue: selection.predictionValue || selection.prediction || '',
        predictionType: selection.predictionType || selection.pick || '',
        fullPrediction: fullPredictionText,
        
        odd: selection.odd || 1.5,
        status: 'pending',
        
        // ✅ Also include additional fields for better data
        team1: selection.team1 || selection.homeTeam,
        team2: selection.team2 || selection.awayTeam,
        league: selection.league || 'Unknown League',
        confidence: selection.confidence || 70,
        matchTime: selection.matchTime || 'TBD',
        source: selection.source || 'ai'
      };
    });

    const payload = {
      title: betslipData.title || `AI Betslip ${new Date().toLocaleDateString()}`,
      matches: matches,
      totalOdds: betslipData.totalOdds || betslipData.totalOdd || 1.0,
      stake: betslipData.stake || 10,
      potentialWin: betslipData.potentialReturn || betslipData.potentialWin || 0,
      source: betslipData.source || 'ai',
      
      // ✅ Also send the AI metrics
      aiConfidence: betslipData.aiConfidence || 0,
      successRate: betslipData.successRate || 0,
    };

    console.log('📦 Sending payload to backend:', JSON.stringify(payload, null, 2));
    
    // ✅ Important: Use the correct endpoint
    const result = await apiFetch('/betslips/save', { // Changed from '/betslips/save'
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (result.data.success && result.data.betslip) {
      // Update user with new betslip
      const updatedBetslips = [...(user?.betslips || []), result.data.betslip];
      const updatedUser = {
        ...user,
        betslips: updatedBetslips,
      };
      
      setUser(updatedUser);
      await AsyncStorage.setItem('@footai_user', JSON.stringify(updatedUser));
      
      console.log('✅ Betslip saved successfully with full prediction data:', result.data.betslip);
      return { success: true, betslip: result.data.betslip };
    } else {
      throw new Error(result.data.message || 'Failed to save betslip');
    }
  } catch (err) {
    console.error('❌ Save betslip error:', err);
    console.error('❌ Error details:', {
      message: err.message,
      data: betslipData
    });
    
    return { success: false, error: err.message };
  }
};

  // Helper function to map prediction to pick
  const mapPredictionToPick = (prediction) => {
    if (!prediction) return '1';
    
    const predictionLower = prediction.toLowerCase();
    
    // Map common predictions to pick format
    if (predictionLower.includes('plus de') || predictionLower.includes('over')) {
      return 'OVER';
    } else if (predictionLower.includes('moins de') || predictionLower.includes('under')) {
      return 'UNDER';
    } else if (predictionLower.includes('les deux équipes marquent') || predictionLower.includes('btts')) {
      return 'BTTS';
    } else if (predictionLower.includes('double chance : 1x')) {
      return '1X';
    } else if (predictionLower.includes('double chance : x2')) {
      return 'X2';
    } else if (predictionLower.includes('double chance : 12')) {
      return '12';
    } else if (prediction.includes('1')) {
      return '1';
    } else if (prediction.includes('X') || prediction.includes('Draw')) {
      return 'X';
    } else if (prediction.includes('2')) {
      return '2';
    }
    
    return prediction.substring(0, 20); // Truncate if too long
  };

  // ✅ Remove a betslip
  const removeBetslip = async (betslipId) => {
    try {
      const result = await apiFetch(`/betslips/${betslipId}`, {
        method: 'DELETE',
      });

      if (result.data.success) {
        // Update user by removing the betslip
        const updatedBetslips = (user?.betslips || []).filter(b => b.id !== betslipId);
        const updatedUser = {
          ...user,
          betslips: updatedBetslips,
        };
        
        setUser(updatedUser);
        await AsyncStorage.setItem('@footai_user', JSON.stringify(updatedUser));
        
        console.log('✅ Betslip removed:', betslipId);
        return { success: true };
      } else {
        throw new Error(result.data.message || 'Failed to remove betslip');
      }
    } catch (err) {
      console.error('Remove betslip error:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ Update user locally (with betslips support)
  const updateUser = (updates) => {
    const updatedUser = { 
      ...user, 
      ...updates,
      // Ensure betslips array is preserved
      betslips: updates.betslips !== undefined ? updates.betslips : user?.betslips || [],
    };
    setUser(updatedUser);
    AsyncStorage.setItem('@footai_user', JSON.stringify(updatedUser));
  };

  // ✅ Update betslips locally (convenience function)
  const updateBetslips = (newBetslips) => {
    updateUser({ betslips: newBetslips });
  };

  // ✅ Sync all user data with server
  const syncUserData = async () => {
    try {
      console.log('🔄 Syncing user data...');
      
      // Fetch fresh profile data
      const profileResult = await getProfile(true);
      
      if (profileResult.success) {
        console.log('✅ User data synced successfully');
        return { success: true, user: profileResult.user };
      } else {
        throw new Error('Failed to sync user data');
      }
    } catch (err) {
      console.error('Sync error:', err);
      return { success: false, error: err.message };
    }
  };

  // Clear errors
  const clearLoginError = () => {
    setLoginError(null);
  };

  const clearRegisterError = () => {
    setRegisterError(null);
  };

  const clearErrors = () => {
    setLoginError(null);
    setRegisterError(null);
  };

  // Refresh API connection
  const refreshConnection = async () => {
    setApiStatus({ ...apiStatus, testing: true });
    const connectionTest = await testConnection();
    setApiStatus({
      connected: connectionTest.connected,
      testing: false,
      message: connectionTest.connected ? 'API reconnected' : connectionTest.error
    });
    return connectionTest.connected;
  };

 const isSubscriptionValid = () => {
  // Check if user has any active subscription (not 'none')
  if (user?.subscription && user.subscription !== 'none') {
    // Also check if subscription end date is valid if it exists
    if (user?.subscriptionEndDate) {
      return new Date(user.subscriptionEndDate) > new Date();
    }
    // If no end date but has subscription type, assume it's active
    return true;
  }
  
  return false;
};

const hasFullAccess = () => {
  return user?.isAdmin || isSubscriptionValid();
};

const hasAffiliateAccess = () => {
  return user?.isAffiliate === true;
};
// Add this function to authContext.jsx (anywhere before the value object)
const refreshUser = async () => {
  try {
    console.log('🔄 Refreshing user data...');
    
    const result = await apiFetch('/users/me');
    
    if (result.data.success && result.data.user) {
      // Create updated user object
      const updatedUser = {
        ...user, // Keep existing data
        ...result.data.user, // Override with fresh data
        credits: result.data.user.credits || 0, // Ensure credits are included
      };

      console.log('✅ User refreshed. Credits:', updatedUser.credits);
      
      // Update state
      setUser(updatedUser);
      // Update storage
      await AsyncStorage.setItem('@footai_user', JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
    } else {
      throw new Error(result.data.message || 'Failed to refresh');
    }
  } catch (error) {
    console.error('❌ Refresh user error:', error);
    return { success: false, error: error.message };
  }
};

  const value = {
    // Core auth data
    user,
    token,
    betslips, // ✅ Direct access to betslips
    loading,
    loginError,
    registerError,
    apiStatus,
    isAuthenticated: !!token,
     hasFullAccess,
     hasAffiliateAccess,
     isSubscriptionValid,
    
    // Auth functions
    register,
    login,
    logout,
    getProfile,
    
    // ✅ Betslip functions
    getBetslips,
    saveBetslip,
    removeBetslip,
    updateBetslips,
    
    // User management
    updateUser,
    syncUserData,
    
    // Error handling
    clearLoginError,
    clearRegisterError,
    clearErrors,
    
    // Connection
     becomeAffiliate,
    refreshConnection,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
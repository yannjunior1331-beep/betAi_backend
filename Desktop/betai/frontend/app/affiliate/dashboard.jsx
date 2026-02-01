import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { theme } from '../../constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../contexts/authContext';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import '../../utils/i18n';

const AffiliateDashboardScreen = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [cashoutMethod, setCashoutMethod] = useState('mobile');
  const [processingCashout, setProcessingCashout] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+237');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  
  // Notification states
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  const notificationAnim = useRef(new Animated.Value(0)).current;

  // Get language state from i18n
  const isFrench = i18n.language === 'fr';

  // Central African country codes
  const centralAfricanCountries = [
    { code: '+237', name: isFrench ? 'Cameroun' : 'Cameroon', flag: '🇨🇲' },
    { code: '+236', name: isFrench ? 'République Centrafricaine' : 'Central African Republic', flag: '🇨🇫' },
    { code: '+242', name: isFrench ? 'Congo' : 'Congo', flag: '🇨🇬' },
    { code: '+243', name: isFrench ? 'RD Congo' : 'DR Congo', flag: '🇨🇩' },
    { code: '+240', name: isFrench ? 'Guinée Équatoriale' : 'Equatorial Guinea', flag: '🇬🇶' },
    { code: '+241', name: isFrench ? 'Gabon' : 'Gabon', flag: '🇬🇦' },
    { code: '+245', name: isFrench ? 'Guinée-Bissau' : 'Guinea-Bissau', flag: '🇬🇼' },
    { code: '+225', name: isFrench ? 'Côte d\'Ivoire' : 'Ivory Coast', flag: '🇨🇮' },
    { code: '+231', name: isFrench ? 'Liberia' : 'Liberia', flag: '🇱🇷' },
    { code: '+222', name: isFrench ? 'Mauritanie' : 'Mauritania', flag: '🇲🇷' },
    { code: '+234', name: isFrench ? 'Nigéria' : 'Nigeria', flag: '🇳🇬' },
    { code: '+250', name: isFrench ? 'Rwanda' : 'Rwanda', flag: '🇷🇼' },
    { code: '+221', name: isFrench ? 'Sénégal' : 'Senegal', flag: '🇸🇳' },
    { code: '+252', name: isFrench ? 'Somalie' : 'Somalia', flag: '🇸🇴' },
    { code: '+211', name: isFrench ? 'Soudan du Sud' : 'South Sudan', flag: '🇸🇸' },
    { code: '+255', name: isFrench ? 'Tanzanie' : 'Tanzania', flag: '🇹🇿' },
    { code: '+228', name: isFrench ? 'Togo' : 'Togo', flag: '🇹🇬' },
    { code: '+256', name: isFrench ? 'Ouganda' : 'Uganda', flag: '🇺🇬' },
    { code: '+260', name: isFrench ? 'Zambie' : 'Zambia', flag: '🇿🇲' },
    { code: '+263', name: isFrench ? 'Zimbabwe' : 'Zimbabwe', flag: '🇿🇼' },
  ];

  // Handle notification display
  const showNotificationMessage = (message, type = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    
    // Animate in
    Animated.sequence([
      Animated.timing(notificationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(4000),
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowNotification(false);
    });
  };

  // Fetch affiliate stats
  const fetchAffiliateStats = async () => {
    try {
      console.log('🟢 STARTING fetchAffiliateStats...');
      setLoading(true);
      
      // Check authentication
      console.log('🟢 Checking authentication...');
      console.log('🟢 isAuthenticated:', isAuthenticated);
      console.log('🟢 user?.isAffiliate:', user?.isAffiliate);
      
      if (!isAuthenticated || !user?.isAffiliate) {
        console.log('🔴 User not authenticated or not an affiliate');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Get token from AsyncStorage
      console.log('🟢 Getting token from AsyncStorage...');
      const token = await AsyncStorage.getItem('@footai_token');
      console.log('🟢 Token exists:', !!token);
      console.log('🟢 Token length:', token?.length);
      
      if (!token) {
        console.error('❌ No authentication token found');
        Alert.alert(t('common.error'), t('affiliate.errors.sessionExpired'));
        router.push('/auth/login');
        return;
      }
      
      console.log('📡 Calling API: https://betai-backend-uxt5.onrender.com/api/affiliate/stats');
      
      // Test the API endpoint first with a simple fetch
      console.log('🟢 Testing network connectivity...');
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 300000)
      );
      
      // Make the API call
      const fetchPromise = fetch('https://betai-backend-uxt5.onrender.com/api/affiliate/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🟢 Making API request...');
      
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      console.log('🟢 Response received, status:', response.status);
      
      // Check response status
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Parse response
      const data = await response.json();
      console.log('🟢 Response parsed successfully');
      console.log('📡 API Response Data:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('✅ Affiliate stats loaded successfully');
        
        const backendStats = data.stats;
        
        // First, debug to see the exact structure
        console.log('📊 Backend stats structure:', {
          totalEarnings: backendStats.totalEarnings,
          availablePayout: backendStats.availablePayout,
          todayEarnings: backendStats.todayEarnings,
          affiliateEarnings: backendStats.affiliateEarnings,
          _backendData: backendStats._backendData
        });
        
        // Extract earnings from the correct location
        // Try to find affiliateEarnings in different locations
        let affiliateEarnings = { total: 0, pending: 0, available: 0 };
        
        if (backendStats._backendData?.affiliateEarnings) {
          // Earnings are in _backendData.affiliateEarnings
          affiliateEarnings = backendStats._backendData.affiliateEarnings;
          console.log('✅ Found earnings in _backendData.affiliateEarnings');
        } else if (backendStats.affiliateEarnings) {
          // Earnings are directly in affiliateEarnings
          affiliateEarnings = backendStats.affiliateEarnings;
          console.log('✅ Found earnings in affiliateEarnings');
        } else {
          // Try separate fields
          affiliateEarnings = {
            total: backendStats.totalEarnings || 0,
            pending: backendStats.pendingPayout || 0,
            available: backendStats.availablePayout || 0
          };
          console.log('✅ Using separate fields');
        }
        
        console.log('💰 Extracted earnings:', affiliateEarnings);
        
        setStats({
          // ✅ CORRECT MAPPING:
          // todayEarnings = available (what's ready to cash out)
          todayEarnings: affiliateEarnings.available || 0,
          
          // totalEarnings = total (lifetime commission)
          totalEarnings: affiliateEarnings.total || 0,
          
          // pendingPayout = pending (already requested payouts)
          pendingPayout: affiliateEarnings.pending || 0,
          
          // Other time-based earnings (not tracked yet)
          thisWeekEarnings: 0,
          thisMonthEarnings: 0,
          
          minimumPayout: backendStats.minimumPayout || 50,
          
          // Referral stats
          totalReferrals: backendStats.totalReferrals || 0,
          activeReferrals: backendStats.activeReferrals || 0,
          conversionRate: backendStats.conversionRate || '0%',
          averageCommission: backendStats.averageCommission || '$0.00',
          
          // Basic info
          promoCode: backendStats.promoCode || 'N/A',
          affiliateTier: backendStats.affiliateTier || 'basic',
          commissionRate: backendStats.commissionRate || '10%',
          nextPayoutDate: backendStats.nextPayoutDate || t('affiliate.notScheduled'),
          referralLink: backendStats.referralLink || `https://footai.com/register?ref=${backendStats.promoCode || 'N/A'}`,
          
          // Keep backend data for debugging
          _backendData: backendStats,
          _extractedEarnings: affiliateEarnings // For debugging
        });
        
        // Try to fetch referrals, but don't fail if it doesn't work
        try {
          await fetchReferrals();
        } catch (referralError) {
          console.warn('⚠️ Failed to fetch referrals:', referralError);
          setReferrals([]);
        }
      } else {
        console.error('❌ API returned success: false');
        throw new Error(data.message || t('affiliate.errors.failedToLoad'));
      }
      
    } catch (error) {
      console.error('❌ ERROR in fetchAffiliateStats:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Show user-friendly error
      let errorMessage = t('affiliate.errors.failedToLoad');
      
      if (error.message.includes('Network request failed') || 
          error.message.includes('fetch') || 
          error.message.includes('NetworkError')) {
        errorMessage = t('affiliate.errors.connectionError');
      } else if (error.message.includes('timeout')) {
        errorMessage = t('affiliate.errors.timeoutError');
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = t('affiliate.errors.sessionExpired');
      } else if (error.message.includes('403') || error.message.includes('not an affiliate')) {
        errorMessage = t('affiliate.errors.notRegistered');
      }
      
      console.log('🟡 Showing alert with message:', errorMessage);
      
      Alert.alert(
        t('common.error'), 
        errorMessage,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('common.confirm'), 
            onPress: () => {
              console.log('🟢 User clicked Retry');
              fetchAffiliateStats();
            }
          },
          { 
            text: t('affiliate.stats.useDemoData'), 
            onPress: () => {
              console.log('🟢 User clicked Use Demo Data');
              // Use user data for demo
              setStats({
                totalEarnings: user?.affiliateEarnings?.total || 0,
                todayEarnings: user?.affiliateEarnings?.available || 0, // Changed to available
                thisWeekEarnings: 0,
                thisMonthEarnings: 0,
                pendingPayout: user?.affiliateEarnings?.pending || 0,
                minimumPayout: user?.minimumPayout || 50,
                totalReferrals: user?.referralCount || 0,
                activeReferrals: 0,
                conversionRate: '0%',
                averageCommission: '$0.00',
                promoCode: user?.promoCode || 'N/A',
                affiliateTier: user?.affiliateTier || 'basic',
                commissionRate: `${user?.affiliateCommission || 10}%`,
                nextPayoutDate: t('affiliate.notScheduled'),
                referralLink: `https://footai.com/register?ref=${user?.promoCode || 'N/A'}`,
              });
              
              // Create mock referrals from user data
              if (user?.referralCount > 0) {
                setReferrals([{
                  id: 'demo1',
                  username: isFrench ? 'Utilisateur Démo' : 'Demo User',
                  email: 'demo@example.com',
                  joinedDate: new Date().toISOString(),
                  subscription: 'none',
                  status: 'inactive',
                  totalDeposits: 0,
                  commission: 0,
                  lastActivity: isFrench ? 'Récemment' : 'Recently',
                }]);
              } else {
                setReferrals([]);
              }
            }
          }
        ]
      );
      
    } finally {
      console.log('🟢 FINALLY: Setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  // SIMPLIFIED fetchReferrals - just returns empty array for now
  const fetchReferrals = async () => {
    console.log('🟢 fetchReferrals called');
    try {
      const token = await AsyncStorage.getItem('@footai_token');
      
      if (!token) {
        console.log('🟡 No token, returning empty referrals');
        setReferrals([]);
        return;
      }
      
      console.log('📡 Calling referrals API...');
      const response = await fetch('https://betai-backend-uxt5.onrender.com/api/affiliate/referrals', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🟢 Referrals response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🟢 Referrals data received:', data.referrals?.length || 0);
        
        if (data.success) {
          // Transform backend data
          const formattedReferrals = data.referrals.map(referral => ({
            id: referral._id || referral.id,
            username: referral.username,
            email: referral.email,
            joinedDate: referral.joinedDate || referral.createdAt,
            subscription: referral.subscription || 'none',
            status: referral.subscription !== 'none' ? 'active' : 'inactive',
            totalDeposits: referral.totalDeposits || 0,
            commission: referral.commission || 0,
            lastActivity: referral.lastActivity || (isFrench ? 'Récemment' : 'Recently'),
          }));
          
          setReferrals(formattedReferrals);
        } else {
          console.warn('⚠️ Referrals API returned success: false');
          setReferrals([]);
        }
      } else {
        console.warn('⚠️ Referrals API error:', response.status);
        setReferrals([]);
      }
    } catch (error) {
      console.error('❌ Error in fetchReferrals:', error);
      setReferrals([]);
    }
  };

  // Refresh data
  const onRefresh = () => {
    setRefreshing(true);
    fetchAffiliateStats();
  };

  // Focus effect to refresh data
  useFocusEffect(
    React.useCallback(() => {
      console.log('🟢 useFocusEffect triggered');
      
      if (isAuthenticated && user?.isAffiliate) {
        console.log('🟢 User is authenticated and affiliate, fetching stats...');
        fetchAffiliateStats();
      } else {
        console.log('🟡 User not authenticated or not affiliate:', {
          isAuthenticated,
          isAffiliate: user?.isAffiliate
        });
      }
      
      // Cleanup function
      return () => {
        console.log('🟢 Cleaning up focus effect');
      };
    }, [isAuthenticated, user?.isAffiliate])
  );

  // ✅ FIXED: Handle cashout - check todayEarnings (available amount)
  const handleCashout = () => {
    // Use todayEarnings (which is available amount)
    if (!stats || stats.todayEarnings < stats.minimumPayout) {
      const neededAmount = (stats?.minimumPayout || 50) - (stats?.todayEarnings || 0);
      Alert.alert(
        t('affiliate.errors.minimumNotMet'),
        t('affiliate.errors.minimumCashout', { 
          min: stats?.minimumPayout || 50,
          needed: neededAmount.toFixed(2)
        }),
        [{ text: t('common.ok') }]
      );
      return;
    }
    
    // Set amount from todayEarnings
    setCashoutAmount(stats.todayEarnings.toFixed(2));
    setShowCashoutModal(true);
  };

  // Process cashout with Formspree - UPDATED WITH NOTIFICATION SYSTEM
  const processCashout = async () => {
    try {
      // Validate contact information
      if (cashoutMethod === 'mobile' && !mobileNumber) {
        const errorMessage = t('affiliate.errors.enterMobileNumber');
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert(t('affiliate.errors.validationError'), errorMessage);
        } else {
          showNotificationMessage(errorMessage, 'error');
        }
        return;
      }
      
      if (cashoutMethod === 'paypal' && !email) {
        const errorMessage = t('affiliate.errors.enterPayPalEmail');
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert(t('affiliate.errors.validationError'), errorMessage);
        } else {
          showNotificationMessage(errorMessage, 'error');
        }
        return;
      }

      if (!cashoutAmount || parseFloat(cashoutAmount) < (stats?.minimumPayout || 50)) {
        const errorMessage = t('affiliate.errors.minimumCashout', { 
          min: stats?.minimumPayout || 50,
          needed: (stats?.minimumPayout || 50) - parseFloat(cashoutAmount || 0)
        });
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert(t('affiliate.errors.validationError'), errorMessage);
        } else {
          showNotificationMessage(errorMessage, 'error');
        }
        return;
      }

      setProcessingCashout(true);

      // Prepare form data for Formspree
      const formData = new FormData();
      
      // User information
      formData.append('user_id', user?.id || 'N/A');
      formData.append('user_email', user?.email || 'N/A');
      formData.append('username', user?.username || 'N/A');
      formData.append('promo_code', stats?.promoCode || 'N/A');
      formData.append('affiliate_tier', stats?.affiliateTier || 'basic');
      formData.append('commission_rate', stats?.commissionRate || '10%');
      
      // Cashout information
      formData.append('cashout_amount', cashoutAmount);
      formData.append('cashout_method', cashoutMethod);
      formData.append('country_code', countryCode);
      
      if (cashoutMethod === 'mobile') {
        formData.append('mobile_number', `${countryCode}${mobileNumber}`);
      }
      
      if (cashoutMethod === 'paypal') {
        formData.append('paypal_email', email);
      }
      
      // Stats - Use correct field names
      formData.append('total_earnings', stats?.totalEarnings || 0);
      formData.append('available_for_payout', stats?.todayEarnings || 0); // Changed to todayEarnings
      formData.append('pending_payout', stats?.pendingPayout || 0);
      formData.append('total_referrals', stats?.totalReferrals || 0);
      formData.append('active_referrals', stats?.activeReferrals || 0);
      formData.append('conversion_rate', stats?.conversionRate || '0%');
      
      // Formspree configuration
      formData.append('_replyto', user?.email || 'no-email@example.com');
      formData.append('_subject', `[footai] ${t('affiliate.requestCashoutModal.emailSubject', { username: user?.username || 'Utilisateur' })}`);
      
      console.log('📤 Sending cashout request to Formspree...');
      
      // Send request to Formspree
      const response = await fetch('https://formspree.io/f/xzdbnggj', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('📨 Formspree response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Formspree success:', data);
        
        // UPDATED: Show success notification with consistent message
        const successMessage = t('affiliate.requestCashoutModal.successMessage', { 
          amount: cashoutAmount,
          method: t(`affiliate.requestCashoutModal.${cashoutMethod}`)
        });
        
        // On mobile, show alert with options
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert(
            t('affiliate.errors.cashoutRequestSubmitted'),
            successMessage,
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  setShowCashoutModal(false);
                  // Reset fields
                  setCashoutAmount('');
                  setMobileNumber('');
                  setEmail('');
                  // Refresh stats
                  fetchAffiliateStats();
                },
              },
            ]
          );
        } else {
          // On web, show notification and auto-close modal
          showNotificationMessage(successMessage, 'success');
          
          // Close modal after delay
          setTimeout(() => {
            setShowCashoutModal(false);
            // Reset fields
            setCashoutAmount('');
            setMobileNumber('');
            setEmail('');
            // Refresh stats
            fetchAffiliateStats();
          }, 1500);
        }
        
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Cashout error:', error);
      
      // Show error notification
      const errorMessage = t('affiliate.errors.cashoutError');
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert(t('common.error'), errorMessage);
      } else {
        showNotificationMessage(errorMessage, 'error');
      }
      
    } finally {
      setProcessingCashout(false);
    }
  };

  // Copy promo code to clipboard
  const copyPromoCode = () => {
    // TODO: Implement clipboard copy
    // Clipboard.setString(stats?.promoCode || '');
    Alert.alert(t('common.success'), t('affiliate.promoCodeCopied', { code: stats?.promoCode }));
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isFrench ? 'fr-FR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get earnings for selected period
  const getPeriodEarnings = () => {
    switch (selectedPeriod) {
      case 'today':
        return stats?.todayEarnings || 0;
      case 'week':
        return stats?.thisWeekEarnings || 0;
      case 'month':
        return stats?.thisMonthEarnings || 0;
      case 'total':
        return stats?.totalEarnings || 0;
      default:
        return 0;
    }
  };

  // Get period label
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today':
        return t('affiliate.today');
      case 'week':
        return t('affiliate.week');
      case 'month':
        return t('affiliate.month');
      case 'total':
        return t('affiliate.total');
      default:
        return '';
    }
  };

  // Get tier color
  const getTierColor = (tier) => {
    switch (tier) {
      case 'basic':
        return theme.colors.textSecondary;
      case 'premium':
        return '#FFD700';
      case 'elite':
        return '#00D4FF';
      default:
        return theme.colors.textSecondary;
    }
  };

  // Get tier translation
  const getTierTranslation = (tier) => {
    switch (tier) {
      case 'basic':
        return t('affiliate.basic');
      case 'premium':
        return t('affiliate.premium');
      case 'elite':
        return t('affiliate.elite');
      default:
        return tier?.toUpperCase() || t('affiliate.basic');
    }
  };

  // Handle quick action clicks
  const handleQuickAction = (action) => {
    switch (action) {
      case 'payouts':
        Alert.alert(t('profile.comingSoon'), t('affiliate.payoutsComingSoon'));
        break;
      case 'support':
        Alert.alert(t('affiliate.support'), t('affiliate.supportMessage'));
        break;
      default:
        Alert.alert(t('profile.comingSoon'), t('profile.willBeAvailable'));
    }
  };

  // Get selected country
  const getSelectedCountry = () => {
    return centralAfricanCountries.find(country => country.code === countryCode);
  };

  // Render notification component
  const renderNotification = () => {
    if (!showNotification) return null;
    
    const backgroundColor = notificationType === 'success' ? '#34C759' : 
                           notificationType === 'error' ? '#FF3B30' : 
                           '#007AFF';
    
    const iconName = notificationType === 'success' ? 'checkmark-circle' : 
                    notificationType === 'error' ? 'alert-circle' : 
                    'information-circle';
    
    return (
      <Animated.View 
        style={[
          styles.notification,
          { 
            backgroundColor,
            opacity: notificationAnim,
            transform: [
              {
                translateY: notificationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }
            ]
          }
        ]}
      >
        <Ionicons name={iconName} size={20} color="#FFFFFF" />
        <Text style={styles.notificationText}>{notificationMessage}</Text>
        <TouchableOpacity 
          onPress={() => {
            Animated.timing(notificationAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => setShowNotification(false));
          }}
          style={styles.notificationClose}
        >
          <Ionicons name="close" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>{t('affiliate.stats.loading')}</Text>
      </View>
    );
  }

  // Redirect if not an affiliate
  if (!isAuthenticated || !user?.isAffiliate) {
    return (
      <View style={styles.notAffiliateContainer}>
        <Ionicons name="people" size={80} color={theme.colors.textMuted} />
        <Text style={styles.notAffiliateTitle}>{t('affiliate.notAnAffiliate')}</Text>
        <Text style={styles.notAffiliateText}>
          {t('affiliate.notAffiliateText')}
        </Text>
        <TouchableOpacity 
          style={styles.notAffiliateButton}
          onPress={() => router.push('/affiliate/register')}
        >
          <Ionicons name="rocket" size={20} color="#FFFFFF" />
          <Text style={styles.notAffiliateButtonText}>{t('affiliate.becomeAnAffiliate')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Notification */}
        {renderNotification()}
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('affiliate.dashboard')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Affiliate Tier Badge */}
        <View style={styles.tierSection}>
          <View style={styles.tierBadge}>
            <Ionicons 
              name={stats?.affiliateTier === 'elite' ? "diamond" : stats?.affiliateTier === 'premium' ? "star" : "person"} 
              size={16} 
              color={getTierColor(stats?.affiliateTier)} 
            />
            <Text style={[styles.tierText, { color: getTierColor(stats?.affiliateTier) }]}>
              {getTierTranslation(stats?.affiliateTier)} {t('affiliate.tier')}
            </Text>
          </View>
          <Text style={styles.commissionRate}>
            {t('affiliate.commissionRate', { rate: stats?.commissionRate || '10%' })}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <Ionicons name="cash" size={24} color={theme.colors.highProbability} />
            <Text style={styles.quickStatValue}>
              ${getPeriodEarnings().toFixed(2)}
            </Text>
            <Text style={styles.quickStatLabel}>
              {getPeriodLabel()} {t('affiliate.earnings')}
            </Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Ionicons name="people" size={24} color={theme.colors.accent} />
            <Text style={styles.quickStatValue}>
              {stats?.totalReferrals || 0}
            </Text>
            <Text style={styles.quickStatLabel}>
              {t('affiliate.totalReferrals')}
            </Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Ionicons name="trending-up" size={24} color={theme.colors.mediumProbability} />
            <Text style={styles.quickStatValue}>
              {stats?.conversionRate || '0%'}
            </Text>
            <Text style={styles.quickStatLabel}>
              {t('affiliate.conversionRate')}
            </Text>
          </View>
        </View>

        {/* Earnings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="trending-up" size={20} color={theme.colors.highProbability} />
              <Text style={styles.sectionTitle}>{t('affiliate.earnings')}</Text>
            </View>
            
            <View style={styles.periodSelector}>
              {['today', 'week', 'month', 'total'].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive
                  ]}>
                    {t(`affiliate.${period}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.earningsCards}>
            <View style={[styles.earningCard, styles.totalEarnings]}>
              <Text style={styles.earningCardLabel}>{t('affiliate.totalEarnings')}</Text>
              <Text style={styles.earningCardValue}>
                ${stats?.totalEarnings?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.earningCardSubtext}>
                {t('affiliate.lifetimeCommissionEarned')}
              </Text>
            </View>
            
            <View style={[styles.earningCard, styles.pendingPayout]}>
              <Text style={styles.earningCardLabel}>{t('affiliate.availableForPayout')}</Text>
              <Text style={styles.earningCardValue}>
                ${stats?.todayEarnings?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.earningCardSubtext}>
                {t('affiliate.min', { amount: stats?.minimumPayout || 50 })}
              </Text>
            </View>
          </View>
          
          {/* ✅ FIXED: Cashout Button - check todayEarnings */}
          <TouchableOpacity 
            style={[
              styles.cashoutButton,
              (stats?.todayEarnings || 0) < (stats?.minimumPayout || 50) && styles.cashoutButtonDisabled
            ]}
            onPress={handleCashout}
            disabled={(stats?.todayEarnings || 0) < (stats?.minimumPayout || 50)}
          >
            <Ionicons name="wallet" size={20} color="#FFFFFF" />
            <Text style={styles.cashoutButtonText}>{t('affiliate.requestCashout')}</Text>
          </TouchableOpacity>
          
          {/* Show pending payouts info if any */}
          {stats?.pendingPayout > 0 && (
            <View style={styles.pendingNotification}>
              <Ionicons name="time" size={16} color={theme.colors.mediumProbability} />
              <Text style={styles.pendingNotificationText}>
                {t('affiliate.pendingPayouts', { amount: stats.pendingPayout.toFixed(2) })}
              </Text>
            </View>
          )}
          
          {/* Next Payout Info */}
          <View style={styles.nextPayoutInfo}>
            <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.nextPayoutText}>
              {t('affiliate.nextPayoutDate', { 
                date: stats?.nextPayoutDate ? formatDate(stats.nextPayoutDate) : t('affiliate.notScheduled')
              })}
            </Text>
          </View>
        </View>

        {/* Promo Code Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="key" size={20} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>{t('affiliate.yourPromoCode')}</Text>
            </View>
          </View>
          
          <View style={styles.promoCodeCard}>
            <View style={styles.promoCodeHeader}>
              <Ionicons name="key" size={18} color={theme.colors.textPrimary} />
              <Text style={styles.promoCodeTitle}>{t('affiliate.yourUniquePromoCode')}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.promoCodeDisplay}
              onPress={copyPromoCode}
            >
              <Text style={styles.promoCodeText}>
                {stats?.promoCode || 'N/A'}
              </Text>
              <Ionicons name="copy" size={16} color={theme.colors.accent} />
            </TouchableOpacity>
            
            <Text style={styles.promoCodeHint}>
              {t('affiliate.shareThisCode')}
            </Text>
          </View>
        </View>

        {/* Recent Referrals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="people" size={20} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>{t('affiliate.recentReferrals')}</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert(t('profile.comingSoon'), t('affiliate.allReferralsComingSoon'))}>
              <Text style={styles.seeAll}>{t('affiliate.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.referralsList}>
            {referrals.slice(0, 3).map((referral) => (
              <View key={referral.id} style={styles.referralItem}>
                <View style={styles.referralAvatar}>
                  <Text style={styles.referralAvatarText}>
                    {referral.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.referralInfo}>
                  <Text style={styles.referralName}>{referral.username}</Text>
                  <Text style={styles.referralEmail}>{referral.email}</Text>
                  <Text style={styles.referralDate}>
                    {t('affiliate.joined', { date: formatDate(referral.joinedDate) })}
                  </Text>
                </View>
                
                <View style={styles.referralStats}>
                  <View style={styles.referralStat}>
                    <Text style={styles.referralStatLabel}>{t('affiliate.commission')}</Text>
                    <Text style={styles.referralStatValue}>
                      ${referral.commission.toFixed(2)}
                    </Text>
                  </View>
                  
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: referral.status === 'active' ? '#10B981' : '#6B7280' }
                  ]}>
                    <Text style={styles.statusText}>
                      {referral.status === 'active' ? t('affiliate.active') : t('affiliate.inactive')}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          
          {referrals.length === 0 && (
            <View style={styles.emptyReferrals}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyReferralsTitle}>{t('affiliate.noReferralsYet')}</Text>
              <Text style={styles.emptyReferralsText}>
                {t('affiliate.shareYourPromoCode')}
              </Text>
            </View>
          )}
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="stats-chart" size={20} color={theme.colors.mediumProbability} />
              <Text style={styles.sectionTitle}>{t('affiliate.performanceMetrics')}</Text>
            </View>
          </View>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.highProbability} />
                <Text style={styles.metricLabel}>{t('affiliate.activeReferrals')}</Text>
              </View>
              <Text style={styles.metricValue}>{stats?.activeReferrals || 0}</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="cash" size={16} color={theme.colors.accent} />
                <Text style={styles.metricLabel}>{t('affiliate.avgCommission')}</Text>
              </View>
              <Text style={styles.metricValue}>{stats?.averageCommission || '$0.00'}</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="trending-up" size={16} color={theme.colors.mediumProbability} />
                <Text style={styles.metricLabel}>{t('affiliate.conversion')}</Text>
              </View>
              <Text style={styles.metricValue}>{stats?.conversionRate || '0%'}</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="trophy" size={16} color="#FFD700" />
                <Text style={styles.metricLabel}>{t('affiliate.tier')}</Text>
              </View>
              <Text style={[styles.metricValue, { color: getTierColor(stats?.affiliateTier) }]}>
                {getTierTranslation(stats?.affiliateTier)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="flash" size={20} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>{t('affiliate.quickActions')}</Text>
            </View>
          </View>
          
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => handleQuickAction('payouts')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${theme.colors.mediumProbability}20` }]}>
                <Ionicons name="card" size={24} color={theme.colors.mediumProbability} />
              </View>
              <Text style={styles.quickActionText}>{t('affiliate.payoutHistory')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => handleQuickAction('support')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: `${theme.colors.lowProbability}20` }]}>
                <Ionicons name="headset" size={24} color={theme.colors.lowProbability} />
              </View>
              <Text style={styles.quickActionText}>{t('affiliate.support')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Cashout Modal */}
      <Modal
        visible={showCashoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => !processingCashout && setShowCashoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('affiliate.requestCashoutModal.title')}</Text>
              <TouchableOpacity 
                onPress={() => !processingCashout && setShowCashoutModal(false)}
                disabled={processingCashout}
              >
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.cashoutInfo}>
              {/* ✅ FIXED: Show todayEarnings (available amount) */}
              <View style={styles.cashoutAmountDisplay}>
                <Text style={styles.cashoutAmountLabel}>{t('affiliate.requestCashoutModal.availableForCashout')}</Text>
                <Text style={styles.cashoutAmountValue}>
                  ${stats?.todayEarnings?.toFixed(2) || '0.00'}
                </Text>
              </View>
              
              <View style={styles.cashoutInputContainer}>
                <Text style={styles.cashoutInputLabel}>{t('affiliate.requestCashoutModal.amountToCashout')}</Text>
                <TextInput
                  style={styles.cashoutInput}
                  value={cashoutAmount}
                  onChangeText={setCashoutAmount}
                  placeholder={t('affiliate.requestCashoutModal.enterAmount')}
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.textMuted}
                  editable={!processingCashout}
                />
              </View>
              
              <View style={styles.cashoutMethodContainer}>
                <Text style={styles.cashoutMethodLabel}>{t('affiliate.requestCashoutModal.paymentMethod')}</Text>
                <View style={styles.cashoutMethods}>
                  {['mobile', 'bank', 'paypal', 'crypto'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.cashoutMethodButton,
                        cashoutMethod === method && styles.cashoutMethodButtonActive
                      ]}
                      onPress={() => setCashoutMethod(method)}
                      disabled={processingCashout}
                    >
                      <Text style={[
                        styles.cashoutMethodText,
                        cashoutMethod === method && styles.cashoutMethodTextActive
                      ]}>
                        {t(`affiliate.requestCashoutModal.${method}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Contact Information */}
              {cashoutMethod === 'mobile' && (
                <View style={styles.contactInfoContainer}>
                  <Text style={styles.contactInfoLabel}>{t('affiliate.requestCashoutModal.mobileMoneyDetails')}</Text>
                  
                  <View style={styles.countrySelector}>
                    <TouchableOpacity 
                      style={styles.countrySelectorButton}
                      onPress={() => !processingCashout && setShowCountryDropdown(!showCountryDropdown)}
                      disabled={processingCashout}
                    >
                      <Text style={styles.countrySelectorText}>
                        {getSelectedCountry()?.flag} {getSelectedCountry()?.name} ({countryCode})
                      </Text>
                      <Ionicons 
                        name={showCountryDropdown ? "chevron-up" : "chevron-down"} 
                        size={16} 
                        color={theme.colors.textPrimary} 
                      />
                    </TouchableOpacity>
                    
                    {showCountryDropdown && (
                      <View style={styles.countryDropdown}>
                        <ScrollView style={styles.countryDropdownScroll}>
                          {centralAfricanCountries.map((country) => (
                            <TouchableOpacity
                              key={country.code}
                              style={styles.countryOption}
                              onPress={() => {
                                setCountryCode(country.code);
                                setShowCountryDropdown(false);
                              }}
                            >
                              <Text style={styles.countryOptionText}>
                                {country.flag} {country.name} ({country.code})
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.mobileInputContainer}>
                    <View style={styles.countryCodeDisplay}>
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                    </View>
                    <TextInput
                      style={styles.mobileInput}
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      placeholder={t('affiliate.requestCashoutModal.enterMobileNumber')}
                      keyboardType="phone-pad"
                      placeholderTextColor={theme.colors.textMuted}
                      editable={!processingCashout}
                    />
                  </View>
                  
                  <Text style={styles.contactHint}>
                    {t('affiliate.requestCashoutModal.mobileMoneyHint', { country: getSelectedCountry()?.name })}
                  </Text>
                </View>
              )}
              
              {cashoutMethod === 'paypal' && (
                <View style={styles.contactInfoContainer}>
                  <Text style={styles.contactInfoLabel}>{t('affiliate.requestCashoutModal.paypalEmail')}</Text>
                  <TextInput
                    style={styles.emailInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('affiliate.requestCashoutModal.enterPayPalEmail')}
                    keyboardType="email-address"
                    placeholderTextColor={theme.colors.textMuted}
                    editable={!processingCashout}
                    autoCapitalize="none"
                  />
                  <Text style={styles.contactHint}>
                    {t('affiliate.requestCashoutModal.paypalHint')}
                  </Text>
                </View>
              )}
              
              {cashoutMethod === 'bank' && (
                <View style={styles.contactInfoContainer}>
                  <Text style={styles.contactInfoLabel}>{t('affiliate.requestCashoutModal.bankTransferDetails')}</Text>
                  <Text style={styles.contactHint}>
                    {t('affiliate.requestCashoutModal.bankHint')}
                  </Text>
                </View>
              )}
              
              {cashoutMethod === 'crypto' && (
                <View style={styles.contactInfoContainer}>
                  <Text style={styles.contactInfoLabel}>{t('affiliate.requestCashoutModal.cryptoWallet')}</Text>
                  <Text style={styles.contactHint}>
                    {t('affiliate.requestCashoutModal.cryptoHint')}
                  </Text>
                </View>
              )}
              
              <View style={styles.cashoutNotes}>
                <Ionicons name="information-circle" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.cashoutNotesText}>
                  {t('affiliate.requestCashoutModal.cashoutNotes', { min: stats?.minimumPayout || 50 })}
                </Text>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => !processingCashout && setShowCashoutModal(false)}
                disabled={processingCashout}
              >
                <Text style={styles.cancelButtonText}>{t('affiliate.requestCashoutModal.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.submitButton,
                  (!cashoutAmount || parseFloat(cashoutAmount) < (stats?.minimumPayout || 50)) && styles.submitButtonDisabled
                ]}
                onPress={processCashout}
                disabled={processingCashout || !cashoutAmount || parseFloat(cashoutAmount) < (stats?.minimumPayout || 50)}
              >
                {processingCashout ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>{t('affiliate.requestCashoutModal.submitRequest')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginTop: theme.spacing.md,
  },
  notAffiliateContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  notAffiliateTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  notAffiliateText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  notAffiliateButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  notAffiliateButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.cardBackground,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.medium,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  tierSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  commissionRate: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  quickStatValue: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 2,
  },
  quickStatLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    padding: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: theme.colors.accent,
  },
  periodButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  earningsCards: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  earningCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.small,
  },
  totalEarnings: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.highProbability,
  },
  pendingPayout: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  earningCardLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  earningCardValue: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  earningCardSubtext: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  cashoutButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small,
  },
  cashoutButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.7,
  },
  cashoutButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
  },
  // ✅ ADDED: Pending notification style
  pendingNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: `${theme.colors.mediumProbability}20`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pendingNotificationText: {
    color: theme.colors.mediumProbability,
    fontSize: 12,
    fontWeight: '600',
  },
  nextPayoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  nextPayoutText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  promoCodeCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  promoCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  promoCodeTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  promoCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  promoCodeText: {
    color: theme.colors.accent,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  promoCodeHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  seeAll: {
    color: theme.colors.accent,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  referralsList: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  referralAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    marginBottom: 2,
  },
  referralEmail: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  referralDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  referralStats: {
    alignItems: 'flex-end',
  },
  referralStat: {
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  referralStatLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  referralStatValue: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyReferrals: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  emptyReferralsTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyReferralsText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.small,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  metricValue: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickAction: {
    width: '48%',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  quickActionText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxHeight: '90%',
    ...theme.shadows.large,
  },
  modalScrollContent: {
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  cashoutInfo: {
    marginBottom: theme.spacing.lg,
  },
  cashoutAmountDisplay: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  cashoutAmountLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  cashoutAmountValue: {
    color: theme.colors.accent,
    fontSize: 32,
    fontWeight: '800',
  },
  cashoutInputContainer: {
    marginBottom: theme.spacing.lg,
  },
  cashoutInputLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  cashoutInput: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cashoutMethodContainer: {
    marginBottom: theme.spacing.lg,
  },
  cashoutMethodLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  cashoutMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  cashoutMethodButton: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cashoutMethodButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  cashoutMethodText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  cashoutMethodTextActive: {
    color: '#FFFFFF',
  },
  contactInfoContainer: {
    backgroundColor: `${theme.colors.accent}10`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  contactInfoLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  countrySelector: {
    marginBottom: theme.spacing.md,
  },
  countrySelectorButton: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  countrySelectorText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
  },
  countryDropdown: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 2,
    maxHeight: 200,
    ...theme.shadows.small,
  },
  countryDropdownScroll: {
    maxHeight: 200,
  },
  countryOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  countryOptionText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
  },
  mobileInputContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  countryCodeDisplay: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 80,
  },
  countryCodeText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  mobileInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emailInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  contactHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  cashoutNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: `${theme.colors.accent}10`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  cashoutNotesText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.6,
  },
  cancelButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  // ✅ ADDED: Notification styles
  notification: {
    position: 'absolute',
    top: 100,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 10,
    zIndex: 1000,
    ...theme.shadows.medium,
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  notificationClose: {
    padding: 4,
  },
});

export default AffiliateDashboardScreen;
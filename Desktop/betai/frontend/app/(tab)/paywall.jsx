import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { theme } from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../contexts/authContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import '../../utils/i18n';

// Get screen dimensions
const { width } = Dimensions.get('window');

// API Base URL
const API_BASE_URL = 'https://betai-backend-uxt5.onrender.com';

// African countries
const SUPPORTED_COUNTRIES = [
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', currency: 'XAF' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', currency: 'XOF' },
  { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮', currency: 'XOF' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', currency: 'XOF' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', currency: 'XOF' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', currency: 'XOF' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
];

// Base plans without discounts
const getBasePlans = (t) => [
  {
    id: 'coins_500',
    name: t('paywall.planDetails.coins_500.name'),
    coins: 500,
    price: 500, // Changed from 500 to 100 XAF
    originalPrice: 800, // Changed from 800 to 200 XAF
    currency: 'XAF',
    duration: t('paywall.planDetails.coins_500.duration'),
    utilization: t('paywall.planDetails.coins_500.utilization'),
    tag: t('paywall.tags.popular'),
    features: [
      t('paywall.planDetails.coins_500.features.0'),
      t('paywall.planDetails.coins_500.features.1'),
      t('paywall.planDetails.coins_500.features.2'),
      t('paywall.planDetails.coins_500.features.3'),
    ],
    type: 'coins',
  },
  {
    id: 'coins_1200',
    name: t('paywall.planDetails.coins_1200.name'),
    coins: 1200,
    price: 1000,
    originalPrice: 1500,
    currency: 'XAF',
    duration: t('paywall.planDetails.coins_1200.duration'),
    utilization: t('paywall.planDetails.coins_1200.utilization'),
    tag: t('paywall.tags.bestValue'),
    features: [
      t('paywall.planDetails.coins_1200.features.0'),
      t('paywall.planDetails.coins_1200.features.1'),
      t('paywall.planDetails.coins_1200.features.2'),
      t('paywall.planDetails.coins_1200.features.3'),
    ],
    type: 'coins',
  },
  {
    id: 'weekly_unlimited',
    name: t('paywall.planDetails.weekly_unlimited.name'),
    price: 5000,
    originalPrice: 7000,
    currency: 'XAF',
    duration: t('paywall.planDetails.weekly_unlimited.duration'),
    utilization: t('paywall.planDetails.weekly_unlimited.utilization'),
    tag: t('paywall.tags.unlimited'),
    features: [
      t('paywall.planDetails.weekly_unlimited.features.0'),
      t('paywall.planDetails.weekly_unlimited.features.1'),
      t('paywall.planDetails.weekly_unlimited.features.2'),
      t('paywall.planDetails.weekly_unlimited.features.3'),
      t('paywall.planDetails.weekly_unlimited.features.4'),
    ],
    type: 'subscription',
  },
  {
    id: 'monthly_unlimited',
    name: t('paywall.planDetails.monthly_unlimited.name'),
    price: 15000,
    originalPrice: 20000,
    currency: 'XAF',
    duration: t('paywall.planDetails.monthly_unlimited.duration'),
    utilization: t('paywall.planDetails.monthly_unlimited.utilization'),
    tag: t('paywall.tags.premium'),
    features: [
      t('paywall.planDetails.monthly_unlimited.features.0'),
      t('paywall.planDetails.monthly_unlimited.features.1'),
      t('paywall.planDetails.monthly_unlimited.features.2'),
      t('paywall.planDetails.monthly_unlimited.features.3'),
      t('paywall.planDetails.monthly_unlimited.features.4'),
      t('paywall.planDetails.monthly_unlimited.features.5'),
      t('paywall.planDetails.monthly_unlimited.features.6'),
    ],
    type: 'subscription',
  },
];

const PaywallScreen = () => {

  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated,refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(SUPPORTED_COUNTRIES[0]);
  const [isSelectingCountry, setIsSelectingCountry] = useState(false);
  const [activeTab, setActiveTab] = useState('coins');
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [promoDiscountApplied, setPromoDiscountApplied] = useState(false);
  const [hasPromoDiscount, setHasPromoDiscount] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  
  const processingRef = useRef(false);

  useEffect(() => {
    const plans = getBasePlans(t);
    setSubscriptionPlans(plans);
  }, [t]);

 // In paywall.js - replace auto-refresh with this


// Inside component
useFocusEffect(
  React.useCallback(() => {
    if (user && refreshUser) {
      console.log('💰 Paywall focused - refreshing credits');
      refreshUser();
    }
  }, [user, refreshUser])
);

  useEffect(() => {
    if (user) {
      const eligibleForDiscount = user.usedPromoCode && !user.promoPerkUsed;
      setHasPromoDiscount(eligibleForDiscount);
      const plans = getBasePlans(t);
      if (eligibleForDiscount) {
        const discountedPlans = plans.map(plan => ({
          ...plan,
          discountedPrice: Math.round(plan.price * 0.9),
          originalPriceForDiscount: plan.price,
          hasDiscount: true,
          discountPercentage: 10
        }));
        setSubscriptionPlans(discountedPlans);
        setPromoDiscountApplied(true);
      } else {
        setSubscriptionPlans(plans);
        setPromoDiscountApplied(false);
      }
    }
  }, [user, t]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        Alert.alert(
          t('paywall.authRequired.title'),
          t('paywall.authRequired.message'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
              onPress: () => router.back(),
            },
            {
              text: t('paywall.authRequired.login'),
              onPress: () => router.push('/auth/login'),
            },
          ]
        );
      } else {
        if (user?.country) {
          const userCountry = SUPPORTED_COUNTRIES.find(c => c.code === user.country);
          if (userCountry) {
            setSelectedCountry(userCountry);
          }
        }
        setLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, user, t, router]);

  const getPlanPrice = (plan) => {
    if (hasPromoDiscount && user && !user.promoPerkUsed) {
      return plan.discountedPrice || plan.price;
    }
    return plan.price;
  };

  const getDisplayPrice = (plan) => {
    const price = getPlanPrice(plan);
    return `${price} XAF`;
  };

  const getDisplayOriginalPrice = (plan) => {
    const originalPrice = plan.originalPriceForDiscount || plan.originalPrice || plan.price;
    return `${originalPrice} XAF`;
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsSelectingCountry(false);
  };

  const toggleFAQ = (faqId) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const handleSelectPlan = async (plan) => {
    if (processingRef.current) return;
    
    setSelectedPlan(plan);
    await initiatePayment(plan);
  };

  const initiatePayment = async (plan) => {
    if (!user) {
      Alert.alert(
        t('paywall.payment.errors.failed.title'),
        t('paywall.payment.errors.userNotFound')
      );
      return;
    }

    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    setProcessingPayment(true);

    try {
      const paymentData = {
        userId: user._id,
        planId: plan.id,
        countryCode: selectedCountry.code,
      };

      console.log('🟡 Sending payment request to:', `${API_BASE_URL}/api/payments/create`);
      console.log('🟡 Payment data:', paymentData);

      const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      console.log('🟡 Response status:', response.status);

      // Get the response text first to see what we're getting
      const responseText = await response.text();
      console.log('🟡 Raw response text:', responseText.substring(0, 200) + '...');

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('🟡 Parsed JSON result:', result);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
        console.error('❌ Response was:', responseText);
        
        // If response is HTML or plain text, show appropriate error
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          throw new Error('Server returned HTML instead of JSON. The API endpoint might be wrong.');
        } else if (responseText.includes('Cannot POST') || responseText.includes('404')) {
          throw new Error('API endpoint not found (404). Check your API URL.');
        } else if (responseText.includes('Cannot GET')) {
          throw new Error('Wrong HTTP method. Should be POST.');
        } else {
          throw new Error(`Server response is not valid JSON: ${responseText.substring(0, 50)}...`);
        }
      }

      if (!response.ok) {
        const errorMessage = result.message || result.detail || result.error || t('paywall.payment.errors.createFailed');
        console.error('❌ API error response:', result);
        throw new Error(errorMessage);
      }

      if (!result.success && result.success !== undefined) {
        throw new Error(result.message || t('paywall.payment.errors.createFailed'));
      }

      const txId = result.transactionId || result.fapshiTransId;
      setTransactionId(txId);
      setPaymentUrl(result.paymentUrl);
      setPaymentStatus('pending');

      // Directly redirect to payment URL without any alerts
      if (result.paymentUrl) {
        const canOpen = await Linking.canOpenURL(result.paymentUrl);
        if (canOpen) {
          await Linking.openURL(result.paymentUrl);
          // User will be redirected back to app after payment
        } else {
          Alert.alert(
            t('paywall.payment.errors.linkError.title'),
            t('paywall.payment.errors.linkError.message'),
            [{ text: t('common.ok') }]
          );
        }
      } else {
        Alert.alert(
          t('paywall.payment.errors.failed.title'),
          t('paywall.payment.errors.noPaymentUrl')
        );
      }
    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      
      let errorMessage = error.message;
      
      // Handle specific error cases
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Check your internet connection and API server.';
      } else if (error.message.includes('API endpoint not found')) {
        errorMessage = 'Payment API endpoint not found. Contact support.';
      } else if (error.message.includes('Server returned HTML')) {
        errorMessage = 'Server configuration error. The API returned HTML instead of JSON.';
      }
      
      Alert.alert(
        t('paywall.payment.errors.failed.title'),
        errorMessage || t('paywall.payment.errors.failed.message')
      );
      setPaymentStatus('failed');
    } finally {
      setProcessingPayment(false);
      processingRef.current = false;
    }
  };

  const renderPromoDiscountBanner = () => {
    if (hasPromoDiscount && user && !user.promoPerkUsed) {
      return (
        <View style={styles.promoBanner}>
          <View style={styles.promoBannerContent}>
            <Ionicons name="gift" size={20} color="#FFFFFF" />
            <View style={styles.promoTextContainer}>
              <Text style={styles.promoTitle}>{t('paywall.promoBanner.title')}</Text>
              <Text style={styles.promoSubtitle}>{t('paywall.promoBanner.subtitle')}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.promoCloseButton}
            onPress={() => setPromoDiscountApplied(false)}
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlan?.id === plan.id;
    const hasDiscount = hasPromoDiscount && user && !user.promoPerkUsed;
    const displayPrice = getDisplayPrice(plan);
    const displayOriginalPrice = getDisplayOriginalPrice(plan);
    const discountPercentage = hasDiscount ? 10 : Math.round((1 - plan.price / plan.originalPrice) * 100);

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard,
          plan.tag === t('paywall.tags.popular') && styles.popularPlanCard,
          plan.tag === t('paywall.tags.bestValue') && styles.bestValuePlanCard,
          hasDiscount && styles.discountedPlanCard,
        ]}
        onPress={() => handleSelectPlan(plan)}
        activeOpacity={0.7}
        disabled={processingPayment}
      >
        <View style={styles.planHeader}>
          <View style={styles.planTitleContainer}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.tag && (
              <View
                style={[
                  styles.planTag,
                  plan.tag === t('paywall.tags.popular') && styles.popularTag,
                  plan.tag === t('paywall.tags.bestValue') && styles.bestValueTag,
                  plan.tag === t('paywall.tags.unlimited') && styles.unlimitedTag,
                  plan.tag === t('paywall.tags.premium') && styles.premiumTag,
                ]}
              >
                <Text style={styles.planTagText}>{plan.tag}</Text>
              </View>
            )}
          </View>

          {plan.type === 'coins' && (
            <View style={styles.coinBadge}>
              <Ionicons name="logo-bitcoin" size={16} color="#F7931A" />
              <Text style={styles.coinCount}>{plan.coins} {t('paywall.planDetails.coins')}</Text>
            </View>
          )}
        </View>

        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Ionicons name="flash" size={12} color="#FFFFFF" />
            <Text style={styles.discountBadgeText}>
              {t('paywall.discountBadge', { percentage: 10 })}
            </Text>
          </View>
        )}

        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.price}>{displayPrice}</Text>
            <Text style={styles.originalPrice}>{displayOriginalPrice}</Text>
          </View>
          <View style={[styles.saveBadge, hasDiscount && styles.promoSaveBadge]}>
            <Text style={styles.saveText}>
              {t('paywall.saveBadge', { percentage: discountPercentage })}
            </Text>
          </View>
        </View>

        <View style={styles.durationContainer}>
          <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.durationText}>
            {t('paywall.validFor', { duration: plan.duration })}
          </Text>
        </View>

        <View style={styles.featuresList}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.highProbability} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isSelected && styles.selectedButton,
            hasDiscount && styles.discountButton,
            processingPayment && styles.disabledButton,
          ]}
          onPress={() => handleSelectPlan(plan)}
          disabled={processingPayment}
        >
          {processingPayment && isSelected ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={[styles.selectButtonText, isSelected && styles.selectedButtonText]}>
                {isSelected ? t('paywall.planActions.selected') : t('paywall.planActions.selectPlan')}
              </Text>
              {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              {hasDiscount && !isSelected && (
                <Ionicons name="gift" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.countryItem, selectedCountry?.code === item.code && styles.selectedCountryItem]}
      onPress={() => handleCountrySelect(item)}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.countryCurrency}>{item.currency}</Text>
    </TouchableOpacity>
  );

  const faqData = [
    {
      id: 1,
      question: t('paywall.faqSection.questions.0'),
      answer: t('faqSection.answers.0', {  
        coinsPerGeneration: 100, 
        freeCredits: 100, 
        contactEmail: 'freecoder21@gmail.com' 
      })
    },
    {
      id: 2,
      question: t('paywall.faqSection.questions.1'),
      answer: t('faqSection.answers.1') 
    },
    {
      id: 3,
      question: t('paywall.faqSection.questions.2'),
      answer: t('faqSection.answers.2') 
    },
    {
      id: 4,
      question: t('paywall.faqSection.questions.3'),
      answer: t('faqSection.answers.3', { 
        contactEmail: 'freecoder21@gmail.com' 
      })
    },
  ];

  const renderFAQItem = (faq) => (
    <View key={faq.id} style={styles.faqItemContainer}>
      <TouchableOpacity
        style={styles.faqQuestionRow}
        onPress={() => toggleFAQ(faq.id)}
        activeOpacity={0.7}
      >
        <View style={styles.faqQuestionContent}>
          <Text style={styles.faqQuestion}>{faq.question}</Text>
        </View>
        <Ionicons 
          name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={theme.colors.accent} 
        />
      </TouchableOpacity>

      {expandedFAQ === faq.id && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        </View>
      )}

      {faq.id < faqData.length && <View style={styles.faqSeparator} />}
    </View>
  );

  // Loading state
  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>{t('paywall.loading')}</Text>
      </View>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Ionicons name="lock-closed" size={80} color={theme.colors.textMuted} />
        <Text style={styles.authTitle}>{t('paywall.authRequired.title')}</Text>
        <Text style={styles.authText}>{t('paywall.authRequired.viewMessage')}</Text>
        <TouchableOpacity 
          style={styles.authButton}
          onPress={() => router.push('/auth/login')}
        >
          <Ionicons name="log-in" size={20} color="#FFFFFF" />
          <Text style={styles.authButtonText}>{t('paywall.authRequired.loginNow')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Country Selection Modal
  if (isSelectingCountry) {
    return (
      <View style={styles.countrySelectionContainer}>
        <View style={styles.countrySelectionHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setIsSelectingCountry(false);
              setSelectedPlan(null);
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.countrySelectionTitle}>{t('paywall.countrySelection.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.countrySelectionSubtitle}>
          {t('paywall.countrySelection.subtitle')}
        </Text>

        <FlatList
          data={SUPPORTED_COUNTRIES}
          renderItem={renderCountryItem}
          keyExtractor={(item) => item.code}
          numColumns={3}
          contentContainerStyle={styles.countriesGrid}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.countrySelectionFooter}>
          <Text style={styles.countrySelectionFooterText}>
            {t('paywall.countrySelection.footer')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {renderPromoDiscountBanner()}

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={processingPayment}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('paywall.header.title')}</Text>
          <View style={styles.userBalance}>
            <Ionicons name="logo-bitcoin" size={16} color="#F7931A" />
            <Text style={styles.balanceText}>
              {t('paywall.header.coins', { count: user?.credits || 0 })}
            </Text>
          </View>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerSubtitle}>
            {t('paywall.header.subtitle')}
          </Text>

          {user?.usedPromoCode && (
            <View style={styles.promoInfoCard}>
              <View style={styles.promoInfoContent}>
                <Ionicons name="ticket" size={16} color={theme.colors.accent} />
                <Text style={styles.promoInfoText}>
                  {t('paywall.promoInfo.registeredWith')} 
                  <Text style={styles.promoCodeText}> {user.usedPromoCode}</Text>
                </Text>
              </View>
              {!user.promoPerkUsed && (
                <View style={styles.promoStatusBadge}>
                  <Text style={styles.promoStatusText}>
                    {t('paywall.promoInfo.discountAvailable')}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={styles.countrySelector}
            onPress={() => setIsSelectingCountry(true)}
            disabled={processingPayment}
          >
            <View style={styles.countrySelectorLeft}>
              <Ionicons name="globe" size={20} color={theme.colors.accent} />
              <View style={styles.countrySelectorInfo}>
                <Text style={styles.countrySelectorLabel}>
                  {t('paywall.countrySelector.label')}
                </Text>
                <Text style={styles.countrySelectorValue}>
                  {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : t('paywall.countrySelector.select')}
                </Text>
                {selectedCountry && (
                  <Text style={styles.countrySelectorInfoText}>
                    {t('paywall.countrySelector.currency', { currency: selectedCountry.currency })}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coins' && styles.activeTab]}
          onPress={() => setActiveTab('coins')}
          disabled={processingPayment}
        >
          <Ionicons 
            name="logo-bitcoin" 
            size={20} 
            color={activeTab === 'coins' ? theme.colors.accent : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'coins' && styles.activeTabText]}>
            {t('paywall.tabs.coins')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscriptions' && styles.activeTab]}
          onPress={() => setActiveTab('subscriptions')}
          disabled={processingPayment}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={activeTab === 'subscriptions' ? theme.colors.accent : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.activeTabText]}>
            {t('paywall.tabs.subscriptions')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.plansSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'coins' ? t('paywall.plansSection.coinsTitle') : t('paywall.plansSection.subscriptionsTitle')}
          </Text>
          {hasPromoDiscount && user && !user.promoPerkUsed && (
            <View style={styles.discountIndicator}>
              <Ionicons name="gift" size={14} color={theme.colors.highProbability} />
              <Text style={styles.discountIndicatorText}>
                {t('paywall.discountIndicator', { percentage: 10 })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.plansGrid}>
          {subscriptionPlans
            .filter(plan => activeTab === 'coins' ? plan.type === 'coins' : plan.type === 'subscription')
            .map(plan => renderPlanCard(plan))}
        </View>
      </View>

      {paymentStatus && (
        <View style={[
          styles.paymentStatusCard, 
          paymentStatus === 'pending' && styles.paymentStatusPending,
          paymentStatus === 'success' && styles.paymentStatusSuccess,
          paymentStatus === 'failed' && styles.paymentStatusFailed
        ]}>
          <Ionicons 
            name={
              paymentStatus === 'pending' ? 'time' :
              paymentStatus === 'success' ? 'checkmark-circle' : 'close-circle'
            } 
            size={20} 
            color="#FFFFFF" 
          />
          <View style={styles.paymentStatusContent}>
            <Text style={styles.paymentStatusTitle}>
              {paymentStatus === 'pending' ? t('paywall.paymentStatus.pending.title') :
               paymentStatus === 'success' ? t('paywall.paymentStatus.success.title') : 
               t('paywall.paymentStatus.failed.title')}
            </Text>
            <Text style={styles.paymentStatusText}>
              {paymentStatus === 'pending' ? t('paywall.paymentStatus.pending.message') :
               paymentStatus === 'success' ? t('paywall.paymentStatus.success.message') :
               t('paywall.paymentStatus.failed.message')}
            </Text>
            {transactionId && (
              <Text style={styles.transactionId}>
                {t('paywall.paymentStatus.transaction', { id: transactionId.substring(0, 20) + '...' })}
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.featuresSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={20} color={theme.colors.accent} />
          <Text style={styles.sectionTitle}>{t('paywall.featuresSection.title')}</Text>
        </View>

        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="analytics" size={24} color={theme.colors.accent} />
            </View>
            <Text style={styles.featureCardTitle}>
              {t('paywall.features.aiPredictions.title')}
            </Text>
            <Text style={styles.featureCardText}>
              {t('paywall.features.aiPredictions.description')}
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="trending-up" size={24} color={theme.colors.highProbability} />
            </View>
            <Text style={styles.featureCardTitle}>
              {t('paywall.features.highAccuracy.title')}
            </Text>
            <Text style={styles.featureCardText}>
              {t('paywall.features.highAccuracy.description')}
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="infinite" size={24} color={theme.colors.mediumProbability} />
            </View>
            <Text style={styles.featureCardTitle}>
              {t('paywall.features.unlimitedAccess.title')}
            </Text>
            <Text style={styles.featureCardText}>
              {t('paywall.features.unlimitedAccess.description')}
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.lowProbability} />
            </View>
            <Text style={styles.featureCardTitle}>
              {t('paywall.features.safeSecure.title')}
            </Text>
            <Text style={styles.featureCardText}>
              {t('paywall.features.safeSecure.description')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.paymentInfoSection}>
        <View style={styles.paymentInfoCard}>
          <Ionicons name="lock-closed" size={24} color={theme.colors.accent} />
          <View style={styles.paymentInfoContent}>
            <Text style={styles.paymentInfoTitle}>
              {t('paywall.paymentInfo.securePayment.title')}
            </Text>
            <Text style={styles.paymentInfoText}>
              {t('paywall.paymentInfo.securePayment.description')}
            </Text>
          </View>
        </View>

        <View style={styles.paymentInfoCard}>
          <Ionicons name="refresh-circle" size={24} color={theme.colors.highProbability} />
          <View style={styles.paymentInfoContent}>
            <Text style={styles.paymentInfoTitle}>
              {t('paywall.paymentInfo.easyCancellation.title')}
            </Text>
            <Text style={styles.paymentInfoText}>
              {t('paywall.paymentInfo.easyCancellation.description')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.faqSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="help-circle" size={20} color={theme.colors.accent} />
          <Text style={styles.sectionTitle}>{t('paywall.faqSection.title')}</Text>
        </View>

        <View style={styles.faqList}>
          {faqData.map(faq => renderFAQItem(faq))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('paywall.footer.agreement')}
        </Text>
        <Text style={styles.copyright}>{t('paywall.footer.copyright')}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginTop: 16,
  },
  authContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  authTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.header.fontSize,
    fontWeight: theme.typography.header.fontWeight,
    marginTop: 24,
    marginBottom: 8,
  },
  authText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: theme.typography.body.lineHeight,
  },
  authButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    minWidth: 200,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  countrySelectionContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  countrySelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  countrySelectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.header.fontSize,
    fontWeight: theme.typography.header.fontWeight,
    flex: 1,
    textAlign: 'center',
  },
  countrySelectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: theme.typography.body.lineHeight,
  },
  countriesGrid: {
    paddingBottom: theme.spacing.xl,
  },
  countryItem: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    margin: 4,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    minWidth: 100,
    maxWidth: (width - 64) / 3,
    ...theme.shadows.small,
  },
  selectedCountryItem: {
    backgroundColor: theme.colors.accent + '20',
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  countryFlag: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  countryName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  countryCurrency: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize - 2,
  },
  countrySelectionFooter: {
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  countrySelectionFooterText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small.fontSize,
    textAlign: 'center',
  },
  promoBanner: {
    backgroundColor: theme.colors.highProbability,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  promoBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
  },
  promoSubtitle: {
    color: '#FFFFFF',
    fontSize: theme.typography.small.fontSize,
    opacity: 0.9,
  },
  promoCloseButton: {
    padding: 4,
  },
  promoInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    width: '100%',
    ...theme.shadows.small,
  },
  promoInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  promoInfoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
  },
  promoCodeText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  promoStatusBadge: {
    backgroundColor: theme.colors.highProbability,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  promoStatusText: {
    color: '#FFFFFF',
    fontSize: theme.typography.small.fontSize - 2,
    fontWeight: '700',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.highProbability,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: theme.typography.small.fontSize - 2,
    fontWeight: '700',
  },
  discountIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.highProbability + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  discountIndicatorText: {
    color: theme.colors.highProbability,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '700',
  },
  discountedPlanCard: {
    borderWidth: 2,
    borderColor: theme.colors.highProbability + '50',
  },
  promoSaveBadge: {
    backgroundColor: theme.colors.highProbability,
  },
  discountButton: {
    backgroundColor: theme.colors.highProbability,
  },
  disabledButton: {
    opacity: 0.6,
  },
  header: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.medium,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardElevated,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.header.fontSize,
    fontWeight: theme.typography.header.fontWeight,
    textAlign: 'center',
    flex: 1,
  },
  userBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardElevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  balanceText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.body.lineHeight,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    ...theme.shadows.small,
  },
  countrySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  countrySelectorInfo: {
    flex: 1,
  },
  countrySelectorLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
    marginBottom: 2,
  },
  countrySelectorValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
  },
  countrySelectorInfoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize - 2,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.cardElevated,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    ...theme.shadows.small,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  activeTab: {
    backgroundColor: theme.colors.cardBackground,
    ...theme.shadows.small,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.textPrimary,
  },
  plansSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
  },
  plansGrid: {
    gap: theme.spacing.md,
  },
  planCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  popularPlanCard: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  bestValuePlanCard: {
    borderWidth: 2,
    borderColor: theme.colors.highProbability,
  },
  selectedPlanCard: {
    backgroundColor: theme.colors.accent + '10',
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  planName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
  },
  planTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularTag: {
    backgroundColor: theme.colors.accent,
  },
  bestValueTag: {
    backgroundColor: theme.colors.highProbability,
  },
  unlimitedTag: {
    backgroundColor: theme.colors.mediumProbability,
  },
  premiumTag: {
    backgroundColor: '#8B5CF6',
  },
  planTagText: {
    color: '#FFFFFF',
    fontSize: theme.typography.small.fontSize - 2,
    fontWeight: '700',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7931A20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  coinCount: {
    color: '#F7931A',
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  price: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
  },
  originalPrice: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body.fontSize,
    textDecorationLine: 'line-through',
  },
  saveBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: theme.typography.small.fontSize - 2,
    fontWeight: '700',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  durationText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
  },
  featuresList: {
    marginBottom: theme.spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
    flex: 1,
    lineHeight: theme.typography.small.lineHeight,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  selectedButton: {
    backgroundColor: theme.colors.highProbability,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '700',
  },
  selectedButtonText: {
    color: '#FFFFFF',
  },
  paymentStatusCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    ...theme.shadows.medium,
  },
  paymentStatusPending: {
    backgroundColor: '#F59E0B',
  },
  paymentStatusSuccess: {
    backgroundColor: theme.colors.highProbability,
  },
  paymentStatusFailed: {
    backgroundColor: theme.colors.lowProbability,
  },
  paymentStatusContent: {
    flex: 1,
  },
  paymentStatusTitle: {
    color: '#FFFFFF',
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentStatusText: {
    color: '#FFFFFF',
    fontSize: theme.typography.small.fontSize,
    opacity: 0.9,
    lineHeight: theme.typography.small.lineHeight,
  },
  transactionId: {
    color: '#FFFFFF',
    fontSize: theme.typography.small.fontSize - 2,
    opacity: 0.8,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  featuresSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  featureCard: {
    width: (width - theme.spacing.lg * 2 - theme.spacing.sm) / 2,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.small,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  featureCardTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureCardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
    textAlign: 'center',
    lineHeight: theme.typography.small.lineHeight,
  },
  paymentInfoSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  paymentInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small,
  },
  paymentInfoContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  paymentInfoTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentInfoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
    lineHeight: theme.typography.small.lineHeight,
  },
  faqSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  faqList: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  faqItemContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  faqQuestionContent: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  faqQuestion: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  faqAnswerContainer: {
    paddingBottom: theme.spacing.md,
  },
  faqAnswer: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
    lineHeight: theme.typography.small.lineHeight,
  },
  faqSeparator: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  copyright: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small.fontSize - 2,
    textAlign: 'center',
  },
});

export default PaywallScreen;
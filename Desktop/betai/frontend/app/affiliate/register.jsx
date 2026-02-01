// app/register.jsx - Updated with consistent notification system
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { theme } from '../../constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../contexts/authContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import '../../utils/i18n';

const AffiliateRegisterScreen = () => {
  const router = useRouter();
  const { 
    user, 
    updateUser, 
    isAuthenticated, 
    loading: authLoading,
    becomeAffiliate 
  } = useAuth();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  
  const [promoCode, setPromoCode] = useState(user?.promoCode || '');
  const [loading, setLoading] = useState(false);
  const [promoCodeError, setPromoCodeError] = useState('');
  const [selectedBenefits, setSelectedBenefits] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const notificationAnim = useRef(new Animated.Value(0)).current;

  // Benefits of becoming an affiliate
  const affiliateBenefits = [
    {
      id: 'commission',
      title: t('affiliate.register.benefits.commission.title'),
      description: t('affiliate.register.benefits.commission.description'),
      icon: 'cash',
      color: theme.colors.highProbability,
    },
    {
      id: 'tracking',
      title: t('affiliate.register.benefits.tracking.title'),
      description: t('affiliate.register.benefits.tracking.description'),
      icon: 'analytics',
      color: theme.colors.accent,
    },
    {
      id: 'dashboard',
      title: t('affiliate.register.benefits.dashboard.title'),
      description: t('affiliate.register.benefits.dashboard.description'),
      icon: 'stats-chart',
      color: theme.colors.mediumProbability,
    },
    {
      id: 'bonus',
      title: t('affiliate.register.benefits.bonus.title'),
      description: t('affiliate.register.benefits.bonus.description'),
      icon: 'gift',
      color: theme.colors.lowProbability,
    },
    {
      id: 'support',
      title: t('affiliate.register.benefits.support.title'),
      description: t('affiliate.register.benefits.support.description'),
      icon: 'headset',
      color: theme.colors.accent,
    },
    {
      id: 'tools',
      title: t('affiliate.register.benefits.tools.title'),
      description: t('affiliate.register.benefits.tools.description'),
      icon: 'megaphone',
      color: theme.colors.highProbability,
    },
  ];

  // Handle notification display
  const showSuccessNotification = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    
    // Animate in
    Animated.sequence([
      Animated.timing(notificationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowNotification(false);
    });
  };

  // Generate a random promo code if user doesn't have one
  const generatePromoCode = () => {
    const prefix = (user?.username || 'footai').toUpperCase().substring(0, 4);
    const randomNum = Math.floor(100 + Math.random() * 900);
    const generatedCode = `${prefix}${randomNum}`;
    setPromoCode(generatedCode);
    setPromoCodeError('');
    
    // Show notification for generated code
    showSuccessNotification(t('affiliate.register.promoGenerated'));
  };

  // Validate promo code
  const validatePromoCode = (code) => {
    if (!code || code.trim().length === 0) {
      return t('affiliate.register.promoErrorEmpty');
    }
    
    if (code.length < 4) {
      return t('affiliate.register.promoErrorLength');
    }
    
    if (!/^[A-Z0-9]+$/.test(code)) {
      return t('affiliate.register.promoErrorFormat');
    }
    
    return '';
  };

  const handleBenefitToggle = (benefitId) => {
    setSelectedBenefits(prev => {
      if (prev.includes(benefitId)) {
        return prev.filter(id => id !== benefitId);
      }
      return [...prev, benefitId];
    });
  };

  const handlePromoCodeChange = (text) => {
    const upperText = text.toUpperCase();
    setPromoCode(upperText);
    
    // Validate as user types
    if (upperText.length > 0) {
      const error = validatePromoCode(upperText);
      setPromoCodeError(error);
    } else {
      setPromoCodeError('');
    }
  };

  const handleBecomeAffiliate = async () => {
    try {
      // Validate promo code
      const validationError = validatePromoCode(promoCode);
      if (validationError) {
        setPromoCodeError(validationError);
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert(t('affiliate.register.validationError'), validationError);
        } else {
          showSuccessNotification(validationError);
        }
        return;
      }

      setLoading(true);

      // Use authContext's becomeAffiliate function
      const result = await becomeAffiliate(promoCode.trim());

      if (result.success) {
        // Show success notification
        showSuccessNotification(t('affiliate.register.registrationSuccess'));
        
        // On mobile, also show alert with options
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Alert.alert(
            t('affiliate.register.congratulations'),
            t('affiliate.register.registrationSuccess'),
            [
              {
                text: t('affiliate.register.viewDashboardBtn'),
                onPress: () => router.push('/affiliate/dashboard'),
              },
              {
                text: t('affiliate.register.done'),
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          // On web, show notification and automatically navigate after delay
          setTimeout(() => {
            router.push('/affiliate/dashboard');
          }, 2000);
        }
      } else {
        throw new Error(result.error || t('affiliate.register.registrationFailed'));
      }
    } catch (error) {
      console.error('Affiliate registration error:', error);
      
      // Show error notification
      const errorMessage = error.message || t('common.error');
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert(t('affiliate.register.registrationFailed'), errorMessage);
      } else {
        showSuccessNotification(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render notification component
  const renderNotification = () => {
    if (!showNotification) return null;
    
    return (
      <Animated.View 
        style={[
          styles.notification,
          { 
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
        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>{t('affiliate.register.loading')}</Text>
      </View>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Alert.alert(t('affiliate.register.authenticationRequired'), t('affiliate.register.pleaseLogin'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => router.back(),
        },
        {
          text: t('profile.loginNow'),
          onPress: () => router.push('/auth/login'),
        },
      ]);
    } else {
      showSuccessNotification(t('affiliate.register.pleaseLogin'));
      setTimeout(() => {
        router.push('/auth/login');
      }, 1500);
    }
    return null;
  }

  // If user already has a promo code or is already an affiliate
  if (user?.promoCode || user?.isAffiliate) {
    return (
      <View style={styles.container}>
        {/* Notification */}
        {renderNotification()}
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('affiliate.register.affiliateProgram')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.alreadyAffiliateContainer}>
          <View style={styles.alreadyBadge}>
            <Ionicons name="checkmark-circle" size={60} color={theme.colors.highProbability} />
            <Text style={styles.alreadyTitle}>{t('affiliate.register.alreadyAffiliate')}</Text>
          </View>
          
          <View style={styles.promoCodeContainer}>
            <Text style={styles.promoCodeLabel}>{t('affiliate.register.yourPromoCode')}</Text>
            <View style={styles.promoCodeDisplay}>
              <Text style={styles.promoCodeText}>{user.promoCode || 'N/A'}</Text>
            </View>
            <Text style={styles.promoCodeHint}>
              {t('affiliate.register.shareCodeHint')}
            </Text>
          </View>

          <View style={styles.affiliateLinks}>
            <TouchableOpacity 
              style={styles.affiliateButton}
              onPress={() => router.push('/affiliate/dashboard')}
            >
              <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
              <Text style={styles.affiliateButtonText}>{t('affiliate.register.viewDashboard')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.affiliateButton, styles.secondaryButton]}
              onPress={() => router.push('/affiliate/share')}
            >
              <Ionicons name="share-social" size={20} color={theme.colors.accent} />
              <Text style={[styles.affiliateButtonText, { color: theme.colors.accent }]}>
                {t('affiliate.register.shareEarn')}
              </Text>
            </TouchableOpacity>
          </View>
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
        <Text style={styles.title}>{t('affiliate.register.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroBadge}>
          <Ionicons name="people" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>{t('affiliate.register.joinAffiliate')}</Text>
        <Text style={styles.heroSubtitle}>
          {t('affiliate.register.joinSubtitle')}
        </Text>
      </View>

      {/* Benefits Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="gift" size={20} color={theme.colors.accent} />
          <Text style={styles.sectionTitle}>{t('affiliate.register.benefitsFeatures')}</Text>
        </View>
        
        <View style={styles.benefitsGrid}>
          {affiliateBenefits.map((benefit) => (
            <TouchableOpacity
              key={benefit.id}
              style={[
                styles.benefitCard,
                selectedBenefits.includes(benefit.id) && styles.benefitCardSelected
              ]}
              onPress={() => handleBenefitToggle(benefit.id)}
            >
              <View style={[styles.benefitIcon, { backgroundColor: `${benefit.color}20` }]}>
                <Ionicons name={benefit.icon} size={24} color={benefit.color} />
              </View>
              
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>{benefit.description}</Text>
              
              {selectedBenefits.includes(benefit.id) && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color={benefit.color} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Commission Structure */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={20} color={theme.colors.highProbability} />
          <Text style={styles.sectionTitle}>{t('affiliate.register.commissionStructure')}</Text>
        </View>
        
        <View style={styles.commissionCards}>
          <View style={styles.commissionCard}>
            <View style={styles.commissionHeader}>
              <Ionicons name="person" size={18} color={theme.colors.textPrimary} />
              <Text style={styles.commissionType}>{t('affiliate.register.commissionTiers.basic.name')}</Text>
            </View>
            <Text style={styles.commissionRate}>{t('affiliate.register.commissionTiers.basic.rate')}</Text>
            <Text style={styles.commissionLabel}>{t('affiliate.register.commissionTiers.basic.label')}</Text>
            <Text style={styles.commissionRequirement}>{t('affiliate.register.commissionTiers.basic.requirement')}</Text>
          </View>
          
          <View style={[styles.commissionCard, styles.premiumCard]}>
            <View style={styles.commissionHeader}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.commissionType}>{t('affiliate.register.commissionTiers.premium.name')}</Text>
            </View>
            <Text style={styles.commissionRate}>{t('affiliate.register.commissionTiers.premium.rate')}</Text>
            <Text style={styles.commissionLabel}>{t('affiliate.register.commissionTiers.premium.label')}</Text>
            <Text style={styles.commissionRequirement}>{t('affiliate.register.commissionTiers.premium.requirement')}</Text>
          </View>
          
          <View style={[styles.commissionCard, styles.eliteCard]}>
            <View style={styles.commissionHeader}>
              <Ionicons name="diamond" size={18} color="#00D4FF" />
              <Text style={styles.commissionType}>{t('affiliate.register.commissionTiers.elite.name')}</Text>
            </View>
            <Text style={styles.commissionRate}>{t('affiliate.register.commissionTiers.elite.rate')}</Text>
            <Text style={styles.commissionLabel}>{t('affiliate.register.commissionTiers.elite.label')}</Text>
            <Text style={styles.commissionRequirement}>{t('affiliate.register.commissionTiers.elite.requirement')}</Text>
          </View>
        </View>
      </View>

      {/* Promo Code Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key" size={20} color={theme.colors.accent} />
          <Text style={styles.sectionTitle}>{t('affiliate.register.yourUniquePromoCode')}</Text>
        </View>
        
        <View style={styles.promoCodeSection}>
          <Text style={styles.promoCodeInstructions}>
            {t('affiliate.register.promoInstructions')}
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.promoCodeInput,
                promoCodeError ? styles.inputError : null
              ]}
              value={promoCode}
              onChangeText={handlePromoCodeChange}
              placeholder={t('affiliate.register.promoPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              maxLength={15}
              autoCapitalize="characters"
            />
            
            <TouchableOpacity 
              style={styles.generateButton}
              onPress={generatePromoCode}
            >
              <Ionicons name="refresh" size={18} color={theme.colors.accent} />
              <Text style={styles.generateButtonText}>{t('affiliate.register.generate')}</Text>
            </TouchableOpacity>
          </View>
          
          {promoCodeError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{promoCodeError}</Text>
            </View>
          ) : promoCode.length > 0 ? (
            <Text style={styles.inputHintValid}>
              {t('affiliate.register.promoValidHint')}
            </Text>
          ) : (
            <Text style={styles.inputHint}>
              {t('affiliate.register.promoFormatHint')}
            </Text>
          )}
          
          <View style={styles.promoCodeExample}>
            <Text style={styles.exampleLabel}>{t('affiliate.register.examples')}</Text>
            <View style={styles.exampleCodes}>
              <View style={styles.exampleCode}>
                <Text style={styles.exampleCodeText}>JOHN123</Text>
              </View>
              <View style={styles.exampleCode}>
                <Text style={styles.exampleCodeText}>footai456</Text>
              </View>
              <View style={styles.exampleCode}>
                <Text style={styles.exampleCodeText}>WINNER789</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Terms & Agreement */}
      <View style={styles.section}>
        <View style={styles.termsContainer}>
          <Ionicons name="document-text" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.termsTitle}>{t('affiliate.register.termsConditions')}</Text>
        </View>
        
        <View style={styles.termsContent}>
          <Text style={styles.termsText}>
            {t('affiliate.register.termsText')}
          </Text>
          
          <View style={styles.termItem}>
            <Ionicons name="checkmark" size={16} color={theme.colors.highProbability} />
            <Text style={styles.termText}>
              {t('affiliate.register.term1')}
            </Text>
          </View>
          
          <View style={styles.termItem}>
            <Ionicons name="checkmark" size={16} color={theme.colors.highProbability} />
            <Text style={styles.termText}>
              {t('affiliate.register.term2')}
            </Text>
          </View>
          
          <View style={styles.termItem}>
            <Ionicons name="checkmark" size={16} color={theme.colors.highProbability} />
            <Text style={styles.termText}>
              {t('affiliate.register.term3')}
            </Text>
          </View>
          
          <View style={styles.termItem}>
            <Ionicons name="checkmark" size={16} color={theme.colors.highProbability} />
            <Text style={styles.termText}>
              {t('affiliate.register.term4')}
            </Text>
          </View>
          
          <View style={styles.termItem}>
            <Ionicons name="checkmark" size={16} color={theme.colors.highProbability} />
            <Text style={styles.termText}>
              {t('affiliate.register.term5')}
            </Text>
          </View>
        </View>
      </View>

      {/* Join Button */}
      <View style={styles.joinSection}>
        <TouchableOpacity 
          style={[
            styles.joinButton,
            (!promoCode || promoCodeError || loading) && styles.joinButtonDisabled
          ]}
          onPress={handleBecomeAffiliate}
          disabled={!promoCode || !!promoCodeError || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="rocket" size={20} color="#FFFFFF" />
              <Text style={styles.joinButtonText}>{t('affiliate.register.becomeAffiliateBtn')}</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>{t('affiliate.register.cancel')}</Text>
        </TouchableOpacity>
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
    paddingBottom: theme.spacing.xl,
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
  // Notification Styles
  notification: {
    position: 'absolute',
    top: 100,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: '#34C759',
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
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  heroBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '90%',
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  benefitCard: {
    width: '48%',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  benefitCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}10`,
  },
  benefitIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  benefitTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  benefitDescription: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  commissionCards: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  commissionCard: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  premiumCard: {
    backgroundColor: `${theme.colors.highProbability}10`,
    borderWidth: 2,
    borderColor: `${theme.colors.highProbability}30`,
  },
  eliteCard: {
    backgroundColor: `${theme.colors.accent}10`,
    borderWidth: 2,
    borderColor: `${theme.colors.accent}30`,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  commissionType: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  commissionRate: {
    color: theme.colors.accent,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  commissionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginBottom: theme.spacing.xs,
  },
  commissionRequirement: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
  },
  promoCodeSection: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  promoCodeInstructions: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  promoCodeInput: {
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
  inputError: {
    borderColor: '#EF4444',
  },
  generateButton: {
    backgroundColor: `${theme.colors.accent}20`,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  generateButtonText: {
    color: theme.colors.accent,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
    backgroundColor: '#FEF2F2',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  inputHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: theme.spacing.lg,
  },
  inputHintValid: {
    color: theme.colors.highProbability,
    fontSize: 11,
    marginBottom: theme.spacing.lg,
    fontWeight: '600',
  },
  promoCodeExample: {
    marginTop: theme.spacing.md,
  },
  exampleLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.sm,
  },
  exampleCodes: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  exampleCode: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exampleCodeText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  termsTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
  },
  termsContent: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  termsText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  termText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    flex: 1,
    lineHeight: 20,
  },
  joinSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  joinButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  joinButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.7,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
  },
  alreadyAffiliateContainer: {
    flex: 1,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alreadyBadge: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  alreadyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  promoCodeContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    width: '100%',
    ...theme.shadows.medium,
  },
  promoCodeLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginBottom: theme.spacing.md,
  },
  promoCodeDisplay: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
  },
  promoCodeText: {
    color: theme.colors.accent,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  promoCodeHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  affiliateLinks: {
    width: '100%',
    gap: theme.spacing.md,
  },
  affiliateButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.medium,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  affiliateButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
  },
});

export default AffiliateRegisterScreen;
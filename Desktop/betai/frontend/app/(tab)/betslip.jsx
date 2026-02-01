// app/betslip.jsx - FIXED for web browser state updates
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Animated,
  Keyboard,
  ScrollView,
} from 'react-native';
import { theme } from '../../constants/theme';
import BetslipCard from '../../components/betslipCard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../contexts/authContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import '../../utils/i18n';

const API_BASE_URL = 'https://betai-backend-uxt5.onrender.com/api';
const GENERATE_ENDPOINT = `${API_BASE_URL}/betslips/generate`;
const CREDITS_REQUIRED = 100; // Credits needed per generation

const BetslipGenerator = () => {
  const { 
    isAuthenticated, 
    user, 
    hasFullAccess,
    updateUser,
    refreshUser,
  } = useAuth();
  
  const { t } = useTranslation();
  
  const [targetOdd, setTargetOdd] = useState('');
  const [betslips, setBetslips] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditWarningVisible, setCreditWarningVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [saveNotificationMessage, setSaveNotificationMessage] = useState('');
  // const [forceUpdate, setForceUpdate] = useState(0); // Add force update trigger
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const saveNotificationAnim = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef(null);

  // Debug: Log user data to see what's happening
  useEffect(() => {
    if (user) {
      console.log('🔍 USER DATA FOR BETSLIP:', {
        username: user.username,
        isAdmin: user.isAdmin,
        subscription: user.subscription,
        subscriptionEndDate: user.subscriptionEndDate,
        credits: user.credits,
        hasFullAccess: hasFullAccess()
      });
    }
  }, [user]); // Add forceUpdate to dependencies

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Show authentication reminder if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      setCreditWarningVisible(true);
    } else if (isAuthenticated && user) {
      // Check if user has enough credits
      if (!hasFullAccess() && (user.credits || 0) < CREDITS_REQUIRED) {
        setCreditWarningVisible(true);
      } else {
        setCreditWarningVisible(false);
      }
    }
  }, [isAuthenticated, user]); // Add forceUpdate to dependencies


  // Handle save notifications
  const handleSaveNotification = (message) => {
    setSaveNotificationMessage(message);
    setShowSaveNotification(true);
    
    // Animate in
    Animated.sequence([
      Animated.timing(saveNotificationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(saveNotificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSaveNotification(false);
    });
  };

  // Add spinning animation effect
  useEffect(() => {
    let animationFrame;
    if (isGenerating) {
      const animate = () => {
        setRotation(prev => (prev + 10) % 360);
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isGenerating]);

  // FIX: Force sync credits when component loads AND after each generation
  // useEffect(() => {
  //   const syncCreditsOnLoad = async () => {
  //     if (!isAuthenticated || !user) return;
      
  //     console.log('🔄 Checking credit sync on component load...');
      
  //     try {
  //       const token = await AsyncStorage.getItem('@footai_token');
  //       if (!token) return;
        
  //       const response = await fetch(`${API_BASE_URL}/users/me`, {
  //         method: 'GET',
  //         headers: {
  //           'Authorization': `Bearer ${token}`,
  //           'Content-Type': 'application/json',
  //         },
  //       });
        
  //       if (response.ok) {
  //         const data = await response.json();
  //         if (data.success && data.user && data.user.credits !== user.credits) {
  //           console.log(`🔄 Syncing credits: UI=${user.credits} → Backend=${data.user.credits}`);
  //           updateUser({ credits: data.user.credits });
  //           // Force a re-render on web
  //           setForceUpdate(prev => prev + 1);
  //         }
  //       }
  //     } catch (error) {
  //       console.log('Credit sync skipped:', error.message);
  //     }
  //   };
    
  //   // Run sync 500ms after component loads
  //   const timer = setTimeout(syncCreditsOnLoad, 500);
  //   return () => clearTimeout(timer);
  // }, [isAuthenticated, user]);

  // Animate credit warning
  useEffect(() => {
    if (creditWarningVisible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [creditWarningVisible, fadeAnim]);

  // Dismiss keyboard when tapping outside
  const dismissKeyboard = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    }
  };

  // Check if user can generate betslips
  const canGenerateBetslips = () => {
    // Admins or users with full access (valid subscription) can generate freely
    if (hasFullAccess()) {
      return true;
    }
    
    // Check credits for regular users
    if (isAuthenticated && user) {
      const userCredits = user.credits || 0;
      return userCredits >= CREDITS_REQUIRED;
    }
    
    // Non-logged in users cannot generate
    return false;
  };

  // Validate input on change
  const handleTargetOddChange = (text) => {
    // Remove non-numeric characters except decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '');
    
    // Allow only one decimal point
    const parts = cleanedText.split('.');
    if (parts.length > 2) {
      setTargetOdd(parts[0] + '.' + parts.slice(1).join(''));
      return;
    }
    
    setTargetOdd(cleanedText);
    
    // Validate for max 10 limit
    const numericValue = parseFloat(cleanedText);
    if (!isNaN(numericValue) && numericValue > 10) {
      setInputError(true);
    } else {
      setInputError(false);
    }
  };

  const handleGenerate = async () => {
    // Dismiss keyboard first
    dismissKeyboard();
    
    // Check if user can generate
    if (!canGenerateBetslips()) {
      setShowCreditModal(true);
      return;
    }

    // Validation
    if (!targetOdd || isNaN(targetOdd) || parseFloat(targetOdd) < 1.1) {
      Alert.alert(t('betslip.errors.invalidInput'), t('betslip.errors.invalidOdd'));
      setInputError(true);
      return;
    }

    const numericValue = parseFloat(targetOdd);
    if (numericValue > 10) {
      Alert.alert(t('betslip.errors.invalidInput'), t('betslip.errors.oddTooHigh'));
      setInputError(true);
      return;
    }

    setIsGenerating(true);
    setInputError(false);
    
    try {
      // Add auth token if user is logged in
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (isAuthenticated) {
        const token = await AsyncStorage.getItem('@footai_token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(GENERATE_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetOdd: numericValue }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${t('betslip.errors.generationError')}`);
      }
      
      if (data.success) {
        // ✅ Format betslips with additional data for better display
        const formattedBetslips = (data.betslips || []).map((betslip, index) => ({
          ...betslip,
          id: betslip.id || `betslip-${Date.now()}-${index}`,
          timestamp: betslip.timestamp || new Date().toISOString(),
          matchCount: betslip.matchCount || betslip.selections?.length || 0,
          stake: betslip.stake || 10,
          potentialReturn: betslip.potentialReturn || (betslip.stake || 10) * (betslip.totalOdd || 1),
          // Ensure selections have all required fields
          selections: (betslip.selections || []).map(selection => ({
            ...selection,
            matchId: selection.matchId || `match-${Math.random().toString(36).substr(2, 9)}`,
            league: selection.league || 'Premier League',
            team1: selection.team1 || 'Team A',
            team2: selection.team2 || 'Team B',
            prediction: selection.prediction || '1',
            odd: selection.odd || 1.5,
            confidence: selection.confidence || 70,
            matchTime: selection.matchTime || '20:00',
            status: selection.status || t('betslip.selections.upcoming')
          }))
        }));
        
        setBetslips(formattedBetslips);
        
        if (formattedBetslips.length === 0) {
          Alert.alert(
            t('betslip.errors.noBetslips'),
            data.message || t('betslip.errors.noBetslipsMessage')
          );
        }
        
        // ✅ WEB FIX: Force sync credits and trigger re-render
      // ✅ SIMPLE FIX: Immediately refresh user after successful generation
if (isAuthenticated) {
  try {
    console.log('🔄 Refreshing user credits after generation...');
    
    // Call refreshUser to get fresh data from backend
    if (refreshUser) {
      const refreshResult = await refreshUser();
      
      if (refreshResult.success) {
        console.log(`✅ User refreshed with ${refreshResult.user.credits} credits`);
        
        // Show warning if credits are now insufficient
        if (refreshResult.user.credits < CREDITS_REQUIRED) {
          setCreditWarningVisible(true);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not refresh user after generation:', error.message);
    // If refresh fails, fall back to local deduction
    // const newCredits = Math.max(0, (user.credits || 0) - CREDITS_REQUIRED);
    // updateUser({ credits: newCredits });
    
    if (newCredits < CREDITS_REQUIRED) {
      setCreditWarningVisible(true);
    }
  }
}
      } else {
        Alert.alert(t('betslip.errors.generationFailed'), data.error || t('betslip.errors.generationError'));
        setBetslips([]);
      }
      
    } catch (error) {
      console.error('API Error:', error);
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        Alert.alert(
          t('betslip.connectionError.title'),
          t('betslip.connectionError.message', { ip: 'http://192.168.138.215:3000' })
        );
      } else {
        Alert.alert(t('common.error'), error.message || t('common.error'));
      }
      
      setBetslips([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    dismissKeyboard();
    setTargetOdd('');
    setBetslips([]);
    setInputError(false);
  };

  // ✅ Get user credits display info
  const getUserCreditsInfo = () => {
    if (!isAuthenticated) {
      return {
        text: t('betslip.authStatus.loginToGenerate'),
        color: theme.colors.mediumProbability,
        icon: 'log-in',
      };
    }
    
    const isAdmin = user?.isAdmin || false;
    const credits = user?.credits || 0;
    
    console.log('💰 CREDITS DISPLAY:', {
      username: user?.username,
      credits,
      isAdmin
    });
    
    // Admins show as admin
    if (isAdmin) {
      return {
        text: 'Admin • Unlimited',
        color: theme.colors.highProbability,
        icon: 'shield-checkmark',
      };
    }
    
    // Everyone else shows credits
    if (credits >= CREDITS_REQUIRED) {
      return {
        text: `${credits} credits`,
        color: theme.colors.highProbability,
        icon: 'wallet',
      };
    }
    
    return {
      text: `Need ${CREDITS_REQUIRED} credits (You have ${credits})`,
      color: '#ff9500',
      icon: 'warning',
    };
  };

  // ✅ Check if generate button should be disabled
  const isGenerateButtonDisabled = () => {
    // If generating, always disabled
    if (isGenerating) return true;
    
    // If input error, disabled
    if (inputError) return true;
    
    // Check if user can generate based on credits/subscription
    if (!canGenerateBetslips()) return true;
    
    // If no target odd, disabled
    if (!targetOdd || targetOdd.trim() === '') return true;
    
    return false;
  };

  // Render credit warning message
  const renderCreditWarning = () => {
    if (!creditWarningVisible) return null;
    
    const creditsInfo = getUserCreditsInfo();
    
    return (
      <Animated.View style={[styles.creditWarning, { opacity: fadeAnim }]}>
        <View style={styles.creditWarningContent}>
          <Ionicons name={creditsInfo.icon} size={16} color="#FFFFFF" />
          <Text style={styles.creditWarningText}>
            {isAuthenticated 
              ? t('betslip.creditsNeeded', { 
                  credits: CREDITS_REQUIRED, 
                  plural: CREDITS_REQUIRED > 1 ? 's' : '' 
                }) + ' ' + t('betslip.youHaveCredits', { 
                  count: user?.credits || 0, 
                  plural: (user?.credits || 0) !== 1 ? 's' : '' 
                })
              : t('betslip.loginToGenerate')
            }
          </Text>
        </View>
        <View style={styles.creditWarningActions}>
          <TouchableOpacity 
            style={styles.creditWarningCloseBtn}
            onPress={() => setCreditWarningVisible(false)}
          >
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.creditWarningAction}
            onPress={() => {
              dismissKeyboard();
              setCreditWarningVisible(false);
              setShowCreditModal(true);
            }}
          >
            <Text style={styles.creditWarningActionText}>
              {isAuthenticated ? t('betslip.getCredits') : t('betslip.goToLogin')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // ✅ Show authentication status
  const renderAuthStatus = () => {
    const creditsInfo = getUserCreditsInfo();
    
    return (
      <View style={styles.authStatus}>
        <Ionicons name={creditsInfo.icon} size={16} color={creditsInfo.color} />
        <Text style={[styles.authStatusText, { color: creditsInfo.color }]}>
          {isAuthenticated ? `${user?.username} • ${creditsInfo.text}` : creditsInfo.text}
        </Text>
      </View>
    );
  };

  // Render save notification
  const renderSaveNotification = () => {
    if (!showSaveNotification) return null;
    
    return (
      <Animated.View 
        style={[
          styles.saveNotification,
          { 
            opacity: saveNotificationAnim,
            transform: [
              {
                translateY: saveNotificationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }
            ]
          }
        ]}
      >
        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
        <Text style={styles.saveNotificationText}>{saveNotificationMessage}</Text>
        <TouchableOpacity 
          onPress={() => {
            Animated.timing(saveNotificationAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => setShowSaveNotification(false));
          }}
          style={styles.saveNotificationClose}
        >
          <Ionicons name="close" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderBetslip = ({ item, index }) => (
    <View style={styles.betslipWrapper}>
      {index > 0 && <View style={styles.betslipDivider} />}
      <BetslipCard 
        betslip={item} 
        index={index + 1}
        onSaveSuccess={(message) => handleSaveNotification(message)}
      />
    </View>
  );

  // Credit purchase modal
  const renderCreditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showCreditModal}
      onRequestClose={() => {
        dismissKeyboard();
        setShowCreditModal(false);
      }}
    >
      <TouchableWithoutFeedback onPress={() => setShowCreditModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isAuthenticated ? t('betslip.needCredits') : t('betslip.loginRequired')}
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowCreditModal(false)}
                  style={styles.modalClose}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <Ionicons 
                  name={isAuthenticated ? "wallet-outline" : "log-in-outline"} 
                  size={60} 
                  color={theme.colors.accent} 
                  style={styles.modalIcon}
                />
                
                <Text style={styles.modalText}>
                  {isAuthenticated 
                    ? t('betslip.creditsNeeded', { 
                        credits: CREDITS_REQUIRED, 
                        plural: CREDITS_REQUIRED > 1 ? 's' : '' 
                      }) + '\n\n' + t('betslip.youHaveCredits', { 
                        count: user?.credits || 0, 
                        plural: (user?.credits || 0) !== 1 ? 's' : '' 
                      })
                    : t('betslip.loginToGenerate')
                  }
                </Text>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setShowCreditModal(false)}
                  >
                    <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={() => {
                      setShowCreditModal(false);
                      // Navigate to appropriate screen
                      // if (isAuthenticated) {
                      //   navigation.navigate('PurchaseCredits');
                      // } else {
                      //   navigation.navigate('Login');
                      // }
                    }}
                  >
                    <Text style={styles.modalButtonPrimaryText}>
                      {isAuthenticated ? t('betslip.getCredits') : t('betslip.goToLogin')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('betslip.title')}</Text>
              <Text style={styles.subtitle}>
                {t('betslip.subtitle')}
              </Text>
              {renderAuthStatus()}
            </View>

            {/* Credit Warning Message */}
            {renderCreditWarning()}

            {/* Simple Input Section */}
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
              <View style={styles.inputSection}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('betslip.targetOdd')}</Text>
                  <View style={[
                    styles.inputWrapper,
                    inputError && styles.inputWrapperError
                  ]}>
                    <TextInput
                      ref={textInputRef}
                      style={[
                        styles.input,
                        inputError && styles.inputError
                      ]}
                      placeholder={t('betslip.targetOddPlaceholder')}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                      value={targetOdd}
                      onChangeText={handleTargetOddChange}
                      editable={!isGenerating}
                      onSubmitEditing={dismissKeyboard}
                      returnKeyType="done"
                      blurOnSubmit={true}
                    />
                    {inputError && (
                      <View style={styles.errorIcon}>
                        <Ionicons name="alert-circle" size={20} color="#ff3b30" />
                      </View>
                    )}
                  </View>
                  {inputError && (
                    <Text style={styles.errorText}>
                      {t('betslip.oddLimitWarning')}
                    </Text>
                  )}
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.clearButton]}
                    onPress={handleClear}
                    disabled={isGenerating}
                  >
                    <Text style={styles.clearButtonText}>{t('betslip.clear')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.button, 
                      styles.generateButton,
                      isGenerateButtonDisabled() && styles.generateButtonDisabled
                    ]}
                    onPress={handleGenerate}
                    disabled={isGenerateButtonDisabled()}
                  >
                    {isGenerating ? (
                      <>
                        <View style={styles.spinningIcon}>
                          <Ionicons 
                            name="sync" 
                            size={20} 
                            color="#FFFFFF" 
                            style={{ transform: [{ rotate: `${rotation}deg` }] }}
                          />
                        </View>
                        <Text style={styles.generateButtonText}>{t('betslip.generating')}</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="flash" size={20} color="#FFFFFF" />
                        <Text style={styles.generateButtonText}>{t('betslip.generate')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>

            {/* Results Section */}
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>
                  {t('betslip.generatedBetslips')} {betslips.length > 0 && `(${betslips.length})`}
                </Text>
                {!isAuthenticated && betslips.length > 0 && (
                  <TouchableOpacity 
                    style={styles.loginTipButton}
                    onPress={() => {
                      dismissKeyboard();
                      setShowCreditModal(true);
                    }}
                  >
                    <Ionicons name="log-in" size={14} color={theme.colors.accent} />
                    <Text style={styles.loginTipText}>{t('betslip.loginToSave')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isGenerating ? (
                <View style={styles.loadingContainer}>
                  <View style={[styles.loadingSpinner, { transform: [{ rotate: `${rotation}deg` }] }]}>
                    <Ionicons name="football" size={40} color={theme.colors.accent} />
                  </View>
                  <Text style={styles.loadingText}>{t('betslip.aiAnalyzing')}</Text>
                  <Text style={styles.loadingSubtext}>{t('betslip.mayTakeTime')}</Text>
                </View>
              ) : betslips.length > 0 ? (
                <FlatList
                  data={betslips}
                  renderItem={renderBetslip}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.betslipsList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  scrollEnabled={true}
                />
              ) : (
                <TouchableWithoutFeedback onPress={dismissKeyboard}>
                  <View style={styles.emptyState}>
                    <Ionicons name="ticket" size={60} color={theme.colors.textMuted} />
                    <Text style={styles.emptyStateTitle}>{t('betslip.noBetslipsYet')}</Text>
                    <Text style={styles.emptyStateText}>
                      {t('betslip.noBetslipsDescription')}
                    </Text>
                    <View style={styles.tipsContainer}>
                      <Text style={styles.tipsTitle}>{t('betslip.tips.title')}</Text>
                      <Text style={styles.tip}>{t('betslip.tips.targetOdds')}</Text>
                      <Text style={styles.tip}>{t('betslip.tips.maxOdd')}</Text>
                      <Text style={styles.tip}>{t('betslip.tips.aiConfidence')}</Text>
                      <Text style={styles.tip}>{t('betslip.tips.successRate')}</Text>
                      <Text style={styles.tip}>
                        {isAuthenticated 
                          ? hasFullAccess() 
                            ? t('betslip.tips.proSubscription') 
                            : t('betslip.tips.creditsNeeded', { credits: CREDITS_REQUIRED })
                          : t('betslip.tips.loginToGenerate')
                        }
                      </Text>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
      
      {/* Save Notification */}
      {renderSaveNotification()}
      
      {/* Credit Modal */}
      {renderCreditModal()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginBottom: theme.spacing.sm,
  },
  authStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardElevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  authStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Credit Warning Styles
  creditWarning: {
    backgroundColor: '#ff9500',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  creditWarningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  creditWarningText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  creditWarningActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditWarningCloseBtn: {
    padding: 4,
  },
  creditWarningAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  creditWarningActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Save Notification Styles
  saveNotification: {
    position: 'absolute',
    top: 20,
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
  saveNotificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  saveNotificationClose: {
    padding: 4,
  },
  inputSection: {
    backgroundColor: theme.colors.cardBackground,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginBottom: theme.spacing.sm,
  },
  // FIXED Input Styles - prevents white background issue
  inputWrapper: {
    position: 'relative',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff0f0',
  },
  input: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  inputError: {
    color: '#ff3b30',
  },
  errorIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: theme.colors.accent,
  },
  generateButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.7,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  spinningIcon: {
    marginRight: 4,
  },
  resultsSection: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  resultsTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
  },
  loginTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${theme.colors.accent}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  loginTipText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  betslipsList: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  betslipWrapper: {
    position: 'relative',
  },
  betslipDivider: {
    height: 20,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
    borderStyle: 'dashed',
    marginLeft: 20,
    marginBottom: -10,
    marginTop: -10,
    zIndex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginBottom: theme.spacing.sm,
  },
  loadingSubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
  },
  emptyStateTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '600',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  tipsContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    ...theme.shadows.medium,
  },
  tipsTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  tip: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    marginBottom: 4,
    paddingLeft: 4,
  },
  // Modal Styles
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
    maxWidth: 400,
    ...theme.shadows.xlarge,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: theme.spacing.lg,
  },
  modalText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: theme.colors.cardElevated,
  },
  modalButtonSecondaryText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    backgroundColor: theme.colors.accent,
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default BetslipGenerator;
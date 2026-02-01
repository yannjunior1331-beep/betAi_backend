import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/authContext';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import '../../utils/i18n';

const RegisterScreen = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, registerError, clearRegisterError, clearLoginError } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // Clear login errors when register screen mounts
    clearLoginError();
  }, []);

  // Toggle between English and French
  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLanguage);
  };

  const handleRegister = async () => {
    // ✅ TRIM ALL INPUTS BEFORE VALIDATION
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedReferralCode = referralCode.trim().toUpperCase(); // Uppercase for consistency
    
    // Validation
    if (!trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
      alert(t('userRegistration.fillAllFields', 'Please fill in all required fields'));
      return;
    }

    if (password !== confirmPassword) {
      alert(t('userRegistration.passwordsNoMatch', 'Passwords do not match'));
      return;
    }

    if (password.length < 6) {
      alert(t('userRegistration.passwordLength', 'Password must be at least 6 characters long'));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert(t('userRegistration.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    // Username validation
    if (trimmedUsername.length < 3) {
      alert(t('userRegistration.usernameLength', 'Username must be at least 3 characters long'));
      return;
    }

    // Username can only contain letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      alert(t('userRegistration.invalidUsername', 'Username can only contain letters, numbers, and underscores'));
      return;
    }

    setIsLoading(true);
    clearRegisterError();

    // ✅ Send trimmed data to backend
    const result = await register(trimmedUsername, trimmedEmail, password, trimmedReferralCode);
    setIsLoading(false);

    if (result.success) {
      alert(t('userRegistration.registrationSuccess', 'Registration successful! Welcome to footai.'));
      router.replace('/(tab)'); // Navigate to home screen
    }
    // Error is already displayed from context, no need for alert
  };

  // ✅ Helper function to automatically trim and format inputs
  const handleUsernameChange = (text) => {
    // Remove spaces and limit to 20 characters
    const trimmed = text.trimStart().replace(/\s+/g, '');
    setUsername(trimmed.slice(0, 20));
    if (registerError) clearRegisterError();
  };

  const handleEmailChange = (text) => {
    // Remove spaces and convert to lowercase
    const trimmed = text.trimStart().replace(/\s+/g, '').toLowerCase();
    setEmail(trimmed);
    if (registerError) clearRegisterError();
  };

  const handleReferralCodeChange = (text) => {
    // Remove spaces and convert to uppercase
    const trimmed = text.trimStart().replace(/\s+/g, '').toUpperCase();
    setReferralCode(trimmed);
    if (registerError) clearRegisterError();
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (registerError) clearRegisterError();
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    if (registerError) clearRegisterError();
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Language Toggle Button */}
      <TouchableOpacity
        style={styles.languageButton}
        onPress={toggleLanguage}
      >
        <Ionicons 
          name="language" 
          size={24} 
          color={theme.colors.textSecondary} 
        />
        <Text style={styles.languageText}>
          {i18n.language === 'en' ? 'FR' : 'EN'}
        </Text>
      </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="trophy" size={48} color={theme.colors.accent} />
          </View>
          <Text style={styles.title}>{t('userRegistration.createAccount', 'Create Account')}</Text>
          <Text style={styles.subtitle}>{t('userRegistration.joinForSmarterBetting', 'Join footai for smarter betting')}</Text>
        </View>

        {/* Error Message */}
        {registerError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.lowProbability} />
            <Text style={styles.errorText}>{registerError}</Text>
          </View>
        )}

        {/* Registration Form */}
        <View style={styles.form}>
          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('userRegistration.username', 'Username *')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('userRegistration.chooseUsername', 'Choose a username (3-20 chars)')}
                placeholderTextColor={theme.colors.textMuted}
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                editable={!isLoading}
                maxLength={20}
              />
              {username.length > 0 && (
                <Text style={styles.charCount}>
                  {username.length}/20
                </Text>
              )}
            </View>
            <Text style={styles.inputHint}>
              {t('userRegistration.usernameHint', 'Letters, numbers, and underscores only')}
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('userRegistration.emailAddress', 'Email Address *')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('userRegistration.enterEmail', 'Enter your email')}
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('userRegistration.password', 'Password *')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('userRegistration.atLeast6Chars', 'At least 6 characters')}
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            {password.length > 0 && password.length < 6 && (
              <Text style={styles.passwordWarning}>
                ⚠️ {t('userRegistration.passwordTooShort', 'Password too short')}
              </Text>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('userRegistration.confirmPassword', 'Confirm Password *')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('userRegistration.confirmYourPassword', 'Confirm your password')}
                placeholderTextColor={theme.colors.textMuted}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.passwordWarning}>
                ⚠️ {t('userRegistration.passwordsDontMatch', 'Passwords do not match')}
              </Text>
            )}
          </View>

          {/* Referral Code Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('userRegistration.referralCode', 'Referral Code (Optional)')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="gift" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('userRegistration.enterReferralCode', 'Enter referral code (auto-uppercased)')}
                placeholderTextColor={theme.colors.textMuted}
                value={referralCode}
                onChangeText={handleReferralCodeChange}
                autoCapitalize="characters"
                editable={!isLoading}
                maxLength={15}
              />
              {referralCode.length > 0 && (
                <Text style={styles.charCount}>
                  {referralCode.length}/15
                </Text>
              )}
            </View>
            <Text style={styles.inputHint}>
              {t('userRegistration.referralCodeHint', 'Get 10% discount on first purchase when you use a referral code')}
            </Text>
          </View>

          {/* Validation Summary */}
          <View style={styles.validationSummary}>
            <Text style={styles.validationTitle}>{t('userRegistration.requirements', 'Requirements:')}</Text>
            <View style={styles.validationItem}>
              <Ionicons 
                name={username.length >= 3 ? "checkmark-circle" : "ellipse"} 
                size={16} 
                color={username.length >= 3 ? theme.colors.highProbability : theme.colors.textMuted} 
              />
              <Text style={styles.validationText}>
                {t('userRegistration.usernameMinLength', 'Username (3+ characters)')}
              </Text>
            </View>
            <View style={styles.validationItem}>
              <Ionicons 
                name={password.length >= 6 ? "checkmark-circle" : "ellipse"} 
                size={16} 
                color={password.length >= 6 ? theme.colors.highProbability : theme.colors.textMuted} 
              />
              <Text style={styles.validationText}>
                {t('userRegistration.passwordMinLength', 'Password (6+ characters)')}
              </Text>
            </View>
            <View style={styles.validationItem}>
              <Ionicons 
                name={password && password === confirmPassword ? "checkmark-circle" : "ellipse"} 
                size={16} 
                color={password && password === confirmPassword ? theme.colors.highProbability : theme.colors.textMuted} 
              />
              <Text style={styles.validationText}>
                {t('userRegistration.passwordsMatch', 'Passwords match')}
              </Text>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton, 
              isLoading && styles.disabledButton,
              (!username.trim() || !email.trim() || password.length < 6 || password !== confirmPassword) && styles.disabledButton
            ]}
            onPress={handleRegister}
            disabled={isLoading || !username.trim() || !email.trim() || password.length < 6 || password !== confirmPassword}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>{t('userRegistration.createAccount', 'Create Account')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              {t('userRegistration.termsText', 'By creating an account, you agree to our ')}
              <Text style={styles.termsLink}>{t('userRegistration.termsOfService', 'Terms of Service ')}</Text>
              {t('userRegistration.and', 'and ')}
              <Text style={styles.termsLink}>{t('userRegistration.privacyPolicy', 'Privacy Policy')}</Text>
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('userRegistration.alreadyHaveAccount', 'Already have an account?')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login Link */}
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>{t('userRegistration.signIn', 'Sign In')}</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>{t('userRegistration.whyJoinfootai', 'Why Join footai?')}</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={24} color={theme.colors.accent} />
              <Text style={styles.featureTitle}>{t('userRegistration.aiPredictions', 'AI Predictions')}</Text>
              <Text style={styles.featureText}>{t('userRegistration.smartMatchAnalysis', 'Smart match analysis')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="ticket" size={24} color={theme.colors.accent} />
              <Text style={styles.featureTitle}>{t('userRegistration.betslipGenerator', 'Betslip Generator')}</Text>
              <Text style={styles.featureText}>{t('userRegistration.customAccumulator', 'Custom accumulator builder')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="cash" size={24} color={theme.colors.accent} />
              <Text style={styles.featureTitle}>{t('userRegistration.freeCredits', 'Free Credits')}</Text>
              <Text style={styles.featureText}>{t('userRegistration.startWith100Credits', 'Start with 100 free credits')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  // Language Toggle Button
  languageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.cardBackground}90`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  languageText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 30,
    paddingHorizontal: theme.spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${theme.colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.lowProbability}20`,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.lowProbability,
    fontSize: theme.typography.body.fontSize,
    flex: 1,
  },
  form: {
    paddingHorizontal: theme.spacing.lg,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  inputIcon: {
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  eyeIcon: {
    paddingHorizontal: theme.spacing.md,
  },
  charCount: {
    position: 'absolute',
    right: theme.spacing.md,
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  inputHint: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small.fontSize,
    marginTop: 4,
  },
  passwordWarning: {
    color: theme.colors.lowProbability,
    fontSize: theme.typography.small.fontSize,
    marginTop: 4,
    fontWeight: '500',
  },
  validationSummary: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  validationTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  validationText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
  },
  registerButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  disabledButton: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '700',
  },
  termsContainer: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  termsText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.small.fontSize,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.lg,
    fontSize: theme.typography.body.fontSize,
  },
  loginButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  loginButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  featuresContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  featuresTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  featureItem: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  featureTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
    marginBottom: 2,
    textAlign: 'center',
  },
  featureText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default RegisterScreen;
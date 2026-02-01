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
import { useTranslation } from 'react-i18next'; // Use react-i18next
import '../../utils/i18n'; // Import i18n configuration

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, loginError, clearLoginError, clearRegisterError } = useAuth();
  const { t, i18n } = useTranslation(); // Get translation functions from react-i18next

  useEffect(() => {
    // Clear register errors when login screen mounts
    clearRegisterError();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      clearLoginError();
      alert(t('login.enterCredentials', 'Please enter both email and password'));
      return;
    }

    setIsLoading(true);
    clearLoginError();

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      router.replace('/(tab)'); // Navigate to home screen
    }
    // Error is already displayed from context, no need for alert
  };

  const handleSignup = () => {
    router.push('/register');
  };

  // Toggle between English and French using react-i18next
  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLanguage);
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
          <Text style={styles.title}>{t('login.welcomeBack', 'Welcome Back')}</Text>
          <Text style={styles.subtitle}>
            {t('login.signInToAccount', 'Sign in to your footai account')}
          </Text>
        </View>

        {/* Error Message */}
        {loginError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.lowProbability} />
            <Text style={styles.errorText}>{loginError}</Text>
          </View>
        )}

        {/* Login Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('login.emailAddress', 'Email Address')}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('login.enterEmail', 'Enter your email')}
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (loginError) clearLoginError();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('login.password', 'Password')}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('login.enterPassword', 'Enter your password')}
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (loginError) clearLoginError();
                }}
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
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>
              {t('login.forgotPassword', 'Forgot Password?')}
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>
                  {t('login.signIn', 'Sign In')}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {t('login.or', 'OR')}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>
              {t('login.noAccount', "Don't have an account? ")}
            </Text>
            <TouchableOpacity onPress={handleSignup}>
              <Text style={styles.signupLink}>
                {t('login.signUp', 'Sign Up')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('login.termsAgreement', 'By signing in, you agree to our Terms & Privacy Policy')}
          </Text>
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
  // Language Toggle Button Styles
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
    paddingTop: 100, // Increased padding to account for language button
    paddingBottom: 40,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.xl,
  },
  forgotPasswordText: {
    color: theme.colors.accent,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.subtitle.fontSize,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  signupText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
  },
  signupLink: {
    color: theme.colors.accent,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.small.fontSize,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LoginScreen;
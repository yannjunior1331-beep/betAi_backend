// app/_layout.jsx
import { Stack } from 'expo-router';
import { theme } from '../constants/theme';

import { AuthProvider, useAuth } from '../contexts/authContext';

import { useEffect } from 'react';
import { router } from 'expo-router';

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Redirect to login if not authenticated
        router.replace('/(auth)/login');
      } else {
        // Redirect to home if authenticated
        router.replace('/(tab)');
      }
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    // Show a splash screen or loading indicator
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.cardBackground,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {/* Auth screens - always accessible */}
      <Stack.Screen 
        name="(auth)/login" 
        options={{ 
         headerShown: false
        }} 
      />
      <Stack.Screen 
        name="(auth)/register" 
        options={{ 
         headerShown: false
        }} 
      />
      
      {/* Protected tabs - only accessible when authenticated */}
      <Stack.Screen 
        name="(tab)" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
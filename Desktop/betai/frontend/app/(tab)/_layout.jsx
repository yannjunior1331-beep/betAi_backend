import { Tabs } from 'expo-router';
import { theme } from '../../constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProtectedRoute from '../../components/protectedRoutes';

export default function TabLayout() {
  return (
    // <ProtectedRoute allow="full">
      <Tabs
       
       screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.cardBackground,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerStyle: {
          backgroundColor: theme.colors.cardBackground,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      
       <Tabs.Screen
        name="betslip"
        options={{
          title: 'Coupons',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket" size={size} color={color} />
          ),
        }}
      />

      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
       <Tabs.Screen
        name="HomeScreen"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="paywall"
        options={{
          href: null
        }}
      />
    </Tabs>
    // </ProtectedRoute>
  );
}

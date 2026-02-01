// app/affiliate/_layout.jsx
import { Stack } from 'expo-router';
import React from 'react';
import ProtectedRoute from '../../components/protectedRoutes';

const AffiliateLayout = () => {
  return (
   
        <Stack>
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
          // presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="dashboard"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
    
    
  );
};

export default AffiliateLayout;
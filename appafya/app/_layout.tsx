import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import AnimatedSplash from '@/components/AnimatedSplash';
import { AlertProvider, useAlert } from '@/context/AlertContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { eventEmitter } from '@/utils/events';
import * as ScreenCapture from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Prevent native splash screen from autohiding
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { userToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!userToken && inAuthGroup) {
      // Redirect but also don't set appIsReady yet (handled in other useEffect)
      router.replace('/login');
    }
    else if (userToken && segments[0] === 'login') {
      router.replace('/(tabs)');
    }
  }, [userToken, segments, isLoading]);

  const { showAlert } = useAlert();
  const { signOut } = useAuth();

  useEffect(() => {
    const handleUnauthorized = () => {
      showAlert({
        title: 'Session Expired',
        message: 'You have been logged out because your account was accessed from another device or your session expired.',
        type: 'error',
        confirmText: 'OK',
        onConfirm: () => {
          signOut();
        }
      });
    };

    eventEmitter.on('unauthorized', handleUnauthorized);
    return () => {
      eventEmitter.off('unauthorized', handleUnauthorized);
    };
  }, [signOut, showAlert]);

  // Global Screenshot Prevention
  useEffect(() => {
    const preventCapture = async () => {
      await ScreenCapture.preventScreenCaptureAsync();
    };
    preventCapture();
  }, []);

  // Splash State
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [splashAnimationFinished, setSplashAnimationFinished] = React.useState(false);

  useEffect(() => {
    if (!isLoading) {
      const inAuthGroup = segments[0] === '(tabs)';
      // If unauthorized and in tabs, wait for redirect (don't set ready yet)
      if (!userToken && inAuthGroup) {
        return;
      }
      setAppIsReady(true);
    }
  }, [isLoading, userToken, segments]);

  // Hide native splash when app is ready (our AnimatedSplash will take over)
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady || !splashAnimationFinished) {
    return (
      <AnimatedSplash
        onAnimationComplete={() => {
          console.log('Splash Animation Complete');
          setSplashAnimationFinished(true);
        }}
      />
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="discussion/[id]" options={{ title: 'Discussion' }} />
        <Stack.Screen name="viewer" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AlertProvider>
        <NotificationProvider>
          <RootLayoutNav />
        </NotificationProvider>
      </AlertProvider>
    </AuthProvider>
  );
}

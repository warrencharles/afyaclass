import { Redirect, Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

function TabIcon({ name, color, focused }: { name: any, color: string, focused: boolean }) {
  const scaleValue = useRef(new Animated.Value(focused ? 1.2 : 1)).current;
  const translateY = useRef(new Animated.Value(focused ? -5 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: focused ? 1.25 : 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: focused ? -8 : 0,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();
  }, [focused]);

  return (
    <Animated.View style={[
      styles.iconWrapper,
      {
        transform: [{ scale: scaleValue }, { translateY: translateY }],
      }
    ]}>
      <View style={[
        styles.iconShadow,
        focused && styles.activeShadow
      ]}>
        <Ionicons size={focused ? 24 : 26} name={name} color={color} />
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  if (!userToken) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3498db', // Matches App Theme
        tabBarInactiveTintColor: '#95a5a6',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 5,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          elevation: 10,
          backgroundColor: '#ffffff',
          borderRadius: 25,
          height: 70,
          borderTopWidth: 0,
          // Shadow for iOS
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: 'Forum',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 45,
    height: 45,
  },
  iconShadow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 22.5,
  },
  activeShadow: {
    backgroundColor: '#fff',
    // 3D "Popped" effect for the icon background
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  }
});

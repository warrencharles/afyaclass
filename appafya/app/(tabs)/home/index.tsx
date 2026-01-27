import AppModal from '@/components/AppModal';
import CountdownTimer from '@/components/CountdownTimer';
import NotificationIcon from '@/components/NotificationIcon';
import PaymentModal from '@/components/PaymentModal';
import SubjectCard from '@/components/SubjectCard';
import api from '@/constants/api';
import { ClassLevel, Subject, User } from '@/constants/types';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Dimensions, FlatList, Image, Linking, Platform, RefreshControl, StatusBar, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { signOut, user: contextUser, updateUser } = useAuth();
  const { showAlert } = useAlert();
  const [userInfo, setUserInfo] = useState<User | null>(contextUser);
  const [localPending, setLocalPending] = useState(false);
  const pendingTimestamp = React.useRef<number>(0);
  const router = useRouter();

  // Data State
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);

  // Filters State
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('1');

  // Robust Access Helpers
  const isTrue = (val: any) => (val === true || val === 1 || val === "1" || val === "true");
  const isGlobalFree = isTrue(userInfo?.isGlobalFreeAccessEnabled) || isTrue(userInfo?.is_global_free_access_enabled);
  const hasPaidAccess = isTrue(userInfo?.hasMaterialAccess) || isTrue(userInfo?.has_material_access);
  const paidEndTime = userInfo?.materialPaidAccessEndTime || userInfo?.material_paid_access_end_time;

  // Calculate if payment is actually valid (not expired)
  const isPaidActive = hasPaidAccess && paidEndTime && (new Date().getTime() < new Date(paidEndTime).getTime());
  const hasAccess = isGlobalFree || isPaidActive;
  const trialStartStr = userInfo?.materialTrialStartTime || userInfo?.material_trial_start_time;

  const isPending = (localPending || (
    userInfo?.materialAccessStatus?.toLowerCase() === 'pending' ||
    userInfo?.material_access_status?.toLowerCase() === 'pending' ||
    userInfo?.materialAccessStatus?.toLowerCase() === 'review' ||
    userInfo?.material_access_status?.toLowerCase() === 'review'
  )) && !hasAccess; // Access OVERRIDES Pending status

  const [banners, setBanners] = useState<any[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Carousel State
  const flatListRef = React.useRef<FlatList>(null);
  const scrollIndex = React.useRef(0);
  const screenWidth = Dimensions.get('window').width;

  // Load persistence on mount
  useEffect(() => {
    const loadPersistence = async () => {
      try {
        const val = await SecureStore.getItemAsync('pending_proof_submitted');
        const time = await SecureStore.getItemAsync('pending_proof_at');
        if (val === 'true') {
          console.log('[Persistence] Hard Pending active from:', time);
          setLocalPending(true);
          pendingTimestamp.current = time ? parseInt(time) : 0;
        }
      } catch (e) { }
    };
    loadPersistence();
  }, []);

  useEffect(() => {
    let interval: any;
    if (banners.length > 0) {
      interval = setInterval(() => {
        scrollIndex.current = (scrollIndex.current + 1) % banners.length;
        flatListRef.current?.scrollToIndex({
          index: scrollIndex.current,
          animated: true,
        });
      }, 5000); // Scroll every 5 seconds
    }
    return () => clearInterval(interval);
  }, [banners]);

  // --- Real-time Polling for Global Access ---
  const prevIsGlobalFreeAccess = React.useRef<boolean | undefined>(
    userInfo?.isGlobalFreeAccessEnabled || userInfo?.is_global_free_access_enabled
  );
  const userInfoRef = React.useRef(userInfo);

  // Sync Ref with userInfo
  useEffect(() => {
    userInfoRef.current = userInfo;
  }, [userInfo]);

  // Sync State with contextUser
  useEffect(() => {
    if (contextUser) {
      setUserInfo(contextUser);
      prevIsGlobalFreeAccess.current = contextUser.isGlobalFreeAccessEnabled || contextUser.is_global_free_access_enabled;
    }
  }, [contextUser]);

  useEffect(() => {
    let interval: any;

    const pollUser = async () => {
      try {
        const currentUser = userInfoRef.current;
        const id = currentUser?.id || currentUser?.userId;
        if (!id) return;

        // Silent fetch
        const res = await api.get(`/user/${id}`);
        const freshData = res.data;

        if (!freshData) return;

        // --- Helper for robust boolean check ---
        const normalizeBool = (val: any) => (val === true || val === 1 || val === "1" || val === "true");

        // 1. Detect and Normalize Global Access
        const isGlobal = normalizeBool(freshData.isGlobalFreeAccessEnabled !== undefined ? freshData.isGlobalFreeAccessEnabled : freshData.is_global_free_access_enabled);

        // 2. Normalize Paid Access
        const hasPaid = normalizeBool(freshData.hasMaterialAccess !== undefined ? freshData.hasMaterialAccess : freshData.has_material_access);

        // Force update both keys to ensure consistency and overwrite stale data in state/storage
        freshData.isGlobalFreeAccessEnabled = isGlobal;
        freshData.is_global_free_access_enabled = isGlobal;
        freshData.hasMaterialAccess = hasPaid;
        freshData.has_material_access = hasPaid;

        // Notification for Global Access change
        const wasGlobal = prevIsGlobalFreeAccess.current;
        if (wasGlobal !== undefined && isGlobal !== wasGlobal) {
          const msg = isGlobal
            ? 'Global Free Access has been enabled by the admin!'
            : 'Global Free Access has ended.';

          if (Platform.OS === 'android') {
            ToastAndroid.show(msg, ToastAndroid.LONG);
          }
        }
        // --- ABSOLUTE GUARD EXPIRATION ---
        const serverStatus = (freshData.materialAccessStatus || freshData.material_access_status || '').toLowerCase();
        const now = Date.now();
        const guardAge = now - pendingTimestamp.current;
        const isGuardExhausted = guardAge > 10000; // 10 seconds absolute window

        // 1. If guard is exhausted OR server has acknowledged, kill the local lock
        const serverIsWorking = serverStatus === 'pending' || serverStatus === 'review' || serverStatus === 'approved';

        if (localPending && (isGuardExhausted || serverIsWorking)) {
          console.log(`[Poll] Guard ${isGuardExhausted ? 'EXPIRED' : 'SYNCED'}. Server status: ${serverStatus || 'none'}`);
          setLocalPending(false);
          await SecureStore.deleteItemAsync('pending_proof_submitted');
          await SecureStore.deleteItemAsync('pending_proof_at');
          // Important: localPending will be false in the NEXT poll, but we use server truth for THIS poll
        }

        // 2. Data Enrichment: Only force pending if localPending is STILL active
        // (This means we are within the 10s window and server hasn't seen it yet)
        const updated = { ...userInfoRef.current, ...freshData };
        if (localPending && !serverIsWorking && !isGuardExhausted) {
          console.log('[Poll] Guarding: forcing PENDING (10s window)');
          updated.materialAccessStatus = 'pending' as any;
          updated.material_access_status = 'pending' as any;
        } else {
          // Guard is over: server is absolute truth. 
          // If server says nothing, ensure status is 'none' to clear stale 'pending'
          if (!serverIsWorking) {
            updated.materialAccessStatus = (freshData.materialAccessStatus || 'none') as any;
            updated.material_access_status = (freshData.material_access_status || 'none') as any;
          }
        }

        await updateUser(updated);
        setUserInfo(updated);

        return updated;

      } catch (err) {
        // Silent fail on polling errors
      }
    };

    if (userInfo) {
      interval = setInterval(pollUser, 10000); // 10 Seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userInfo?.id]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showSemModal, setShowSemModal] = useState(false);

  // Initial Data Fetch
  const fetchDashboardData = async () => {
    try {
      // 1. Get User Info from Context or Storage
      let storedUser = contextUser;

      if (!storedUser) {
        // Fallback to storage if context is empty (shouldn't happen if user is logged in)
        if (Platform.OS !== 'web') {
          const infoStr = await SecureStore.getItemAsync('userInfo');
          if (infoStr) storedUser = JSON.parse(infoStr);
        } else if (typeof localStorage !== 'undefined') {
          const infoStr = localStorage.getItem('userInfo');
          if (infoStr) storedUser = JSON.parse(infoStr);
        }
      }

      // 2. DETECT USER CHANGE: Only reset state if the user is different or we have NO user in memory
      const storedId = storedUser?.id || storedUser?.userId;
      const currentId = userInfo?.id || userInfo?.userId;

      if (!storedUser || storedId !== currentId) {
        console.log('[Dashboard] User changed or first load. Resetting state.');
        setAllSubjects([]);
        setFilteredSubjects([]);
        setClassLevels([]);
        setBanners([]);
        setLoading(true); // Show spinner for fresh loads/user changes
      }

      if (!storedUser) {
        setUserInfo(null);
        setLoading(false);
        return;
      }

      setUserInfo(storedUser);
      const userId = storedUser.id || storedUser.userId;

      console.log('[Dashboard] Fetching with User ID:', userId);

      // 2. Fetch Data
      // Reverted class-levels to public endpoint based on analysis
      const [levelsRes, subjectsRes, bannersRes, userProfileRes] = await Promise.allSettled([ // Added bannersRes
        api.get('/class-levels'),
        api.get('/subjects'), // Back to the list of subjects, handled by interceptor
        api.get('/advertisements'), // Fetch banners
        userId ? api.get(`/user/${userId}`) : Promise.reject('No User ID') // Refresh User Profile
      ]);

      // --- NEW: Process User Profile Refresh (Fix for Revocation Persistence) ---
      if (userProfileRes.status === 'fulfilled') {
        const freshUserData = userProfileRes.value.data;
        console.log('[Dashboard] User profile refreshed. Access:', freshUserData.hasMaterialAccess);

        // --- Fix: Normalize Global Access Flag (Handle string '0'/'1' or boolean) ---
        const isGlobalRaw = freshUserData.isGlobalFreeAccessEnabled !== undefined ? freshUserData.isGlobalFreeAccessEnabled : freshUserData.is_global_free_access_enabled;
        let isGlobal = isGlobalRaw;
        if (typeof isGlobalRaw === 'string') {
          isGlobal = isGlobalRaw === '1' || isGlobalRaw === 'true';
        } else if (typeof isGlobalRaw === 'number') {
          isGlobal = isGlobalRaw === 1;
        }
        // Force update both keys to ensure consistency and overwrite stale data
        freshUserData.isGlobalFreeAccessEnabled = isGlobal;
        freshUserData.is_global_free_access_enabled = isGlobal;
        // -----------------------------------------------------------------------------

        const serverStatus = (freshUserData.materialAccessStatus || freshUserData.material_access_status || '').toLowerCase();

        // --- ABSOLUTE GUARD EXPIRATION ---
        const now = Date.now();
        const guardAge = now - pendingTimestamp.current;
        const isGuardExhausted = guardAge > 10000;
        const serverIsWorking = serverStatus === 'pending' || serverStatus === 'review' || serverStatus === 'approved';

        if (localPending && (isGuardExhausted || serverIsWorking)) {
          console.log('[Dashboard] Guard cleared. Server in control.');
          setLocalPending(false);
          await SecureStore.deleteItemAsync('pending_proof_submitted');
          await SecureStore.deleteItemAsync('pending_proof_at');
        }

        const updatedUser = { ...userInfo, ...freshUserData };
        if (localPending && !serverIsWorking && !isGuardExhausted) {
          console.log('[Dashboard] Guarding: forcing PENDING');
          updatedUser.materialAccessStatus = 'pending' as any;
          updatedUser.material_access_status = 'pending' as any;
        } else if (!serverIsWorking) {
          updatedUser.materialAccessStatus = (freshUserData.materialAccessStatus || 'none') as any;
          updatedUser.material_access_status = (freshUserData.material_access_status || 'none') as any;
        }

        await updateUser(updatedUser);
        setUserInfo(updatedUser);
        storedUser = updatedUser; // Update local ref for further logic
      } else {
        console.warn('[Dashboard] Failed to refresh user profile:', userProfileRes.reason);
      }
      // ------------------------------------------------------------------------

      // 3. Process Levels & Subjects
      let levels: ClassLevel[] = [];
      let subjects: Subject[] = [];

      if (subjectsRes.status === 'fulfilled') {
        const data = subjectsRes.value.data;
        subjects = Array.isArray(data) ? data : (data.data || []);
        setAllSubjects(subjects);
        console.log('[Dashboard] Subjects loaded for enrichment:', subjects.length);
      }

      if (levelsRes.status === 'fulfilled') {
        levels = Array.isArray(levelsRes.value.data) ? levelsRes.value.data : [];
        if (storedUser?.classType || storedUser?.classLevel) {
          const rawId = (storedUser?.classType || storedUser?.classLevel || '').toUpperCase();
          const prefixMatch = rawId.match(/^[A-Z]+/);
          const cleanPrefix = prefixMatch ? prefixMatch[0] : '';

          if (cleanPrefix) {
            levels = levels.filter(l => l.name.toUpperCase().startsWith(cleanPrefix));
          }
        }

        // --- ENRICHMENT LOGIC ---
        levels = levels.map(level => {
          const currentName = (level.name || '').trim();
          // If name already has a number (e.g. "CMT 4"), we are good.
          if (/\d+/.test(currentName)) return level;

          const prefix = currentName.toUpperCase().match(/^[A-Z]+/)?.[0] || 'LEVEL';

          // Strategy 1: Derive from subjects assigned to this level
          const sample = subjects.find(s => s.classLevelId == level.id);
          if (sample) {
            const combined = (sample.name + " " + (sample.code || '')).toUpperCase();
            // Look for patterns like "06", "05", "04" (NACTVET codes) or " 5", " 6"
            const numMatch = combined.match(/(\d{2})|(?:\s(\d))|(\d+)/);
            if (numMatch) {
              const numStr = numMatch[1] || numMatch[2] || numMatch[3];
              const foundNum = parseInt(numStr);
              if (foundNum > 0 && foundNum < 15) { // Valid NTA levels are 1-9
                return { ...level, name: `${prefix} ${foundNum}` };
              }
            }
          }

          // Strategy 2: ID-based fallback (NACTVET systems often use Level ID = Level Number)
          // If ID is 4, 5, or 6, it's almost certainly that level.
          if (level.id >= 4 && level.id <= 9) {
            return { ...level, name: `${prefix} ${level.id}` };
          }

          // Strategy 3: Final Force
          // If we still didn't get a number, just use the ID.
          return { ...level, name: `${prefix} ${level.id}` };
        });

        // Final Filter: Remove redundant prefix-only entries if numbered versions exist
        const levelsWithNumbers = levels.filter(l => /\d+/.test(l.name));
        if (levelsWithNumbers.length > 0) {
          levels = levelsWithNumbers;
        }

        // Sort: Numerical
        levels.sort((a, b) => {
          const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
          if (numA !== numB) return numA - numB;
          return a.name.localeCompare(b.name);
        });

        console.log('[Dashboard] Final Enriched Levels Map:', levels.map(l => `${l.id}: ${l.name}`));
        setClassLevels(levels);
      } else {
        console.log('[Dashboard] Levels fetch failed:', levelsRes.reason);
      }

      // 4. Process Banners
      if (bannersRes.status === 'fulfilled') {
        const data = bannersRes.value.data;
        const bannerList = Array.isArray(data) ? data : (data.data || []);
        setBanners(bannerList.filter((b: any) => b.imageUrl));
      } else {
        console.warn('[Dashboard] Banners fetch failed:', bannersRes.reason);
      }

      // 5. Set Defaults
      if (levels.length > 0 && !selectedLevelId) {
        const userLevelName = storedUser?.classLevel;
        const defaultLevel = levels.find(l => l.name === userLevelName) || levels[0];
        setSelectedLevelId(defaultLevel.id);
      }

    } catch (error) {
      console.log('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Double Back to Exit State
  const [backPressedOnce, setBackPressedOnce] = useState(false);

  // useFocusEffect to handle Back Press only on this screen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (backPressedOnce) {
          BackHandler.exitApp();
          return true;
        }

        setBackPressedOnce(true);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        setTimeout(() => setBackPressedOnce(false), 2000);
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [backPressedOnce])
  );

  useEffect(() => {
    // Filtering Logic
    if (!selectedLevelId) {
      setFilteredSubjects([]);
      return;
    }

    const results = allSubjects.filter(s => {
      // Robust comparison for ID
      const levelMatch = s.classLevelId == selectedLevelId;

      // Robust comparison for Semester (API can return number or string)
      // We convert both to string and trim
      const subjectSem = String(s.semester || '').trim();
      const targetSem = String(selectedSemester).trim();
      const semesterMatch = subjectSem === targetSem;

      return levelMatch && semesterMatch;
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`[Filter] Level: ${selectedLevelId}, Sem: ${selectedSemester} => Found: ${results.length}`);
    setFilteredSubjects(results);
  }, [selectedLevelId, selectedSemester, allSubjects]);

  const onRefresh = async () => {
    console.log('[Refresh] Manual refresh: Clearing local guards for instant sync');
    setLocalPending(false);
    pendingTimestamp.current = 0;
    await SecureStore.deleteItemAsync('pending_proof_submitted');
    await SecureStore.deleteItemAsync('pending_proof_at');

    setRefreshing(true);
    fetchDashboardData();
  };

  const getSelectedLevelName = () => {
    return classLevels.find(l => l.id === selectedLevelId)?.name || 'Select Class';
  };

  // Stabilize renderHeader to prevent NotificationIcon modal from closing on re-renders
  const renderHeader = useCallback(() => {
    // isPending and access variables are now in the outer component scope

    return (
      <View style={styles.header}>
        {/* Top Bar: Greeting + Forum/Logout */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Habari,</Text>
            <Text style={styles.username}>{userInfo?.full_name || userInfo?.name || userInfo?.username || 'Guest'}</Text>

            {/* ACCESS STATUS INDICATORS */}
            {isGlobalFree ? (
              <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e8f5e9', padding: 6, borderRadius: 8, alignSelf: 'flex-start' }}>
                <Ionicons name="gift-outline" size={16} color="#2e7d32" />
                <Text style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: 12 }}>Global Free Access Active</Text>
              </View>
            ) : isPending ? (
              <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff9c4', padding: 6, borderRadius: 8, alignSelf: 'flex-start' }}>
                <Ionicons name="time-outline" size={16} color="#f57f17" />
                <Text style={{ color: '#f57f17', fontWeight: 'bold', fontSize: 12 }}>Payment Pending Review</Text>
              </View>
            ) : (hasPaidAccess && paidEndTime) ? (
              <View style={{ marginTop: 6 }}>
                <CountdownTimer
                  targetDate={paidEndTime}
                  label="Subscription Ends In:"
                  onExpire={() => {
                    console.log('Subscription Expired in UI');
                    fetchDashboardData();
                  }}
                />
              </View>
            ) : trialStartStr ? (() => {
              const trialStart = new Date(trialStartStr).getTime();
              const TRIAL_DURATION_MS = 15 * 60 * 1000;
              const trialEnd = trialStart + TRIAL_DURATION_MS;
              const now = new Date().getTime();

              if (now < trialEnd) {
                return (
                  <View style={{ marginTop: 6 }}>
                    <CountdownTimer
                      targetDate={new Date(trialEnd).toISOString()}
                      label="Free Trial Ends In:"
                      onExpire={() => fetchDashboardData()}
                    />
                  </View>
                );
              } else {
                return (
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffebee', padding: 6, borderRadius: 8, alignSelf: 'flex-start' }}>
                    <Ionicons name="alert-circle" size={16} color="#c62828" />
                    <Text style={{ color: '#c62828', fontWeight: 'bold', fontSize: 12 }}>Trial Expired</Text>
                  </View>
                );
              }
            })() : null}

            {/* DEBUG TAG HIDDEN IN BACKGROUND AS REQUESTED */}
          </View>

          <View style={styles.actions}>
            <NotificationIcon />
            <TouchableOpacity
              onPress={() => showAlert({
                title: "Logout",
                message: "Are you sure you want to log out?",
                type: 'confirm',
                confirmText: "Logout",
                cancelText: "Cancel",
                onConfirm: signOut
              })}
              style={styles.logoutIcon}
            >
              <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner Carousel */}
        {
          banners.length > 0 && (
            <View>
              <FlatList
                ref={flatListRef}
                horizontal
                data={banners}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                scrollEnabled
                snapToAlignment="center"
                scrollEventThrottle={16}
                decelerationRate="fast"
                contentContainerStyle={{ marginVertical: 10 }}
                onScrollToIndexFailed={info => {
                  const wait = new Promise(resolve => setTimeout(resolve, 500));
                  wait.then(() => {
                    flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                  });
                }}
                renderItem={({ item }) => {
                  // Mapped from Website API Inspection:
                  // Title -> title
                  // Desc -> description
                  // Link -> targetUrl (or link)
                  // CTA Text -> Not in API, Website defaults to "Learn More"

                  const title = item.title || item.name || item.heading || item.caption;
                  const desc = item.description || item.content || item.subtitle;
                  const rawLink = item.targetUrl || item.link; // Correct API key is targetUrl

                  // Helper to ensure URL has scheme
                  const openLink = (url?: string) => {
                    if (!url) return;
                    // Prepend https:// if missing http/https
                    const finalUrl = (url.startsWith('http://') || url.startsWith('https://'))
                      ? url
                      : `https://${url}`;

                    Linking.openURL(finalUrl).catch(err => console.error("Couldn't load page", err));
                  };

                  // We use "Learn More" because the website does so. This is UI text, not mock data.
                  const cta = item.ctaText || item.cta_text || item.button_text || 'Learn More';

                  return (
                    <View style={[styles.bannerContainer, { width: screenWidth - 32 }]}>
                      <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                      <View style={styles.bannerOverlay}>
                        <View style={styles.bannerTextContainer}>
                          {title && <Text style={styles.bannerTitle} numberOfLines={1}>{title}</Text>}
                          {desc && <Text style={styles.bannerDesc} numberOfLines={2}>{desc}</Text>}
                        </View>
                        {rawLink && (
                          <TouchableOpacity
                            style={styles.bannerBtn}
                            activeOpacity={0.8}
                            onPress={() => openLink(rawLink)}
                          >
                            <Text style={styles.bannerBtnText}>{cta}</Text>
                            <Ionicons name="arrow-forward" size={12} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )
                }}
              />
            </View>
          )
        }

        {/* Filters Row (Dropdowns) */}
        <View style={styles.filtersRow}>
          {/* Class Level Dropdown */}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowLevelModal(true)}
          >
            <View>
              <Text style={styles.dropdownLabel}>Class Level</Text>
              <Text style={styles.dropdownValue}>{getSelectedLevelName()}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
          </TouchableOpacity>

          {/* Semester Dropdown */}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowSemModal(true)}
          >
            <View>
              <Text style={styles.dropdownLabel}>Semester</Text>
              <Text style={styles.dropdownValue}>{selectedSemester ? `Semester ${selectedSemester}` : 'Select Semester'}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
          </TouchableOpacity>
        </View>

        {/* Banner (Placeholder for now) */}
        {/* <View style={styles.banner}><Text style={styles.bannerText}>News & Updates</Text></View> */}

        <View style={styles.sectionHeader}>
          {/* Fallback text if user hasn't selected anything or loading */}
          <Text style={styles.sectionTitle}>
            {selectedLevelId ? 'My Subjects' : 'Select a Class'}
          </Text>
          <Text style={styles.badge}>{filteredSubjects.length} found</Text>
        </View>
      </View>
    );
  }, [userInfo, banners, selectedLevelId, selectedSemester, classLevels, screenWidth, showAlert, signOut, getSelectedLevelName, fetchDashboardData, filteredSubjects.length, styles, isPending]);

  const renderModals = () => (
    <>
      <AppModal
        visible={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        title="Select Class Level"
      >
        <View>
          {classLevels.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#999', padding: 20 }}>
              Loading levels...
            </Text>
          ) : (
            classLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[styles.modalOption, selectedLevelId === level.id && styles.modalOptionActive]}
                onPress={() => {
                  setSelectedLevelId(level.id);
                  setShowLevelModal(false);
                }}
              >
                <Text style={[styles.optionText, selectedLevelId === level.id && styles.optionTextActive]}>
                  {level.name}
                </Text>
                {selectedLevelId === level.id && <Ionicons name="checkmark" size={20} color="#3498db" />}
              </TouchableOpacity>
            ))
          )}
        </View>
      </AppModal>

      <AppModal
        visible={showSemModal}
        onClose={() => setShowSemModal(false)}
        title="Select Semester"
      >
        <View>
          {['1', '2'].map((sem) => (
            <TouchableOpacity
              key={sem}
              style={[styles.modalOption, selectedSemester === sem && styles.modalOptionActive]}
              onPress={() => {
                setSelectedSemester(sem);
                setShowSemModal(false);
              }}
            >
              <Text style={[styles.optionText, selectedSemester === sem && styles.optionTextActive]}>
                Semester {sem}
              </Text>
              {selectedSemester === sem && <Ionicons name="checkmark" size={20} color="#3498db" />}
            </TouchableOpacity>
          ))}
        </View>
      </AppModal>
    </>
  );



  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={filteredSubjects}
        extraData={`${JSON.stringify(userInfo)}-${localPending}`}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => {
          let isLocked = !isGlobalFree;
          if (isLocked && isPaidActive) {
            isLocked = false; // Overridden by active payment
          }

          if (isLocked && trialStartStr) {
            const trialEnd = new Date(trialStartStr).getTime() + (15 * 60 * 1000);
            isLocked = new Date().getTime() >= trialEnd;
          }

          const status = isPending ? 'pending' : (isLocked ? 'locked' : 'unlocked');

          const handlePress = (s: any) => {
            if (isPending) {
              showAlert({
                title: 'Review in Progress',
                message: 'Your payment proof has been submitted and is currently being reviewed by the admin. Please wait for approval.',
                type: 'info'
              });
              return;
            }

            if (isLocked) {
              showAlert({
                title: 'Upgrade Required',
                message: 'Unlock full access to view notes and videos for this subject. Pay now with PesaPal or upload proof.',
                type: 'confirm',
                confirmText: 'Pay Now',
                cancelText: 'Cancel',
                onConfirm: () => setShowPaymentModal(true)
              });
              return;
            }
            router.push({ pathname: "/subject/[id]", params: { id: s.id, name: s.name } });
          };

          return (
            <SubjectCard
              subject={item}
              index={index}
              isLocked={isLocked}
              status={isPending ? 'pending' : (isLocked ? 'locked' : 'unlocked')}
              onPress={handlePress}
            />
          );
        }}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={{ marginTop: 10, color: '#bdc3c7' }}>Loading your subjects...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {allSubjects.length === 0 ? 'No subjects found.' : 'No subjects match your filter.'}
              </Text>
              {allSubjects.length > 0 && (
                <Text style={{ fontSize: 12, color: '#ccc', marginTop: 10 }}>
                  Try changing the semester.
                </Text>
              )}
            </View>
          )
        }
      />
      {renderModals()}

      {userInfo && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          userId={userInfo.id ? userInfo.id.toString() : (userInfo.userId ? userInfo.userId.toString() : '')}
          userName={userInfo.full_name || userInfo.name || userInfo.username || ''}
          userEmail={userInfo.email || ''}
          isPending={isPending}
          onSuccess={async () => {
            setShowPaymentModal(false);
            const now = Date.now();
            setLocalPending(true);
            pendingTimestamp.current = now;
            await SecureStore.setItemAsync('pending_proof_submitted', 'true');
            await SecureStore.setItemAsync('pending_proof_at', now.toString());

            if (userInfo) {
              const updated = {
                ...userInfo,
                materialAccessStatus: 'pending' as any,
                material_access_status: 'pending' as any
              };
              await updateUser(updated);
              setUserInfo(updated);
            }
            setTimeout(onRefresh, 5000);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 150, // Added to clear floating navigation
  },
  header: {
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20,
  },
  greeting: { fontSize: 13, color: '#95a5a6', textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerContainer: {
    width: Dimensions.get('window').width - 32, // Full width minus padding
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 0, // No margin right since we are centering/paging
    backgroundColor: '#ddd',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)', // Dark overlay for readability
    justifyContent: 'flex-end',
    padding: 16,
  },
  bannerTextContainer: {
    marginBottom: 10,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  bannerDesc: {
    color: '#f0f0f0',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '85%',
  },
  bannerBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bannerBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterSection: { fontSize: 13, color: '#95a5a6', textTransform: 'uppercase', letterSpacing: 0.5 },
  username: { fontSize: 20, fontWeight: '800', color: '#2c3e50' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  logoutButton: { padding: 8, backgroundColor: '#ffebee', borderRadius: 20 },
  logoutIcon: { padding: 4 }, // Just icon for logout to save space

  filtersRow: {
    flexDirection: 'row', gap: 12, marginBottom: 24,
  },
  dropdownBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#ecf0f1',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  dropdownLabel: { fontSize: 10, color: '#bdc3c7', fontWeight: 'bold', textTransform: 'uppercase' },
  dropdownValue: { fontSize: 14, color: '#34495e', fontWeight: '600', marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2c3e50' },
  badge: { fontSize: 12, color: '#7f8c8d', backgroundColor: '#ecf0f1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#95a5a6' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: 400 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
    minHeight: 50, // Ensure enough height for wrapped text
  },
  modalOptionActive: { backgroundColor: '#f0f9ff', paddingHorizontal: 10, borderRadius: 8, borderBottomWidth: 0 },
  optionText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1, // Allow text to take available space
    flexWrap: 'wrap', // Enable text wrapping
    marginRight: 10, // Space before checkmark
  },
  optionTextActive: { color: '#3498db', fontWeight: '600' },
});

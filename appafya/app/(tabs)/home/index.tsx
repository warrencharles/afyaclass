import AppModal from '@/components/AppModal';
import NotificationIcon from '@/components/NotificationIcon';
import SubjectCard from '@/components/SubjectCard';
import api from '@/constants/api';
import { ClassLevel, Subject, User } from '@/constants/types';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Dimensions, FlatList, Image, Linking, Platform, RefreshControl, StatusBar, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { showAlert } = useAlert();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const router = useRouter();

  // Data State
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);

  // Filters State
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('1');
  const [banners, setBanners] = useState<any[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

  // Carousel State
  const flatListRef = React.useRef<FlatList>(null);
  const scrollIndex = React.useRef(0);
  const screenWidth = Dimensions.get('window').width;

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

  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showSemModal, setShowSemModal] = useState(false);

  // Initial Data Fetch
  const fetchDashboardData = async () => {
    try {
      // 1. Get User Info
      let currentUser = userInfo;
      if (!currentUser) {
        if (Platform.OS !== 'web') {
          const infoStr = await SecureStore.getItemAsync('userInfo');
          if (infoStr) currentUser = JSON.parse(infoStr);
        } else if (typeof localStorage !== 'undefined') {
          const infoStr = localStorage.getItem('userInfo');
          if (infoStr) currentUser = JSON.parse(infoStr);
        }
      }
      if (currentUser) setUserInfo(currentUser);
      const userId = currentUser?.id || currentUser?.userId;

      console.log('[Dashboard] Fetching with User ID:', userId);

      // 2. Fetch Data
      // Reverted class-levels to public endpoint based on analysis
      const [levelsRes, subjectsRes, bannersRes] = await Promise.allSettled([ // Added bannersRes
        api.get('/class-levels'),
        api.get('/subjects'), // Back to the list of subjects, handled by interceptor
        api.get('/advertisements') // Fetch banners
      ]);

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
        if (currentUser?.classType || currentUser?.classLevel) {
          const rawId = (currentUser?.classType || currentUser?.classLevel || '').toUpperCase();
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
        const userLevelName = currentUser?.classLevel;
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
    });

    console.log(`[Filter] Level: ${selectedLevelId}, Sem: ${selectedSemester} => Found: ${results.length}`);
    setFilteredSubjects(results);
  }, [selectedLevelId, selectedSemester, allSubjects]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getSelectedLevelName = () => {
    return classLevels.find(l => l.id === selectedLevelId)?.name || 'Select Class';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Top Bar: Greeting + Forum/Logout */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Habari,</Text>
          <Text style={styles.username}>{userInfo?.name || userInfo?.username || 'Student'}</Text>
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
      {banners.length > 0 && (
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
      )}

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
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <SubjectCard
            subject={item}
            index={index}
            onPress={(s) => router.push({ pathname: "/subject/[id]", params: { id: s.id, name: s.name } })}
          />
        )}
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
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

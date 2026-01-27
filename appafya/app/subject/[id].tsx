import PaymentModal from '@/components/PaymentModal';
import api from '@/constants/api';
import { Material } from '@/constants/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SubjectDetailScreen() {
    const { id, name } = useLocalSearchParams();
    const navigation = useNavigation();
    const router = useRouter();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'notes' | 'books' | 'nactvet' | 'exams' | 'examGuides' | 'videos' | 'practicals'>('notes');

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null); // To pass to modal

    useEffect(() => {
        // Hide default header to use custom one
        navigation.setOptions({ headerShown: false });

        // We need to get the user ID first to fetch content
        const init = async () => {
            try {
                const infoStr = await SecureStore.getItemAsync('userInfo');
                if (infoStr) {
                    const user = JSON.parse(infoStr);
                    const userId = user.id || user.userId;
                    fetchMaterials(userId);
                } else {
                    console.log('No user info found');
                    setLoading(false);
                }
            } catch (e) {
                console.log('Error getting user info', e);
                setLoading(false);
            }
        };
        init();
    }, [id]);

    useEffect(() => {
        // Detailed filtering logic for tabs
        const naturalSort = (a: Material, b: Material) => {
            return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
        };

        let filtered: Material[] = [];
        if (activeTab === 'notes') {
            filtered = materials.filter(m => m.type === 'note');
        } else if (activeTab === 'books') {
            filtered = materials.filter(m => m.type === 'book');
        } else if (activeTab === 'nactvet') {
            filtered = materials.filter(m => m.type === 'nactvet');
        } else if (activeTab === 'exams') {
            filtered = materials.filter(m => m.type === 'exam');
        } else if (activeTab === 'examGuides') {
            filtered = materials.filter(m => m.type === 'examGuide');
        } else if (activeTab === 'videos') {
            filtered = materials.filter(m => m.type === 'video');
        } else if (activeTab === 'practicals') {
            filtered = materials.filter(m => m.type === 'practical');
        }
        setFilteredMaterials(filtered.sort(naturalSort));
    }, [activeTab, materials]);
    // ... (fetching code) ...
    // ... (fetching code) ...

    const fetchMaterials = async (userId: number) => {
        try {
            // console.log(`[SubjectDetails] Fetching materials for userId: ${userId}`);
            // Use the reliable user content endpoint
            const response = await api.get(`/user/${userId}/content`);

            // console.log('[SubjectDetails] Response Status:', response.status);

            const allContent = Array.isArray(response.data) ? response.data : (response.data.data || []);
            // console.log(`[SubjectDetails] Raw content count: ${allContent.length}`);

            // if (allContent.length > 0) {
            //     console.log('[SubjectDetails] Sample first item:', JSON.stringify(allContent[0], null, 2));
            // }

            // Filter for this specific subject
            // Ensure we compare strings/numbers safely
            const subjectMaterials = allContent.filter((m: any) => {
                // Backend might return strings or numbers, equal-equal (==) handles coercion
                return m.subjectId == id;
            });

            console.log(`[SubjectDetails] Found ${subjectMaterials.length} materials for subject ${id}`);

            // Map to ensure properties are clean if needed, or just set
            // If backend returns different field names, we might map them here. 
            // For now assuming direct mapping + our type update works.
            // For now assuming direct mapping + our type update works.
            setMaterials(subjectMaterials);

            // Re-fetch user info to have fresh data for modal
            const infoStr = await SecureStore.getItemAsync('userInfo');
            if (infoStr) setUserInfo(JSON.parse(infoStr));

        } catch (error) {
            console.log('Error fetching materials', error);
            alert('Failed to load materials. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const checkAccess = (material: Material) => {
        // Standardize properties (Handle snake_case from backend)
        const isGlobalFree = userInfo?.isGlobalFreeAccessEnabled || userInfo?.is_global_free_access_enabled;

        // Paid Access: Check Boolean OR Time Validity
        const paidEndTimeStr = userInfo?.materialPaidAccessEndTime || userInfo?.material_paid_access_end_time;
        const hasPaidFlag = userInfo?.hasMaterialAccess || userInfo?.has_material_access;

        let isPaidActive = false;
        if (paidEndTimeStr) {
            const end = new Date(paidEndTimeStr).getTime();
            if (end > new Date().getTime()) isPaidActive = true;
        }
        if (hasPaidFlag) isPaidActive = true;

        const trialStartStr = userInfo?.materialTrialStartTime || userInfo?.material_trial_start_time;

        // 0. Global Free Access Override (Highest Priority)
        // If Global Free Access is ON, ignore everything else.
        if (isGlobalFree) return true;

        // 1. Check if material considers itself locked
        // API might return isLocked as boolean, number (0/1), or string ("0"/"1")
        const lockedFlag = material.isLocked == true || String(material.isLocked) === '1' || String(material.isLocked) === 'true';
        const statusLocked = material.accessStatus === 'locked' || material.accessStatus === 'premium' || material.accessStatus === 'paid';
        const isMaterialRestricted = lockedFlag || statusLocked;

        // If material is NOT restricted at all, everyone can access
        if (!isMaterialRestricted) return true;

        // 2. Paid Access (Medium Priority)
        // If user has paid access, they can view restricted content
        if (isPaidActive) return true;

        // 3. Trial Access (Lowest Priority)
        if (trialStartStr) {
            const trialStart = new Date(trialStartStr).getTime();
            const TRIAL_DURATION_MS = 15 * 60 * 1000;
            const now = new Date().getTime();
            // Active trial allows access to restricted content
            if (now < trialStart + TRIAL_DURATION_MS) return true;
        }

        // 4. Fallback: Access Denied
        return false;
    };

    const openMaterial = (material: Material) => {
        const canAccess = checkAccess(material);

        if (!canAccess) {
            setShowPaymentModal(true);
            return;
        }

        let url = material.fileUrl || material.videoUrl;

        // Ensure absolute URL for PDFs/Images if it's a relative path
        if (url && !url.startsWith('http') && !url.startsWith('https')) {
            const baseUrl = 'https://afyaclass.co.tz/backend-php/public';
            const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const cleanPath = url.startsWith('/') ? url.slice(1) : url;
            url = `${cleanBase}/${cleanPath}`;
            console.log('[SubjectDetails] Constructed absolute URL:', url);
        }

        if (url) {
            router.push({
                pathname: "/viewer",
                params: {
                    url: encodeURIComponent(url),
                    title: material.title,
                    type: material.type
                }
            });
        } else {
            alert('No URL found for this content');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return 'play-circle-outline';
            case 'book': return 'book-outline';
            case 'exam': return 'clipboard-outline';
            default: return 'document-text-outline';
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2c3e50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{name || 'Subject Details'}</Text>
                <View style={{ width: 40 }} />
            </View>
            {/* Tabs */}
            <View>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={['notes', 'books', 'nactvet', 'exams', 'examGuides', 'videos', 'practicals']}
                    keyExtractor={item => item}
                    contentContainerStyle={styles.tabContainer}
                    renderItem={({ item: tab }) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            onPress={() => setActiveTab(tab as any)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab === 'nactvet' ? 'NACTVET' : tab === 'examGuides' ? 'Exam Guides' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>


            <FlatList
                data={filteredMaterials}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={styles.emptyText}>No materials found.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const hasAccess = checkAccess(item);
                    const isLocked = !hasAccess;

                    return (
                        <TouchableOpacity
                            style={[styles.card, isLocked && styles.lockedCard]}
                            onPress={() => openMaterial(item)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.type === 'video' ? '#ffebee' : '#e3f2fd' }]}>
                                <Ionicons
                                    name={getIcon(item.type)}
                                    size={24}
                                    color={item.type === 'video' ? '#e53935' : '#1e88e5'}
                                />
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.type}>{item.type.toUpperCase()}</Text>
                            </View>
                            {isLocked ? (
                                <Ionicons name="lock-closed" size={20} color="#999" />
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color="#ddd" />
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
            {/* Payment Modal */}
            {userInfo && (
                <PaymentModal
                    visible={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    userId={userInfo.id || userInfo.userId}
                    userName={userInfo.name || userInfo.username || ''}
                    userEmail={userInfo.email || ''}
                    onSuccess={() => {
                        // Ideally re-fetch or update state
                        setShowPaymentModal(false);
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 12,
        margin: 16,
        marginBottom: 8,
        borderRadius: 12,
        gap: 10, // Modern gap property for spacing
    },
    tab: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20, // More horizontal space
        borderRadius: 20, // Softer pills
        backgroundColor: '#f5f6fa',
        borderWidth: 1,
        borderColor: '#f5f6fa',
    },
    activeTab: {
        backgroundColor: '#fff',
        borderColor: '#3498db',
        borderWidth: 1,
    },
    tabText: {
        color: '#7f8c8d',
        fontWeight: '600',
        fontSize: 13,
    },
    activeTabText: {
        color: '#3498db',
        fontWeight: 'bold',
    },
    list: {
        padding: 16,
        paddingTop: 8,
        paddingBottom: 150, // Added to clear floating navigation
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    lockedCard: {
        opacity: 0.7,
        backgroundColor: '#f9f9f9'
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
    },
    type: {
        fontSize: 11,
        color: '#95a5a6',
        fontWeight: '500',
    },
    emptyText: {
        color: '#95a5a6',
        fontSize: 16,
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f5f6fa',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
        textAlign: 'center',
    }
});

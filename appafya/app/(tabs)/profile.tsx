import PaymentModal from '@/components/PaymentModal';
import api from '@/constants/api';
import { User } from '@/constants/types';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const { signOut } = useAuth();
    const { showAlert } = useAlert();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Personal Details State
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        educationCenter: '', // Mapped from classLevel or separate field if exists
    });

    // Security State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const infoStr = await SecureStore.getItemAsync('userInfo');
            let currentUser = infoStr ? JSON.parse(infoStr) : null;

            if (currentUser && (currentUser.id || currentUser.userId)) {
                const id = currentUser.id || currentUser.userId;
                try {
                    const res = await api.get(`/user/${id}`);
                    if (res.data) {
                        currentUser = res.data;
                        await SecureStore.setItemAsync('userInfo', JSON.stringify(res.data));
                    }
                } catch (err) {
                    console.log('Background fetch failed, using cache');
                }
            }

            if (currentUser) {
                setUser(currentUser);
                setFormData({
                    username: currentUser.username || '',
                    email: currentUser.email || '',
                    phone: currentUser.phone || '',
                    educationCenter: currentUser.schoolName || '', // Assuming schoolName exists or is empty
                });
            }
        } catch (e) {
            console.log('Error fetching profile', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            // Mock API call - replace with actual endpoint e.g., api.post('/update-profile', formData)
            // await api.post('/user/update', { ...formData, id: user?.id });

            // Simulating network delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            showAlert({ title: "Success", message: "Profile details updated successfully.", type: 'success' });

            // Optimistic update
            const updatedUser = { ...user!, ...formData };
            setUser(updatedUser);
            await SecureStore.setItemAsync('userInfo', JSON.stringify(updatedUser));

        } catch (error) {
            showAlert({ title: "Error", message: "Failed to update profile. Please try again.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            showAlert({ title: "Error", message: "New passwords do not match.", type: 'error' });
            return;
        }
        if (!passwords.current) {
            showAlert({ title: "Error", message: "Please enter your current password.", type: 'error' });
            return;
        }

        setSaving(true);
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            showAlert({ title: "Success", message: "Password updated successfully.", type: 'success' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            showAlert({ title: "Error", message: "Failed to update password.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        showAlert({
            title: "Delete Account",
            message: "Are you sure? This action is permanent and cannot be undone.",
            type: 'confirm',
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    if (user?.id) {
                        await api.delete(`/user/${user.id}`);
                        showAlert({ title: "Success", message: "Account deleted successfully.", type: 'success' });
                        // Small delay to let user see success message
                        setTimeout(async () => {
                            await signOut();
                        }, 1500);
                    }
                } catch (error) {
                    console.log('Error deleting account:', error);
                    showAlert({ title: "Error", message: "Failed to delete account. Please try again.", type: 'error' });
                    setLoading(false);
                }
            }
        });
    };

    const getJoinDate = () => {
        const dateStr = user?.createdAt || user?.created_at || user?.date_joined;
        // console.log('[Profile] Raw Join Date:', dateStr);

        if (!dateStr) return 'Joined 2025'; // Fallback to matched visual if missing

        try {
            // Handle SQL timestamps: "2024-01-01 12:00:00" -> "2024-01-01T12:00:00"
            const normalizedDate = dateStr.replace(' ', 'T');
            const d = new Date(normalizedDate);

            if (isNaN(d.getTime())) {
                // Try basic hyphenated parsing "2024-01-01"
                const parts = dateStr.split(/[- :]/);
                if (parts.length >= 3) {
                    return `Joined ${new Date(parseInt(parts[0]), parseInt(parts[1]) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
                }
                return 'Joined 2025';
            }
            return `Joined ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
        } catch (e) {
            return 'Joined 2025';
        }
    };

    const renderHeader = () => (
        <View style={styles.headerCard}>
            <View style={styles.avatarWrapper}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.cameraBtn}>
                    <Ionicons name="camera" size={14} color="#fff" />
                </TouchableOpacity>
            </View>
            <View style={styles.headerInfo}>
                <Text style={styles.username}>{user?.username || 'Student'}</Text>
                <Text style={styles.email}>{user?.email || 'No email'}</Text>
                <View style={styles.roleRow}>
                    <View style={[styles.roleBadge, user?.role?.toLowerCase() === 'premium' && styles.premiumBadge]}>
                        <Text style={[styles.roleText, user?.role?.toLowerCase() === 'premium' && styles.premiumText]}>
                            {user?.role?.toLowerCase() === 'premium' ? 'PREMIUM MEMBER' : (user?.role?.toUpperCase() || 'MEMBER')}
                        </Text>
                    </View>
                    <Text
                        style={styles.joinDate}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                        minimumFontScale={0.8}
                    >
                        {getJoinDate()}
                    </Text>
                </View>

                {/* Upgrade Button if not premium */}
                {user?.role?.toLowerCase() !== 'premium' && (
                    <TouchableOpacity
                        style={styles.upgradeBtn}
                        onPress={() => setShowPaymentModal(true)}
                    >
                        <Ionicons name="sparkles" size={12} color="#fff" />
                        <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
                onPress={() => setActiveTab('personal')}
            >
                <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>Personal Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'security' && styles.activeTab]}
                onPress={() => setActiveTab('security')}
            >
                <Text style={[styles.tabText, activeTab === 'security' && styles.activeTabText]}>Security</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPersonalTab = () => (
        <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                    style={styles.input}
                    value={formData.username}
                    onChangeText={(t) => setFormData({ ...formData, username: t })}
                    placeholder="Enter username"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(t) => setFormData({ ...formData, email: t })}
                    placeholder="Enter email"
                    keyboardType="email-address"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Education Center</Text>
                <TextInput
                    style={styles.input}
                    value={formData.educationCenter}
                    onChangeText={(t) => setFormData({ ...formData, educationCenter: t })}
                    placeholder="College or School"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(t) => setFormData({ ...formData, phone: t })}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                />
            </View>

            <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleSaveProfile}
                disabled={saving}
            >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderSecurityTab = () => (
        <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Password</Text>
                <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={passwords.current}
                    onChangeText={(t) => setPasswords({ ...passwords, current: t })}
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={passwords.new}
                    onChangeText={(t) => setPasswords({ ...passwords, new: t })}
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={passwords.confirm}
                    onChangeText={(t) => setPasswords({ ...passwords, confirm: t })}
                />
            </View>

            <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabledBtn]}
                onPress={handleUpdatePassword}
                disabled={saving}
            >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
            </TouchableOpacity>

            <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Danger Zone</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                    <Text style={styles.deleteBtnText}>Delete Account</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !user) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {renderHeader()}
                    {renderTabs()}
                    {activeTab === 'personal' ? renderPersonalTab() : renderSecurityTab()}

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.logoutRow} onPress={() => showAlert({
                        title: "Logout",
                        message: "Are you sure you want to log out?",
                        type: 'confirm',
                        confirmText: "Logout",
                        cancelText: "Cancel",
                        onConfirm: signOut
                    })}>
                        <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Payment Modal */}
            {user && (
                <PaymentModal
                    visible={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    userId={user.id ? user.id.toString() : (user.userId ? user.userId.toString() : '')}
                    userName={user.username || user.name || ''}
                    userEmail={user.email || ''}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        fetchProfile(); // Refresh profile to see premium status if instant
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f6fa' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20, paddingBottom: 100 },

    // Header
    headerCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 16, padding: 20, marginBottom: 20,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    avatarWrapper: { position: 'relative', marginRight: 20 },
    avatarContainer: {
        width: 70, height: 70, borderRadius: 35, backgroundColor: '#e3f2fd',
        justifyContent: 'center', alignItems: 'center'
    },
    avatarText: { fontSize: 28, fontWeight: 'bold', color: '#1565c0' },
    cameraBtn: {
        position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3498db',
        width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    headerInfo: { flex: 1 },
    username: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 2 },
    email: { fontSize: 13, color: '#7f8c8d', marginBottom: 6 },
    roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
    roleBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    premiumBadge: { backgroundColor: '#fff3e0' },
    roleText: { color: '#2e7d32', fontSize: 10, fontWeight: 'bold' },
    premiumText: { color: '#f57c00' },
    joinDate: { fontSize: 11, color: '#95a5a6', flex: 1 },
    upgradeBtn: {
        marginTop: 8,
        backgroundColor: '#f1c40f',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    upgradeBtnText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },

    // Tabs
    tabContainer: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 20
    },
    tab: {
        flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8
    },
    activeTab: { backgroundColor: '#e3f2fd' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#7f8c8d' },
    activeTabText: { color: '#1565c0' },

    // Forms
    formContainer: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20,
        shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1
    },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 12, color: '#34495e', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    input: {
        backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e1e4e8',
        borderRadius: 8, padding: 12, fontSize: 16, color: '#2c3e50'
    },
    saveBtn: {
        backgroundColor: '#3498db', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 10
    },
    disabledBtn: { opacity: 0.7 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // Danger Zone
    dangerZone: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#ffebee', paddingTop: 20 },
    dangerTitle: { color: '#c0392b', fontWeight: 'bold', marginBottom: 10 },
    deleteBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#ffebee', paddingVertical: 12, borderRadius: 10
    },
    deleteBtnText: { color: '#c0392b', fontWeight: '600', marginLeft: 8 },

    divider: { height: 1, backgroundColor: '#e1e4e8', marginVertical: 24 },

    logoutRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    logoutText: { color: '#e74c3c', fontSize: 16, fontWeight: '600' }
});

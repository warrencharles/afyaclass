import api from '@/constants/api';
import { useAlert } from '@/context/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';

interface PaymentModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    userEmail: string;
    onSuccess?: () => void;
}

export default function PaymentModal({ visible, onClose, userId, userName, userEmail, onSuccess }: PaymentModalProps) {
    const { showAlert } = useAlert();
    const [step, setStep] = useState<'plan' | 'payment'>('plan');
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'weekly_material_access' | 'monthly_material_access'>('weekly_material_access');
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState(userName);
    const [email, setEmail] = useState(userEmail);

    const handleInitiatePayment = async () => {
        if (!name || !email) {
            showAlert({ title: 'Error', message: 'Name and Email are required.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const amount = selectedPlan === 'weekly_material_access' ? 1000 : 4000;
            const payload = {
                userId: String(userId), // Ensure string as per website logic
                name,
                email,
                requestType: selectedPlan,
                amount,
            };

            console.log('[Payment] Initiating Payload:', JSON.stringify(payload, null, 2));
            const response = await api.post('/initiate-pesapal-payment', payload);
            console.log('[Payment] Success Response:', response.data);

            const { redirectUrl } = response.data;
            if (redirectUrl) {
                setPaymentUrl(redirectUrl);
                setStep('payment');
            } else {
                showAlert({ title: 'Error', message: 'Failed to generate payment link.', type: 'error' });
            }
        } catch (error: any) {
            console.log('[Payment] Error details:', error.response?.data || error.message);

            let title = 'Payment Failed';
            let message = 'An unexpected error occurred. Please try again later.';

            if (error.response) {
                const status = error.response.status;
                const backendMsg = error.response.data?.message || error.response.data?.error;

                if (status === 500) {
                    message = 'Our payment gateway is currently unavailable. Please try again in a few minutes.';
                } else if (status === 400 || status === 404) {
                    message = backendMsg || 'Invalid payment request. Please check your details.';
                } else if (status === 401) {
                    message = 'Your session has expired. Please log in again.';
                } else if (backendMsg) {
                    // Fallback to backend message if it's not a 500 and we have one
                    message = backendMsg;
                }
            } else if (error.message === 'Network Error' || !error.response) {
                message = 'Network error. Please check your internet connection and try again.';
            }

            showAlert({ title, message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep('plan');
        setPaymentUrl(null);
        onClose();
    };

    const handleWebViewNavigation = (navState: any) => {
        // You can check for success/callback URLs here if Pesapal redirects back
        const { url } = navState;
        console.log('WebView Nav:', url);
        // Example check: if (url.includes('payment-success')) { ... }
    };

    const renderPlanSelection = () => (
        <View style={styles.content}>
            <Text style={styles.headerTitle}>Unlock Full Access</Text>
            <Text style={styles.subHeader}>Choose a plan to continue learning.</Text>

            <View style={styles.planContainer}>
                <TouchableOpacity
                    style={[styles.planCard, selectedPlan === 'weekly_material_access' && styles.selectedPlan]}
                    onPress={() => setSelectedPlan('weekly_material_access')}
                    activeOpacity={0.8}
                >
                    <View style={styles.planInfo}>
                        <Text style={[styles.planTitle, selectedPlan === 'weekly_material_access' && styles.selectedText]}>Weekly Pass</Text>
                        <Text style={[styles.planPrice, selectedPlan === 'weekly_material_access' && styles.selectedText]}>1,000 Tsh</Text>
                    </View>
                    {selectedPlan === 'weekly_material_access' && <Ionicons name="checkmark-circle" size={24} color="#3498db" />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.planCard, selectedPlan === 'monthly_material_access' && styles.selectedPlan]}
                    onPress={() => setSelectedPlan('monthly_material_access')}
                    activeOpacity={0.8}
                >
                    <View style={styles.planInfo}>
                        <Text style={[styles.planTitle, selectedPlan === 'monthly_material_access' && styles.selectedText]}>Monthly Pass</Text>
                        <Text style={[styles.planPrice, selectedPlan === 'monthly_material_access' && styles.selectedText]}>4,000 Tsh</Text>
                    </View>
                    {selectedPlan === 'monthly_material_access' && <Ionicons name="checkmark-circle" size={24} color="#3498db" />}
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter full name"
                    autoCorrect={false}
                />

                <Text style={styles.label}>Email Address</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.payButton} onPress={handleInitiatePayment} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.payButtonText}>Pay Now</Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={loading}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.secureBadge}>
                <Ionicons name="lock-closed" size={12} color="#95a5a6" />
                <Text style={styles.secureText}>Secured by Pesapal</Text>
            </View>
        </View>
    );

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={handleClose}
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    {step === 'plan' ? (
                        renderPlanSelection()
                    ) : (
                        <View style={{ flex: 1 }}>
                            <View style={styles.webViewHeader}>
                                <TouchableOpacity onPress={() => setStep('plan')} style={styles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color="#333" />
                                </TouchableOpacity>
                                <Text style={styles.webTitle}>Complete Payment</Text>
                                <View style={{ width: 40 }} />
                            </View>
                            {paymentUrl && (
                                <WebView
                                    source={{ uri: paymentUrl }}
                                    style={{ flex: 1 }}
                                    onNavigationStateChange={handleWebViewNavigation}
                                    startInLoadingState
                                    renderLoading={() => (
                                        <View style={styles.webLoading}>
                                            <ActivityIndicator size="large" color="#3498db" />
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
        textAlign: 'center',
    },
    subHeader: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 30,
    },
    planContainer: {
        gap: 12,
        marginBottom: 30,
    },
    planCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#eee',
    },
    selectedPlan: {
        borderColor: '#3498db',
        backgroundColor: '#f0f9ff',
    },
    planInfo: {
        gap: 4,
    },
    planTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    planPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7f8c8d',
    },
    selectedText: {
        color: '#2980b9',
    },
    form: {
        marginBottom: 30,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dcdde1',
        fontSize: 16,
    },
    footer: {
        marginTop: 'auto',
        gap: 12,
    },
    payButton: {
        backgroundColor: '#2c3e50',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    payButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    cancelButton: {
        padding: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#7f8c8d',
        fontSize: 16,
        fontWeight: '600',
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 20,
    },
    secureText: {
        fontSize: 12,
        color: '#95a5a6',
    },
    // WebView Styles
    webViewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backBtn: {
        padding: 8,
    },
    webTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    webLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    }
});

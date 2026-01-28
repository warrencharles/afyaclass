import api from '@/constants/api';
import { useAlert } from '@/context/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
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
    isPending?: boolean;
}

export default function PaymentModal({ visible, onClose, userId, userName, userEmail, onSuccess, isPending }: PaymentModalProps) {
    const { showAlert } = useAlert();
    const [step, setStep] = useState<'plan' | 'payment'>('plan');
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'weekly_material_access' | 'monthly_material_access'>('weekly_material_access');
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [paymentMode, setPaymentMode] = useState<'pesapal' | 'manual'>('pesapal');
    const [instructions, setInstructions] = useState('');
    const [screenshot, setScreenshot] = useState<ImagePicker.ImagePickerAsset | null>(null);

    // Form State
    const [name, setName] = useState(userName);
    const [email, setEmail] = useState(userEmail);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await api.get('/settings/public');
                setPaymentMode(res.data.payment_mode || 'pesapal');
                setInstructions(res.data.manual_payment_instructions || '');
            } catch (e) {
                console.log('Failed to load payment settings', e);
            }
        };
        if (visible) loadSettings();
    }, [visible]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setScreenshot(result.assets[0]);
        }
    };

    const handleInitiatePayment = async () => {
        if (!name || !email) {
            showAlert({ title: 'Error', message: 'Name and Email are required.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const amount = selectedPlan === 'weekly_material_access' ? 1000 : 4000;

            // First check if already pending via props or local logic if needed
            // But we primarily rely on the caller blocking the modal. 
            // However, a second check here is good for safety.

            if (paymentMode === 'pesapal') {
                const payload = {
                    userId: String(userId),
                    name,
                    email,
                    requestType: selectedPlan,
                    amount,
                };

                const response = await api.post('/initiate-pesapal-payment', payload);
                const { redirectUrl } = response.data;
                if (redirectUrl) {
                    setPaymentUrl(redirectUrl);
                    setStep('payment');
                } else {
                    showAlert({ title: 'Error', message: 'Failed to generate payment link.', type: 'error' });
                }
            } else {
                // Manual Proof
                if (!screenshot) {
                    showAlert({ title: 'Error', message: 'Please pick a screenshot of your payment.', type: 'error' });
                    setLoading(false);
                    return;
                }

                const formData = new FormData();
                formData.append('userId', String(userId));
                formData.append('name', name);
                formData.append('email', email);
                formData.append('requestType', selectedPlan);
                formData.append('amount', String(amount));

                // Correctly append file for React Native
                const uri = screenshot.uri;
                const nameArr = uri.split('/');
                const fileName = nameArr[nameArr.length - 1];

                // @ts-ignore
                formData.append('paymentScreenshot', {
                    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                    type: 'image/jpeg',
                    name: fileName,
                });

                await api.post('/submit-payment-proof', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                showAlert({
                    title: 'Submitted',
                    message: 'Your payment proof has been submitted for review. Access will be granted once approved.',
                    type: 'success'
                });
                if (onSuccess) onSuccess();
                handleClose();
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
        setScreenshot(null);
        onClose();
    };

    const handleWebViewNavigation = (navState: any) => {
        // You can check for success/callback URLs here if Pesapal redirects back
        const { url } = navState;
        console.log('WebView Nav:', url);
        // Example check: if (url.includes('payment-success')) { ... }
    };

    const renderPlanSelection = () => (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Unlock Full Access</Text>
                {isPending ? (
                    <View style={styles.pendingWarning}>
                        <Ionicons name="time" size={20} color="#f57f17" />
                        <Text style={styles.pendingWarningText}>Review in Progress: Your previous proof is being verified.</Text>
                    </View>
                ) : (
                    <Text style={styles.subHeader}>Choose a plan to continue learning.</Text>
                )}
            </View>

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

            {paymentMode === 'manual' && (
                <View style={styles.manualContainer}>
                    <View style={styles.instructionBox}>
                        <View style={styles.labelRow}>
                            <Ionicons name="information-circle" size={16} color="#2980b9" />
                            <Text style={styles.manualLabel}>INSTRUCTIONS</Text>
                        </View>
                        <Text style={styles.instructionText}>{instructions || 'Please upload your payment receipt below.'}</Text>
                    </View>

                    <TouchableOpacity style={[styles.uploadBtn, screenshot && styles.hasScreenshot]} onPress={pickImage}>
                        <Ionicons name={screenshot ? "checkmark-circle" : "image-outline"} size={20} color={screenshot ? "#2e7d32" : "#7f8c8d"} />
                        <Text style={[styles.uploadBtnText, screenshot && styles.hasScreenshotText]}>
                            {screenshot ? 'Screenshot Selected' : 'Upload Receipt Screenshot'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.payButton,
                        (paymentMode === 'manual' && !isPending) && styles.manualSubmitBtn,
                        isPending && { backgroundColor: '#bdc3c7' }
                    ]}
                    onPress={handleInitiatePayment}
                    disabled={loading || isPending}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.payButtonText}>
                            {isPending ? 'Review in Progress' : (paymentMode === 'pesapal' ? 'Pay Now' : 'Submit Proof')}
                        </Text>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={loading}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.secureBadge}>
                <Ionicons name="lock-closed" size={14} color="#7f8c8d" />
                <Text style={styles.secureText}>{paymentMode === 'pesapal' ? 'Secured by Pesapal' : 'REVIEW BY SUPPORT'}</Text>
            </View>
        </ScrollView>
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
    scrollContent: {
        padding: 24,
        paddingTop: 40,
        paddingBottom: 100, // Even more padding for home indicators
    },
    headerContainer: {
        marginBottom: 8,
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
        marginTop: 20,
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
        gap: 8,
        marginTop: 30,
        marginBottom: 20, // Extra margin at bottom of content
    },
    secureText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#7f8c8d',
        letterSpacing: 0.5,
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
    },
    // Manual Proof Styles
    manualContainer: {
        marginBottom: 20,
    },
    instructionBox: {
        backgroundColor: '#e3f2fd',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3498db',
        marginBottom: 16,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    manualLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2980b9',
        letterSpacing: 1,
    },
    instructionText: {
        fontSize: 13,
        color: '#34495e',
        lineHeight: 18,
        fontWeight: '500',
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dcdde1',
        borderStyle: 'dashed',
    },
    hasScreenshot: {
        borderColor: '#2e7d32',
        backgroundColor: '#e8f5e9',
        borderStyle: 'solid',
    },
    uploadBtnText: {
        fontSize: 14,
        color: '#7f8c8d',
        fontWeight: 'bold',
    },
    hasScreenshotText: {
        color: '#2e7d32',
    },
    manualSubmitBtn: {
        backgroundColor: '#3498db',
    },
    pendingWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff9c4',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: '#fbc02d',
    },
    pendingWarningText: {
        color: '#f57f17',
        fontSize: 13,
        fontWeight: 'bold',
        flex: 1,
    }
});

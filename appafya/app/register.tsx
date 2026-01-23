import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import api from '../constants/api';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen() {
    const router = useRouter();
    const { signIn } = useAuth();
    const { showAlert } = useAlert();

    // Steps: 1: Basic Info, 2: Education, 3: Password, 4: OTP
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        college: '',
        classType: '', // This will hold the classCode
        password: '',
        confirmPassword: '',
        otp: ''
    });

    const [classes, setClasses] = useState<any[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
            if (res.data.length > 0) {
                // Default to first class if available
                // setFormData(prev => ({ ...prev, classType: res.data[0].classCode }));
            }
        } catch (error) {
            console.log('Error fetching classes', error);
        } finally {
            setLoadingClasses(false);
        }
    };

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!formData.username || !formData.email || !formData.phone) {
                showAlert({ title: 'Error', message: 'Please fill in all fields', type: 'error' });
                return;
            }
            if (!formData.email.endsWith('@gmail.com')) {
                showAlert({ title: 'Error', message: 'Only Gmail accounts are allowed', type: 'error' });
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!formData.college || !formData.classType) {
                showAlert({ title: 'Error', message: 'Please fill in all fields', type: 'error' });
                return;
            }
            setCurrentStep(3);
        }
    };

    const handleRegister = async () => {
        if (!formData.password || !formData.confirmPassword) {
            showAlert({ title: 'Error', message: 'Please enter password', type: 'error' });
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            showAlert({ title: 'Error', message: 'Passwords do not match', type: 'error' });
            return;
        }
        if (formData.password.length < 6) {
            showAlert({ title: 'Error', message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const selectedClass = classes.find(c => c.classCode === formData.classType);
            const payload = {
                username: formData.username,
                email: formData.email,
                phone: formData.phone,
                college: formData.college,
                classType: formData.classType,
                classTypeNameFull: selectedClass ? selectedClass.name : formData.classType,
                classLevel: '',
                password: formData.password
            };

            const res = await api.post('/register', payload);

            showAlert({
                title: 'Success',
                message: res.data.message || 'Account created! Please verify OTP.',
                type: 'success'
            });
            setCurrentStep(4);
        } catch (error: any) {
            let msg = 'Registration failed';
            if (error.response?.data?.message) {
                msg = error.response.data.message;
            } else if (error.message && typeof error.message === 'string') {
                msg = error.message;
            }
            showAlert({ title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!formData.otp) {
            showAlert({ title: 'Error', message: 'Please enter OTP', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/verify-login-otp', {
                email: formData.email,
                otp: formData.otp
            });

            if (res.data.token) {
                await signIn(res.data.token);
                showAlert({
                    title: 'Success',
                    message: 'Email verified!',
                    type: 'success',
                    onConfirm: () => router.replace('/(tabs)')
                });
            } else {
                showAlert({
                    title: 'Success',
                    message: 'Verification successful. Please login.',
                    type: 'success',
                    onConfirm: () => router.replace('/login')
                });
            }
        } catch (error: any) {
            let msg = 'Verification failed';
            if (error.response?.data?.message) {
                msg = error.response.data.message;
            } else if (error.message && typeof error.message === 'string') {
                // Try to avoid showing "[Object object]" or similar raw dumps
                if (!error.message.includes('AxiosError') && !error.message.includes('code 401')) {
                    msg = error.message;
                }
            }
            showAlert({ title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Basic Info</Text>
            <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#7f8c8d"
                value={formData.username}
                onChangeText={(t) => updateForm('username', t)}
            />
            <TextInput
                style={styles.input}
                placeholder="Email (@gmail.com)"
                placeholderTextColor="#7f8c8d"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(t) => updateForm('email', t)}
            />
            <TextInput
                style={styles.input}
                placeholder="Phone Number *"
                placeholderTextColor="#7f8c8d"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(t) => updateForm('phone', t)}
            />
            <TouchableOpacity style={styles.button} onPress={handleNext}>
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Education Info</Text>
            <TextInput
                style={styles.input}
                placeholder="College / Institution"
                placeholderTextColor="#7f8c8d"
                value={formData.college}
                onChangeText={(t) => updateForm('college', t)}
            />

            <Text style={styles.label}>Select Program:</Text>
            {loadingClasses ? (
                <ActivityIndicator />
            ) : (
                <View style={styles.pillsContainer}>
                    {classes.map((cls) => (
                        <TouchableOpacity
                            key={cls.classCode}
                            style={[
                                styles.pill,
                                formData.classType === cls.classCode && styles.pillActive
                            ]}
                            onPress={() => updateForm('classType', cls.classCode)}
                        >
                            <Text style={[
                                styles.pillText,
                                formData.classType === cls.classCode && styles.pillTextActive
                            ]}>
                                {cls.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.rowBtn}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep(1)}>
                    <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.flexButton]} onPress={handleNext}>
                    <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Security</Text>
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#7f8c8d"
                secureTextEntry
                autoCapitalize="none"
                value={formData.password}
                onChangeText={(t) => updateForm('password', t)}
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#7f8c8d"
                secureTextEntry
                autoCapitalize="none"
                value={formData.confirmPassword}
                onChangeText={(t) => updateForm('confirmPassword', t)}
            />

            <View style={styles.rowBtn}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep(2)}>
                    <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.flexButton]} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Verify OTP</Text>
            <Text style={styles.subTitle}>Enter the code sent to {formData.email}</Text>
            <TextInput
                style={styles.input}
                placeholder="OTP Code"
                placeholderTextColor="#7f8c8d"
                keyboardType="number-pad"
                value={formData.otp}
                onChangeText={(t) => updateForm('otp', t)}
            />
            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Login</Text>}
            </TouchableOpacity>
        </View>
    );

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}
                        style={styles.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.stepIndicator}>Step {currentStep} of 4</Text>
                </View>

                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}

                {currentStep < 4 && (
                    <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginLink}>
                        <Text style={styles.loginLinkText}>Already have an account? Sign In</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        minHeight: Dimensions.get('window').height, // Full screen height
        backgroundColor: '#fff',
        padding: 20,
        paddingBottom: 50,
        justifyContent: 'center', // Center content vertically
    },
    header: { marginBottom: 30, marginTop: 20 },
    closeBtn: { position: 'absolute', top: -10, right: 0, padding: 10, zIndex: 10, elevation: 5 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
    stepIndicator: { color: '#7f8c8d', fontSize: 14 },
    stepContainer: { flex: 1 },
    stepTitle: { fontSize: 22, fontWeight: '600', marginBottom: 20, color: '#34495e' },
    subTitle: { fontSize: 14, color: '#7f8c8d', marginBottom: 20 },
    input: {
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dcdde1',
        marginBottom: 15,
        fontSize: 16,
        color: '#2c3e50',
    },
    label: { marginBottom: 10, fontWeight: '600', color: '#34495e' },
    pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    pill: {
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: '#f1f2f6', borderWidth: 1, borderColor: 'transparent'
    },
    pillActive: { backgroundColor: '#e3f2fd', borderColor: '#3498db' },
    pillText: { color: '#7f8c8d', fontWeight: '500' },
    pillTextActive: { color: '#3498db', fontWeight: 'bold' },

    button: {
        backgroundColor: '#3498db', padding: 16, borderRadius: 10, alignItems: 'center',
        marginTop: 10,
        // Removed flex: 1 to prevent huge buttons in column view
    },
    flexButton: {
        flex: 1 // Use this for buttons in rowBtn
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    rowBtn: { flexDirection: 'row', gap: 15, marginTop: 10 },
    backBtn: {
        backgroundColor: '#fff', padding: 16, borderRadius: 10, alignItems: 'center',
        marginTop: 10, borderWidth: 1, borderColor: '#bdc3c7', width: 100
    },
    backBtnText: { color: '#7f8c8d', fontSize: 16, fontWeight: '600' },

    loginLink: { marginTop: 30, alignItems: 'center' },
    loginLinkText: { color: '#3498db', fontWeight: '600' }
});

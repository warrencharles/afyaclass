import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../constants/api';
import { useAlert } from '../context/AlertContext';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleInitiateReset = async () => {
        if (!email) {
            showAlert({ title: 'Error', message: 'Please enter your email', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await api.post('/request-password-reset', { email });
            showAlert({ title: 'Success', message: 'OTP sent to your email', type: 'success' });
            setStep(2);
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to send OTP';
            showAlert({ title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) {
            showAlert({ title: 'Error', message: 'Please enter OTP', type: 'error' });
            return;
        }
        // Web app does not verify OTP at this stage, it verifies during reset.
        // We just move to the next step.
        setStep(3);
    };

    const handleCompleteReset = async () => {
        if (!newPassword || !confirmPassword) {
            showAlert({ title: 'Error', message: 'Please enter new password', type: 'error' });
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert({ title: 'Error', message: 'Passwords do not match', type: 'error' });
            return;
        }
        if (newPassword.length < 6) {
            showAlert({ title: 'Error', message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await api.post('/reset-password', { email, otp, newPassword });
            showAlert({ title: 'Success', message: 'Password reset successful!', type: 'success' });
            setTimeout(() => router.replace('/login'), 1500);
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to reset password';
            showAlert({ title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.description}>Enter your email to receive a password reset code.</Text>
            <TextInput
                style={styles.input}
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />
            <TouchableOpacity style={styles.button} onPress={handleInitiateReset} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.description}>Enter the 6-digit code sent to {email}</Text>
            <TextInput
                style={styles.input}
                placeholder="OTP Code"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
            />
            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.description}>Create a new password.</Text>
            <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                autoCapitalize="none"
                value={newPassword}
                onChangeText={setNewPassword}
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />
            <TouchableOpacity style={styles.button} onPress={handleCompleteReset} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </TouchableOpacity>
        </View>
    );

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>

                <Text style={styles.title}>Forgot Password</Text>

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#fff', padding: 20 },
    closeBtn: { marginTop: 30, marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
    description: { fontSize: 16, color: '#7f8c8d', marginBottom: 20 },
    stepContainer: { flex: 1 },
    input: {
        backgroundColor: '#f5f6fa', padding: 15, borderRadius: 10, borderWidth: 1,
        borderColor: '#dcdde1', marginBottom: 15, fontSize: 16
    },
    button: {
        backgroundColor: '#3498db', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

import LoadingOverlay from '@/components/LoadingOverlay';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../constants/api';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showAlert } = useAlert();
    const router = useRouter();
    const { signIn } = useAuth();

    const handleTerminateSessions = async (userId: number, resolutionToken: string) => {
        setLoading(true);
        try {
            console.log('Terminating other sessions for user:', userId);
            await api.post('/terminate-all-other-sessions',
                { userId, currentSessionId: null },
                { headers: { Authorization: `Bearer ${resolutionToken}` } }
            );

            showAlert({ title: 'Success', message: 'Other sessions terminated. Logging in...', type: 'success' });
            // Retry login normally
            await handleLogin();
        } catch (error: any) {
            console.log('Termination error:', error);
            const message = error.response?.data?.message || 'Failed to terminate sessions. Please try again.';
            showAlert({ title: 'Error', message, type: 'error' });
            setLoading(false); // Only set loading false if we fail, otherwise handleLogin keeps it true
        }
    };

    const handleLogin = async () => {
        Keyboard.dismiss();
        if (!email || !password) {
            showAlert({ title: 'Error', message: 'Please enter both email and password', type: 'error' });
            return;
        }

        setLoading(true);
        const startTime = Date.now();
        try {
            console.log(`Attempting login with: ${email}`);

            const payload = {
                emailOrUsername: email,
                password: password,
            };

            console.log('Sending Login Payload:', JSON.stringify(payload));

            const response = await api.post('/login', payload);

            console.log('Login response:', JSON.stringify(response.data));

            if (response.data && response.data.token) {
                await signIn(response.data.token);

                if (response.data.sessionId) {
                    if (Platform.OS !== 'web') {
                        await SecureStore.setItemAsync('deviceId', response.data.sessionId);
                    } else if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('deviceId', response.data.sessionId);
                    }
                }

                if (response.data.user) {
                    if (Platform.OS !== 'web') {
                        await SecureStore.setItemAsync('userInfo', JSON.stringify(response.data.user));
                    } else if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
                    }
                }

                // Ensure at least 2 seconds have passed for the animation
                // const elapsed = Date.now() - startTime;
                // if (elapsed < 2000) {
                //     await new Promise(resolve => setTimeout(resolve, 2000 - elapsed));
                // }

                router.replace('/(tabs)');
            } else {
                showAlert({ title: 'Login Failed', message: 'Invalid response from server', type: 'error' });
            }
        } catch (error: any) {
            setLoading(false); // Stop loading on error so user can retry
            // Check for 409 Conflict first - this is an expected flow, not a critical error
            if (error.response?.status === 409) {
                console.log('Session conflict detected (409):', error.response?.data?.message);

                const data = error.response.data;
                const resolutionToken = data.resolutionToken;
                const userId = data.user?.userId;

                if (resolutionToken && userId) {
                    showAlert({
                        title: 'Session Conflict',
                        message: data.message || 'You are logged in on another device. Terminate other sessions to continue?',
                        type: 'confirm',
                        confirmText: 'Terminate & Login',
                        cancelText: 'Cancel',
                        onConfirm: () => handleTerminateSessions(userId, resolutionToken)
                    });
                } else {
                    showAlert({
                        title: 'Login Error',
                        message: 'Session conflict detected but could not resolve automatically.',
                        type: 'error'
                    });
                }
            } else {
                const message = error.response?.data?.message || 'Something went wrong. Please try again.';
                showAlert({ title: 'Login Failed', message: message, type: 'error' });
            }
        }
        // implicit finally: do nothing. If success, we redirected. If error, we cleared loading.
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LoadingOverlay visible={loading} message="Signing in..." />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title} numberOfLines={0}>AfyaClass Hub</Text>
                    <Text style={styles.subtitle} numberOfLines={0}>Welcome Back!</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Email or Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor="#7f8c8d"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor="#7f8c8d"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && { opacity: 0.7 }]}
                        onPress={() => handleLogin()}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => router.push('/forgot-password')}
                    >
                        <Text style={styles.linkText}>Forgot Password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => router.push('/register')}
                    >
                        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        width: '100%',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
        textAlign: 'center',
        width: '100%',
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        width: '100%',
        minWidth: 200,
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f6fa',
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dcdde1',
        marginBottom: 20,
        fontSize: 16,
        color: '#2c3e50',
    },
    button: {
        backgroundColor: '#3498db',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkButton: {
        marginTop: 15,
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    linkText: {
        color: '#3498db',
        fontSize: 15,
        textAlign: 'center',
    }
});

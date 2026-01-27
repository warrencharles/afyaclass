import { User } from '@/constants/types';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface AuthContextType {
    userToken: string | null;
    user: User | null;
    isLoading: boolean;
    signIn: (token: string, user: User) => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    userToken: null,
    user: null,
    isLoading: true,
    signIn: async () => { },
    updateUser: async () => { },
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Restore token and user info on app load
        const restoreSession = async () => {
            try {
                let token;
                let userInfo;
                if (Platform.OS !== 'web') {
                    token = await SecureStore.getItemAsync('userToken');
                    userInfo = await SecureStore.getItemAsync('userInfo');
                } else {
                    token = localStorage.getItem('userToken');
                    userInfo = localStorage.getItem('userInfo');
                }

                if (token) {
                    setUserToken(token);
                }
                if (userInfo) {
                    setUser(JSON.parse(userInfo));
                }
            } catch (e) {
                console.log('Restoring session failed', e);
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, []);

    const signIn = async (token: string, userData: User) => {
        setUserToken(token);
        setUser(userData);
        if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync('userToken', token);
            await SecureStore.setItemAsync('userInfo', JSON.stringify(userData));
        } else {
            localStorage.setItem('userToken', token);
            localStorage.setItem('userInfo', JSON.stringify(userData));
        }
    };

    const updateUser = async (userData: User) => {
        setUser(userData);
        if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync('userInfo', JSON.stringify(userData));
        } else {
            localStorage.setItem('userInfo', JSON.stringify(userData));
        }
    };

    const signOut = async () => {
        setUserToken(null);
        setUser(null);
        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('userToken');
            await SecureStore.deleteItemAsync('userInfo');
            await SecureStore.deleteItemAsync('deviceId');
        } else {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userInfo');
            localStorage.removeItem('deviceId');
        }
    };

    return (
        <AuthContext.Provider value={{ userToken, user, isLoading, signIn, updateUser, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

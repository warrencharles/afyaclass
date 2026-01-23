import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface AuthContextType {
    userToken: string | null;
    isLoading: boolean;
    signIn: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    userToken: null,
    isLoading: true,
    signIn: async () => { },
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Restore token on app load
        const restoreToken = async () => {
            try {
                let token;
                if (Platform.OS !== 'web') {
                    token = await SecureStore.getItemAsync('userToken');
                } else {
                    token = localStorage.getItem('userToken');
                }

                if (token) {
                    setUserToken(token);
                }
            } catch (e) {
                console.log('Restoring token failed', e);
            } finally {
                setIsLoading(false);
            }
        };

        restoreToken();
    }, []);

    const signIn = async (token: string) => {
        setUserToken(token);
        if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync('userToken', token);
        } else {
            localStorage.setItem('userToken', token);
        }
    };

    const signOut = async () => {
        setUserToken(null);
        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('userToken');
        } else {
            localStorage.removeItem('userToken');
        }
    };

    return (
        <AuthContext.Provider value={{ userToken, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

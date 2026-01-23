import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
}

export default function LoadingOverlay({ visible, message = 'Loading...' }: LoadingOverlayProps) {
    if (!visible) return null;

    // Simplified to standard View/Text to debug React 19 Internal Error
    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons name="school" size={40} color="#3498db" />
                </View>
                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    card: {
        alignItems: 'center',
        padding: 30,
    },
    iconContainer: {
        marginBottom: 20,
    },
    message: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
    },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CountdownTimerProps {
    // Use either exact timestamp or seconds
    targetDate?: string | null;
    initialSeconds?: number;
    onExpire?: () => void;
    label?: string;
    showIcon?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
    targetDate,
    initialSeconds,
    onExpire,
    label = "Access Ends In:",
    showIcon = true
}) => {
    const calculateSecondsRemaining = () => {
        if (initialSeconds !== undefined) return initialSeconds;
        if (targetDate) {
            const end = new Date(targetDate).getTime();
            const now = new Date().getTime();
            return Math.max(0, Math.floor((end - now) / 1000));
        }
        return 0;
    };

    const [timeLeft, setTimeLeft] = useState(calculateSecondsRemaining());

    useEffect(() => {
        // Recalculate immediately in case prop changed
        setTimeLeft(calculateSecondsRemaining());

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const newValue = prev - 1;
                if (newValue <= 0) {
                    clearInterval(interval);
                    if (onExpire) onExpire();
                    return 0;
                }
                return newValue;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate, initialSeconds]);

    if (timeLeft <= 0) return null;

    const days = Math.floor(timeLeft / (24 * 3600));
    const hours = Math.floor((timeLeft % (24 * 3600)) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {showIcon && <Ionicons name="time-outline" size={16} color="#d32f2f" style={styles.icon} />}
                <Text style={styles.label}>{label}</Text>
                <View style={styles.timeContainer}>
                    {days > 0 && <Text style={styles.timeText}>{days}d </Text>}
                    <Text style={styles.timeText}>
                        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffebee',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    icon: {
        marginRight: 2,
    },
    label: {
        fontSize: 12,
        color: '#c62828',
        fontWeight: '600',
    },
    timeContainer: {
        flexDirection: 'row',
    },
    timeText: {
        fontSize: 13,
        color: '#b71c1c',
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'], // Helps with monospaced numbers if font supports it
    },
});

export default CountdownTimer;

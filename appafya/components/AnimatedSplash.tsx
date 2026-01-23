import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashProps {
    onAnimationComplete?: () => void;
}

export default function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
    // Animation Values
    const iconScale = useRef(new Animated.Value(0.3)).current;
    const iconOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    // Background circles
    const circle1Scale = useRef(new Animated.Value(0)).current;
    const circle2Scale = useRef(new Animated.Value(0)).current;

    // State to track if animation should be running
    const [animationDone, setAnimationDone] = useState(false);

    useEffect(() => {
        // Sequence of animations
        Animated.sequence([
            // 1. Background circles expand
            Animated.parallel([
                Animated.timing(circle1Scale, {
                    toValue: 2,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(circle2Scale, {
                    toValue: 2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Icon bounces in
            Animated.parallel([
                Animated.spring(iconScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 15,
                    useNativeDriver: true,
                }),
                Animated.timing(iconOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
            // 3. Text slides up and fades in
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            // 4. Brief pause
            Animated.delay(800),
        ]).start(() => {
            setAnimationDone(true);
            if (onAnimationComplete) {
                onAnimationComplete();
            }
        });
    }, []);

    return (
        <View style={styles.container}>
            {/* Decorative Circles */}
            <Animated.View style={[styles.circle, styles.circle1, { transform: [{ scale: circle1Scale }] }]} />
            <Animated.View style={[styles.circle, styles.circle2, { transform: [{ scale: circle2Scale }] }]} />

            {/* Main Content */}
            <View style={styles.centerContent}>
                <Animated.View style={{ transform: [{ scale: iconScale }], opacity: iconOpacity }}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="school" size={60} color="#fff" />
                    </View>
                </Animated.View>

                <Animated.View style={{ opacity: textOpacity, transform: [{ translateY }] }}>
                    <Text style={styles.appName}>AfyaClass</Text>
                    <Text style={styles.tagline}>Learn. Grow. Succeed.</Text>
                </Animated.View>
            </View>

            {/* Bottom Loading Indicator */}
            <View style={styles.bottomContainer}>
                {!animationDone && <Text style={styles.loadingText}>Starting up...</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // White background to prevent black screen
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    centerContent: {
        alignItems: 'center',
        zIndex: 10,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#3498db',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5,
    },
    tagline: {
        fontSize: 16,
        color: '#7f8c8d',
        letterSpacing: 1,
    },
    // Decorative backgrounds
    circle: {
        position: 'absolute',
        borderRadius: 1000,
    },
    circle1: {
        width: width * 0.8,
        height: width * 0.8,
        backgroundColor: '#e3f2fd',
        top: -height * 0.1,
        right: -width * 0.2,
    },
    circle2: {
        width: width * 0.6,
        height: width * 0.6,
        backgroundColor: '#f0f9ff',
        bottom: -height * 0.1,
        left: -width * 0.1,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 50,
    },
    loadingText: {
        color: '#bdc3c7',
        fontSize: 12,
    }
});

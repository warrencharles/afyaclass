import { Subject } from '@/constants/types';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SubjectCardProps {
    subject: Subject;
    onPress: (subject: Subject) => void;
    index: number;
    isLocked?: boolean;
    status?: 'pending' | 'locked' | 'unlocked';
}

export default function SubjectCard({ subject, onPress, index, isLocked, status }: SubjectCardProps) {
    // Generate a random-ish pastel color based on index or ID
    const colors = ['#e1f5fe', '#e0f2f1', '#fce4ec', '#fff8e1', '#f3e5f5'];
    const accentColors = ['#0288d1', '#00796b', '#c2185b', '#ffa000', '#7b1fa2'];
    const bgColor = status === 'pending' ? '#fff9c4' : (isLocked ? '#f5f5f5' : colors[index % colors.length]);
    const accentColor = status === 'pending' ? '#fbc02d' : (isLocked ? '#9e9e9e' : accentColors[index % accentColors.length]);

    const safeName = subject.name || 'Unknown Subject';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: bgColor, borderLeftColor: accentColor },
                (isLocked && status !== 'pending') && { opacity: 0.8 },
                status === 'pending' && { borderLeftColor: '#fbc02d', elevation: 4 }
            ]}
            onPress={() => onPress(subject)}
            activeOpacity={(isLocked && status !== 'pending') ? 1 : 0.7}
        >
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={[styles.code, { color: accentColor }]}>
                        {safeName.split(':')[0]}
                    </Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Sem {subject.semester}</Text>
                    </View>
                </View>

                <Text style={styles.title} numberOfLines={2}>
                    {safeName.split(':')[1] || safeName}
                </Text>

                <View style={styles.footer}>
                    <View style={styles.dummyRow}>
                        <Ionicons
                            name={status === 'pending' ? "time-outline" : (isLocked ? "lock-closed" : "book-outline")}
                            size={14}
                            color={status === 'pending' ? "#f57f17" : (isLocked ? "#d32f2f" : "#666")}
                        />
                        <Text
                            style={[
                                styles.footerText,
                                (isLocked && status !== 'pending') && { color: '#d32f2f', fontWeight: 'bold' },
                                status === 'pending' && { color: '#f57f17' }
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {status === 'pending' ? "Pending Review" : (isLocked ? "Access Restricted" : "Notes & Videos")}
                        </Text>
                    </View>
                    <Ionicons
                        name={status === 'pending' ? "hourglass-outline" : (isLocked ? "lock-closed-outline" : "chevron-forward")}
                        size={18}
                        color={accentColor}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        // Add shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 4,
    },
    content: {
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    code: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#555',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    dummyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 12,
        color: '#666',
        maxWidth: 200, // Reasonable max width to trigger scaling if needed
    }
});

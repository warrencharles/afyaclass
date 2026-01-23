import api from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* 
 * Detail View for a Discussion
 * Fetches thread details and replies.
 */

interface Discussion {
    id: number;
    title: string;
    content: string;
    createdByUsername: string;
    createdAt: string;
    viewCount?: number;
}

interface Reply {
    id: number;
    content: string;
    username: string;
    createdAt: string;
}

export default function DiscussionDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [discussion, setDiscussion] = useState<Discussion | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        try {
            // Fetch main discussion
            // Assuming endpoint like /api/discussions/{id}
            // If that fails, we might need to rely on the list data passed via params, 
            // but fetching fresh is better.
            const res = await api.get(`/api/discussions/${id}`);
            setDiscussion(res.data.discussion || res.data); // Adjust based on actual API
            setReplies(res.data.replies || []); // Adjust based on actual API
        } catch (error) {
            console.error('Error fetching discussion detail', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setSending(true);
        try {
            await api.post(`/api/discussions/${id}/replies`, { content: replyText });
            setReplyText('');
            fetchDetail(); // Refresh to see new reply
        } catch (error) {
            console.error('Error sending reply', error);
            alert('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 50 }} />
            </SafeAreaView>
        );
    }

    if (!discussion) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 10 }}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.errorText}>Discussion not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2c3e50" />
                </TouchableOpacity>
                <Text style={styles.navTitle} numberOfLines={1}>Discussion</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={replies}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListHeaderComponent={
                    <View style={styles.mainContent}>
                        <Text style={styles.title}>{discussion.title}</Text>
                        <View style={styles.metaRow}>
                            <Ionicons name="person-circle-outline" size={20} color="#7f8c8d" />
                            <Text style={styles.metaText}>{discussion.createdByUsername} • {new Date(discussion.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.body}>{discussion.content}</Text>
                        <View style={styles.divider} />
                        <Text style={styles.repliesHeader}>Replies ({replies.length})</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.replyCard}>
                        <View style={styles.replyHeader}>
                            <Text style={styles.replyUser}>{item.username}</Text>
                            <Text style={styles.replyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <Text style={styles.replyBody}>{item.content}</Text>
                    </View>
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No replies yet. Be the first to reply!</Text>
                }
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={10}>
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Write a reply..."
                        placeholderTextColor="#95a5a6"
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                    />
                    <TouchableOpacity onPress={handleSendReply} disabled={sending} style={[styles.sendBtn, sending && { opacity: 0.5 }]}>
                        {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="#fff" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backBtn: { padding: 4 },
    navTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },

    mainContent: { marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    metaText: { fontSize: 13, color: '#7f8c8d', marginLeft: 6 },
    body: { fontSize: 16, color: '#34495e', lineHeight: 24, marginBottom: 20 },
    divider: { height: 1, backgroundColor: '#eee', marginBottom: 16 },
    repliesHeader: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 10 },

    replyCard: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    replyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    replyUser: { fontSize: 14, fontWeight: '600', color: '#2c3e50' },
    replyDate: { fontSize: 12, color: '#95a5a6' },
    replyBody: { fontSize: 14, color: '#555', lineHeight: 20 },

    emptyText: { textAlign: 'center', color: '#95a5a6', marginTop: 20 },
    errorText: { textAlign: 'center', fontSize: 18, color: '#e74c3c', marginTop: 50 },

    inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
    input: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: '#2c3e50' },
    sendBtn: { marginLeft: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center' },
});

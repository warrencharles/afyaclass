import AppModal from '@/components/AppModal';
import api from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Discussion {
    id: number;
    title: string;
    content: string;
    createdByUsername: string;
    viewCount: number;
    replyCount: number;
    createdAt: string;
    category?: string;
}

export default function ForumScreen() {
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [filteredDiscussions, setFilteredDiscussions] = useState<Discussion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchDiscussions();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredDiscussions(discussions);
        } else {
            const lower = searchQuery.toLowerCase();
            setFilteredDiscussions(discussions.filter(d =>
                d.title.toLowerCase().includes(lower) ||
                d.content.toLowerCase().includes(lower)
            ));
        }
    }, [searchQuery, discussions]);

    const fetchDiscussions = async () => {
        try {
            const response = await api.get('/api/discussions');
            const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setDiscussions(data);
            setFilteredDiscussions(data);
        } catch (error) {
            console.error('Error fetching discussions', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDiscussions();
    };

    const renderItem = ({ item }: { item: Discussion }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/discussion/${item.id}`)}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.createdByUsername?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
                <View>
                    <Text style={styles.username}>{item.createdByUsername || 'Unknown User'}</Text>
                    <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                {item.category && <View style={styles.tag}><Text style={styles.tagText}>{item.category}</Text></View>}
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.preview} numberOfLines={2}>{item.content}</Text>

            <View style={styles.footer}>
                <View style={styles.stat}>
                    <Ionicons name="eye-outline" size={16} color="#95a5a6" />
                    <Text style={styles.statText}>{item.viewCount || 0}</Text>
                </View>
                <View style={styles.stat}>
                    <Ionicons name="chatbox-outline" size={16} color="#95a5a6" />
                    <Text style={styles.statText}>{item.replyCount || 0}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const [modalVisible, setModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreateDiscussion = async () => {
        if (!newTitle.trim() || !newContent.trim()) {
            alert('Please enter both title and content');
            return;
        }

        setCreating(true);
        try {
            await api.post('/api/discussions', {
                title: newTitle,
                content: newContent,
                category_id: 1, // Default to General for now, or add selector
            });
            setModalVisible(false);
            setNewTitle('');
            setNewContent('');
            fetchDiscussions(); // Refresh list
        } catch (error) {
            console.error('Error creating discussion', error);
            alert('Failed to create discussion');
        } finally {
            setCreating(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
                <Text style={styles.headerTitle}>Community Forum</Text>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#bdc3c7" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search topics..."
                        placeholderTextColor="#bdc3c7"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3498db" />
                </View>
            ) : (
                <FlatList
                    data={filteredDiscussions}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No discussions found.</Text>
                        </View>
                    }
                />
            )}

            {/* Create Discussion Modal */}
            <AppModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                title="New Discussion"
            >
                <View>
                    <Text style={styles.label}>Topic Title</Text>
                    <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. Help with Anatomy"
                        value={newTitle}
                        onChangeText={setNewTitle}
                    />

                    <Text style={styles.label}>Content</Text>
                    <TextInput
                        style={[styles.modalInput, styles.textArea]}
                        placeholder="Describe your question or topic..."
                        value={newContent}
                        onChangeText={setNewContent}
                        multiline
                        numberOfLines={4}
                    />

                    <TouchableOpacity
                        style={[styles.createBtn, creating && { opacity: 0.7 }]}
                        onPress={handleCreateDiscussion}
                        disabled={creating}
                    >
                        {creating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.createBtnText}>Post Discussion</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </AppModal>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f6fa' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    topBar: { padding: 16, backgroundColor: '#fff', paddingBottom: 10 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginBottom: 12 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f2f5',
        borderRadius: 10, paddingHorizontal: 12, height: 44
    },
    input: { flex: 1, fontSize: 16, color: '#2c3e50' },
    list: { padding: 16, paddingBottom: 150 },
    card: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0f7fa', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarText: { color: '#006064', fontWeight: 'bold' },
    username: { fontSize: 14, fontWeight: '600', color: '#2c3e50' },
    date: { fontSize: 12, color: '#bdc3c7' },
    tag: { marginLeft: 'auto', backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    tagText: { fontSize: 10, color: '#2e7d32', fontWeight: 'bold' },
    title: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 6 },
    preview: { fontSize: 14, color: '#7f8c8d', marginBottom: 12, lineHeight: 20 },
    footer: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#f5f6fa', paddingTop: 10 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12, color: '#95a5a6' },
    emptyText: { color: '#95a5a6', fontSize: 16 },
    fab: {
        position: 'absolute', bottom: 130, right: 20, width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 8
    },
    label: { fontSize: 14, fontWeight: '600', color: '#34495e', marginBottom: 6 },
    modalInput: { backgroundColor: '#f5f6fa', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, color: '#2c3e50' },
    textArea: { height: 100, textAlignVertical: 'top' },
    createBtn: { backgroundColor: '#3498db', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
    createBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

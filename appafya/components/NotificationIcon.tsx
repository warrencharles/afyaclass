import { useAlert } from '@/context/AlertContext';
import { useNotifications } from '@/context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NotificationIcon = () => {
    const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } = useNotifications();
    const [modalVisible, setModalVisible] = useState(false);
    const { showAlert } = useAlert();

    const handleMarkRead = async (id: number) => {
        await markNotificationAsRead(id);
    };

    const handleClearAll = () => {
        showAlert({
            title: 'Clear All',
            message: 'Are you sure you want to clear all notifications?',
            type: 'confirm',
            onConfirm: async () => {
                await clearAllNotifications();
            }
        });
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.item, !item.isRead && styles.unreadItem]}
            onPress={() => handleMarkRead(item.id)}
        >
            <View style={styles.itemHeader}>
                <Ionicons name={item.isRead ? "notifications-outline" : "notifications"} size={20} color={item.isRead ? "#999" : "#3498db"} />
                <Text style={styles.time}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</Text>
            </View>
            <Text style={[styles.message, !item.isRead && styles.unreadMessage]}>{item.message}</Text>
        </TouchableOpacity>
    );

    return (
        <>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconButton}>
                <Ionicons name="notifications-outline" size={24} color="#333" />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Notifications</Text>
                            <View style={styles.headerButtons}>
                                {unreadCount > 0 && (
                                    <TouchableOpacity onPress={() => markAllNotificationsAsRead()}>
                                        <Text style={styles.actionText}>Mark all read</Text>
                                    </TouchableOpacity>
                                )}
                                {notifications.length > 0 && (
                                    <TouchableOpacity onPress={handleClearAll} style={{ marginLeft: 15 }}>
                                        <Text style={[styles.actionText, { color: '#e74c3c' }]}>Clear all</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginLeft: 15 }}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {notifications.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                                <Text style={styles.emptyText}>No notifications</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={notifications}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={styles.listContent}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    iconButton: {
        padding: 5,
        position: 'relative',
        marginRight: 15,
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#e74c3c',
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
        paddingTop: 60, // Top margin to simulate dropdown below header
        alignItems: 'flex-end', // Align to right side
        paddingRight: 10,
    },
    modalContainer: {
        width: '90%',
        maxWidth: 350,
        maxHeight: 500,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 12,
        color: '#3498db',
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 20,
    },
    item: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    unreadItem: {
        backgroundColor: '#f0f9ff',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    time: {
        fontSize: 12,
        color: '#95a5a6',
    },
    message: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    unreadMessage: {
        color: '#2c3e50',
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 10,
        color: '#bdc3c7',
        fontSize: 16,
    }
});

export default NotificationIcon;

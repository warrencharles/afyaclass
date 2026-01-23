import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

interface AppModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function AppModal({ visible, onClose, title, children }: AppModalProps) {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={() => { /* Prevent closing on content click */ }}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.containerWrapper}
                        >
                            <View style={styles.container}>
                                <View style={styles.header}>
                                    <Text style={styles.title}>{title}</Text>
                                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                        <Ionicons name="close" size={24} color="#bdc3c7" />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView
                                    style={[styles.content, { maxHeight: Dimensions.get('window').height * 0.7 }]}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                >
                                    {children}
                                </ScrollView>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', // Center vertically
        alignItems: 'center', // Center horizontally
        padding: 20, // Padding around the modal card
    },
    containerWrapper: {
        width: '95%', // Use percentage for better small screen support
        maxWidth: 400, // Reasonable max width for tablets/web
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 24, // Round all corners for a card look
        padding: 24,
        paddingBottom: 24, // Consistent padding
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        maxHeight: '85%', // Limit height
        minHeight: 250,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f6fa',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    closeBtn: {
        padding: 5,
    },
    content: {
        // Content styles
    }
});

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import YoutubePlayer from "react-native-youtube-iframe";

export default function ViewerScreen() {
    const { url, title, type } = useLocalSearchParams();
    const navigation = useNavigation();
    const router = useRouter();

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, []);

    const CustomHeader = () => (
        <View style={styles.header}>
            <Ionicons
                name="close"
                size={24}
                color="#000"
                onPress={() => router.back()}
            />
            <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Viewer'}</Text>
            {/* Spacer for alignment */}
            <View style={{ width: 24 }} />
        </View>
    );

    if (!url) return null;

    // Extract Youtube ID if possible
    const getYoutubeId = (url: string) => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length == 11) ? match[7] : false;
    };

    if (type === 'video') {
        const videoId = getYoutubeId(String(url));
        if (videoId) {
            // Detailed Youtube Player
            const { height, width } = Dimensions.get('window');
            return (
                <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
                    <CustomHeader />
                    <View style={styles.playerWrapper}>
                        <YoutubePlayer
                            height={240}
                            width={width}
                            play={true}
                            videoId={videoId as string}
                            onChangeState={onStateChange}
                            initialPlayerParams={{
                                controls: true,
                                showClosedCaptions: true
                            }}
                        />
                    </View>
                    <View style={styles.videoInfo}>
                        <Text style={styles.videoDesc}>Playing content from server.</Text>
                    </View>
                </SafeAreaView>
            );
        }
    }

    // Fallback or PDF logic
    let uri = decodeURIComponent(url as string);
    // console.log('[Viewer] Raw URI:', uri);

    if (Platform.OS === 'android' && (type === 'note' || type === 'book' || uri.toLocaleLowerCase().endsWith('.pdf'))) {
        // Cache busting: append a timestamp to the original PDF URL to force GView to re-fetch
        // This is the "intelligent" fix for the intermittent blank page issue.
        const connector = uri.includes('?') ? '&' : '?';
        const uniqueUri = `${uri}${connector}v=${Date.now()}`;
        const encodedUri = encodeURIComponent(uniqueUri);
        uri = `https://docs.google.com/gview?embedded=true&url=${encodedUri}`;
    }

    // Inject JS to zoom content (approx 125% - 135%)
    // Google Docs Viewer might need specific targeting, but body zoom is a good general attempt.
    // Inject JS to zoom content and hide Google's 'Open in Browser' button
    const zoomScript = `
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes'); 
        document.getElementsByTagName('head')[0].appendChild(meta);
        
        // Hide Google Docs Viewer 'pop-out' button
        const style = document.createElement('style');
        style.innerHTML = '.ndfHFb-c4YZDc-Wrql6b { display: none !important; }';
        document.head.appendChild(style);

        // Content Protection: Disable Select, Copy, Context Menu
        const protectStyle = document.createElement('style');
        protectStyle.innerHTML = \`
            * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
            }
        \`;
        document.head.appendChild(protectStyle);

        document.documentElement.style.webkitUserSelect='none';
        document.addEventListener('contextmenu', event => event.preventDefault());
        document.addEventListener('dragstart', event => event.preventDefault());
    `;

    const [isReady, setIsReady] = React.useState(false);
    const [key, setKey] = React.useState(0);

    useEffect(() => {
        // Keep screen on during viewing if possible (optional but good)
        setIsReady(true);
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <CustomHeader />
            {isReady ? (
                <WebView
                    key={key}
                    source={{ uri }}
                    style={styles.webview}
                    startInLoadingState
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scalesPageToFit={true}
                    injectedJavaScript={zoomScript}
                    // Android Specific optimizations
                    androidHardwareAccelerationDisabled={false}
                    mixedContentMode="always"
                    renderLoading={() => (
                        <View style={styles.loading}>
                            <Ionicons name="book" size={48} color="#3498db" style={{ marginBottom: 16 }} />
                            <ActivityIndicator size="large" color="#3498db" />
                            <Text style={{ marginTop: 16, color: '#7f8c8d', fontSize: 14, fontWeight: '600' }}>Opening Material...</Text>
                        </View>
                    )}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.log('[Viewer] WebView error handled silently:', nativeEvent.description);
                    }}
                />
            ) : (
                <View style={styles.loading}>
                    <Ionicons name="book" size={48} color="#3498db" style={{ marginBottom: 16 }} />
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={{ marginTop: 16, color: '#7f8c8d', fontSize: 14, fontWeight: '600' }}>Preparing Reader...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const onStateChange = (state: string) => {
    if (state === "ended") {
        // Optional: handle video end
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa', // Changed from black to match app theme if we have a white header
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
        textAlign: 'center',
    },
    webview: {
        flex: 1,
    },
    loading: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white'
    },
    videoHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
    videoTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    playerWrapper: { marginTop: 0 },
    videoInfo: { padding: 16 },
    videoDesc: { color: '#7f8c8d', fontSize: 12 }
});

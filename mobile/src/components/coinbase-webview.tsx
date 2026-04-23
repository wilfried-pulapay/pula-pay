import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme';
import type { Theme } from '@/src/theme/types';
import { useStyles } from '@/src/hooks/use-styles';

type CoinbaseWebViewProps = {
    paymentUrl: string;
    visible: boolean;
    /** URL that Coinbase redirects to on offramp completion (e.g. "{apiUrl}/onramp-complete"). */
    redirectUrl?: string;
    onClose: () => void;
    onSuccess?: () => void;
};

export default function CoinbaseWebView({ paymentUrl, visible, redirectUrl, onClose, onSuccess }: CoinbaseWebViewProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useStyles(getStyles);
    const [loading, setLoading] = useState(true);

    const handleNavigationChange = (navState: WebViewNavigation) => {
        const { url } = navState;
        // For offramp: Coinbase redirects to our redirectUrl when the sell is complete.
        if (redirectUrl && url.startsWith(redirectUrl)) {
            onSuccess?.();
            return;
        }
        // Fallback: detect the /onramp-complete path in case redirectUrl wasn't passed.
        if (url.includes('/onramp-complete')) {
            onSuccess?.();
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('deposit.completingPayment')}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>{t('deposit.openPayment')}</Text>
                    </View>
                )}

                <WebView
                    source={{ uri: paymentUrl }}
                    style={styles.webview}
                    onLoadEnd={() => setLoading(false)}
                    onNavigationStateChange={handleNavigationChange}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState
                    scalesPageToFit
                />
            </View>
        </Modal>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outline,
        backgroundColor: theme.colors.surface,
    },
    headerTitle: {
        ...theme.typography.body,
        color: theme.colors.text,
        fontWeight: '600',
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
    webview: {
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        zIndex: 1,
    },
    loadingText: {
        ...theme.typography.body,
        color: theme.colors.textMuted,
        marginTop: theme.spacing.m,
    },
});

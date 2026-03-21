import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, CheckCircle, ExternalLink } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import type { Theme } from '@/src/theme/types';

type WalletAddressProps = {
    address: string | null;
    blockchain: string | null;
    truncate?: boolean;
    loading?: boolean;
    onCopy?: () => void;
    copied?: boolean;
};

const EXPLORER_URLS: Record<string, string> = {
    POLYGON_AMOY: 'https://amoy.polygonscan.com/address/',
    POLYGON: 'https://polygonscan.com/address/',
    ARBITRUM: 'https://arbiscan.io/address/',
};

const BLOCKCHAIN_NAMES: Record<string, string> = {
    POLYGON_AMOY: 'Polygon Amoy (Testnet)',
    POLYGON: 'Polygon',
    ARBITRUM: 'Arbitrum',
};

export default function WalletAddress({
    address,
    blockchain,
    truncate = true,
    loading = false,
    onCopy,
    copied = false,
}: WalletAddressProps) {
    const { t } = useTranslation();
    const styles = useStyles(getStyles);
    const theme = useTheme();

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    if (!address) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>—</Text>
            </View>
        );
    }

    const displayAddress = truncate
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : address;

    const blockchainName = blockchain ? BLOCKCHAIN_NAMES[blockchain] ?? blockchain : '';
    const explorerUrl = blockchain ? EXPLORER_URLS[blockchain] : null;

    const openExplorer = () => {
        if (explorerUrl && address) {
            Linking.openURL(`${explorerUrl}${address}`);
        }
    };

    return (
        <View style={styles.container}>
            {blockchain && (
                <Text style={styles.blockchainLabel}>
                    {t('wallet.blockchain')}: {blockchainName}
                </Text>
            )}
            <View style={styles.addressRow}>
                <Text style={styles.addressText}>{displayAddress}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={onCopy}
                        accessibilityLabel={t('wallet.copyAddress')}
                    >
                        {copied ? (
                            <CheckCircle size={20} color={theme.colors.success} />
                        ) : (
                            <Copy size={20} color={theme.colors.primary} />
                        )}
                    </TouchableOpacity>
                    {explorerUrl && (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={openExplorer}
                            accessibilityLabel="Open in explorer"
                        >
                            <ExternalLink size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {copied && (
                <Text style={styles.copiedText}>{t('wallet.addressCopied')}</Text>
            )}
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    blockchainLabel: {
        fontSize: 11,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.xs,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    addressText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 0.5,
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    iconButton: {
        padding: theme.spacing.xs,
    },
    copiedText: {
        fontSize: 11,
        color: theme.colors.success,
        marginTop: theme.spacing.xs,
    },
    errorText: {
        fontSize: 14,
        color: theme.colors.textMuted,
    },
});

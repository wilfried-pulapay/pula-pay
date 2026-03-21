import { View, Text, StyleSheet, Share, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { Share2 } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import type { Theme } from '@/src/theme/types';

type ReceiveQRCodeProps = {
    address: string | null;
    blockchain?: string | null;
    amount?: string;
    loading?: boolean;
    size?: number;
};

const BLOCKCHAIN_NAMES: Record<string, string> = {
    POLYGON_AMOY: 'Polygon Amoy (Testnet)',
    POLYGON: 'Polygon',
    ARBITRUM: 'Arbitrum',
};

export default function ReceiveQRCode({
    address,
    blockchain,
    amount,
    loading = false,
    size = 200,
}: ReceiveQRCodeProps) {
    const { t } = useTranslation();
    const styles = useStyles(getStyles);
    const theme = useTheme();

    const handleShare = async () => {
        if (!address) return;

        const message = amount
            ? t('receive.shareMessageWithAmount', { address, amount })
            : t('receive.shareMessage', { address });

        await Share.share({
            message: `${message}\n\n${address}`,
            title: t('receive.shareTitle'),
        });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    if (!address) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{t('receive.noAddress')}</Text>
            </View>
        );
    }

    const networkName = blockchain ? BLOCKCHAIN_NAMES[blockchain] ?? blockchain : '';
    const isTestnet = blockchain?.includes('AMOY') || blockchain?.includes('TESTNET');

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('receive.scanQr')}</Text>

            <View style={styles.qrContainer}>
                <QRCode
                    value={address}
                    size={size}
                    backgroundColor={theme.colors.background}
                    color={theme.colors.text}
                />
            </View>

            {isTestnet && (
                <View style={styles.warningBanner}>
                    <Text style={styles.warningText}>
                        {t('receive.testnetWarning')}
                    </Text>
                </View>
            )}

            <View style={styles.networkInfo}>
                <Text style={styles.networkLabel}>{t('receive.network')}</Text>
                <Text style={styles.networkValue}>{networkName}</Text>
            </View>

            <Text style={styles.warning}>
                {t('receive.warning', { network: networkName })}
            </Text>

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Share2 size={20} color={theme.colors.primary} />
                <Text style={styles.shareText}>{t('receive.share')}</Text>
            </TouchableOpacity>
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    qrContainer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
    },
    warningBanner: {
        backgroundColor: 'rgba(255,107,0,0.10)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: 'rgba(255,107,0,0.25)',
        marginBottom: theme.spacing.m,
    },
    warningText: {
        fontSize: 12,
        color: '#FF6B00',
        textAlign: 'center',
    },
    networkInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    networkLabel: {
        fontSize: 11,
        color: theme.colors.textMuted,
        marginRight: theme.spacing.xs,
    },
    networkValue: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: theme.colors.textMuted,
        backgroundColor: theme.colors.surfaceAlt,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.full,
    },
    warning: {
        fontSize: 11,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: theme.spacing.m,
        paddingHorizontal: theme.spacing.m,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.full,
        marginTop: theme.spacing.m,
    },
    shareText: {
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: theme.spacing.xs,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 14,
        color: theme.colors.danger,
    },
});

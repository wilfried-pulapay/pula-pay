import { View, Text, StyleSheet, Share, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { Share2 } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import { FONTS, SIZES } from '@/src/constants/theme';
import type { Theme } from '@/src/theme/types';

// QR codes require a plain white background for reliable scanning
const QR_CONTAINER_BG = '#FFFFFF';

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
                <Share2 size={SIZES.iconMd} color={theme.colors.primary} />
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
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.h2.fontSize,
        letterSpacing: theme.typography.h2.letterSpacing,
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    qrContainer: {
        padding: theme.spacing.l - 4,
        backgroundColor: QR_CONTAINER_BG,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: theme.spacing.s,
        elevation: 2,
    },
    warningBanner: {
        backgroundColor: theme.colors.primaryLight,
        paddingVertical: theme.spacing.m - 4,
        paddingHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.primaryBorder,
        marginBottom: theme.spacing.m,
    },
    warningText: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.caption.fontSize! + 1,
        color: theme.colors.primary,
        textAlign: 'center',
    },
    networkInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    networkLabel: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.caption.fontSize,
        color: theme.colors.textMuted,
        marginRight: theme.spacing.xs,
    },
    networkValue: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.badgeFontSize,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: theme.colors.textMuted,
        backgroundColor: theme.colors.surfaceAlt,
        paddingVertical: theme.spacing.xs + 1,
        paddingHorizontal: theme.spacing.m - 4,
        borderRadius: theme.borderRadius.full,
    },
    warning: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.caption.fontSize,
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
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.body.fontSize,
        color: theme.colors.text,
        marginLeft: theme.spacing.xs,
    },
    errorText: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.body.fontSize,
        color: theme.colors.danger,
    },
});

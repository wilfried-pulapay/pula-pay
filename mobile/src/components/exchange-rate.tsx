import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import type { Theme } from '@/src/theme/types';
import type { DisplayCurrency, ExchangeRateDTO } from '@/src/api/types';

type ExchangeRateIndicatorProps = {
    rate: ExchangeRateDTO | null;
    currency: DisplayCurrency;
    loading?: boolean;
    onRefresh?: () => void;
    compact?: boolean;
};

function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ExchangeRateIndicator({
    rate,
    currency,
    loading = false,
    onRefresh,
    compact = false,
}: ExchangeRateIndicatorProps) {
    const { t } = useTranslation();
    const styles = useStyles(getStyles);
    const theme = useTheme();

    if (loading) {
        return (
            <View style={[styles.container, compact && styles.containerCompact]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>{t('exchange.refreshing')}</Text>
            </View>
        );
    }

    if (!rate) {
        return (
            <View style={[styles.container, compact && styles.containerCompact]}>
                <Text style={styles.errorText}>—</Text>
            </View>
        );
    }

    const rateValue = parseFloat(rate.rate);
    const formattedRate = currency === 'XOF'
        ? rateValue.toFixed(0)
        : rateValue.toFixed(4);

    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            <View style={styles.rateInfo}>
                <Text style={styles.rateText}>
                    1 USDC = {formattedRate} {currency}
                </Text>
                {!compact && (
                    <Text style={styles.timestampText}>
                        {t('exchange.lastUpdate')}: {formatTimestamp(rate.timestamp)}
                    </Text>
                )}
            </View>
            {onRefresh && (
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={onRefresh}
                    disabled={loading}
                >
                    <RefreshCw size={16} color={theme.colors.primary} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surfaceAlt,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.full,
    },
    containerCompact: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    rateInfo: {
        flex: 1,
    },
    rateText: {
        fontSize: 12,
        fontWeight: '400',
        color: theme.colors.textMuted,
    },
    timestampText: {
        fontSize: 10,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    refreshButton: {
        padding: theme.spacing.xs,
    },
    loadingText: {
        fontSize: 11,
        color: theme.colors.textMuted,
        marginLeft: theme.spacing.xs,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.textMuted,
    },
});

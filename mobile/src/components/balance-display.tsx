import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import type { Theme } from '@/src/theme/types';
import type { DisplayCurrency } from '@/src/api/types';

type BalanceDisplayProps = {
    balanceUsdc: string | null;
    displayBalance: string | null;
    displayCurrency: DisplayCurrency;
    showUsdc?: boolean;
    size?: 'small' | 'medium' | 'large';
    loading?: boolean;
};

const SIZE_CONFIG = {
    small:  { primary: 18, secondary: 11, weight: '600' as const, spacing: 0 },
    medium: { primary: 28, secondary: 12, weight: '700' as const, spacing: -1 },
    large:  { primary: 44, secondary: 13, weight: '800' as const, spacing: -2 },
};

export default function BalanceDisplay({
    balanceUsdc,
    displayBalance,
    displayCurrency,
    showUsdc = false,
    size = 'medium',
    loading = false,
}: BalanceDisplayProps) {
    const { t } = useTranslation();
    const styles = useStyles(getStyles);
    const theme = useTheme();

    const sizeConfig = SIZE_CONFIG[size];

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    const formattedDisplay = displayBalance ?? '—';
    const formattedUsdc = balanceUsdc ? `${parseFloat(balanceUsdc).toFixed(2)} USDC` : '—';

    return (
        <View style={styles.container}>
            <Text style={[styles.primaryBalance, {
                fontSize: sizeConfig.primary,
                fontWeight: sizeConfig.weight,
                letterSpacing: sizeConfig.spacing,
            }]}>
                {formattedDisplay}
            </Text>
            {showUsdc && (
                <Text style={[styles.secondaryBalance, { fontSize: sizeConfig.secondary }]}>
                    {t('wallet.balanceUsdc')}: {formattedUsdc}
                </Text>
            )}
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBalance: {
        color: theme.colors.text,
    },
    secondaryBalance: {
        color: theme.colors.textMuted,
        marginTop: theme.spacing.xs,
    },
});

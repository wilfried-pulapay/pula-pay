import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUpRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useWalletStore } from '../store/walletStore';
import { useTheme } from '../theme';
import { useStyles } from '../hooks/use-styles';
import type { Theme } from '../theme/types';
import { sortByDateDesc } from '../utils/transactions';
import TransactionItem from './transaction-item';

const MAX_RECENT_TRANSACTIONS = 3;

export default function RecentTransactions() {
    const router = useRouter();
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useStyles(getStyles);
    const { transactions, walletNotFound } = useWalletStore();

    const recentTransactions = useMemo(() => {
        return sortByDateDesc(transactions).slice(0, MAX_RECENT_TRANSACTIONS);
    }, [transactions]);

    if (!recentTransactions.length) {
        return (
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{t('transactions.recentTitle')}</Text>
                    <TouchableOpacity onPress={() => router.push('/history')}>
                        <Text style={styles.seeAll}>{t('transactions.seeAll')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyBody}>
                    <View style={styles.emptyIcon}>
                        <ArrowUpRight color={theme.colors.textMuted} size={28} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('transactions.emptyTitle')}</Text>
                    <Text style={styles.emptySubtitle}>{t('transactions.emptySubtitle')}</Text>
                    {!walletNotFound && (
                        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/wallet/deposit')}>
                            <Text style={styles.primaryButtonText}>{t('transactions.firstTransaction')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>{t('transactions.recentTitle')}</Text>
                <TouchableOpacity onPress={() => router.push('/history')}>
                    <Text style={styles.seeAll}>{t('transactions.seeAll')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.list}>
                {recentTransactions.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} showYear={false} />
                ))}
            </View>
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    card: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: theme.colors.textMuted,
    },
    seeAll: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.primary,
    },
    emptyBody: {
        padding: theme.spacing.l,
        alignItems: 'center',
    },
    emptyIcon: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.s,
    },
    emptyTitle: {
        fontSize: 14,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: theme.spacing.xs,
    },
    emptySubtitle: {
        fontSize: 12,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: theme.spacing.s,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
        borderRadius: theme.borderRadius.full,
    },
    primaryButtonText: {
        color: theme.colors.onPrimary,
        fontWeight: '600',
        fontSize: 13,
    },
    list: {},
});

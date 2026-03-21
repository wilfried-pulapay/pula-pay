import { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Search, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useWalletStore } from '../store/walletStore';
import { useTheme } from '../theme';
import { useStyles } from '../hooks/use-styles';
import type { Theme } from '../theme/types';
import type { TxDTO } from '../api/types';
import { filterTransactions, sortByDateDesc } from '../utils/transactions';
import TransactionItem from './transaction-item';

export default function Transactions() {
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useStyles(getStyles);
    const { transactions, loading, error, fetchTransactions } = useWalletStore();
    const [query, setQuery] = useState('');

    const filteredTransactions = useMemo(() => {
        const sorted = sortByDateDesc(transactions);
        return filterTransactions(sorted, query);
    }, [query, transactions]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const renderTransaction = ({ item }: { item: TxDTO }) => (
        <TransactionItem transaction={item} showYear />
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('transactions.title')}</Text>

            <View style={styles.searchContainer}>
                <Search color={theme.colors.textMuted} size={18} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('transactions.searchPlaceholder')}
                    placeholderTextColor={theme.colors.placeholder}
                    value={query}
                    onChangeText={setQuery}
                />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => item.id}
                renderItem={renderTransaction}
                refreshing={loading}
                onRefresh={fetchTransactions}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        {loading ? '' : t('transactions.empty')}
                    </Text>
                }
                contentContainerStyle={filteredTransactions.length === 0 && styles.emptyList}
            />

            <TouchableOpacity
                style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
                onPress={fetchTransactions}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                ) : (
                    <RefreshCw color={theme.colors.onPrimary} size={18} />
                )}
                <Text style={styles.refreshButtonText}>
                    {loading ? t('transactions.refreshing') : t('transactions.refresh')}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.background,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: theme.spacing.s,
        marginBottom: theme.spacing.m,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    searchInput: {
        flex: 1,
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.s,
        color: theme.colors.text,
        fontSize: 14,
    },
    errorText: {
        color: theme.colors.danger,
        marginBottom: theme.spacing.m,
        textAlign: 'center',
        fontSize: 13,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textMuted,
        marginTop: theme.spacing.xl,
        fontSize: 14,
    },
    emptyList: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        marginTop: theme.spacing.m,
        paddingVertical: 14,
        paddingHorizontal: 28,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.full,
    },
    refreshButtonDisabled: {
        opacity: 0.7,
    },
    refreshButtonText: {
        color: theme.colors.onPrimary,
        fontWeight: '600',
        fontSize: 14,
    },
});

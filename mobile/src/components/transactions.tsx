import { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';

import { useWalletStore } from '../store/walletStore';
import { useTheme } from '../theme';
import { useStyles } from '../hooks/use-styles';
import { FONTS, SIZES } from '../constants/theme';
import type { Theme } from '../theme/types';
import type { TxDTO } from '../api/types';
import { filterTransactions, sortByDateDesc, formatAmount } from '../utils/transactions';
import TransactionItem from './transaction-item';

type Filter = 'all' | 'credit' | 'debit';

const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',    label: 'Tout' },
    { key: 'credit', label: 'Reçus' },
    { key: 'debit',  label: 'Envoyés' },
];

export default function Transactions() {
    const { t } = useTranslation();
    const theme = useTheme();
    const s = useStyles(getStyles);
    const { transactions, loading, fetchTransactions, displayCurrency, exchangeRates } = useWalletStore();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const sorted = useMemo(() => sortByDateDesc(transactions), [transactions]);

    const filtered = useMemo(() => {
        let list = filterTransactions(sorted, query);
        if (filter === 'credit') list = list.filter(tx => tx.direction === 'IN');
        if (filter === 'debit')  list = list.filter(tx => tx.direction === 'OUT');
        return list;
    }, [query, filter, sorted]);

    const exchangeRate = exchangeRates?.[displayCurrency]
        ? parseFloat(exchangeRates[displayCurrency].rate)
        : null;

    const sumDisplay = (txs: typeof sorted) =>
        txs.filter(tx => tx.status === 'COMPLETED')
           .reduce((acc, tx) => {
               if (tx.displayCurrency === displayCurrency) {
                   return acc + parseFloat(tx.displayAmount || '0');
               }
               if (exchangeRate !== null) {
                   return acc + parseFloat(tx.amountUsdc || '0') * exchangeRate;
               }
               return acc;
           }, 0);

    const totalIn  = useMemo(() => sumDisplay(sorted.filter(tx => tx.direction === 'IN')),  [sorted, displayCurrency, exchangeRates]);
    const totalOut = useMemo(() => sumDisplay(sorted.filter(tx => tx.direction === 'OUT')), [sorted, displayCurrency, exchangeRates]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const renderTransaction = ({ item }: { item: TxDTO }) => (
        <TransactionItem transaction={item} showYear />
    );

    return (
        <View style={s.container}>
            {/* Dark hero header */}
            <View style={s.header}>
                <View style={s.glowContainer} pointerEvents="none">
                    <Svg width={280} height={200}>
                        <Defs>
                            <RadialGradient id="hG" cx="75%" cy="0%" r="60%">
                                <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity="0.08" />
                                <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0" />
                            </RadialGradient>
                        </Defs>
                        <Ellipse cx={210} cy={0} rx={140} ry={140} fill="url(#hG)" />
                    </Svg>
                </View>

                <View style={s.summaryRow}>
                    <View style={s.summaryCard}>
                        <Text style={s.summaryLabel}>REÇU</Text>
                        <Text style={[s.summaryAmount, s.summaryIn]}>
                            +{formatAmount(totalIn.toString(), displayCurrency)}
                        </Text>
                    </View>
                    <View style={s.summaryCard}>
                        <Text style={s.summaryLabel}>ENVOYÉ</Text>
                        <Text style={s.summaryAmount}>
                            –{formatAmount(totalOut.toString(), displayCurrency)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Search + filters */}
            <View style={s.controls}>
                <View style={s.searchBar}>
                    <View style={s.searchIconWrapper}>
                        <Search size={SIZES.iconSm} color="transparent" />
                    </View>
                    <TextInput
                        style={s.searchInput}
                        placeholder="Rechercher..."
                        value={query}
                        onChangeText={setQuery}
                    />
                    <View style={s.searchIconWrapper} pointerEvents="none">
                        <Search size={SIZES.iconSm} />
                    </View>
                </View>

                <View style={s.filterRow}>
                    {FILTERS.map(f => {
                        const active = filter === f.key;
                        return (
                            <TouchableOpacity
                                key={f.key}
                                style={[s.filterBtn, active && s.filterBtnActive]}
                                onPress={() => setFilter(f.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.filterLabel, active && s.filterLabelActive]}>
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderTransaction}
                refreshing={loading}
                onRefresh={fetchTransactions}
                ListEmptyComponent={
                    <Text style={s.emptyText}>
                        {loading ? '' : t('transactions.empty')}
                    </Text>
                }
                contentContainerStyle={[
                    s.listContent,
                    filtered.length === 0 && s.emptyList,
                ]}
            />

            {loading && transactions.length === 0 && (
                <ActivityIndicator style={s.loader} />
            )}
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        // Hero header
        header: {
            backgroundColor: theme.colors.heroBackground,
            paddingTop: theme.spacing.m,
            paddingBottom: theme.spacing.l,
            paddingHorizontal: theme.spacing.l,
            overflow: 'hidden',
        },
        glowContainer: {
            position: 'absolute',
            top: -40,
            right: -20,
            width: 280,
            height: 200,
        },
        summaryRow: {
            flexDirection: 'row',
            gap: theme.spacing.m - 4,
        },
        summaryCard: {
            flex: 1,
            backgroundColor: theme.colors.overlaySubtle,
            borderWidth: 1,
            borderColor: theme.colors.heroBorder,
            borderRadius: theme.borderRadius.m,
            padding: theme.spacing.m,
        },
        summaryLabel: {
            fontFamily: FONTS.sansBold,
            fontSize: SIZES.badgeFontSize - 1,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: theme.colors.onHeroMuted,
            marginBottom: theme.spacing.s - 2,
        },
        summaryAmount: {
            fontFamily: FONTS.sansBold,
            fontSize: SIZES.summaryFontSize,
            letterSpacing: -0.5,
            color: theme.colors.onHero,
        },
        summaryIn: {
            color: theme.colors.success,
        },
        summaryUnit: {
            fontFamily: FONTS.sans,
            fontSize: theme.typography.caption.fontSize,
            color: theme.colors.onHeroMuted,
        },
        // Controls
        controls: {
            paddingHorizontal: theme.spacing.l,
            paddingTop: theme.spacing.m,
            paddingBottom: theme.spacing.s,
            gap: theme.spacing.m - 4,
        },
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.m,
            paddingVertical: theme.spacing.s + 2,
        },
        searchIconWrapper: {
            marginRight: theme.spacing.s,
        },
        searchInput: {
            flex: 1,
            fontFamily: FONTS.sans,
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text,
        },
        filterRow: {
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.borderRadius.full,
            overflow: 'hidden',
            gap: 1,
        },
        filterBtn: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: theme.spacing.s + 1,
            paddingHorizontal: theme.spacing.m,
            backgroundColor: theme.colors.surfaceAlt,
        },
        filterBtnActive: {
            backgroundColor: theme.colors.text,
        },
        filterLabel: {
            fontFamily: FONTS.sansBold,
            fontSize: theme.typography.caption.fontSize! + 1,
            color: theme.colors.stone,
        },
        filterLabelActive: {
            color: theme.colors.background,
        },
        // List
        listContent: {
            paddingHorizontal: theme.spacing.l,
            paddingBottom: 120,
        },
        emptyText: {
            fontFamily: FONTS.sans,
            textAlign: 'center',
            color: theme.colors.textMuted,
            marginTop: theme.spacing.xxl,
            fontSize: theme.typography.body.fontSize,
        },
        emptyList: {
            flexGrow: 1,
        },
        loader: {
            marginTop: theme.spacing.l,
        },
});

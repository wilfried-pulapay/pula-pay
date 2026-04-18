import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, RotateCcw, RefreshCw, Coins } from 'lucide-react-native';
import type { TxType, TxStatus, TxDTO, TxDirection } from '../api/types';
import type { Theme } from '../theme/types';

// Transaction type to icon mapping
export const TX_TYPE_ICONS: Record<TxType, typeof ArrowUpRight> = {
    DEPOSIT_ONRAMP: ArrowDownRight,
    DEPOSIT_CRYPTO: ArrowDownRight,
    WITHDRAWAL_OFFRAMP: ArrowUpRight,
    WITHDRAWAL_CRYPTO: ArrowUpRight,
    TRANSFER_P2P: ArrowLeftRight,
    REFUND: RotateCcw,
    FEE: Coins,
};

// Check if transaction is a credit (money coming in)
export function isCredit(direction: TxDirection): boolean {
    return direction === 'IN';
}

// Get icon for transaction type
export function getTxIcon(type: TxType) {
    return TX_TYPE_ICONS[type] || ArrowLeftRight;
}

// Get status colors
export function getStatusColors(status: TxStatus, theme: Theme): { bg: string; text: string } {
    switch (status) {
        case 'COMPLETED':
            return { bg: theme.colors.successLight ?? theme.colors.success, text: theme.colors.success };
        case 'FAILED':
            return { bg: theme.colors.dangerLight ?? theme.colors.danger, text: theme.colors.danger };
        case 'CANCELLED':
        case 'EXPIRED':
            return { bg: theme.colors.dangerLight ?? theme.colors.danger, text: theme.colors.danger };
        case 'PENDING':
        case 'PROCESSING':
        default:
            return { bg: theme.colors.warningLight ?? theme.colors.warning, text: theme.colors.warning };
    }
}

// Format amount with currency
export function formatAmount(
    amount: string,
    currency: string,
    locale: string = 'en-GB'
): string {
    if (!currency) {
        return Number(amount || 0).toFixed(2);
    }
    const decimals = currency === 'XOF' ? 0 : 2;
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: decimals,
    }).format(Number(amount || 0));
}

// Format date for transaction list
export function formatTxDate(
    dateStr: string,
    locale: string = 'en-GB',
    includeYear: boolean = false
): string {
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    };
    if (includeYear) {
        options.year = 'numeric';
    }
    return new Date(dateStr).toLocaleString(locale, options);
}

// Sort transactions by date (newest first)
export function sortByDateDesc(transactions: TxDTO[]): TxDTO[] {
    return [...transactions].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// Filter transactions by search query
export function filterTransactions(transactions: TxDTO[], query: string): TxDTO[] {
    if (!query) return transactions;
    const lowerQuery = query.toLowerCase();
    return transactions.filter(
        (tx) =>
            tx.externalRef?.toLowerCase().includes(lowerQuery) ||
            tx.id.toLowerCase().includes(lowerQuery) ||
            tx.description?.toLowerCase().includes(lowerQuery)
    );
}

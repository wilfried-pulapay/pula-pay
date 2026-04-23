import { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ArrowLeft, CreditCard, Building2, Smartphone, Download, Check } from 'lucide-react-native';

import { useAuth } from '@/src/lib/auth';
import { useWalletStore } from '@/src/store/walletStore';
import { useConversion } from '@/src/hooks/use-conversion';
import { getApiError } from '@/src/utils/api-error';
import { toast } from '@/src/store/toastStore';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import Screen from '@/src/components/screen';
import Button from '@/src/components/ui/button';
import ExchangeRateIndicator from '@/src/components/exchange-rate';
import CoinbaseWebView from '@/src/components/coinbase-webview';
import type { Theme } from '@/src/theme/types';
import type { PaymentMethod, TxStatus, DepositResponse } from '@/src/api/types';

type DepositMethod = {
    id: PaymentMethod | 'CRYPTO';
    name: string;
    icon: typeof CreditCard;
    available: boolean;
};

const DEPOSIT_METHODS: DepositMethod[] = [
    { id: 'CARD', name: 'Card', icon: CreditCard, available: true },
    { id: 'ACH_BANK_ACCOUNT', name: 'Bank Transfer', icon: Building2, available: true },
    { id: 'APPLE_PAY', name: 'Apple Pay', icon: Smartphone, available: true },
    { id: 'CRYPTO', name: 'Receive Crypto', icon: Download, available: true },
];

type TxPhase = 'idle' | 'webview' | 'polling' | 'completed' | 'failed';

type SubmittedTx = {
    txId: string;
    amount: string;
    amountUsdc: string;
    method: string;
    fees?: DepositResponse['fees'];
};

const generateIdempotencyKey = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function Deposit() {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const styles = useStyles(getStyles);
    const locale = i18n.language === 'en' ? 'en-GB' : 'fr-FR';

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CARD');
    const [amount, setAmount] = useState('');
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [txPhase, setTxPhase] = useState<TxPhase>('idle');
    const [submittedTx, setSubmittedTx] = useState<SubmittedTx | null>(null);

    const { user } = useAuth();
    const { deposit, loading, error, displayCurrency, syncWalletStatus, trackTransaction } = useWalletStore();
    const { toUsdc, rate, loading: rateLoading, refresh: refreshRate } = useConversion(displayCurrency);

    const formatAmount = (value: string) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: displayCurrency,
            maximumFractionDigits: displayCurrency === 'XOF' ? 0 : 2,
        }).format(Number(value || 0));
    };

    const estimatedUsdc = amount ? toUsdc(amount) : '0';

    const handleMethodSelect = (method: PaymentMethod | 'CRYPTO') => {
        if (method === 'CRYPTO') {
            router.push('/wallet/receive');
            return;
        }
        setSelectedMethod(method);
    };

    const startPolling = (txId: string) => {
        setTxPhase('polling');
        trackTransaction(txId)
            .then((status: TxStatus) => {
                setTxPhase(status === 'COMPLETED' ? 'completed' : 'failed');
            })
            .catch(() => setTxPhase('failed'));
    };

    const handleSubmit = async () => {
        if (!user?.id) {
            toast.error(t('errors.unauthenticated'));
            return;
        }

        try {
            toast.info(t('deposit.checkingWallet'), 3000);
            const { wasUpdated, currentStatus } = await syncWalletStatus();

            if (wasUpdated) {
                toast.success(t('deposit.walletActivated'), 3000);
            }

            if (currentStatus !== 'ACTIVE') {
                toast.error(t('deposit.walletNotActive'), 5000);
                return;
            }

            const idempotencyKey = generateIdempotencyKey();
            const response = await deposit(
                { amount: parseFloat(amount), currency: displayCurrency, paymentMethod: selectedMethod },
                { idempotencyKey }
            );

            const tx: SubmittedTx = {
                txId: response.transactionId,
                amount,
                amountUsdc: response.amountUsdc,
                method: selectedMethod,
                fees: response.fees,
            };
            setSubmittedTx(tx);

            if (response.paymentUrl) {
                setPaymentUrl(response.paymentUrl);
                setTxPhase('webview');
            } else {
                startPolling(response.transactionId);
            }
        } catch (err: unknown) {
            const { code, translationKey, message } = getApiError(err);
            toast.error(message || t(translationKey), 6000);
            if (code === 'WALLET_NOT_FOUND') {
                router.replace('/(main)/dashboard');
            }
        }
    };

    const handleWebViewClose = () => {
        setPaymentUrl(null);
        if (submittedTx) {
            startPolling(submittedTx.txId);
        } else {
            setTxPhase('idle');
        }
    };

    // ── WebView ──────────────────────────────────────────────────────
    if (txPhase === 'webview' && paymentUrl) {
        return (
            <CoinbaseWebView
                paymentUrl={paymentUrl}
                visible
                onClose={handleWebViewClose}
                onSuccess={handleWebViewClose}
            />
        );
    }

    // ── Polling / Processing ─────────────────────────────────────────
    if (txPhase === 'polling') {
        return (
            <Screen>
                <View style={styles.statusContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.statusTitle}>{t('deposit.processing')}</Text>
                    <Text style={styles.statusSubtitle}>{t('deposit.processingSubtitle')}</Text>
                </View>
            </Screen>
        );
    }

    // ── Success ──────────────────────────────────────────────────────
    if (txPhase === 'completed' && submittedTx) {
        return (
            <Screen>
                <ArrowLeft onPress={() => router.replace('/(main)/wallet')} color={theme.colors.text} />
                <View style={styles.container}>
                    <Text style={styles.successTitle}>{t('deposit.success')}</Text>
                    <View style={styles.detailsContainer}>
                        <Text style={styles.label}>{t('deposit.paymentMethod')}:</Text>
                        <Text style={styles.value}>{t(`deposit.${selectedMethod.toLowerCase()}`) || selectedMethod}</Text>
                        <Text style={styles.label}>{t('deposit.amount')}:</Text>
                        <Text style={styles.value}>{formatAmount(submittedTx.amount)}</Text>
                        <Text style={styles.label}>{t('deposit.equivalentUsdc')}:</Text>
                        <Text style={styles.value}>~{parseFloat(submittedTx.amountUsdc).toFixed(2)} USDC</Text>
                        {submittedTx.fees?.coinbaseFee && (
                            <>
                                <Text style={styles.label}>{t('deposit.coinbaseFee')}:</Text>
                                <Text style={styles.value}>{submittedTx.fees.coinbaseFee}</Text>
                            </>
                        )}
                        {submittedTx.fees?.networkFee && (
                            <>
                                <Text style={styles.label}>{t('deposit.networkFee')}:</Text>
                                <Text style={styles.value}>{submittedTx.fees.networkFee}</Text>
                            </>
                        )}
                        {submittedTx.fees?.paymentTotal && (
                            <>
                                <Text style={styles.label}>{t('deposit.paymentTotal')}:</Text>
                                <Text style={[styles.value, { color: theme.colors.primary }]}>{submittedTx.fees.paymentTotal}</Text>
                            </>
                        )}
                        <Text style={styles.label}>{t('deposit.txId')}:</Text>
                        <Text style={styles.value}>{submittedTx.txId}</Text>
                    </View>
                    <Button title={t('deposit.viewTransactions')} onPress={() => router.push('/history')} />
                </View>
            </Screen>
        );
    }

    // ── Failed ───────────────────────────────────────────────────────
    if ((txPhase === 'failed') && submittedTx) {
        return (
            <Screen>
                <ArrowLeft onPress={() => { setTxPhase('idle'); setSubmittedTx(null); }} color={theme.colors.text} />
                <View style={styles.container}>
                    <Text style={[styles.successTitle, { color: theme.colors.danger }]}>{t('deposit.failed')}</Text>
                    <Text style={styles.statusSubtitle}>{t('deposit.failedSubtitle')}</Text>
                    <Button title={t('deposit.tryAgain')} onPress={() => { setTxPhase('idle'); setSubmittedTx(null); }} />
                </View>
            </Screen>
        );
    }

    // ── Form ─────────────────────────────────────────────────────────
    return (
        <Screen>
            <ArrowLeft onPress={() => router.replace('/(main)/wallet')} color={theme.colors.text} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>{t('deposit.title')}</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('deposit.selectMethod')}</Text>
                    <View style={styles.methodGrid}>
                        {DEPOSIT_METHODS.map((method) => {
                            const Icon = method.icon;
                            const isSelected = method.id !== 'CRYPTO' && selectedMethod === method.id;
                            return (
                                <TouchableOpacity
                                    key={method.id}
                                    style={[
                                        styles.methodCard,
                                        isSelected && styles.methodCardSelected,
                                        !method.available && styles.methodCardDisabled,
                                    ]}
                                    onPress={() => method.available && handleMethodSelect(method.id)}
                                    disabled={!method.available}
                                >
                                    <Icon size={24} color={isSelected ? theme.colors.primary : theme.colors.text} />
                                    <Text style={[
                                        styles.methodName,
                                        isSelected && styles.methodNameSelected,
                                        !method.available && styles.methodNameDisabled,
                                    ]}>
                                        {t(`deposit.${method.id.toLowerCase()}`) || method.name}
                                    </Text>
                                    {isSelected && (
                                        <View style={styles.checkMark}>
                                            <Check size={16} color={theme.colors.primary} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {(selectedMethod as string) !== 'CRYPTO' && (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('deposit.amount')} ({displayCurrency})</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('deposit.amountPlaceholder')}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholderTextColor={theme.colors.placeholder}
                            />
                            {amount && (
                                <Text style={styles.usdcEquivalent}>
                                    {t('deposit.equivalentUsdc')}: ~{parseFloat(estimatedUsdc).toFixed(2)} USDC
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <ExchangeRateIndicator
                                rate={rate}
                                currency={displayCurrency}
                                loading={rateLoading}
                                onRefresh={refreshRate}
                            />
                        </View>

                        <Button
                            title={loading ? t('deposit.submitting') : t('deposit.submit')}
                            onPress={handleSubmit}
                            loading={loading}
                            disabled={loading || !amount}
                        />
                    </>
                )}

                {loading && <ActivityIndicator style={styles.loader} color={theme.colors.primary} />}
                {error && <Text style={styles.error}>{error}</Text>}
            </ScrollView>
        </Screen>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: theme.spacing.xl,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    inputGroup: {
        marginBottom: theme.spacing.m,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.s,
        fontSize: 14,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        borderColor: theme.colors.border,
    },
    methodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.s,
    },
    methodCard: {
        flex: 1,
        minWidth: 100,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        position: 'relative',
    },
    methodCardSelected: {
        borderColor: theme.colors.primary,
        borderWidth: 2,
    },
    methodCardDisabled: {
        opacity: 0.5,
    },
    methodName: {
        fontSize: 12,
        color: theme.colors.text,
        marginTop: theme.spacing.xs,
        textAlign: 'center',
    },
    methodNameSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    methodNameDisabled: {
        color: theme.colors.textMuted,
    },
    checkMark: {
        position: 'absolute',
        top: theme.spacing.xs,
        right: theme.spacing.xs,
    },
    usdcEquivalent: {
        fontSize: 11,
        color: theme.colors.textMuted,
        marginTop: theme.spacing.xs,
    },
    loader: {
        marginTop: theme.spacing.m,
    },
    error: {
        fontSize: 11,
        color: theme.colors.danger,
        marginTop: theme.spacing.xs,
    },
    statusContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: theme.spacing.m,
    },
    statusSubtitle: {
        fontSize: 14,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginTop: theme.spacing.s,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    detailsContainer: {
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
    },
    value: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
});

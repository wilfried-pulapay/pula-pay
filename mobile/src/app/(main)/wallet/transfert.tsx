import { useState, useEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import PhoneInput, { ICountry } from '@/src/components/ui/phone-input';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { executeCircleChallenge } from '@/src/lib/circle';
import type { TransferResponse } from '@/src/api/types';

import { useRecipientId } from '@/src/hooks/use-recipient-id';
import { useAuth } from '@/src/lib/auth';
import { useWalletStore } from '@/src/store/walletStore';
import { useConversion } from '@/src/hooks/use-conversion';
import { sanitizePhoneNumber } from '@/src/utils/phone';
import { getApiError } from '@/src/utils/api-error';
import { toast } from '@/src/store/toastStore';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import Screen from '@/src/components/screen';
import Button from '@/src/components/ui/button';
import ExchangeRateIndicator from '@/src/components/exchange-rate';
import type { Theme } from '@/src/theme/types';

export default function Transfer() {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const styles = useStyles(getStyles);
    const locale = i18n.language === 'en' ? 'en-GB' : 'fr-FR';

    const [queryPhone, setQueryPhone] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [countryCode, setCountryCode] = useState<null | ICountry>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [submittedTx, setSubmittedTx] = useState<{
        amount: string;
        amountUsdc: string;
        recipientPhone: string | null;
        txId: string | null;
    } | null>(null);

    const { recipientId, errorKey: recipientErrorKey, getPhoneUserId } = useRecipientId();
    const { user } = useAuth();
    const { transfer, loading, error, displayCurrency, balanceUsdc, syncWalletStatus } = useWalletStore();
    const { toUsdc, toDisplay, rate, loading: rateLoading, refresh: refreshRate } = useConversion(displayCurrency);

    const formatAmount = (value: string) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: displayCurrency,
            maximumFractionDigits: displayCurrency === 'XOF' ? 0 : 2,
        }).format(Number(value || 0));
    };

    const estimatedUsdc = amount ? toUsdc(amount) : '0';
    const availableDisplay = balanceUsdc ? toDisplay(balanceUsdc) : '—';

    // Debounced phone lookup
    useEffect(() => {
        if (!user?.id || !queryPhone) return;
        const handler = setTimeout(() => {
            const formattedPhone = `${countryCode?.idd.root}${sanitizePhoneNumber(queryPhone)}`;
            getPhoneUserId(formattedPhone);
        }, 400);
        return () => clearTimeout(handler);
    }, [user?.id, queryPhone, getPhoneUserId, countryCode]);

    // Set recipient phone when user is found
    useEffect(() => {
        if (recipientId && !recipientPhone && queryPhone) {
            setRecipientPhone(`${countryCode?.idd.root}${sanitizePhoneNumber(queryPhone)}`);
        }
    }, [recipientId, queryPhone, recipientPhone, countryCode]);

    const handleSubmit = async () => {
        if (!recipientPhone || !amount || !recipientId || !user?.id) {
            toast.error(t('transfer.fillAllFields'));
            return;
        }

        // Check if user has enough balance
        if (balanceUsdc && parseFloat(estimatedUsdc) > parseFloat(balanceUsdc)) {
            toast.error(t('transfer.insufficientFunds'));
            return;
        }

        try {
            // Check and sync wallet status before attempting transaction
            toast.info(t('transfer.checkingWallet'), 3000);
            const { wasUpdated, currentStatus } = await syncWalletStatus();

            if (wasUpdated) {
                toast.success(t('transfer.walletActivated'), 3000);
            }

            if (currentStatus !== 'ACTIVE') {
                toast.error(t('transfer.walletNotActive'), 5000);
                return;
            }

            // Initiate transfer — returns challenge for PIN confirmation
            const response = await transfer({
                recipientPhone: recipientPhone,
                amount: parseFloat(amount),
                currency: displayCurrency,
                description: note || undefined,
            });

            // Execute Circle SDK challenge natively (PIN confirmation)
            await executeCircleChallenge(response);

            setSubmittedTx({
                amount,
                amountUsdc: response.amountUsdc,
                recipientPhone,
                txId: response.transactionId,
            });
            toast.success(t('transfer.success'));
        } catch (err: unknown) {
            const { code, translationKey, message } = getApiError(err);
            const errorMessage = message || t(translationKey);
            toast.error(errorMessage, 6000);
            if (code === 'WALLET_NOT_FOUND') {
                router.replace('/(main)/dashboard');
            }
        }
    };

    if (submittedTx) {
        return (
            <Screen>
                <ArrowLeft onPress={() => router.replace('/(main)/wallet')} color={theme.colors.text} />
                <View style={styles.container}>
                    <Text style={styles.successTitle}>{t('transfer.success')}</Text>
                    <View style={styles.detailsContainer}>
                        <Text style={styles.label}>{t('transfer.recipient')}:</Text>
                        <Text style={styles.value}>{submittedTx.recipientPhone}</Text>
                        <Text style={styles.label}>{t('transfer.amount')}:</Text>
                        <Text style={styles.value}>{formatAmount(submittedTx.amount)}</Text>
                        <Text style={styles.label}>{t('transfer.amountUsdc')}:</Text>
                        <Text style={styles.value}>~{parseFloat(submittedTx.amountUsdc).toFixed(2)} USDC</Text>
                        <Text style={styles.label}>{t('transfer.txId')}:</Text>
                        <Text style={styles.value}>{submittedTx.txId}</Text>
                    </View>
                    <Button title={t('transfer.viewTransactions')} onPress={() => router.push('/history')} />
                </View>
            </Screen>
        );
    }

    return (
        <>
        <Screen>
            <ArrowLeft onPress={() => router.replace('/(main)/wallet')} color={theme.colors.text} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>{t('transfer.title')}</Text>

                <View style={styles.balanceInfo}>
                    <Text style={styles.balanceLabel}>{t('transfer.availableBalance')}</Text>
                    <Text style={styles.balanceValue}>{availableDisplay}</Text>
                    {balanceUsdc && (
                        <Text style={styles.balanceUsdc}>({parseFloat(balanceUsdc).toFixed(2)} USDC)</Text>
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('transfer.recipientPhone')}</Text>
                    <PhoneInput
                        value={queryPhone}
                        onChangePhoneNumber={setQueryPhone}
                        onChangeSelectedCountry={setCountryCode}
                    />
                    {recipientId && !recipientErrorKey && (
                        <Text style={styles.successMessage}>{t('transfer.userFound')}: {queryPhone}</Text>
                    )}
                    {recipientErrorKey && queryPhone && (
                        <Text style={styles.error}>{t(recipientErrorKey)}</Text>
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('transfer.amount')} ({displayCurrency})</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('transfer.amountPlaceholder')}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholderTextColor={theme.colors.placeholder}
                    />
                    {amount && (
                        <Text style={styles.usdcEquivalent}>
                            {t('transfer.amountUsdc')}: ~{parseFloat(estimatedUsdc).toFixed(2)} USDC
                        </Text>
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('transfer.note')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('transfer.notePlaceholder')}
                        value={note}
                        onChangeText={setNote}
                        placeholderTextColor={theme.colors.placeholder}
                    />
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
                    title={loading ? t('transfer.submitting') : t('transfer.submit')}
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading || !recipientPhone || !amount}
                />

                {loading && <ActivityIndicator style={styles.loader} color={theme.colors.primary} />}
                {error && <Text style={styles.error}>{error}</Text>}
            </ScrollView>
        </Screen>
        </>
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
    balanceInfo: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    balanceLabel: {
        fontSize: 11,
        color: theme.colors.textMuted,
    },
    balanceValue: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
        color: theme.colors.text,
    },
    balanceUsdc: {
        fontSize: 14,
        color: theme.colors.textMuted,
        marginTop: 4,
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
    successMessage: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.success,
        marginTop: theme.spacing.xs,
        backgroundColor: theme.colors.successLight,
        borderRadius: theme.borderRadius.full,
        paddingVertical: 4,
        paddingHorizontal: 10,
        alignSelf: 'flex-start',
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

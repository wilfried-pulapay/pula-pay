import { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Eye, EyeOff, RotateCw, Plus, ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useWalletStore } from "../store/walletStore";
import { executeCircleChallenge } from "../lib/circle";
import { useStyles } from "../hooks/use-styles";
import type { Theme } from "../theme/types";

export default function WalletSummary() {
    const { t } = useTranslation();
    const router = useRouter();
    const styles = useStyles(getStyles);
    const { balanceUsdc, displayBalance, loading, fetchWallet, fetchBalance, reconcileBalance, walletNotFound, initiateWalletSetup, confirmWalletSetup } = useWalletStore();
    const [showBalance, setShowBalance] = useState(true);
    const [creatingWallet, setCreatingWallet] = useState(false);

    const maskedOrValue = useMemo(() => {
        if (!showBalance) return "••••••";
        if (displayBalance === null) return "--";
        return displayBalance;
    }, [showBalance, displayBalance]);

    const usdcValue = useMemo(() => {
        if (!showBalance) return "••••••";
        if (balanceUsdc === null) return "--";
        return `${parseFloat(balanceUsdc).toFixed(2)} USDC`;
    }, [showBalance, balanceUsdc]);

    const refresh = async () => {
        const calls: Promise<void>[] = [fetchWallet(), fetchBalance()];
        if (process.env.EXPO_PUBLIC_ENABLE_RECONCILE === 'true') {
            calls.push(reconcileBalance());
        }
        await Promise.all(calls);
    };

    useEffect(() => {
        refresh();
    }, []);

    // Handle wallet creation when wallet not found
    const handleCreateWallet = async () => {
        setCreatingWallet(true);
        try {
            const challengeData = await initiateWalletSetup("BASE_SEPOLIA");
            if (challengeData.challengeId) {
                await executeCircleChallenge(challengeData);
                await confirmWalletSetup(challengeData.userToken, "BASE_SEPOLIA");
            } else {
                await fetchWallet();
                await fetchBalance();
            }
        } catch {
            // Setup failed — walletNotFound UI stays visible so user can retry
        } finally {
            setCreatingWallet(false);
        }
    };

    // Show wallet creation prompt if wallet not found
    if (walletNotFound) {
        return (
            <View style={styles.card}>
                <LinearGradient
                    colors={['rgba(255,107,0,0.12)', 'transparent']}
                    start={[1, 0]} end={[0, 1]}
                    style={StyleSheet.absoluteFillObject}
                    pointerEvents="none"
                />
                <View style={styles.cardInner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <AlertCircle color="#FF6B00" size={20} />
                        <Text style={styles.balanceLabel}>{t('wallet.notFound')}</Text>
                    </View>
                    <Text style={[styles.balance, { fontSize: 18 }]}>
                        {t('wallet.createWalletPrompt')}
                    </Text>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.actionPrimary}
                            onPress={handleCreateWallet}
                            disabled={creatingWallet}
                        >
                            {creatingWallet ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.actionPrimaryText}>{t('wallet.createWallet')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            {/* Orange glow at top-right */}
            <LinearGradient
                colors={['rgba(255,107,0,0.12)', 'transparent']}
                start={[1, 0]} end={[0, 1]}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />

            <View style={styles.cardInner}>
                <View style={styles.topRow}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.balanceLabel}>{t('wallet.availableBalance')}</Text>
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" style={{ marginVertical: 8 }} />
                        ) : (
                            <Text style={styles.balance}>{maskedOrValue}</Text>
                        )}
                        <Text style={styles.usdcText}>{usdcValue}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={() => setShowBalance((s) => !s)} style={styles.iconButton}>
                            {showBalance ? <Eye color="rgba(255,255,255,0.6)" size={18} /> : <EyeOff color="rgba(255,255,255,0.6)" size={18} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={refresh} style={styles.iconButton}>
                            <RotateCw color="rgba(255,255,255,0.6)" size={18} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionPrimary} onPress={() => router.push('/wallet/deposit')}>
                        <Plus color="#FFFFFF" size={14} />
                        <Text style={styles.actionPrimaryText}>{t('wallet.deposit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionGhost} onPress={() => router.push('/wallet/transfert')}>
                        <ArrowUpRight color="rgba(255,255,255,0.75)" size={14} />
                        <Text style={styles.actionGhostText}>{t('wallet.send')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionGhost} onPress={() => router.push('/wallet/withdraw')}>
                        <ArrowDownRight color="rgba(255,255,255,0.75)" size={14} />
                        <Text style={styles.actionGhostText}>{t('wallet.withdraw')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginBottom: 24,
        borderRadius: theme.borderRadius.xl,
        backgroundColor: '#0D0D0D',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 40,
        elevation: 8,
    },
    cardInner: {
        padding: 32,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    headerLeft: {
        flex: 1,
    },
    balanceLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.35)',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    balance: {
        fontSize: 44,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -2,
    },
    usdcText: {
        fontSize: 13,
        fontWeight: '400',
        color: 'rgba(255,255,255,0.40)',
        marginTop: 4,
    },
    headerRight: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        marginLeft: theme.spacing.s,
    },
    iconButton: {
        padding: theme.spacing.xs,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionPrimary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#FF6B00',
        borderRadius: theme.borderRadius.m,
        paddingVertical: 14,
    },
    actionPrimaryText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    actionGhost: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: theme.borderRadius.m,
        paddingVertical: 14,
    },
    actionGhostText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
});

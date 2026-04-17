import { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Eye, EyeOff, RotateCw, Plus, ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Svg, { Defs, RadialGradient, Stop, Ellipse, Pattern, Rect, Line } from "react-native-svg";

// Hero grid texture: fixed subtle white lines — always on a dark surface
const HERO_GRID_LINE = 'rgba(255,255,255,0.015)';

import { useWalletStore } from "../store/walletStore";
import { executeCircleChallenge } from "../lib/circle";
import { useTheme } from "../theme";
import { useStyles } from "../hooks/use-styles";
import { FONTS, SIZES } from "../constants/theme";
import type { Theme } from "../theme/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Glow & grid overlays — colours come from the hero palette (always dark)
function GlowOverlay({ primaryColor, successBase }: { primaryColor: string; successBase: string }) {
    return (
        <>
            <View style={styles.glowOrange} pointerEvents="none">
                <Svg width={320} height={320}>
                    <Defs>
                        <RadialGradient id="gO" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.12" />
                            <Stop offset="65%" stopColor={primaryColor} stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Ellipse cx={160} cy={160} rx={160} ry={160} fill="url(#gO)" />
                </Svg>
            </View>
            <View style={styles.glowGreen} pointerEvents="none">
                <Svg width={260} height={200}>
                    <Defs>
                        <RadialGradient id="gG" cx="50%" cy="50%" r="50%">
                            <Stop offset="0%" stopColor={successBase} stopOpacity="0.08" />
                            <Stop offset="65%" stopColor={successBase} stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Ellipse cx={130} cy={100} rx={130} ry={100} fill="url(#gG)" />
                </Svg>
            </View>
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Svg width={SCREEN_WIDTH} height="100%">
                    <Defs>
                        <Pattern id="grid" x={0} y={0} width={48} height={48} patternUnits="userSpaceOnUse">
                            <Line x1={0} y1={0} x2={48} y2={0} stroke={HERO_GRID_LINE} strokeWidth={1} />
                            <Line x1={0} y1={0} x2={0} y2={48} stroke={HERO_GRID_LINE} strokeWidth={1} />
                        </Pattern>
                    </Defs>
                    <Rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" />
                </Svg>
            </View>
        </>
    );
}

export default function WalletSummary() {
    const { t } = useTranslation();
    const router = useRouter();
    const theme = useTheme();
    const s = useStyles(getStyles);
    const { balanceUsdc, displayBalance, displayCurrency, loading, fetchWallet, fetchBalance, reconcileBalance,
            walletNotFound, initiateWalletSetup, confirmWalletSetup } = useWalletStore();
    const [showBalance, setShowBalance] = useState(true);
    const [creatingWallet, setCreatingWallet] = useState(false);

    const maskedOrValue = useMemo(() => {
        if (!showBalance) return "••••••";
        if (displayBalance === null) return "--";
        return displayBalance;
    }, [showBalance, displayBalance]);

    const usdcValue = useMemo(() => {
        if (!showBalance) return "••••";
        if (balanceUsdc === null) return "--";
        return `${parseFloat(balanceUsdc).toFixed(2)} USDC`;
    }, [showBalance, balanceUsdc]);

    const refresh = async () => {
        const calls: Promise<void>[] = [fetchWallet(), fetchBalance()];
        if (process.env.EXPO_PUBLIC_ENABLE_RECONCILE === "true") calls.push(reconcileBalance());
        await Promise.all(calls);
    };

    useEffect(() => { refresh(); }, []);

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
            // walletNotFound UI stays visible for retry
        } finally {
            setCreatingWallet(false);
        }
    };

    const gradientColors: [string, string] = [theme.colors.heroBackground, theme.colors.heroBackground2];

    if (walletNotFound) {
        return (
            <View style={s.hero}>
                <LinearGradient colors={gradientColors} start={[0, 0]} end={[0, 1]} style={StyleSheet.absoluteFillObject} />
                <GlowOverlay primaryColor={theme.colors.primary} successBase={theme.colors.success} />
                <View style={s.heroInner}>
                    <View style={s.notFoundRow}>
                        <AlertCircle color={theme.colors.primary} size={SIZES.iconMd} />
                        <Text style={s.balanceLabel}>{t("wallet.notFound")}</Text>
                    </View>
                    <Text style={s.balance}>{t("wallet.createWalletPrompt")}</Text>
                    <View style={s.actions}>
                        <TouchableOpacity
                            style={[s.actionBtn, s.actionBtnPrimary]}
                            onPress={handleCreateWallet}
                            disabled={creatingWallet}
                            activeOpacity={0.8}
                        >
                            {creatingWallet
                                ? <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                                : <Text style={s.actionBtnText}>{t("wallet.createWallet")}</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={s.hero}>
            <LinearGradient colors={gradientColors} start={[0, 0]} end={[0, 1]} style={StyleSheet.absoluteFillObject} />
            <GlowOverlay primaryColor={theme.colors.primary} successBase={theme.colors.success} />

            <View style={s.heroInner}>
                <View style={s.balanceSection}>
                    <Text style={s.balanceLabel}>{t("wallet.availableBalance")}</Text>
                    <View style={s.balanceRow}>
                        {loading
                            ? <ActivityIndicator color={theme.colors.onHero} style={s.balanceLoader} />
                            : <Text style={s.balance}>
                                {maskedOrValue}
                                {showBalance && displayBalance !== null && (
                                    <Text style={s.balanceCurrency}> {displayCurrency}</Text>
                                )}
                              </Text>
                        }
                        <View style={s.balanceIcons}>
                            <TouchableOpacity onPress={() => setShowBalance(v => !v)} style={s.iconBtn}>
                                {showBalance
                                    ? <Eye color={theme.colors.onHeroSubtle} size={SIZES.iconSm} />
                                    : <EyeOff color={theme.colors.onHeroSubtle} size={SIZES.iconSm} />
                                }
                            </TouchableOpacity>
                            <TouchableOpacity onPress={refresh} style={s.iconBtn}>
                                <RotateCw color={theme.colors.onHeroSubtle} size={SIZES.iconSm} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={s.usdcText}>{usdcValue}</Text>
                </View>

                <View style={s.actions}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/wallet/deposit")} activeOpacity={0.75}>
                        <Plus color={theme.colors.onHero} size={SIZES.iconSm} strokeWidth={2.5} />
                        <Text style={s.actionBtnText}>{t("wallet.deposit")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/wallet/transfert")} activeOpacity={0.75}>
                        <ArrowUpRight color={theme.colors.onHero} size={SIZES.iconSm} strokeWidth={2.5} />
                        <Text style={s.actionBtnText}>{t("wallet.send")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/wallet/withdraw")} activeOpacity={0.75}>
                        <ArrowDownRight color={theme.colors.onHero} size={SIZES.iconSm} strokeWidth={2.5} />
                        <Text style={s.actionBtnText}>{t("wallet.withdraw")}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    hero: {
        width: "100%",
        overflow: "hidden",
    },
    heroInner: {
        paddingHorizontal: theme.spacing.l,
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.xl,
    },
    balanceSection: {
        marginBottom: theme.spacing.l,
    },
    balanceLabel: {
        fontFamily: FONTS.sans,
        fontSize: SIZES.tabLabelSize,
        color: theme.colors.onHeroMuted,
        letterSpacing: theme.typography.label.letterSpacing,
        textTransform: "uppercase",
        marginBottom: theme.spacing.s - 2,
    },
    balanceRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    balanceLoader: {
        marginVertical: theme.spacing.s,
    },
    balance: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.balanceFontSize,
        color: theme.colors.onHero,
        letterSpacing: -2,
        flex: 1,
    },
    balanceCurrency: {
        fontFamily: FONTS.sans,
        fontSize: SIZES.balanceFontSize * 0.45,
        color: theme.colors.onHeroMuted,
        letterSpacing: 0,
    },
    usdcText: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.caption.fontSize,
        color: theme.colors.onHeroMuted,
        marginTop: theme.spacing.xs,
    },
    balanceIcons: {
        flexDirection: "row",
        gap: theme.spacing.xs,
        paddingTop: theme.spacing.s,
    },
    iconBtn: {
        padding: theme.spacing.xs,
    },
    notFoundRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.s,
        marginBottom: theme.spacing.m - 4,
    },
    actions: {
        flexDirection: "row",
        gap: theme.spacing.s + 2,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.s - 2,
        backgroundColor: theme.colors.heroSurface,
        borderWidth: 1,
        borderColor: theme.colors.heroBorder,
        borderRadius: theme.borderRadius.full,
        paddingVertical: theme.spacing.m - 2,
    },
    actionBtnPrimary: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    actionBtnText: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.iconSm - 3, // 13px — slightly smaller than body
        color: theme.colors.onHero,
        letterSpacing: -0.2,
    },
});

// Static styles used by GlowOverlay (no theme dependency)
const styles = StyleSheet.create({
    glowOrange: {
        position: "absolute",
        top: -80,
        right: -40,
        width: 320,
        height: 320,
    },
    glowGreen: {
        position: "absolute",
        bottom: -40,
        left: "10%",
        width: 260,
        height: 200,
    },
});

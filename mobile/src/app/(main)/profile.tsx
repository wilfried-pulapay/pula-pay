import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { useRef } from "react";
import { LogOut, Moon, Sun, ChevronRight, Shield, HelpCircle, FileText } from "lucide-react-native";
import Svg, { Defs, RadialGradient, Stop, Ellipse } from "react-native-svg";

import { logout, useAuth } from "../../lib/auth";
import { useTheme } from "@/src/theme";
import { useStyles } from "@/src/hooks/use-styles";
import { useUIStore } from "@/src/store/uiStore";
import { useWalletStore } from "@/src/store/walletStore";
import { FONTS, SIZES } from "@/src/constants/theme";
import type { Theme } from "@/src/theme/types";

function ThemeToggle() {
    const theme = useTheme();
    const { setTheme } = useUIStore();
    const isDark = theme.mode === "dark";
    const togglePadding = theme.spacing.xs - 1; // 3px
    const toggleTravel = SIZES.toggleWidth - SIZES.toggleThumb - 2 * togglePadding; // 20px
    const translateX = useRef(new Animated.Value(isDark ? toggleTravel : 0)).current;

    const toggle = () => {
        const toValue = isDark ? 0 : toggleTravel;
        Animated.spring(translateX, { toValue, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
        setTheme(isDark ? "light" : "dark");
    };

    return (
        <TouchableOpacity
            onPress={toggle}
            activeOpacity={0.9}
            style={{
                width: SIZES.toggleWidth,
                height: SIZES.toggleHeight,
                borderRadius: SIZES.toggleHeight / 2,
                padding: togglePadding,
                justifyContent: "center",
                backgroundColor: isDark ? theme.colors.primary : theme.colors.toggleOff,
            }}
        >
            <Animated.View style={{
                width: SIZES.toggleThumb,
                height: SIZES.toggleThumb,
                borderRadius: SIZES.toggleThumb / 2,
                backgroundColor: theme.colors.onPrimary,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: theme.colors.ink,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: theme.spacing.xs,
                elevation: 2,
                transform: [{ translateX }],
            }}>
                {isDark
                    ? <Moon size={SIZES.toggleIconSize} color={theme.colors.primary} />
                    : <Sun size={SIZES.toggleIconSize} color={theme.colors.stone} />
                }
            </Animated.View>
        </TouchableOpacity>
    );
}

function Avatar({ name }: { name: string }) {
    const theme = useTheme();
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? "")
        .join("");
    return (
        <View style={{
            width: SIZES.avatar,
            height: SIZES.avatar,
            borderRadius: SIZES.avatar / 2,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
        }}>
            <Text style={{
                fontFamily: FONTS.sansBold,
                fontSize: SIZES.avatarFontSize,
                color: theme.colors.onPrimary,
            }}>
                {initials || "?"}
            </Text>
        </View>
    );
}

export default function Profile() {
    const s = useStyles(getStyles);
    const theme = useTheme();
    const { user } = useAuth();
    const { wallet, displayBalance, balanceUsdc } = useWalletStore();

    const name = user?.name ?? "Utilisateur";
    const phone = user?.phoneNumber ?? "";

    return (
        <ScrollView
            style={s.scrollView}
            contentContainerStyle={s.scrollContent}
        >
            {/* Dark header */}
            <View style={s.header}>
                <View style={s.glowOrange} pointerEvents="none">
                    <Svg width={280} height={220}>
                        <Defs>
                            <RadialGradient id="pG" cx="75%" cy="0%" r="60%">
                                <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity="0.12" />
                                <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0" />
                            </RadialGradient>
                        </Defs>
                        <Ellipse cx={210} cy={0} rx={140} ry={140} fill="url(#pG)" />
                    </Svg>
                </View>

                <View style={s.userRow}>
                    <Avatar name={name} />
                    <View style={s.userInfo}>
                        <Text style={s.userName}>{name}</Text>
                        {phone ? <Text style={s.userPhone}>{phone}</Text> : null}
                        <View style={s.verifiedBadge}>
                            <View style={s.verifiedDot} />
                            <Text style={s.verifiedText}>Vérifié</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={s.body}>
                {/* Account info card */}
                {wallet && (
                    <View style={s.card}>
                        <Text style={s.sectionTitle}>MON COMPTE</Text>
                        <View style={s.infoGrid}>
                            <View style={s.infoField}>
                                <Text style={s.infoLabel}>Solde XOF</Text>
                                <Text style={s.infoValue}>{displayBalance ?? "–"}</Text>
                            </View>
                            <View style={s.infoField}>
                                <Text style={s.infoLabel}>Solde USDC</Text>
                                <Text style={s.infoValue}>
                                    {balanceUsdc ? `${parseFloat(balanceUsdc).toFixed(2)} USDC` : "–"}
                                </Text>
                            </View>
                            <View style={s.infoField}>
                                <Text style={s.infoLabel}>Réseau</Text>
                                <Text style={s.infoValue}>{wallet.blockchain}</Text>
                            </View>
                            <View style={s.infoField}>
                                <Text style={s.infoLabel}>Adresse</Text>
                                <Text style={[s.infoValue, s.mono]} numberOfLines={1}>
                                    {wallet.address}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Settings */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>PARAMÈTRES</Text>

                    <View style={s.menuItem}>
                        <View style={s.menuIcon}>
                            <Moon size={SIZES.iconSm} color={theme.colors.text} />
                        </View>
                        <View style={s.menuContent}>
                            <Text style={s.menuLabel}>Mode sombre</Text>
                        </View>
                        <ThemeToggle />
                    </View>

                    <View style={s.divider} />

                    <View style={s.menuItem}>
                        <View style={s.menuIcon}>
                            <Shield size={SIZES.iconSm} color={theme.colors.text} />
                        </View>
                        <View style={s.menuContent}>
                            <Text style={s.menuLabel}>Sécurité</Text>
                            <Text style={s.menuDesc}>PIN & authentification</Text>
                        </View>
                        <ChevronRight size={SIZES.iconSm} color={theme.colors.stone} />
                    </View>
                </View>

                {/* Support */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>SUPPORT</Text>

                    <View style={s.menuItem}>
                        <View style={s.menuIcon}>
                            <HelpCircle size={SIZES.iconSm} color={theme.colors.text} />
                        </View>
                        <View style={s.menuContent}>
                            <Text style={s.menuLabel}>Aide</Text>
                        </View>
                        <ChevronRight size={SIZES.iconSm} color={theme.colors.stone} />
                    </View>

                    <View style={s.divider} />

                    <View style={s.menuItem}>
                        <View style={s.menuIcon}>
                            <FileText size={SIZES.iconSm} color={theme.colors.text} />
                        </View>
                        <View style={s.menuContent}>
                            <Text style={s.menuLabel}>Conditions d'utilisation</Text>
                        </View>
                        <ChevronRight size={SIZES.iconSm} color={theme.colors.stone} />
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity
                    style={s.logoutBtn}
                    onPress={logout}
                    activeOpacity={0.8}
                >
                    <LogOut size={SIZES.iconSm} color={theme.colors.danger} />
                    <Text style={s.logoutText}>Se déconnecter</Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={s.footer}>
                    <Text style={s.footerBrand}>
                        Pula<Text style={s.footerBrandAccent}>pay</Text>
                    </Text>
                    <Text style={s.footerTagline}>
                        Votre argent, partout en Afrique.
                    </Text>
                    <Text style={s.footerVersion}>
                        v1.0 · UEMOA · Base L2
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    // Header
    header: {
        backgroundColor: theme.colors.heroBackground,
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.l + 4,
        paddingHorizontal: theme.spacing.l,
        overflow: "hidden",
    },
    glowOrange: {
        position: "absolute",
        top: -(theme.spacing.l - 4),
        right: -(theme.spacing.l - 4),
        width: 280,
        height: 220,
    },
    userRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.m,
    },
    userInfo: {
        flex: 1,
        gap: theme.spacing.xs - 2,
    },
    userName: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.subtitleFontSize,
        letterSpacing: -0.3,
        color: theme.colors.onHero,
    },
    userPhone: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.caption.fontSize! + 1,
        color: theme.colors.onHeroMuted,
    },
    verifiedBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: theme.spacing.xs + 1,
        backgroundColor: theme.colors.successLight,
        borderRadius: theme.borderRadius.full,
        paddingVertical: theme.spacing.xs - 1,
        paddingHorizontal: theme.spacing.s + 2,
        marginTop: theme.spacing.xs,
    },
    verifiedDot: {
        width: theme.spacing.xs + 1,
        height: theme.spacing.xs + 1,
        borderRadius: theme.spacing.xs - 1,
        backgroundColor: theme.colors.success,
    },
    verifiedText: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.badgeFontSize,
        color: theme.colors.success,
    },
    // Body
    body: {
        paddingHorizontal: theme.spacing.l,
        paddingTop: theme.spacing.l - 4,
        gap: theme.spacing.m,
    },
    card: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.l,
        overflow: "hidden",
        backgroundColor: theme.colors.surfaceAlt,
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.xs,
    },
    sectionTitle: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.badgeFontSize,
        letterSpacing: 2,
        color: theme.colors.primary,
        marginBottom: theme.spacing.m - 4,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: theme.spacing.m,
        paddingBottom: theme.spacing.m - 4,
    },
    infoField: {
        width: "45%",
    },
    infoLabel: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.caption.fontSize,
        color: theme.colors.stone,
        marginBottom: theme.spacing.xs - 2,
    },
    infoValue: {
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.caption.fontSize! + 1,
        color: theme.colors.text,
    },
    mono: {
        fontFamily: FONTS.mono,
        fontSize: SIZES.badgeFontSize,
        color: theme.colors.text,
    },
    // Menu items
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.s + 6,
        gap: theme.spacing.m - 4,
    },
    menuIcon: {
        width: SIZES.avatarSm,
        height: SIZES.avatarSm,
        borderRadius: theme.borderRadius.s + 2,
        backgroundColor: theme.colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    menuContent: {
        flex: 1,
    },
    menuLabel: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.menuFontSize,
        color: theme.colors.text,
    },
    menuDesc: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.caption.fontSize,
        color: theme.colors.stone,
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginLeft: SIZES.avatarSm + theme.spacing.m - 4,
    },
    // Logout
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.s,
        borderRadius: theme.borderRadius.full,
        paddingVertical: theme.spacing.s + 5,
        backgroundColor: theme.colors.dangerLight,
    },
    logoutText: {
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.body.fontSize,
        color: theme.colors.danger,
    },
    // Footer
    footer: {
        alignItems: "center",
        paddingTop: theme.spacing.s,
        paddingBottom: theme.spacing.s,
        gap: theme.spacing.xs,
    },
    footerBrand: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.brandFontSize,
        letterSpacing: -0.5,
        color: theme.colors.text,
    },
    footerBrandAccent: {
        color: theme.colors.primary,
    },
    footerTagline: {
        fontFamily: FONTS.serifItalic,
        fontSize: theme.typography.caption.fontSize,
        color: theme.colors.stone,
    },
    footerVersion: {
        fontFamily: FONTS.sans,
        fontSize: SIZES.badgeFontSize,
        color: theme.colors.textMuted,
    },
});

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ArrowLeft, Copy, AlertTriangle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { useWalletAddress } from '@/src/hooks/use-wallet-address';
import { useAuth } from '@/src/lib/auth';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import Screen from '@/src/components/screen';
import WalletAddressComponent from '@/src/components/wallet-address';
import ReceiveQRCode from '@/src/components/qr-code';
import { FONTS, SIZES } from '@/src/constants/theme';
import type { Theme } from '@/src/theme/types';

type Tab = 'qr' | 'link' | 'usdc';

export default function Receive() {
    const { t } = useTranslation();
    const theme = useTheme();
    const s = useStyles(getStyles);
    const { address, blockchain, loading, copyToClipboard, copied } = useWalletAddress();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('qr');

    const username = user?.name?.toLowerCase().replace(/\s+/g, '') ?? 'utilisateur';
    const payLink = `pay.pulapay.com/${username}`;

    const TABS: { key: Tab; label: string }[] = [
        { key: 'qr',   label: 'QR Code' },
        { key: 'link', label: 'Lien' },
        { key: 'usdc', label: 'USDC' },
    ];

    return (
        <Screen>
            {/* Back */}
            <TouchableOpacity
                onPress={() => router.replace('/(main)/wallet')}
                style={s.backBtn}
                activeOpacity={0.7}
            >
                <ArrowLeft color={theme.colors.text} size={SIZES.iconLg} />
            </TouchableOpacity>

            <Text style={s.title}>{t('receive.title')}</Text>

            {/* Tab selector */}
            <View style={s.tabBar}>
                {TABS.map(tab => {
                    const active = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[s.tabBtn, active && s.tabBtnActive]}
                            onPress={() => setActiveTab(tab.key)}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView contentContainerStyle={s.content}>
                {activeTab === 'qr' && (
                    <>
                        <ReceiveQRCode address={address} blockchain={blockchain} loading={loading} />
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>
                                {t('receive.yourAddress')}
                            </Text>
                            <WalletAddressComponent
                                address={address}
                                blockchain={blockchain}
                                loading={loading}
                                onCopy={copyToClipboard}
                                copied={copied}
                                truncate={false}
                            />
                        </View>
                    </>
                )}

                {activeTab === 'link' && (
                    <View style={s.linkSection}>
                        <Text style={s.sectionTitle}>
                            Votre lien de paiement
                        </Text>
                        <View style={s.linkBox}>
                            <Text style={s.linkText}>{payLink}</Text>
                            <TouchableOpacity
                                onPress={() => Clipboard.setStringAsync(payLink)}
                                style={s.copyBtn}
                                activeOpacity={0.8}
                            >
                                <Copy size={SIZES.iconSm} color={theme.colors.onPrimary} />
                                <Text style={s.copyBtnText}>Copier</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={s.infoText}>
                            Partagez ce lien pour recevoir des paiements directement sur votre compte Pulapay.
                        </Text>
                    </View>
                )}

                {activeTab === 'usdc' && (
                    <>
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>
                                Adresse USDC
                            </Text>
                            <WalletAddressComponent
                                address={address}
                                blockchain={blockchain}
                                loading={loading}
                                onCopy={copyToClipboard}
                                copied={copied}
                                truncate={false}
                            />
                        </View>
                        <View style={s.warningBox}>
                            <AlertTriangle size={SIZES.iconSm} color={theme.colors.warning} />
                            <Text style={s.warningText}>
                                Envoyez uniquement des USDC sur le réseau {blockchain ?? '…'}. Tout autre token sera perdu.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </Screen>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    backBtn: {
        padding: theme.spacing.xs,
        marginBottom: theme.spacing.s,
        alignSelf: 'flex-start',
    },
    title: {
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.h2.fontSize,
        letterSpacing: theme.typography.h2.letterSpacing,
        textAlign: 'center',
        color: theme.colors.text,
        marginBottom: theme.spacing.l - 4,
    },
    tabBar: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
        gap: 1,
        marginHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.l - 4,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: theme.spacing.s + 1,
        backgroundColor: theme.colors.surfaceAlt,
    },
    tabBtnActive: {
        backgroundColor: theme.colors.text,
    },
    tabLabel: {
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.caption.fontSize! + 1,
        color: theme.colors.stone,
    },
    tabLabelActive: {
        color: theme.colors.background,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.xl + theme.spacing.s,
    },
    section: {
        marginTop: theme.spacing.m,
    },
    sectionTitle: {
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.body.fontSize,
        color: theme.colors.text,
        marginBottom: theme.spacing.s,
    },
    linkSection: {
        marginTop: theme.spacing.m,
        gap: theme.spacing.m,
    },
    linkBox: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surfaceAlt,
        padding: theme.spacing.m,
        gap: theme.spacing.m - 4,
    },
    linkText: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.body.fontSize + 1,
        letterSpacing: -0.2,
        color: theme.colors.text,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.s,
        borderRadius: theme.borderRadius.full,
        paddingVertical: theme.spacing.s + 2,
        backgroundColor: theme.colors.primary,
    },
    copyBtnText: {
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.body.fontSize,
        color: theme.colors.onPrimary,
    },
    infoText: {
        fontFamily: FONTS.sans,
        fontSize: theme.typography.caption.fontSize! + 1,
        lineHeight: theme.typography.caption.lineHeight! + 2,
        color: theme.colors.textMuted,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.s + 2,
        borderWidth: 1,
        borderColor: theme.colors.warning,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.warningLight,
        padding: theme.spacing.m - 2,
        marginTop: theme.spacing.m,
    },
    warningText: {
        fontFamily: FONTS.sans,
        flex: 1,
        fontSize: theme.typography.caption.fontSize! + 1,
        lineHeight: theme.typography.caption.lineHeight! + 2,
        color: theme.colors.warning,
    },
});

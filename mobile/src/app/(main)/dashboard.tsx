import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Screen from "../../components/screen";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth";

import RecentTransactions from "@/src/components/recent-transactions";
import SafeComponent from "@/src/components/safe-component";
import WalletSummary from "@/src/components/wallet-summary";
import { useStyles } from "@/src/hooks/use-styles";
import type { Theme } from "@/src/theme/types";

export default function Dashboard() {
    const { t } = useTranslation();
    const styles = useStyles(getStyles);
    const { user } = useAuth();

    return (
        <Screen scroll contentStyle={styles.container}>
            <SafeComponent>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetingMuted}>Bonjour,</Text>
                        <Text style={styles.greeting}>{user?.name ?? 'Bienvenue'}</Text>
                        <Text style={styles.date}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                    </View>
                </View>
            </SafeComponent>

            <SafeComponent>
                <View style={{ width: '100%' }}>
                    <WalletSummary />
                </View>
            </SafeComponent>

            {/* Promo card */}
            <SafeComponent>
                <View style={styles.promoCard}>
                    <View style={styles.promoLeft}>
                        <Text style={styles.promoTitle}>Offre spéciale</Text>
                        <Text style={styles.promoSubtitle}>5% de réduction sur les recharges aujourd'hui</Text>
                    </View>
                    <TouchableOpacity style={styles.promoButton} onPress={() => { /* TODO: promo action */ }}>
                        <Text style={styles.promoButtonText}>Profiter</Text>
                    </TouchableOpacity>
                </View>
            </SafeComponent>

            <SafeComponent>
                <View style={{ width: '100%' }}>
                    <RecentTransactions />
                </View>
            </SafeComponent>

        </Screen>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        paddingBottom: theme.spacing.xxl,
    },
    header: {
        width: '100%',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
    },
    greetingMuted: {
        fontSize: 13,
        fontWeight: '300',
        color: theme.colors.textMuted,
    },
    greeting: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: theme.colors.text,
    },
    date: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    promoCard: {
        marginHorizontal: 16,
        marginBottom: 24,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    promoLeft: {
        flex: 1,
    },
    promoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    promoSubtitle: {
        fontSize: 12,
        color: theme.colors.textMuted,
    },
    promoButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.s,
        borderRadius: theme.borderRadius.full,
    },
    promoButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 12,
    },
});

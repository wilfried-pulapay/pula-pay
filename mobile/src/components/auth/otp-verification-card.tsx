import type { ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Screen from "@/src/components/screen";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/button";
import { useStyles } from "@/src/hooks/use-styles";
import { useTheme } from "@/src/theme";
import type { Theme } from "@/src/theme/types";

type Props = {
    title: string;
    subtitle: string;
    otp: string;
    onChangeOtp: (value: string) => void;
    onSubmit: () => void;
    onResend: () => void;
    loading: boolean;
    resending?: boolean;
    error: string | null;
    submitLabel: string;
    resendLabel: string;
    showLogo?: boolean;
    footer?: ReactNode;
};

export default function OtpVerificationCard({
    title,
    subtitle,
    otp,
    onChangeOtp,
    onSubmit,
    onResend,
    loading,
    resending = false,
    error,
    submitLabel,
    resendLabel,
    showLogo = false,
    footer,
}: Props) {
    const theme = useTheme();
    const styles = useStyles(getStyles);

    return (
        <Screen scroll style={styles.container}>
            <View style={styles.card}>
                {showLogo && (
                    <Text style={styles.logo}>
                        <Text style={styles.logoPula}>Pula</Text>
                        <Text style={styles.logoPay}>pay</Text>
                    </Text>
                )}

                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>

                <View style={styles.otpGroup}>
                    <Input
                        placeholder="000000"
                        value={otp}
                        onChangeText={onChangeOtp}
                        keyboardType="number-pad"
                        autoFocus
                        editable={!loading}
                        inputStyle={styles.otpInput}
                    />
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <Button
                    title={submitLabel}
                    onPress={onSubmit}
                    loading={loading}
                    fullWidth
                />

                <TouchableOpacity
                    style={styles.resendRow}
                    onPress={onResend}
                    disabled={resending || loading}
                >
                    <Text style={[styles.resendText, { color: theme.colors.primary }]}>
                        {resending ? "…" : resendLabel}
                    </Text>
                </TouchableOpacity>

                {footer}
            </View>
        </Screen>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.m,
        backgroundColor: theme.colors.background,
    },
    card: {
        width: "100%",
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        marginTop: 48,
    },
    logo: {
        fontSize: 32,
        fontWeight: "800",
        letterSpacing: -1.5,
        textAlign: "center",
        marginBottom: theme.spacing.s,
    },
    logoPula: {
        color: theme.colors.text,
    },
    logoPay: {
        color: theme.colors.primary,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        letterSpacing: -0.5,
        color: theme.colors.text,
        textAlign: "center",
        marginBottom: theme.spacing.s,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textMuted,
        textAlign: "center",
        marginBottom: theme.spacing.l,
    },
    otpGroup: {
        marginBottom: theme.spacing.m,
    },
    otpInput: {
        textAlign: "center",
        fontSize: 28,
        letterSpacing: 10,
        fontWeight: "700",
    },
    error: {
        fontSize: 11,
        color: theme.colors.danger,
        marginTop: theme.spacing.m,
        fontWeight: "500",
    },
    resendRow: {
        alignItems: "center",
        marginTop: theme.spacing.l,
    },
    resendText: {
        fontSize: 14,
        fontWeight: "600",
    },
});

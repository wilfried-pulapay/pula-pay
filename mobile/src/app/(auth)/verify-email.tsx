import { useState } from "react";
import { StyleSheet, TouchableOpacity, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import OtpVerificationCard from "@/src/components/auth/otp-verification-card";
import { useStyles } from "@/src/hooks/use-styles";
import { useTheme } from "@/src/theme";
import { authClient, useAuth, logout } from "@/src/lib/auth";
import type { Theme } from "@/src/theme/types";

export default function VerifyEmail() {
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useStyles(getStyles);
    const { user } = useAuth();

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const email = user?.email ?? "";

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setError(t("validation.invalidOtp"));
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const { error: verifyError } = await authClient.emailOtp.verifyEmail({ email, otp });
            if (verifyError) {
                setError(verifyError.message ?? t("apiErrors.VERIFICATION_FAILED"));
                return;
            }
            router.replace("/(auth)/verify-phone");
        } catch {
            setError(t("apiErrors.NETWORK_ERROR"));
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            setResending(true);
            setError(null);
            await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
        } catch {
            setError(t("apiErrors.NETWORK_ERROR"));
        } finally {
            setResending(false);
        }
    };

    return (
        <OtpVerificationCard
            title={t("verifyEmail.title")}
            subtitle={t("verifyEmail.subtitle", { email })}
            otp={otp}
            onChangeOtp={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
            onSubmit={handleVerify}
            onResend={handleResend}
            loading={loading}
            resending={resending}
            error={error}
            submitLabel={t("verifyEmail.button")}
            resendLabel={t("verifyEmail.resend")}
            showLogo
            footer={
                <TouchableOpacity
                    style={styles.logoutRow}
                    onPress={logout}
                    disabled={loading}
                >
                    <Text style={[styles.logoutText, { color: theme.colors.textMuted }]}>
                        {t("verifyEmail.wrongEmail")}
                    </Text>
                </TouchableOpacity>
            }
        />
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    logoutRow: {
        alignItems: "center",
        marginTop: theme.spacing.m,
    },
    logoutText: {
        fontSize: 13,
    },
});

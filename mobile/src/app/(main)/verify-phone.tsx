import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import Screen from "@/src/components/screen";
import Button from "@/src/components/ui/button";
import PhoneInput from "@/src/components/ui/phone-input";
import OtpVerificationCard from "@/src/components/auth/otp-verification-card";
import { useStyles } from "@/src/hooks/use-styles";
import { useTheme } from "@/src/theme";
import { usePhoneForm } from "@/src/hooks/use-phone-form";
import { authClient } from "@/src/lib/auth";
import type { Theme } from "@/src/theme/types";

type Step = "phone" | "otp" | "success";

export default function VerifyPhone() {
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useStyles(getStyles);
    const { phone, setPhone, setCountryCode, formatPhone } = usePhoneForm();

    const [step, setStep] = useState<Step>("phone");
    const [formattedPhone, setFormattedPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSendCode = async () => {
        const full = formatPhone();
        if (!full) {
            setError(t("validation.invalidPhone"));
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const { error: sendError } = await authClient.phoneNumber.sendOtp({ phoneNumber: full });
            if (sendError) {
                setError(sendError.message ?? t("common.errors.unknown"));
                return;
            }
            setFormattedPhone(full);
            setStep("otp");
        } catch {
            setError(t("apiErrors.NETWORK_ERROR"));
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setError(t("validation.invalidOtp"));
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const { error: verifyError } = await authClient.phoneNumber.verify({
                phoneNumber: formattedPhone,
                code: otp,
                updatePhoneNumber: true,
            });
            if (verifyError) {
                setError(verifyError.message ?? t("apiErrors.VERIFICATION_FAILED"));
                return;
            }
            setStep("success");
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
            await authClient.phoneNumber.sendOtp({ phoneNumber: formattedPhone });
        } catch {
            setError(t("apiErrors.NETWORK_ERROR"));
        } finally {
            setResending(false);
        }
    };

    if (step === "success") {
        return (
            <Screen scroll style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>{t("verifyPhone.successTitle")}</Text>
                    <Text style={styles.subtitle}>{t("verifyPhone.successSubtitle")}</Text>
                    <Button
                        title={t("verifyPhone.continueButton")}
                        onPress={() => router.back()}
                        fullWidth
                    />
                </View>
            </Screen>
        );
    }

    if (step === "otp") {
        return (
            <OtpVerificationCard
                title={t("verifyPhone.step2title")}
                subtitle={t("verifyPhone.step2subtitle", { phone: formattedPhone })}
                otp={otp}
                onChangeOtp={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                onSubmit={handleVerify}
                onResend={handleResend}
                loading={loading}
                resending={resending}
                error={error}
                submitLabel={t("verifyPhone.button")}
                resendLabel={t("verifyPhone.resend")}
                footer={
                    <TouchableOpacity
                        style={styles.backRow}
                        onPress={() => { setStep("phone"); setOtp(""); setError(null); }}
                    >
                        <Text style={[styles.backText, { color: theme.colors.textMuted }]}>
                            ← {t("verifyPhone.changeNumber")}
                        </Text>
                    </TouchableOpacity>
                }
            />
        );
    }

    return (
        <Screen scroll style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>{t("verifyPhone.title")}</Text>
                <Text style={styles.subtitle}>{t("verifyPhone.subtitle")}</Text>

                <View style={styles.inputGroup}>
                    <PhoneInput
                        value={phone}
                        onChangePhoneNumber={setPhone}
                        onChangeSelectedCountry={setCountryCode}
                        disabled={loading}
                    />
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <Button
                    title={loading ? "…" : t("verifyPhone.sendCode")}
                    onPress={handleSendCode}
                    loading={loading}
                    fullWidth
                />
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
    inputGroup: {
        marginBottom: theme.spacing.m,
    },
    error: {
        fontSize: 11,
        color: theme.colors.danger,
        marginTop: theme.spacing.m,
        fontWeight: "500",
    },
    backRow: {
        alignItems: "center",
        marginTop: theme.spacing.m,
    },
    backText: {
        fontSize: 13,
    },
});

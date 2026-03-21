import { useState } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import Input from "@/src/components/ui/Input";
import AuthFormLayout, { getAuthFormStyles } from "@/src/components/auth-form-layout";
import { useStyles } from "@/src/hooks/use-styles";
import { authClient } from "../../lib/auth";

export default function Register() {
    const { t } = useTranslation();
    const styles = useStyles(getAuthFormStyles);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!name || !email || !password || !confirmPassword) {
                setError(t("validation.fillAllFields"));
                return;
            }
            if (password !== confirmPassword) {
                setError(t("validation.passwordMismatch"));
                return;
            }

            const { error: signUpError } = await authClient.signUp.email({
                email,
                password,
                name,
            });

            if (signUpError) {
                setError(signUpError.message ?? t("apiErrors.UNKNOWN_ERROR"));
                return;
            }

            router.replace("/(main)/dashboard");
        } catch {
            setError(t("apiErrors.NETWORK_ERROR"));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setGoogleLoading(true);
            setError(null);
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "pulapay://auth/callback",
            });
        } catch {
            setError(t("apiErrors.NETWORK_ERROR"));
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <>
            <AuthFormLayout
                title={t("register.title")}
                buttonTitle={t("register.button")}
                linkText={t("register.goToLogin")}
                linkLabel={t("login.title")}
                linkHref="/(auth)/login"
                error={error}
                loading={loading}
                onSubmit={handleSubmit}
                onGoogleSignIn={handleGoogleSignIn}
                googleLoading={googleLoading}
            >
                <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("register.name")}</Text>
                    <Input
                        placeholder="John Doe"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        editable={!loading}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("register.email")}</Text>
                    <Input
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("login.password")}</Text>
                    <Input
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        editable={!loading}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>{t("register.confirmPassword")}</Text>
                    <Input
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        editable={!loading}
                    />
                </View>
            </AuthFormLayout>
        </>
    );
}

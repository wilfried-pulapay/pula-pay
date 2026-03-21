import { useState } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import Input from "@/src/components/ui/Input";
import AuthFormLayout, { getAuthFormStyles } from "@/src/components/auth-form-layout";
import { useStyles } from "@/src/hooks/use-styles";
import { authClient } from "@/src/lib/auth";

export default function Login() {
    const { t } = useTranslation();
    const styles = useStyles(getAuthFormStyles);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!email || !password) {
                setError(t("validation.fillAllFields"));
                return;
            }

            const { error: signInError } = await authClient.signIn.email({ email, password });

            if (signInError) {
                setError(signInError.message ?? t("apiErrors.INVALID_CREDENTIALS"));
            }
            // Session is auto-set by Better Auth — auth layout guard redirects to dashboard
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
        <AuthFormLayout
            title={t("login.title")}
            buttonTitle={t("login.button")}
            linkText={t("login.goToRegister")}
            linkLabel={t("register.title")}
            linkHref="/(auth)/register"
            error={error}
            loading={loading}
            onSubmit={handleSubmit}
            onGoogleSignIn={handleGoogleSignIn}
            googleLoading={googleLoading}
        >
            <View style={styles.formGroup}>
                <Text style={styles.label}>{t("login.email")}</Text>
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
        </AuthFormLayout>
    );
}

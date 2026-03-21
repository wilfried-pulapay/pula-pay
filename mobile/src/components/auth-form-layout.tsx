import { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import Screen from "@/src/components/screen";
import Button from "@/src/components/ui/button";
import { useStyles } from "@/src/hooks/use-styles";
import type { Theme } from "@/src/theme/types";

type Props = {
    title: string;
    buttonTitle: string;
    linkText: string;
    linkLabel: string;
    linkHref: string;
    error: string | null;
    loading: boolean;
    onSubmit: () => void;
    onGoogleSignIn?: () => void;
    googleLoading?: boolean;
    children: ReactNode;
};

export default function AuthFormLayout({
    title,
    buttonTitle,
    linkText,
    linkLabel,
    linkHref,
    error,
    loading,
    onSubmit,
    onGoogleSignIn,
    googleLoading,
    children,
}: Props) {
    const styles = useStyles(getStyles);

    return (
        <Screen scroll style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.logo}>
                    <Text style={styles.logoPula}>Pula</Text>
                    <Text style={styles.logoPay}>pay</Text>
                </Text>
                <Text style={styles.title}>{title}</Text>

                {children}

                {error && <Text style={styles.error}>{error}</Text>}

                <Button
                    title={buttonTitle}
                    onPress={onSubmit}
                    loading={loading}
                    fullWidth
                />

                {onGoogleSignIn && (
                    <>
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={onGoogleSignIn}
                            disabled={googleLoading || loading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.googleIcon}>G</Text>
                            <Text style={styles.googleLabel}>Continue with Google</Text>
                        </TouchableOpacity>
                    </>
                )}

                <View style={styles.linkContainer}>
                    <Text style={styles.linkText}>{linkText} </Text>
                    <Link href={linkHref as any} asChild>
                        <TouchableOpacity>
                            <Text style={styles.linkButton}>{linkLabel}</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </Screen>
    );
}

export const getAuthFormStyles = (theme: Theme) => StyleSheet.create({
    formGroup: {
        marginBottom: theme.spacing.m,
    },
    label: {
        ...theme.typography.caption,
        color: theme.colors.textMuted,
        marginBottom: theme.spacing.xs,
    },
});

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing.m,
        backgroundColor: theme.colors.background,
    },
    card: {
        width: '100%',
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        marginTop: 48,
    },
    logo: {
        fontSize: 32,
        fontWeight: '800',
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
        fontWeight: '700',
        letterSpacing: -0.5,
        color: theme.colors.text,
        textAlign: "center",
        marginBottom: theme.spacing.l,
    },
    error: {
        fontSize: 11,
        color: theme.colors.danger,
        marginTop: theme.spacing.m,
        fontWeight: "500",
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: theme.spacing.m,
        gap: theme.spacing.s,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border,
    },
    dividerText: {
        fontSize: 11,
        color: theme.colors.textMuted,
    },
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.s,
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.l,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    googleIcon: {
        fontSize: 16,
        fontWeight: "700",
        color: "#4285F4",
    },
    googleLabel: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: "600",
    },
    linkContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: theme.spacing.l,
    },
    linkText: {
        fontSize: 13,
        color: theme.colors.textMuted,
    },
    linkButton: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: "700",
    },
});

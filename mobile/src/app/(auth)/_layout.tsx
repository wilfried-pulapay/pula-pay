import { useEffect } from "react";
import { Stack, Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import LoadingSpinner from "../../components/ui/loading-spinner";
import { useTheme } from "@/src/theme";

export default function AuthLayout() {
    const { status, user } = useAuth();
    const theme = useTheme();

    // Navigate to verify-email via effect so the Stack stays mounted and
    // we don't create a <Redirect> loop (layout re-renders but effect only fires once).
    useEffect(() => {
        if (status === "authenticated" && !user?.emailVerified) {
            router.replace("/(auth)/verify-email");
        }
    }, [status, user?.emailVerified]);

    if (status === "loading") {
        return <LoadingSpinner message="Chargement…" />;
    }

    if (status === "authenticated" && user?.emailVerified) {
        return <Redirect href="/(main)/dashboard" />;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="verify-email" />
                <Stack.Screen name="verify-phone" />
            </Stack>
        </SafeAreaView>
    );
}

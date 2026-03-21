import { Stack, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth";
import LoadingSpinner from "../../components/ui/loading-spinner";
import { useTheme } from "@/src/theme";

export default function AuthLayout() {
    const { status } = useAuth();
    const theme = useTheme();

    if (status === "loading") {
        return <LoadingSpinner message="Chargement…" />;
    }

    if (status === "authenticated") {
        return <Redirect href="/(main)/dashboard" />;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Stack initialRouteName="login" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
            </Stack>
        </SafeAreaView>
    );
}

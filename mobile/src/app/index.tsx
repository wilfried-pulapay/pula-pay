import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useAuth } from "../lib/auth";
import Screen from "../components/screen";

export default function Index() {
    const { status } = useAuth();

    if (status === "loading") {
        return (
            <Screen>
                <ActivityIndicator size="large" />
            </Screen>
        );
    }

    if (status === "authenticated") {
        return <Redirect href="/(main)/dashboard" />;
    }

    console.log("User is unauthenticated, redirecting to login");

    return <Redirect href="/(auth)/login" />;
}

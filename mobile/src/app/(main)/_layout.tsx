import { Tabs, Redirect } from "expo-router";

import { useAuth } from "../../lib/auth";
import { useTheme } from "@/src/theme";
import LoadingSpinner from "@/src/components/ui/loading-spinner";
import BrandHeader from "@/src/components/brand-header";
import { House, Wallet, History, Settings } from "lucide-react-native";

export default function MainLayout() {
    const { status } = useAuth();
    const theme = useTheme();

    if (status === "loading") {
        return <LoadingSpinner message="Chargement…" />;
    }

    if (status !== "authenticated") {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                header: () => <BrandHeader />,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                },
                tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
            }}>
            <Tabs.Screen name="dashboard" options={{
                title: "Home",
                tabBarIcon: ({ color, size }) => (
                    <House color={color} size={size} />
                )
            }} />
            <Tabs.Screen name="wallet" options={{
                title: "Wallet",
                tabBarIcon: ({ color, size }) => (
                    <Wallet color={color} size={size} />
                )
            }} />
            <Tabs.Screen name="history" options={{
                title: "History",
                tabBarIcon: ({ color, size }) => (
                    <History color={color} size={size} />
                )
            }} />
            <Tabs.Screen name="profile" options={{
                title: "Profil",
                tabBarIcon: ({ color, size }) => (
                    <Settings color={color} size={size} />
                )
            }} />
        </Tabs>
    );
};
import { Tabs, Redirect } from "expo-router";

import { useAuth } from "../../lib/auth";
import { useTheme } from "@/src/theme";
import LoadingSpinner from "@/src/components/ui/loading-spinner";
import BrandHeader from "@/src/components/brand-header";
import TabBar from "@/src/components/ui/tab-bar";

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
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={{
                headerShown: true,
                header: () => <BrandHeader />,
                headerStyle: {
                    backgroundColor: theme.colors.heroBackground,
                },
                headerShadowVisible: false,
            }}>
            <Tabs.Screen name="dashboard" options={{ title: "Accueil" }} />
            <Tabs.Screen name="history"   options={{ title: "Activité" }} />
            <Tabs.Screen name="wallet"    options={{ title: "Wallet" }} />
            <Tabs.Screen name="profile"   options={{ title: "Profil" }} />
        </Tabs>
    );
};
import "../i18n";
import { Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useTheme } from "../theme";
import { ToastContainer } from "../components/ui/toast-container";

export default function RootLayout() {
    const theme = useTheme();
    const { isPending } = useAuth();

    if (isPending) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: theme.colors.background,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <>
            <Slot />
            <ToastContainer />
        </>
    );
}

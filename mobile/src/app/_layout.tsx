import "../i18n";
import { Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useFonts } from "expo-font";
import { useAuth } from "../lib/auth";
import { useTheme } from "../theme";
import { ToastContainer } from "../components/ui/toast-container";

export default function RootLayout() {
    const theme = useTheme();
    const { isPending } = useAuth();
    const [fontsLoaded] = useFonts({
        "ProductSans-Regular": require("../../assets/fonts/ProductSans-Regular.ttf"),
        "ProductSans-Bold": require("../../assets/fonts/ProductSans-Bold.ttf"),
        "ProductSans-Italic": require("../../assets/fonts/ProductSans-Italic.ttf"),
        "ProductSans-BoldItalic": require("../../assets/fonts/ProductSans-BoldItalic.ttf"),
        "TimesNewRomanMTStd": require("../../assets/fonts/TimesNewRomanMTStd.ttf"),
        "TimesNewRomanMTStd-Bold": require("../../assets/fonts/TimesNewRomanMTStd-Bold.ttf"),
        "TimesNewRomanMTStd-Italic": require("../../assets/fonts/TimesNewRomanMTStd-Italic.ttf"),
    });

    if (isPending || !fontsLoaded) {
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

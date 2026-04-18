import { ScrollView, View, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";

import RecentTransactions from "@/src/components/recent-transactions";
import SafeComponent from "@/src/components/safe-component";
import WalletSummary from "@/src/components/wallet-summary";

export default function Dashboard() {
    const theme = useTheme();

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            contentContainerStyle={styles.container}
        >
            <SafeComponent>
                <WalletSummary />
            </SafeComponent>

            <SafeComponent>
                <View style={styles.content}>
                    <RecentTransactions />
                </View>
            </SafeComponent>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
    },
    content: {
        paddingTop: 8,
        paddingBottom: 48,
    },
});

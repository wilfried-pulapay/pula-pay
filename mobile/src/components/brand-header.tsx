import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell } from "lucide-react-native";
import { useTheme } from "@/src/theme";
import type { Theme } from "@/src/theme/types";

export default function BrandHeader() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyles(theme, insets.top);

    const handleNotifications = () => {
        console.log("Notifications pressed");
    };

    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                <Text style={styles.brandName}>
                    <Text style={styles.brandPula}>Pula</Text>
                    <Text style={styles.brandPay}>pay</Text>
                </Text>
            </View>
            <TouchableOpacity
                style={styles.bellButton}
                onPress={handleNotifications}
                activeOpacity={0.7}
            >
                <Bell
                    color={theme.colors.text}
                    size={24}
                    strokeWidth={2}
                />
            </TouchableOpacity>
        </View>
    );
}

const getStyles = (theme: Theme, topInset: number) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: topInset + theme.spacing.s,
        paddingBottom: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandName: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    brandPula: {
        color: theme.colors.text,
    },
    brandPay: {
        color: theme.colors.primary,
    },
    bellButton: {
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.m,
    },
});
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { House, QrCode, History } from "lucide-react-native";
import { useTheme } from "@/src/theme";
import { useStyles } from "@/src/hooks/use-styles";
import { FONTS, SIZES } from "@/src/constants/theme";
import type { Theme } from "@/src/theme/types";

const ITEMS = [
    { routeName: "dashboard", label: "Accueil", Icon: House },
    { routeName: "receive-fab", label: "",        Icon: QrCode, isFab: true },
    { routeName: "history",    label: "Activité", Icon: History },
] as const;

export default function TabBar({ state, navigation }: BottomTabBarProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const s = useStyles(getStyles);
    const currentRoute = state.routes[state.index]?.name;

    const handlePress = (routeName: string, isFab?: boolean) => {
        if (isFab) {
            navigation.navigate("wallet", { screen: "receive" });
            return;
        }
        const event = navigation.emit({
            type: "tabPress",
            target: state.routes.find(r => r.name === routeName)?.key ?? "",
            canPreventDefault: true,
        });
        if (!event.defaultPrevented) {
            navigation.navigate(routeName);
        }
    };

    return (
        <View style={[s.outer, { paddingBottom: Math.max(insets.bottom, theme.spacing.s) }]}>
            {/* Background layer — clipped separately so FAB can overflow */}
            <View style={[s.bgLayer, { borderColor: theme.colors.border }]}>
                <BlurView
                    intensity={20}
                    tint={theme.mode === "dark" ? "dark" : "light"}
                    style={StyleSheet.absoluteFillObject}
                />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.tabBarBg }]} />
            </View>

            <View style={s.row}>
                {ITEMS.map((item) => {
                    const isFocused = !item.isFab && currentRoute === item.routeName;
                    const iconColor = isFocused ? theme.colors.primary : theme.colors.stone;

                    if (item.isFab) {
                        return (
                            <View key="fab" style={s.fabSlot}>
                                <TouchableOpacity
                                    onPress={() => handlePress(item.routeName, true)}
                                    activeOpacity={0.85}
                                    style={s.fabLift}
                                >
                                    <View style={s.fab}>
                                        <item.Icon color={theme.colors.onPrimary} size={SIZES.iconLg} strokeWidth={2} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    }

                    return (
                        <TouchableOpacity
                            key={item.routeName}
                            onPress={() => handlePress(item.routeName)}
                            activeOpacity={0.7}
                            style={s.tab}
                        >
                            <View style={s.tabInner}>
                                <item.Icon
                                    color={iconColor}
                                    size={SIZES.iconMd}
                                    strokeWidth={isFocused ? 2.2 : 1.8}
                                />
                                {isFocused && <View style={s.dot} />}
                                <Text style={[s.label, { color: iconColor }]}>{item.label}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    outer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        ...theme.shadows.md,
        shadowOffset: { width: 0, height: -4 },
    },
    bgLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: "hidden",
        borderTopWidth: 1,
    },
    row: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingTop: theme.spacing.s,
    },
    tab: {
        flex: 1,
        alignItems: "center",
    },
    tabInner: {
        alignItems: "center",
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.m - 4,
    },
    label: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.tabLabelSize,
        letterSpacing: 0.3,
        textTransform: "uppercase",
    },
    dot: {
        position: "absolute",
        bottom: -2,
        width: SIZES.tabDot,
        height: SIZES.tabDot,
        borderRadius: SIZES.tabDot / 2,
        backgroundColor: theme.colors.primary,
    },
    fabSlot: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: theme.spacing.xs,
    },
    fabLift: {
        transform: [{ translateY: -16 }],
    },
    fab: {
        width: SIZES.fab,
        height: SIZES.fab,
        borderRadius: SIZES.fab / 2,
        backgroundColor: theme.colors.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 10,
    },
});

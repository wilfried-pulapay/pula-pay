import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Menu } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/lib/auth";
import { useTheme } from "@/src/theme";
import { useStyles } from "@/src/hooks/use-styles";
import { FONTS, SIZES } from "@/src/constants/theme";
import type { Theme } from "@/src/theme/types";

function AvatarButton({ name, onPress, theme }: { name: string; onPress: () => void; theme: Theme }) {
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? "")
        .join("") || "?";
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.75}
            style={[styles.avatarBtn, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarText, { color: theme.colors.onPrimary }]}>{initials}</Text>
        </TouchableOpacity>
    );
}

export default function BrandHeader() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const s = useStyles(getStyles);

    return (
        <View style={[s.container, { paddingTop: insets.top + theme.spacing.s }]}>
            <TouchableOpacity style={s.iconButton} activeOpacity={0.7}>
                <Menu color={theme.colors.onHero} size={SIZES.iconLg} strokeWidth={2} />
            </TouchableOpacity>

            <Text style={s.brandName}>Pulapay</Text>

            <AvatarButton
                name={user?.name ?? ""}
                onPress={() => router.push("/(main)/profile")}
                theme={theme}
            />
        </View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        backgroundColor: theme.colors.heroBackground,
    },
    iconButton: {
        width: SIZES.iconLg + theme.spacing.m,
        height: SIZES.iconLg + theme.spacing.m,
        alignItems: "center",
        justifyContent: "center",
    },
    brandName: {
        fontFamily: FONTS.sansBold,
        fontSize: SIZES.brandFontSize,
        letterSpacing: -0.3,
        color: theme.colors.onHero,
    },
    avatarBtn: {
        width: SIZES.avatarSm,
        height: SIZES.avatarSm,
        borderRadius: SIZES.avatarSm / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontFamily: FONTS.sansBold,
        fontSize: theme.typography.caption.fontSize! + 2,
    },
});

// Non-theme styles reused by AvatarButton
const styles = StyleSheet.create({
    avatarBtn: {
        width: SIZES.avatarSm,
        height: SIZES.avatarSm,
        borderRadius: SIZES.avatarSm / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontFamily: FONTS.sansBold,
        fontSize: 13,
    },
});

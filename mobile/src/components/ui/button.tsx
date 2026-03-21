import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, StyleProp, ViewStyle, TextStyle } from "react-native";
import { useStyles } from "@/src/hooks/use-styles";
import type { Theme } from "@/src/theme/types";

type Variant = "primary" | "secondary" | "outline" | "danger";
type Size = "sm" | "default" | "lg";

type Props = {
    title: string;
    onPress: () => void;
    loading?: boolean;
    loadingText?: string;
    disabled?: boolean;
    variant?: Variant;
    size?: Size;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    fullWidth?: boolean;
};

export default function Button({
    title,
    onPress,
    loading = false,
    loadingText,
    disabled = false,
    variant = "primary",
    size = "default",
    style,
    textStyle,
    fullWidth = true,
}: Props) {
    const isDisabled = disabled || loading;
    const styles = useStyles((theme: Theme) => getStyles(theme, variant, size, isDisabled, fullWidth));

    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={isDisabled ? 1 : 0.75}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
        >
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={styles.text.color} size="small" />
                    <Text style={[styles.text, { marginLeft: 8 }, textStyle]}>
                        {loadingText ?? "Chargement..."}
                    </Text>
                </View>
            ) : (
                <Text style={[styles.text, textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const SIZE_PADDING: Record<Size, { h: number; v: number; fontSize: number }> = {
    sm:      { h: 18, v: 9,  fontSize: 12 },
    default: { h: 28, v: 14, fontSize: 14 },
    lg:      { h: 36, v: 16, fontSize: 16 },
};

const getStyles = (theme: Theme, variant: Variant, size: Size, disabled: boolean, fullWidth: boolean) => {
    const variantStyles = {
        primary: {
            bg: theme.colors.primary,
            border: theme.colors.primary,
            text: theme.colors.onPrimary,
        },
        secondary: {
            bg: theme.colors.ink,
            border: theme.colors.ink,
            text: '#FFFFFF',
        },
        outline: {
            bg: 'transparent',
            border: theme.colors.border,
            text: theme.colors.text,
        },
        danger: {
            bg: theme.colors.dangerLight,
            border: theme.colors.dangerLight,
            text: theme.colors.danger,
        },
    };

    const currentVariant = variantStyles[variant];
    const sizing = SIZE_PADDING[size];

    return StyleSheet.create({
        button: {
            borderRadius: theme.borderRadius.full,
            paddingVertical: sizing.v,
            paddingHorizontal: sizing.h,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: theme.spacing.m,
            borderWidth: 1.5,
            backgroundColor: currentVariant.bg,
            borderColor: currentVariant.border,
            alignSelf: fullWidth ? 'stretch' : 'center',
            opacity: disabled ? 0.4 : 1,
        },
        loadingContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        text: {
            fontSize: sizing.fontSize,
            fontWeight: '600',
            color: disabled ? theme.colors.textMuted : currentVariant.text,
        }
    });
};

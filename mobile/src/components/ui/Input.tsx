import { useState } from "react";
import { TextInput, StyleSheet, Text, View, TextInputProps, StyleProp, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/src/theme";
import type { Theme } from "@/src/theme/types";
import { useStyles } from "@/src/hooks/use-styles";

type Props = TextInputProps & {
    label?: string;
    helperText?: string;
    error?: string;
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
    left?: React.ReactNode;
    right?: React.ReactNode;
};

export default function Input({
    label,
    helperText,
    error,
    containerStyle,
    inputStyle,
    left,
    right,
    onFocus,
    onBlur,
    ...rest
}: Props) {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);
    const styles = useStyles((theme: Theme) => getStyles(theme, focused, !!error));

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View style={styles.field}>
                {left && <View style={styles.side}>{left}</View>}

                <TextInput
                    style={[styles.input, inputStyle]}
                    placeholderTextColor={theme.colors.placeholder}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur?.(e);
                    }}
                    {...rest}
                />

                {right && <View style={styles.side}>{right}</View>}
            </View>

            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : helperText ? (
                <Text style={styles.helperText}>{helperText}</Text>
            ) : null}
        </View>
    );
}

const getStyles = (theme: Theme, focused: boolean, hasError: boolean) => {
    let borderColor = theme.colors.border;
    let bgColor = theme.colors.surface;
    if (hasError) {
        borderColor = theme.colors.danger;
        bgColor = theme.colors.dangerLight;
    } else if (focused) {
        borderColor = theme.colors.text;
    }

    return StyleSheet.create({
        container: {
            marginBottom: theme.spacing.m,
        },
        label: {
            fontSize: 12,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 6,
        },
        field: {
            minHeight: 48,
            borderRadius: theme.borderRadius.m,
            borderWidth: 1.5,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            backgroundColor: bgColor,
            borderColor: borderColor,
        },
        side: {
            marginRight: theme.spacing.s,
        },
        input: {
            fontSize: 14,
            fontWeight: '400',
            flex: 1,
            color: theme.colors.text,
            paddingVertical: 12,
        },
        helperText: {
            fontSize: 11,
            color: theme.colors.textMuted,
            marginTop: theme.spacing.xs,
        },
        errorText: {
            fontSize: 11,
            color: theme.colors.danger,
            marginTop: theme.spacing.xs,
        },
    });
};

import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { useStyles } from '@/src/hooks/use-styles';
import { FONTS, SIZES } from '@/src/constants/theme';
import type { Theme } from '@/src/theme/types';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    onDismiss: (id: string) => void;
}

const TOAST_ICONS = {
    success: CheckCircle,
    error:   XCircle,
    warning: AlertCircle,
    info:    Info,
};

export function Toast({ id, type, message, duration = 4000, onDismiss }: ToastProps) {
    const theme = useTheme();
    const s = useStyles(getStyles);
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => handleDismiss(), duration);
        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(opacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
        ]).start(() => onDismiss(id));
    };

    const Icon = TOAST_ICONS[type];

    const statusColors = {
        success: {
            bg:        theme.colors.successLight,
            border:    theme.colors.success,
            iconColor: theme.colors.success,
            textColor: theme.colors.successText,
        },
        error: {
            bg:        theme.colors.dangerLight,
            border:    theme.colors.danger,
            iconColor: theme.colors.danger,
            textColor: theme.colors.danger,
        },
        warning: {
            bg:        theme.colors.warningLight,
            border:    theme.colors.warning,
            iconColor: theme.colors.warning,
            textColor: theme.colors.warningText,
        },
        info: {
            bg:        theme.colors.surfaceAlt,
            border:    theme.colors.border,
            iconColor: theme.colors.text,
            textColor: theme.colors.textMuted,
        },
    }[type];

    return (
        <Animated.View
            style={[
                s.container,
                {
                    backgroundColor: statusColors.bg,
                    borderColor: statusColors.border,
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Icon size={SIZES.iconMd} color={statusColors.iconColor} />
            <Text style={[s.message, { color: statusColors.textColor }]} numberOfLines={3}>
                {message}
            </Text>
            <TouchableOpacity onPress={handleDismiss} style={s.closeButton}>
                <X size={SIZES.iconSm + 2} color={statusColors.textColor} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m + 2,
        paddingVertical: theme.spacing.s + 6,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        marginBottom: theme.spacing.s,
        marginHorizontal: theme.spacing.m,
        gap: theme.spacing.m - 4,
    },
    message: {
        flex: 1,
        fontFamily: FONTS.sans,
        fontSize: SIZES.menuFontSize,
        lineHeight: theme.typography.caption.lineHeight! + 2,
    },
    closeButton: {
        padding: theme.spacing.xs,
    },
});

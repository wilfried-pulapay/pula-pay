import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react-native';
import { useTheme } from '@/src/theme';

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
    error: XCircle,
    warning: AlertCircle,
    info: Info,
};

export function Toast({ id, type, message, duration = 4000, onDismiss }: ToastProps) {
    const theme = useTheme();
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        // Fade in animation
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss after duration
        const timer = setTimeout(() => {
            handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -20,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss(id);
        });
    };

    const Icon = TOAST_ICONS[type];

    const statusColors = {
        success: {
            bg: theme.colors.successLight,
            border: theme.colors.success,
            iconColor: theme.colors.success,
            textColor: '#166357',
        },
        error: {
            bg: theme.colors.dangerLight,
            border: theme.colors.danger,
            iconColor: theme.colors.danger,
            textColor: theme.colors.danger,
        },
        warning: {
            bg: theme.colors.warningLight,
            border: theme.colors.warning,
            iconColor: theme.colors.warning,
            textColor: '#8B5E00',
        },
        info: {
            bg: theme.colors.surfaceAlt,
            border: theme.colors.border,
            iconColor: theme.colors.text,
            textColor: theme.colors.textMuted,
        },
    }[type];

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: statusColors.bg,
                    borderColor: statusColors.border,
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Icon size={20} color={statusColors.iconColor} />
            <Text style={[styles.message, { color: statusColors.textColor }]} numberOfLines={3}>
                {message}
            </Text>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                <X size={18} color={statusColors.textColor} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        marginHorizontal: 16,
        gap: 12,
    },
    message: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    closeButton: {
        padding: 4,
    },
});

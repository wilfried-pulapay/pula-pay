import { Platform } from 'react-native';
import { Spacing } from '../theme/types';

const tintColorLight = '#FF6B00';
const tintColorDark = '#FF6B00';

export const Colors = {
    light: {
        text: '#0D0D0D',
        background: '#FFFFFF',
        tint: tintColorLight,
        icon: '#6B6B6B',
        tabIconDefault: '#6B6B6B',
        tabIconSelected: tintColorLight,
    },
    dark: {
        text: '#FFFFFF',
        background: '#0D0D0D',
        tint: tintColorDark,
        icon: 'rgba(255,255,255,0.40)',
        tabIconDefault: 'rgba(255,255,255,0.40)',
        tabIconSelected: tintColorDark,
    },
};

export const FONTS = Platform.select({
    ios: {
        ui: 'system-ui',
        serif: 'Georgia',
        mono: 'ui-monospace',
    },
    default: {
        ui: 'normal',
        serif: 'serif',
        mono: 'monospace',
    },
    web: {
        ui: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
});

// Kept for backward compatibility
export const Fonts = FONTS;

export const SPACING: Spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const BORDER_RADIUS = {
    xs: 6,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    full: 9999,
};

export const TYPOGRAPHY = {
    h1:      { fontSize: 32, fontWeight: '800' as const, lineHeight: 36, letterSpacing: -1.5 },
    h2:      { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.5 },
    body:    { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.3 },
    label:   { fontSize: 10, fontWeight: '700' as const, lineHeight: 14, letterSpacing: 2, textTransform: 'uppercase' as const },
};

export const SHADOWS = {
    xs: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 40, elevation: 8 },
};
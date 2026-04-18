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
        text: '#F5F5F2',
        background: '#0A0A0A',
        tint: tintColorDark,
        icon: '#A0A0A0',
        tabIconDefault: '#A0A0A0',
        tabIconSelected: tintColorDark,
    },
};

export const FONTS = {
    sans: 'ProductSans-Regular',
    sansBold: 'ProductSans-Bold',
    sansItalic: 'ProductSans-Italic',
    sansBoldItalic: 'ProductSans-BoldItalic',
    serif: 'TimesNewRomanMTStd',
    serifBold: 'TimesNewRomanMTStd-Bold',
    serifItalic: 'TimesNewRomanMTStd-Italic',
    mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) as string,
};

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
    h1:      { fontFamily: 'ProductSans-Bold', fontSize: 32, lineHeight: 36, letterSpacing: -1.5 },
    h2:      { fontFamily: 'ProductSans-Bold', fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
    body:    { fontFamily: 'ProductSans-Regular', fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: 'ProductSans-Regular', fontSize: 11, lineHeight: 16, letterSpacing: 0.3 },
    label:   { fontFamily: 'ProductSans-Bold', fontSize: 10, lineHeight: 14, letterSpacing: 2, textTransform: 'uppercase' as const },
};

export const SIZES = {
    // Icon sizes
    iconXs:  14,   // tiny inline icons
    iconSm:  16,   // small action icons
    iconMd:  20,   // tab bar icons
    iconLg:  22,   // header / FAB icons
    iconXl:  24,   // large icons

    // Component sizes
    avatar:       56,   // user avatar circle
    avatarSm:     36,   // menu item icon container
    fab:          56,   // floating action button
    toggleWidth:  48,   // theme toggle track width
    toggleHeight: 28,   // theme toggle track height
    toggleThumb:  22,   // theme toggle thumb size
    tabDot:        4,   // active tab indicator dot

    // Typography — specific sizes not covered by TYPOGRAPHY presets
    balanceFontSize:  38,  // hero balance display
    brandFontSize:    18,  // "Pulapay" brand name
    summaryFontSize:  18,  // summary card amounts
    subtitleFontSize: 17,  // user name / subtitle headings
    menuFontSize:     13,  // menu item labels
    avatarFontSize:   20,  // initials on large (56px) avatar
    tabLabelSize:      9,  // tab bar labels
    badgeFontSize:    10,  // verified badge / tiny labels
    toggleIconSize:   12,  // icon inside theme toggle thumb
};

export const SHADOWS = {
    xs: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 40, elevation: 8 },
};
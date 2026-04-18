import { ColorPalette, Theme } from "./types";
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from "@/src/constants/theme";

const lightPalette: ColorPalette = {
    // Brand
    primary:      '#FF6B00',
    primaryDark:  '#E55E00',
    onPrimary:    '#FFFFFF',
    secondary:    '#6B6B6B',
    onSecondary:  '#FFFFFF',

    // Backgrounds
    background:   '#FFFFFF',
    surface:      '#FFFFFF',
    surfaceAlt:   '#F5F5F2',
    surfaceVariant: '#F5F5F2', // compat alias

    // Text
    text:         '#0D0D0D',
    textMuted:    '#6B6B6B',

    // Structure
    border:       '#E8E8E4',
    outline:      '#E8E8E4', // compat alias
    ink:          '#0D0D0D',

    // Inputs
    inputBackground: '#FFFFFF',
    placeholder:  '#6B6B6B',

    // Semantic
    success:      '#1F8A70',
    successLight: '#E8F5F1',
    successText:  '#166357',
    danger:       '#E53333',
    dangerLight:  '#FFF0F0',
    warning:      '#F5A623',
    warningLight: '#FFFBF0',
    warningText:  '#8B5E00',

    // Legacy
    primaryLight:  'rgba(255,107,0,0.10)',
    primaryBorder: 'rgba(255,107,0,0.25)',

    // Accent
    violet:       '#5B2EFF',
    violetLight:  '#EDEAFF',
    stone:        '#6B6B6B',

    // Hero sections (always dark regardless of app theme — intentional design)
    heroBackground:  '#0D0D0D',
    heroBackground2: '#111111',
    onHero:          '#FFFFFF',
    onHeroMuted:     'rgba(255,255,255,0.30)',
    onHeroSubtle:    'rgba(255,255,255,0.50)',
    heroBorder:      'rgba(255,255,255,0.08)',
    heroSurface:     'rgba(255,255,255,0.07)',
    overlaySubtle:   'rgba(255,255,255,0.04)',

    // UI controls
    tabBarBg:   'rgba(255,255,255,0.96)',
    toggleOff:  '#D4D4CE',
};

const light: Theme = {
    mode: "light" as const,
    colors: lightPalette,
    spacing: SPACING,
    borderRadius: BORDER_RADIUS,
    typography: TYPOGRAPHY,
    shadows: SHADOWS,
};

export default light;

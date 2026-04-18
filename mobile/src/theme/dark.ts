import { ColorPalette, Theme } from "./types";
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from "@/src/constants/theme";

const darkPalette: ColorPalette = {
    // Brand — same as light
    primary:      '#FF6B00',
    primaryDark:  '#E55E00',
    onPrimary:    '#FFFFFF',
    secondary:    'rgba(255,255,255,0.40)',
    onSecondary:  '#FFFFFF',

    // Backgrounds
    background:   '#0A0A0A',
    surface:      '#141414',
    surfaceAlt:   '#1C1C1C',
    surfaceVariant: '#1C1C1C', // compat alias

    // Text
    text:         '#F5F5F2',
    textMuted:    '#A0A0A0',

    // Structure
    border:       '#2A2A2A',
    outline:      '#2A2A2A', // compat alias
    ink:          '#0A0A0A',

    // Inputs
    inputBackground: '#252525',
    placeholder:  'rgba(245,245,242,0.30)',

    // Semantic
    success:      '#2BD4A0',
    successLight: 'rgba(31,138,112,0.15)',
    successText:  '#2BD4A0',
    danger:       '#FF6B6B',
    dangerLight:  'rgba(229,51,51,0.12)',
    warning:      '#F5A623',
    warningLight: 'rgba(245,166,35,0.12)',
    warningText:  '#F5A623',

    // Legacy
    primaryLight:  'rgba(255,107,0,0.12)',
    primaryBorder: 'rgba(255,107,0,0.25)',

    // Accent
    violet:       '#8B7AFF',
    violetLight:  'rgba(140,120,255,0.12)',
    stone:        '#A0A0A0',

    // Hero sections (always dark)
    heroBackground:  '#0D0D0D',
    heroBackground2: '#111111',
    onHero:          '#FFFFFF',
    onHeroMuted:     'rgba(255,255,255,0.30)',
    onHeroSubtle:    'rgba(255,255,255,0.50)',
    heroBorder:      'rgba(255,255,255,0.08)',
    heroSurface:     'rgba(255,255,255,0.07)',
    overlaySubtle:   'rgba(255,255,255,0.04)',

    // UI controls
    tabBarBg:   'rgba(10,10,10,0.96)',
    toggleOff:  '#3A3A3A',
};

const dark: Theme = {
    mode: "dark" as const,
    colors: darkPalette,
    spacing: SPACING,
    borderRadius: BORDER_RADIUS,
    typography: TYPOGRAPHY,
    shadows: SHADOWS,
};

export default dark;

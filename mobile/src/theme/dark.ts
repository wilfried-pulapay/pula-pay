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
    background:   '#0D0D0D',
    surface:      '#161616',
    surfaceAlt:   'rgba(255,255,255,0.04)',
    surfaceVariant: 'rgba(255,255,255,0.04)', // compat alias

    // Text
    text:         '#FFFFFF',
    textMuted:    'rgba(255,255,255,0.40)',

    // Structure
    border:       'rgba(255,255,255,0.08)',
    outline:      'rgba(255,255,255,0.08)', // compat alias
    ink:          '#0D0D0D',

    // Inputs
    inputBackground: '#161616',
    placeholder:  'rgba(255,255,255,0.30)',

    // Semantic
    success:      '#1F8A70',
    successLight: 'rgba(31,138,112,0.15)',
    danger:       '#E53333',
    dangerLight:  'rgba(229,51,51,0.12)',
    warning:      '#F5A623',
    warningLight: 'rgba(245,166,35,0.12)',

    // Legacy
    primaryLight: 'rgba(255,107,0,0.12)',
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

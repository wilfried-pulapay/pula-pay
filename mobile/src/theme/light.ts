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
    danger:       '#E53333',
    dangerLight:  '#FFF0F0',
    warning:      '#F5A623',
    warningLight: '#FFFBF0',

    // Legacy
    primaryLight: 'rgba(255,107,0,0.10)',
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

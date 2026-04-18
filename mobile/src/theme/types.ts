import { TextStyle } from "react-native";

export type ColorPalette = {
  // Brand colors
  primary: string;
  primaryDark: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;

  // Surface & Background
  background: string;
  surface: string;
  surfaceVariant: string;  // kept for compat — equals surfaceAlt
  surfaceAlt: string;      // mist / alternate section bg

  // Text
  text: string;
  textMuted: string;
  outline: string;         // kept for compat — equals border
  border: string;          // rule color for dividers and input borders
  ink: string;             // near-black for dark surfaces

  // Inputs
  inputBackground: string;
  placeholder: string;

  // Feedback
  success: string;
  successLight: string;
  successText: string;   // text on successLight backgrounds
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  warningText: string;   // text on warningLight backgrounds

  // Light variants
  primaryLight: string;
  primaryBorder: string;  // rgba(255,107,0,0.25) — border tint for primary-accented boxes

  // Accent
  violet: string;
  violetLight: string;
  stone: string;

  // Hero sections — intentionally always dark regardless of app theme
  heroBackground: string;   // #0D0D0D — base of hero gradient
  heroBackground2: string;  // #111111 — end of hero gradient
  onHero: string;           // #FFFFFF — text/icons on hero
  onHeroMuted: string;      // rgba(255,255,255,0.30) — muted text on hero
  onHeroSubtle: string;     // rgba(255,255,255,0.50) — subtle icons on hero
  heroBorder: string;       // rgba(255,255,255,0.08) — borders on hero
  heroSurface: string;      // rgba(255,255,255,0.07) — button bg on hero
  overlaySubtle: string;    // rgba(255,255,255,0.04) — very subtle card bg on dark

  // UI controls
  tabBarBg: string;   // tab bar background (theme-aware)
  toggleOff: string;  // toggle track when inactive
};

export type Spacing = {
  xs: number;
  s: number;
  m: number;
  l: number;
  xl: number;
  xxl: number;
};

export type Theme = {
  mode: "light" | "dark";
  colors: ColorPalette;
  spacing: Spacing;
  borderRadius: {
    xs: number;
    s: number;
    m: number;
    l: number;
    xl: number;
    full: number;
  };
  typography: {
    h1: TextStyle;
    h2: TextStyle;
    body: TextStyle;
    caption: TextStyle;
    label: TextStyle;
  };
  shadows: {
    xs: object;
    sm: object;
    md: object;
    lg: object;
  };
};

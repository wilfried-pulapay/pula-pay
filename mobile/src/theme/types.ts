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
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;

  // Light variants
  primaryLight: string;
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

import { Platform } from "react-native";

export const colors = {
  navy900: "#0B132B",
  navy800: "#1C2541",
  navy700: "#2A3A5F",
  gold500: "#D4AF37",
  gold400: "#E5C158",
  gold100: "#FBF3D3",
  sage700: "#4A5D23",
  sage600: "#556B2F",
  sage100: "#E8ECE1",
  bg: "#FAFAF6",
  surface: "#FFFFFF",
  paper: "#F3EEE0",
  border: "#D7D3C4",
  borderStrong: "#0B132B",
  text: "#1E293B",
  textMuted: "#5A6270",
  danger: "#8B2E2E",
};

export const fonts = {
  heading: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }) as string,
  headingBold: Platform.select({ ios: "Georgia-Bold", android: "serif", default: "serif" }) as string,
  body: Platform.select({ ios: "System", android: "sans-serif", default: "System" }) as string,
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) as string,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  none: 0,
  sm: 2,
  md: 4,
};

export const type = {
  h1: { fontFamily: fonts.heading, fontWeight: "700" as const, fontSize: 32, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.heading, fontWeight: "700" as const, fontSize: 24 },
  h3: { fontFamily: fonts.heading, fontWeight: "600" as const, fontSize: 18 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.body, fontSize: 15, fontWeight: "600" as const },
  small: { fontFamily: fonts.body, fontSize: 12 },
  mono: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 0.5 },
  monoLg: { fontFamily: fonts.mono, fontSize: 16, letterSpacing: 0.5, fontWeight: "600" as const },
  label: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1.5, fontWeight: "600" as const, textTransform: "uppercase" as const },
};

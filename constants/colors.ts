const Colors = {
  light: {
    text: "#1A1A2E",
    textSecondary: "#6B7280",
    background: "#F5F7FA",
    surface: "#FFFFFF",
    surfaceSecondary: "#EDF2F7",
    tint: "#0D9488",
    accent: "#0D9488",
    accentLight: "#CCFBF1",
    correct: "#10B981",
    correctLight: "#D1FAE5",
    incorrect: "#EF4444",
    incorrectLight: "#FEE2E2",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    border: "#E5E7EB",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: "#0D9488",
    cardShadow: "rgba(0, 0, 0, 0.06)",
    overlay: "rgba(0, 0, 0, 0.5)",
  },
  dark: {
    text: "#F3F4F6",
    textSecondary: "#9CA3AF",
    background: "#0F172A",
    surface: "#1E293B",
    surfaceSecondary: "#334155",
    tint: "#14B8A6",
    accent: "#14B8A6",
    accentLight: "#042F2E",
    correct: "#34D399",
    correctLight: "#064E3B",
    incorrect: "#F87171",
    incorrectLight: "#7F1D1D",
    warning: "#FBBF24",
    warningLight: "#78350F",
    border: "#374151",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#14B8A6",
    cardShadow: "rgba(0, 0, 0, 0.3)",
    overlay: "rgba(0, 0, 0, 0.7)",
  },
};

export default Colors;

export function useThemeColors(colorScheme: "light" | "dark" | null | undefined) {
  return colorScheme === "dark" ? Colors.dark : Colors.light;
}

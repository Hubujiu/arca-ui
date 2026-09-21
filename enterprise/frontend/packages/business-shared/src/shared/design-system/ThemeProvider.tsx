import { MotionPreferenceContext } from "@/lib/motion-preference";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { DEFAULT_APPEARANCE, type Appearance } from "./theme-core";

type ThemeContextValue = {
  appearance: Appearance;
  dark: boolean;
  reducedMotion: boolean;
  update: (next: Appearance) => boolean;
  reset: () => boolean;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function readAppearance(): Appearance {
  return { ...DEFAULT_APPEARANCE, mode: "light" };
}
export function ThemeProvider({ children, forceReducedMotion = false }: { children: ReactNode; forceReducedMotion?: boolean }) {
  const [appearance] = useState(readAppearance);
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const dark = false;
  const reducedMotion = forceReducedMotion || appearance.motion === "reduced" || systemReduced;
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionChanged = () => setSystemReduced(motionQuery.matches);
    motionQuery.addEventListener("change", motionChanged);
    return () => {
      motionQuery.removeEventListener("change", motionChanged);
    };
  }, []);
  const value = useMemo<ThemeContextValue>(() => ({
    appearance, dark, reducedMotion,
    update() { return false; },
    reset() { return false; },
  }), [appearance, dark, reducedMotion]);
  return <ThemeContext.Provider value={value}><MotionPreferenceContext.Provider value={reducedMotion}><MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>{children}</MotionConfig></MotionPreferenceContext.Provider></ThemeContext.Provider>;
}
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used within ThemeProvider");
  return theme;
}

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { darkTheme, lightTheme, useMediaQuery } from "../utils/theme";

type Mode = "system" | "light" | "dark";

type ColorModeContext = {
  mode: Mode;
  toggleMode: () => void;
  theme: typeof lightTheme;
};

const STORAGE_KEY = "shisetsu-viewer-color-mode";
const MODES: Mode[] = ["system", "light", "dark"];

const Context = createContext<ColorModeContext>({
  mode: "system",
  toggleMode: () => {},
  theme: lightTheme,
});

const getStoredMode = (): Mode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable
  }
  return "system";
};

export const ColorModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<Mode>(getStoredMode);
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const idx = MODES.indexOf(prev);
      /* istanbul ignore next -- MODES index is always valid via modulo */
      const next = MODES[(idx + 1) % MODES.length] ?? "system";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const value = useMemo(() => ({ mode, toggleMode, theme }), [mode, toggleMode, theme]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useColorMode = () => useContext(Context);

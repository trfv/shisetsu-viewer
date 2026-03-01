import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Mode = "system" | "light" | "dark";

type ColorModeContext = {
  mode: Mode;
  isDark: boolean;
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
};

const STORAGE_KEY = "shisetsu-viewer-color-mode";
const MODES: Mode[] = ["system", "light", "dark"];
const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

const Context = createContext<ColorModeContext>({
  mode: "system",
  isDark: false,
  toggleMode: () => {},
  setMode: () => {},
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
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia(PREFERS_DARK_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(PREFERS_DARK_QUERY);
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const persistAndSetMode = useCallback((next: Mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
    setMode(next);
  }, []);

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

  // Set data-theme attribute on <html> for CSS Custom Properties
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const value = useMemo(
    () => ({ mode, isDark, toggleMode, setMode: persistAndSetMode }),
    [mode, isDark, toggleMode, persistAndSetMode]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useColorMode = () => useContext(Context);

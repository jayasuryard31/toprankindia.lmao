import { createContext, useContext, useState, useEffect, useRef } from "react";
import { currentTimeOfDay } from "../components/map/three/timeOfDay";

const ThemeContext = createContext();

const STORE_KEY = "tri-theme";

/** The theme the wall clock wants: dark after dusk, light during the day. */
function themeForClock() {
  return currentTimeOfDay() === "night" ? "dark" : "light";
}

/**
 * Theme is CLOCK-DRIVEN, not sticky.
 *
 * The site (and the 3D city with it) goes dark on its own at night and light
 * again in the morning - the user never has to think about it. A manual toggle
 * still wins, but only until the next phase boundary, so "switch to dark at
 * night automatically" keeps working for someone who flipped to light at noon.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      // An override only survives inside the phase it was made in.
      if (saved && saved.phase === currentTimeOfDay()) return saved.theme;
    } catch {
      /* ignore */
    }
    return themeForClock();
  });

  // The phase the current value was decided in - used to expire overrides.
  const phaseRef = useRef(currentTimeOfDay());
  const manualRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ theme, phase: phaseRef.current, manual: manualRef.current })
      );
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Follow the clock across phase boundaries. Checked once a minute; a manual
  // choice is dropped the moment the day rolls into the next phase.
  useEffect(() => {
    const tick = () => {
      const phase = currentTimeOfDay();
      if (phase === phaseRef.current) return;
      phaseRef.current = phase;
      manualRef.current = false;
      setThemeState(themeForClock());
    };
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const setTheme = (next) => {
    manualRef.current = true;
    phaseRef.current = currentTimeOfDay();
    setThemeState(next);
  };
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

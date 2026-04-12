import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "dark",
  toggle: () =>
    set((state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("elephant-theme", next); } catch {}
      }
      return { theme: next };
    }),
}));

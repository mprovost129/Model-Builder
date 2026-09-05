/**
 * Light/dark interface theme, stored per browser and shared through a custom
 * event so every subscriber updates together.
 * Extracted from app/model-builder-app.tsx.
 */

export const INTERFACE_THEME_STORAGE_KEY = "model-builder:interface-theme:v1";

export const INTERFACE_THEME_CHANGE_EVENT = "model-builder:interface-theme-change";

export type InterfaceTheme = "dark" | "light";

let interfaceThemeFallback: InterfaceTheme = "light";

export function storedInterfaceTheme(): InterfaceTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(INTERFACE_THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : interfaceThemeFallback;
  } catch {
    return interfaceThemeFallback;
  }
}

export function subscribeInterfaceTheme(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === INTERFACE_THEME_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(INTERFACE_THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(INTERFACE_THEME_CHANGE_EVENT, onStoreChange);
  };
}

export function setStoredInterfaceTheme(theme: InterfaceTheme) {
  interfaceThemeFallback = theme;
  try {
    window.localStorage.setItem(INTERFACE_THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme remains available through the current render.
  }
  window.dispatchEvent(new Event(INTERFACE_THEME_CHANGE_EVENT));
}

// ═══════════════════════════════════════════════════════
// SERVANA — Dark Mode Utility
// Import and call initDarkMode() on every page.
// ═══════════════════════════════════════════════════════

const DARK = {
  "--text-1":    "#E4EAFF",
  "--text-2":    "#7D8FC4",
  "--text-3":    "#3D4E7A",
  "--border":    "#1C2860",
  "--bg":        "#080E30",
  "--bg-page":   "#060C28",
  "--bg-card":   "#0F1848",
  "--bg-subtle": "#111D52",
  "--bg-surface":"#0A1240",
};

const LIGHT = {
  "--text-1":    "#0D1B4B",
  "--text-2":    "#4A5880",
  "--text-3":    "#8C9BBF",
  "--border":    "#E2E8F8",
  "--bg":        "#EEF2FF",
  "--bg-page":   "#EEF2FF",
  "--bg-card":   "#FFFFFF",
  "--bg-subtle": "#F5F7FF",
  "--bg-surface":"#FFFFFF",
};

export function applyTheme(dark) {
  const vars = dark ? DARK : LIGHT;
  Object.entries(vars).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v)
  );
  localStorage.setItem("servana-dark", dark ? "true" : "false");
}

export function initDarkMode() {
  const saved = localStorage.getItem("servana-dark");
  if (saved === "true")  applyTheme(true);
  if (saved === "false") applyTheme(false);
  // No saved preference → CSS @media(prefers-color-scheme) handles it
}

export function isDarkMode() {
  const saved = localStorage.getItem("servana-dark");
  if (saved !== null) return saved === "true";
  return window.matchMedia?.("(prefers-color-scheme:dark)").matches ?? false;
}
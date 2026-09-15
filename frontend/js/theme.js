const KEY = "lender-theme-v2";
const THEMES = [
  { id: "neverland", label: "Neverland" },
  { id: "mermaid-lagoon", label: "Lagoon" },
  { id: "grove", label: "Lender" },
];
const DEFAULT_THEME = "neverland";

function readTheme() {
  try {
    const raw = localStorage.getItem(KEY);
    if (THEMES.some((t) => t.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

function applyTheme(id) {
  const root = document.documentElement;
  for (const t of THEMES) root.classList.remove(`theme-${t.id}`);
  root.classList.remove("theme-skull-rock", "theme-second-star");
  root.classList.add(`theme-${id}`);
  root.dataset.theme = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  const current = THEMES.find((t) => t.id === id) || THEMES[0];
  const btn = document.getElementById("theme-cycle");
  if (btn) {
    const i = THEMES.findIndex((t) => t.id === id);
    const next = THEMES[(i + 1) % THEMES.length];
    btn.title = `Theme: ${current.label}. Next: ${next.label}`;
    btn.setAttribute(
      "aria-label",
      `Colour theme ${current.label}. Click to switch to ${next.label}`,
    );
  }
}

function cycleTheme() {
  const id = readTheme();
  const i = THEMES.findIndex((t) => t.id === id);
  applyTheme(THEMES[(i + 1) % THEMES.length].id);
}

applyTheme(readTheme());
document.getElementById("theme-cycle")?.addEventListener("click", cycleTheme);

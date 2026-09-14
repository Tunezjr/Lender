const KEY = "lender-neverland-theme";
const THEMES = [
  { id: "grove", label: "Lender" },
  { id: "neverland", label: "Neverland" },
  { id: "skull-rock", label: "Skull Rock" },
  { id: "mermaid-lagoon", label: "Lagoon" },
  { id: "second-star", label: "Second Star" },
];

function readTheme() {
  try {
    const raw = localStorage.getItem(KEY);
    if (THEMES.some((t) => t.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return "grove";
}

function applyTheme(id) {
  const root = document.documentElement;
  for (const t of THEMES) root.classList.remove(`theme-${t.id}`);
  root.classList.add(`theme-${id}`);
  root.dataset.theme = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  const current = THEMES.find((t) => t.id === id) || THEMES[0];
  const label = document.getElementById("theme-label");
  const btn = document.getElementById("theme-cycle");
  if (label) label.textContent = current.label;
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

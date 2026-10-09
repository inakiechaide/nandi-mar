import { CONFIG } from './config.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const UI = CONFIG.ui;
export const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

export const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const toDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

export const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

export const fmt = (d, o) => new Intl.DateTimeFormat(CONFIG.site.lang, o).format(d);

export const isPast = ev => toDate(ev.endDate || ev.date) < TODAY;

export const byDate = (a, b) => toDate(a.date) - toDate(b.date);

/* ==== ESTILOS EDITABLES ==== */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export const TONES = ["selva", "tierra", "fuego", "musgo"];
// Colores que se pueden cambiar desde el panel, con su valor original (el de styles.css).
export const THEME_COLORS = {
  earth: { label: "Fondo del sitio", value: "#1E1712" },
  "earth-2": { label: "Fondo de tarjetas", value: "#271E17" },
  cream: { label: "Texto", value: "#EFE4D2" },
  "cream-2": { label: "Texto secundario", value: "#CFC2AC" },
  ocre: { label: "Acento ocre (botones)", value: "#C9A15B" },
  terra: { label: "Acento tierra", value: "#B5653A" },
  musgo: { label: "Acento musgo", value: "#4F6B4A" },
  jungle: { label: "Verde selva (fondos)", value: "#1F3A2E" }
};

// Cada color arrastra a sus derivados (líneas, tonos claros, velos) para que el conjunto siga combinando.
const DERIVED = {
  earth: c => ({ "--c-veil": `color-mix(in srgb,${c} 72%,transparent)`, "--c-veil-2": `color-mix(in srgb,${c} 90%,transparent)` }),
  "earth-2": c => ({ "--c-earth-3": `color-mix(in srgb,${c} 88%,var(--c-cream))` }),
  cream: c => ({ "--c-line": `color-mix(in srgb,${c} 12%,transparent)`, "--c-line-strong": `color-mix(in srgb,${c} 28%,transparent)`, "--c-mute": `color-mix(in srgb,${c} 62%,var(--c-earth))` }),
  ocre: c => ({ "--c-ocre-ink": `color-mix(in srgb,${c} 72%,var(--c-cream))` }),
  terra: c => ({ "--c-terra-ink": `color-mix(in srgb,${c} 62%,var(--c-cream))` }),
  musgo: c => ({ "--c-musgo-ink": `color-mix(in srgb,${c} 50%,var(--c-cream))` }),
  jungle: c => ({ "--c-jungle-deep": `color-mix(in srgb,${c} 72%,#000)` })
};

export function themeVars(theme) {
  const vars = {};
  for (const key of Object.keys(THEME_COLORS)) {
    const color = theme?.colors?.[key];
    if (!HEX.test(color || "") || color.toLowerCase() === THEME_COLORS[key].value.toLowerCase()) continue;
    Object.assign(vars, { [`--c-${key}`]: color }, DERIVED[key]?.(color));
  }
  return vars;
}

export function applyTheme(theme, root = document.documentElement) {
  (root.dataset.theme || "").split(" ").filter(Boolean).forEach(name => root.style.removeProperty(name));
  const vars = themeVars(theme);
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  root.dataset.theme = Object.keys(vars).join(" ");
}

// Fondo propio de una sección: color liso, degradado del sitio o foto con velo.
export const bgStyle = bg => {
  if (bg?.type === "color" && HEX.test(bg.color || "")) return `background:${bg.color}`;
  if (bg?.type === "tone" && TONES.includes(bg.tone)) return `background:var(--motif),var(--grad-${bg.tone});background-size:240px,cover`;
  if (bg?.type === "image" && bg.image) {
    // El velo usa el color de fondo del sitio, así el texto se lee con cualquier paleta.
    const veil = `color-mix(in srgb,var(--c-earth) ${Math.round(Math.min(1, Math.max(0, Number(bg.veil ?? 0.6) || 0)) * 100)}%,transparent)`;
    return `background:linear-gradient(${veil},${veil}),url("${encodeURI(bg.image)}") center/cover no-repeat`;
  }
  return "";
};

export const accentStyle = area => `--accent:var(--c-${area.accent});--accent-ink:var(--c-${area.accent}-ink)`;

export const EVENTS_URL = "data/events.json";

export let EVENTS = [];

export const setEvents = list => {
  EVENTS = list.map((ev, i) => ({ ...ev, id: `ev-${i}`, area: CONFIG.areas.find(a => a.id === ev.area) })).filter(ev => ev.area && ev.date);
};

export async function loadEvents() {
  try {
    const res = await fetch(EVENTS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    setEvents(await res.json());
  } catch (err) {
    console.error("No se pudieron cargar los eventos", err);
    setEvents([]);
  }
}

export const rangeLabel = ev => {
  const a = toDate(ev.date);
  if (!ev.endDate) return fmt(a, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const b = toDate(ev.endDate);
  const start = a.getMonth() === b.getMonth() ? a.getDate() : fmt(a, { day: "numeric", month: "long" });
  return `${start} al ${fmt(b, { day: "numeric", month: "long", year: "numeric" })}`;
};

export const ICONS = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
  spotify: '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.6c3-1 6.5-.8 9 .8M8 12.7c2.5-.7 5.2-.5 7.3.7M8.6 15.5c2-.5 3.9-.3 5.5.5"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
  whatsapp: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8.1 19z"/><path d="M9 9c.3 2.6 2.4 4.7 5 5l1-1.2 1.6.8"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/>',
  play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>'
};

export const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;

export const divider = () => `<svg class="divider" viewBox="0 0 240 24" aria-hidden="true"><path d="M0 12h88M152 12h88" stroke="currentColor" stroke-width=".8" fill="none"/><path d="M120 2c-7 5-7 15 0 20 7-5 7-15 0-20zM104 12c-5-4-11-4-14 0 3 4 9 4 14 0zM136 12c5-4 11-4 14 0-3 4-9 4-14 0z" fill="currentColor"/></svg>`;

export const renderImage = (img, parallax = 0) => {
  const p = parallax ? ` data-parallax="${parallax}"` : "";
  return img.src
    ? `<img class="frame__img" src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy"${p}>`
    : `<div class="frame__img ph ph--${esc(img.tone || "tierra")}" role="img" aria-label="${esc(img.alt)}"${p}></div>`;
};

export const navItems = () => [
  { id: CONFIG.about.id, label: CONFIG.about.navLabel },
  ...CONFIG.areas.map(a => ({ id: a.id, label: a.navLabel })),
  { id: CONFIG.agenda.id, label: CONFIG.agenda.navLabel },
  { id: CONFIG.contact.id, label: CONFIG.contact.navLabel }
];

export const lockScroll = on => document.documentElement.classList.toggle("is-locked", on);

async function onSubscribe(email) {
  const subject = encodeURIComponent("Suscripción — Carta de luna");

  const body = encodeURIComponent(
    `Hola,

Quiero suscribirme a la Carta de luna.

Mi email es: ${email}

Gracias.`
  );

  window.location.href =
    `mailto:${CONFIG.newsletter.email}?subject=${subject}&body=${body}`;

  return true;
}

export { onSubscribe };

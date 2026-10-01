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

export const accentStyle = area => `--accent:var(--c-${area.accent});--accent-ink:var(--c-${area.accent}-ink)`;

export const EVENTS = CONFIG.areas.flatMap(area => area.events.map((ev, i) => ({ ...ev, id: `${area.id}-${i}`, area })));

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

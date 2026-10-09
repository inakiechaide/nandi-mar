// js/admin/sections.js
import { CONFIG } from '../modules/config.js';
import * as U from '../modules/utils.js';
import * as C from '../modules/components.js';

const { $, esc } = U;
const state = { config: null, sha: null };

// Partes de CONFIG que se editan desde acá.
const EDITABLE = ["site", "theme", "about", "areas", "agenda", "contact", "socials", "newsletter"];
const pick = src => Object.fromEntries(EDITABLE.map(k => [k, src?.[k]]));
const sleep = ms => new Promise(done => setTimeout(done, ms));
let rawEvents = [];

/* ==== HELPERS ==== */
const clone = v => JSON.parse(JSON.stringify(v ?? null));
const val = (form, name) => (form.elements[name]?.value ?? "").trim();
const setVal = (form, name, v) => { const el = form.elements[name]; if (el) el.value = v ?? ""; };
const setError = (form, text = "") => { const el = form && $("[data-error]", form); if (el) el.textContent = text; };
const openDialog = sel => { const d = $(sel); if (d && !d.open) d.showModal(); return d; };
const closeDialog = sel => { const d = $(sel); if (d?.open) d.close(); };

// Si falta un elemento en el HTML avisa por consola en vez de romper todo el módulo.
function on(sel, type, fn) {
  const el = $(sel);
  if (!el) { console.warn(`[secciones] Falta en admin.html: ${sel}`); return; }
  el.addEventListener(type, fn);
}

const trimRows = rows => rows
  .map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])))
  .filter(r => Object.values(r).some(v => v !== "" && v != null));

let toastTimer;
function toast(text, error = false) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = text;
  el.className = `admin__toast is-on${error ? " is-error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), error ? 6000 : 3500);
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api/${path}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function busy(form, fn) {
  const btn = $('button[type="submit"]', form);
  const label = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Guardando…"; }
  try { return await fn(); } finally { if (btn) { btn.disabled = false; btn.textContent = label; } }
}

/* ==== CARGA Y GUARDADO ==== */
function listMessage(text) {
  const list = $("#sections-list");
  if (list) list.innerHTML = `<li class="admin__empty">${esc(text)}</li>`;
}

async function loadConfig() {
  try {
    const data = await api("config");
    if (!data.config) throw new Error("El servidor no devolvió la configuración.");
    state.config = data.config;
    state.sha = data.sha;
    applyConfig();
    renderSections();
    return true;
  } catch (err) {
    console.error("[secciones] Error al cargar config:", err);
    if (err.status === 401) {
      toast(err.message, true);
      setTimeout(() => window.location.reload(), 1200);
    } else {
      if (!state.config) listMessage(err.message);
      toast(err.message, true);
    }
    return false;
  }
}

// Guarda `next` y recién si el servidor lo acepta lo pasa a ser el estado actual.
async function saveConfig(next, message, form = null) {
  try {
    const data = await api("config", { method: "PUT", body: { config: next, sha: state.sha, message } });
    state.config = data.config;
    state.sha = data.sha;
    applyConfig();
    renderSections();
    toast("Guardado. Publicando… te aviso cuando esté en el sitio.");
    watchDeploy(data.config);
    return true;
  } catch (err) {
    if (err.status === 401) {
      toast(err.message, true);
      setTimeout(() => window.location.reload(), 1200);
      return false;
    }
    if (err.status === 409) await loadConfig();
    if (form) setError(form, err.message); else toast(err.message, true);
    return false;
  }
}

// Espera a que el deploy termine: el sitio publicado pasa a servir exactamente lo que se guardó.
let watching = 0;
async function watchDeploy(config) {
  const id = ++watching;
  const want = `export const CONFIG = ${JSON.stringify(config, null, 2)};`;
  for (let i = 0; i < 30; i++) {
    await sleep(4000);
    if (id !== watching) return;
    const live = await fetch(`js/modules/config.js?t=${Date.now()}`, { cache: "no-store" }).then(r => r.text()).catch(() => "");
    if (live.trim() === want) return toast("Publicado: el sitio ya muestra los cambios.");
  }
  toast("El guardado está hecho, pero el sitio todavía no lo muestra. Revisá el deploy en Vercel.", true);
}

// El CONFIG que importó la página es el del último deploy; lo guardado en GitHub puede ser más nuevo.
// Se actualiza en memoria para que el resto del panel (por ejemplo el selector de áreas) lo vea.
function applyConfig() {
  Object.assign(CONFIG, pick(state.config));
  U.setEvents(rawEvents);
  document.dispatchEvent(new CustomEvent("config:changed"));
}

function renderSections() {
  const list = $("#sections-list");
  if (!list || !state.config) return;
  const areas = state.config.areas || [];
  list.innerHTML = `
    <li class="admin__section-item">
      <div><h3>Estilos</h3><p class="admin__meta">Colores del sitio, foto de portada y fondo de la agenda</p></div>
      <span class="admin__btns"><button class="btn btn--ghost btn--sm" type="button" data-edit-style>Editar</button></span>
    </li>
    <li class="admin__section-item">
      <div><h3>Sobre mí</h3><p class="admin__meta">Título, lead, párrafos, cita, imagen y fondo</p></div>
      <span class="admin__btns"><button class="btn btn--ghost btn--sm" type="button" data-edit-about>Editar</button></span>
    </li>
    <li class="admin__section-item">
      <div><h3>Áreas</h3><p class="admin__meta">${areas.length} áreas: ${areas.map(a => esc(a.navLabel ?? "")).join(", ")}</p></div>
      <span class="admin__btns"><button class="btn btn--ghost btn--sm" type="button" data-edit-areas>Editar</button></span>
    </li>
    <li class="admin__section-item">
      <div><h3>Contacto y redes</h3><p class="admin__meta">Texto de contacto, redes sociales, newsletter y fondo</p></div>
      <span class="admin__btns"><button class="btn btn--ghost btn--sm" type="button" data-edit-contact>Editar</button></span>
    </li>`;
}

/* ==== VISTA PREVIA ====
   Cada vista previa es un iframe que carga las mismas hojas de estilo que el sitio
   (sin admin.css) y se dibuja a ancho real de escritorio o de celular, escalado para
   entrar en el panel. Así los media queries y las fuentes se comportan como en la web. */
const VIEWPORTS = { desktop: 1280, mobile: 390 };
const PREVIEW_CSS = "html{scroll-behavior:auto}body{display:flow-root;position:relative;overflow:hidden}.reveal{opacity:1!important;transform:none!important}.nav{position:absolute}.hero{min-height:820px}.hero__content>*{animation:none!important}";

function siteHead() {
  const links = [...document.querySelectorAll('link[rel~="stylesheet"],link[rel~="preconnect"]')]
    .filter(l => !/admin[^/]*\.css/i.test(l.getAttribute("href") || ""))
    .map(l => `<link rel="${l.rel}" href="${l.href}"${l.hasAttribute("crossorigin") ? " crossorigin" : ""}>`);
  const styles = [...document.querySelectorAll("style")].map(s => `<style>${s.textContent}</style>`);
  return [...links, ...styles].join("");
}

function createPreview(host) {
  let mode = "desktop", doc = null, root = null, html = "", theme = null, timer;

  host.className = "admin__preview-content";
  host.innerHTML = `
    <div class="admin__preview-bar" role="group" aria-label="Tamaño de la vista previa">
      <button type="button" class="btn btn--ghost btn--sm" data-vp="desktop" aria-pressed="true">Escritorio</button>
      <button type="button" class="btn btn--ghost btn--sm" data-vp="mobile" aria-pressed="false">Móvil</button>
    </div>
    <div class="admin__frame"></div>`;
  const wrap = $(".admin__frame", host);
  const frame = document.createElement("iframe");
  frame.title = "Vista previa";
  frame.tabIndex = -1;
  frame.setAttribute("scrolling", "no");

  function fit() {
    const vw = VIEWPORTS[mode], avail = wrap.clientWidth;
    if (!avail) return;
    const scale = Math.min(1, avail / vw);
    frame.style.width = `${vw}px`;
    const h = doc ? doc.body.offsetHeight : 0;
    frame.style.height = `${h}px`;
    frame.style.transform = `scale(${scale})`;
    frame.style.left = `${Math.max(0, (avail - vw * scale) / 2)}px`;
    wrap.style.height = `${Math.ceil(h * scale)}px`;
  }

  function paint() {
    if (!root) return;
    // Una imagen recién subida todavía no está publicada: se muestra la copia local.
    let markup = html;
    localImages.forEach((local, path) => { markup = markup.replaceAll(path, local); });
    root.innerHTML = markup;
    U.applyTheme(theme, doc.documentElement);
    root.querySelectorAll("img").forEach(img => img.addEventListener("load", fit, { once: true }));
    fit();
  }

  frame.addEventListener("load", () => {
    const d = frame.contentDocument;
    if (!d?.getElementById("root")) return;
    doc = d;
    root = d.getElementById("root");
    d.addEventListener("click", e => e.preventDefault(), true);
    d.addEventListener("submit", e => e.preventDefault(), true);
    new frame.contentWindow.ResizeObserver(fit).observe(d.body);
    paint();
  });

  frame.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${location.origin}/">${siteHead()}<style>${PREVIEW_CSS}</style></head><body><main id="root"></main></body></html>`;
  wrap.append(frame);
  new ResizeObserver(fit).observe(wrap);

  host.addEventListener("click", e => {
    const btn = e.target.closest("[data-vp]");
    if (!btn) return;
    mode = btn.dataset.vp;
    host.querySelectorAll("[data-vp]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
    fit();
  });

  return {
    render(next, nextTheme) {
      html = next;
      theme = nextTheme;
      clearTimeout(timer);
      timer = setTimeout(paint, 120);
    }
  };
}

const previews = {};
// Dibuja `body()` con el borrador puesto, debajo de la barra de menú real y con los colores del tema.
function preview(name, draft, body) {
  const host = $(`#${name}-preview`);
  if (!host) return;
  previews[name] ??= createPreview(host);
  let html, theme = state.config?.theme;
  try {
    html = withDraft(draft, () => {
      theme = CONFIG.theme;
      return `<header class="nav nav--solid">${C.renderNav(U.navItems()).bar}</header>${body()}`;
    });
  } catch (err) {
    console.error(`[secciones] Vista previa "${name}":`, err);
    html = `<p style="padding:2rem;color:#E39A70">No se pudo generar la vista previa: ${esc(err.message)}</p>`;
  }
  previews[name].render(html, theme);
}

// Dibuja con los mismos componentes que usa el sitio. Como esos componentes leen CONFIG y los
// eventos, se les pone el borrador por un instante y se restaura lo guardado al terminar.
function withDraft(draft, render) {
  const saved = pick(CONFIG);
  Object.assign(CONFIG, pick(state.config), draft);
  U.setEvents(rawEvents);
  try { return render(); } finally { Object.assign(CONFIG, saved); U.setEvents(rawEvents); }
}

/* ==== FONDO DE SECCIÓN ==== */
const BG_DEFAULT = { color: "#1E1712", tone: "selva", veil: 0.6 };
const TONE_LABELS = { selva: "Selva", tierra: "Tierra", fuego: "Fuego", musgo: "Musgo" };
const toneOptions = U.TONES.map(t => `<option value="${t}">${TONE_LABELS[t]}</option>`).join("");
const uploadField = (name, label, placeholder = "img/foto.jpg o https://…") => `<div class="admin__image">
    <input name="${name}" placeholder="${placeholder}" aria-label="${label}">
    <label class="btn btn--ghost btn--sm"><span>Subir imagen</span><input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${name}" hidden></label>
  </div>`;

const bgFields = (p, title) => `<div class="admin__section">
    <h3>${title}</h3>
    <div class="grid">
      <label class="field"><span>Tipo de fondo</span><select name="${p}BgType">
        <option value="">El del diseño</option><option value="color">Color liso</option><option value="tone">Degradado</option><option value="image">Foto</option>
      </select></label>
      <label class="field" data-bg-for="color"><span>Color</span><input type="color" name="${p}BgColor"></label>
      <label class="field" data-bg-for="tone"><span>Degradado</span><select name="${p}BgTone">${toneOptions}</select></label>
      <div class="field field--wide" data-bg-for="image"><span>Foto de fondo</span>${uploadField(`${p}BgImage`, "Ruta o URL de la foto de fondo")}</div>
      <label class="field field--wide" data-bg-for="image"><span>Velar la foto (para que el texto se lea)</span><input type="range" name="${p}BgVeil" min="0" max="0.9" step="0.05"></label>
    </div>
  </div>`;

function setBg(form, p, bg) {
  setVal(form, `${p}BgType`, bg?.type || "");
  setVal(form, `${p}BgColor`, bg?.color || BG_DEFAULT.color);
  setVal(form, `${p}BgTone`, bg?.tone || BG_DEFAULT.tone);
  setVal(form, `${p}BgImage`, bg?.image || "");
  setVal(form, `${p}BgVeil`, bg?.veil ?? BG_DEFAULT.veil);
  syncBg(form);
}

function readBg(form, p) {
  const type = val(form, `${p}BgType`);
  if (type === "color") return { type, color: val(form, `${p}BgColor`) };
  if (type === "tone") return { type, tone: val(form, `${p}BgTone`) };
  if (type === "image") return { type, image: val(form, `${p}BgImage`), veil: Number(val(form, `${p}BgVeil`)) };
  return undefined;
}

// Muestra solo los campos del tipo de fondo elegido.
function syncBg(form) {
  form.querySelectorAll("[data-bg]").forEach(box => {
    const type = val(form, `${box.dataset.bg}BgType`);
    box.querySelectorAll("[data-bg-for]").forEach(el => { el.hidden = el.dataset.bgFor !== type; });
  });
}

/* ==== ESTILOS ==== */
function readStyle(form) {
  const colors = {};
  for (const [key, { value }] of Object.entries(U.THEME_COLORS)) {
    const picked = val(form, `color-${key}`);
    if (picked && picked.toLowerCase() !== value.toLowerCase()) colors[key] = picked;
  }
  const { site = {}, agenda = {}, theme = {} } = state.config;
  return {
    theme: { ...theme, colors },
    site: { ...site, hero: { ...site.hero, src: val(form, "heroImage"), tone: val(form, "heroTone") || "selva" } },
    agenda: { ...agenda, background: readBg(form, "agenda") }
  };
}

function updateStylePreview() {
  const form = $("#style-form");
  if (!form || !state.config) return;
  syncBg(form);
  preview("style", readStyle(form), () => [
    C.renderHero(CONFIG.site),
    C.renderAbout(CONFIG.about),
    CONFIG.areas.map(C.renderArea).join(""),
    C.renderAgenda(CONFIG.agenda),
    C.renderContact(CONFIG.contact),
    `<footer class="footer">${C.renderFooter(CONFIG.footer)}</footer>`
  ].join(""));
}

function setColors(form, colors = {}) {
  for (const [key, { value }] of Object.entries(U.THEME_COLORS)) setVal(form, `color-${key}`, colors[key] || value);
}

function openStyleDialog() {
  const form = $("#style-form");
  if (!form) return console.error("[secciones] Falta #style-form");
  const hero = state.config.site?.hero || {};
  form.reset();
  setColors(form, state.config.theme?.colors);
  setVal(form, "heroImage", hero.src);
  setVal(form, "heroTone", hero.tone || "selva");
  setBg(form, "agenda", state.config.agenda?.background);
  setError(form);
  openDialog("#style-dialog");
  updateStylePreview();
}

async function submitStyle(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const next = { ...clone(state.config), ...readStyle(form) };
  const ok = await busy(form, () => saveConfig(next, "edición Estilos", form));
  if (ok) closeDialog("#style-dialog");
}

/* ==== IMÁGENES ==== */
const localImages = new Map();
const MAX_SIDE = 1600;

async function shrink(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1E1712";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(done => canvas.toBlob(done, "image/jpeg", 0.85));
  if (!blob) throw new Error("No se pudo procesar la imagen.");
  return blob;
}

const toDataUrl = blob => new Promise((done, fail) => {
  const reader = new FileReader();
  reader.onload = () => done(reader.result);
  reader.onerror = () => fail(new Error("No se pudo leer la imagen."));
  reader.readAsDataURL(blob);
});

async function onUpload(e) {
  const picker = e.target.closest("[data-upload]");
  const file = picker?.files?.[0];
  if (!file) return;
  const form = e.currentTarget;
  const label = picker.closest("label")?.querySelector("span");
  const text = label?.textContent;
  if (label) label.textContent = "Subiendo…";
  picker.disabled = true;
  setError(form);
  try {
    const blob = await shrink(file);
    const { path } = await api("upload", { method: "POST", body: { name: file.name, dataUrl: await toDataUrl(blob) } });
    localImages.set(path, URL.createObjectURL(blob));
    setVal(form, picker.dataset.upload, path);
    form.dispatchEvent(new Event("input"));
    toast("Imagen subida. Guardá para publicarla.");
  } catch (err) {
    setError(form, err.message);
  } finally {
    picker.value = "";
    picker.disabled = false;
    if (label) label.textContent = text;
  }
}

/* ==== SOBRE MÍ ==== */
function readAbout(form) {
  const base = state.config.about || {};
  return {
    ...base,
    id: val(form, "aboutId"),
    navLabel: val(form, "aboutNavLabel"),
    title: val(form, "aboutTitle"),
    lead: val(form, "aboutLead"),
    paragraphs: (form.elements.aboutParagraphs?.value ?? "").split(/\n+/).map(p => p.trim()).filter(Boolean),
    quote: val(form, "aboutQuote"),
    image: { ...base.image, src: val(form, "aboutImage"), alt: val(form, "aboutImageAlt") },
    background: readBg(form, "about")
  };
}

function updateAboutPreview() {
  const form = $("#about-form");
  if (!form || !state.config) return;
  syncBg(form);
  preview("about", { about: readAbout(form) }, () => C.renderAbout(CONFIG.about));
}

function openAboutDialog() {
  const form = $("#about-form");
  if (!form) return console.error("[secciones] Falta #about-form");
  const about = state.config.about || {};
  form.reset();
  setVal(form, "aboutId", about.id);
  setVal(form, "aboutNavLabel", about.navLabel);
  setVal(form, "aboutTitle", about.title);
  setVal(form, "aboutLead", about.lead);
  setVal(form, "aboutQuote", about.quote);
  setVal(form, "aboutImage", about.image?.src);
  setVal(form, "aboutImageAlt", about.image?.alt);
  setVal(form, "aboutParagraphs", (about.paragraphs || []).join("\n\n"));
  setBg(form, "about", about.background);
  setError(form);
  openDialog("#about-dialog");
  updateAboutPreview();
}

async function submitAbout(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const next = clone(state.config);
  next.about = readAbout(form);
  const ok = await busy(form, () => saveConfig(next, "edición Sobre mí", form));
  if (ok) closeDialog("#about-dialog");
}

/* ==== ÁREAS ==== */
let editingAreaIndex = null;
let offerings, media, socials;

function renderAreasList() {
  const list = $("#areas-list");
  if (!list) return;
  list.innerHTML = state.config.areas.map((area, index) => `
    <li class="admin__area-item">
      <span>${esc(area.navLabel ?? "")}</span>
      <div class="admin__btns">
        <button class="btn btn--ghost btn--sm" type="button" data-edit-area="${index}">Editar</button>
        <button class="btn btn--danger btn--sm" type="button" data-delete-area="${index}">Borrar</button>
      </div>
    </li>`).join("");
}

function openAreasDialog() {
  renderAreasList();
  openDialog("#areas-dialog");
}

function updateAccentPicker(color) {
  $("#accent-picker")?.querySelectorAll("[data-color]").forEach(opt => opt.classList.toggle("selected", opt.dataset.color === color));
}

function readArea(form) {
  const base = editingAreaIndex === null ? {} : state.config.areas[editingAreaIndex] || {};
  return {
    ...base,
    id: val(form, "areaId"),
    navLabel: val(form, "areaNavLabel"),
    title: val(form, "areaTitle"),
    accent: val(form, "areaAccent") || "ocre",
    subtitle: val(form, "areaSubtitle"),
    description: val(form, "areaDescription"),
    image: { ...base.image, src: val(form, "areaImage"), alt: val(form, "areaImageAlt") },
    offerings: trimRows(offerings.get()),
    media: trimRows(media.get()),
    background: readBg(form, "area")
  };
}

function updateAreaPreview() {
  const form = $("#area-form");
  if (!form || !state.config) return;
  // El área se dibuja en su posición real (respeta la alternancia de diseño) y con sus eventos.
  const index = editingAreaIndex ?? state.config.areas.length;
  syncBg(form);
  const areas = [...state.config.areas];
  areas[index] = readArea(form);
  preview("area", { areas }, () => C.renderArea(CONFIG.areas[index], index));
}

function openAreaForm(index = null) {
  const form = $("#area-form");
  if (!form) return console.error("[secciones] Falta #area-form");
  editingAreaIndex = index;
  const area = index === null ? { accent: "ocre" } : state.config.areas[index];

  form.reset();
  setVal(form, "areaId", area.id);
  setVal(form, "areaNavLabel", area.navLabel);
  setVal(form, "areaTitle", area.title);
  setVal(form, "areaAccent", area.accent || "ocre");
  setVal(form, "areaSubtitle", area.subtitle);
  setVal(form, "areaDescription", area.description);
  setVal(form, "areaImage", area.image?.src);
  setVal(form, "areaImageAlt", area.image?.alt);
  offerings.set(area.offerings || []);
  media.set(area.media || []);
  setBg(form, "area", area.background);
  updateAccentPicker(val(form, "areaAccent"));

  const title = $("[data-title]", form);
  if (title) title.textContent = index === null ? "Nueva área" : "Editar área";
  setError(form);
  closeDialog("#areas-dialog");
  openDialog("#area-dialog");
  updateAreaPreview();
}

async function submitArea(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const area = readArea(form);
  if (!area.id || !area.navLabel || !area.title) return setError(form, "Completá ID, etiqueta de navegación y título.");
  if (state.config.areas.some((a, i) => a.id === area.id && i !== editingAreaIndex)) return setError(form, `Ya existe un área con el ID "${area.id}".`);

  const next = clone(state.config);
  if (editingAreaIndex === null) next.areas.push(area); else next.areas[editingAreaIndex] = area;
  const message = `${editingAreaIndex === null ? "alta" : "edición"} área "${area.navLabel}"`;
  const ok = await busy(form, () => saveConfig(next, message, form));
  if (ok) closeDialog("#area-dialog"); // al cerrarse vuelve sola a la lista de áreas
}

async function onAreasListClick(e) {
  const edit = e.target.closest("[data-edit-area]");
  if (edit) return openAreaForm(Number(edit.dataset.editArea));
  const del = e.target.closest("[data-delete-area]");
  if (!del) return;
  const index = Number(del.dataset.deleteArea);
  const area = state.config.areas[index];
  if (state.config.areas.length <= 1) return toast("Tiene que quedar al menos un área.", true);
  if (!confirm(`¿Borrar "${area.navLabel}"?`)) return;
  const next = clone(state.config);
  next.areas.splice(index, 1);
  del.disabled = true;
  await saveConfig(next, `baja área "${area.navLabel}"`);
  renderAreasList();
}

/* ==== CONTACTO ==== */
function readContact(form) {
  const base = state.config.newsletter || {};
  return {
    contact: {
      ...state.config.contact,
      id: val(form, "contactId"),
      navLabel: val(form, "contactNavLabel"),
      title: val(form, "contactTitle"),
      text: val(form, "contactText"),
      background: readBg(form, "contact")
    },
    socials: trimRows(socials.get()),
    newsletter: {
      ...base,
      email: val(form, "newsletterEmail"),
      title: val(form, "newsletterTitle"),
      label: val(form, "newsletterLabel"),
      placeholder: val(form, "newsletterPlaceholder"),
      button: val(form, "newsletterButton"),
      sending: val(form, "newsletterSending"),
      success: val(form, "newsletterSuccess"),
      error: val(form, "newsletterError"),
      note: val(form, "newsletterNote")
    }
  };
}

function updateContactPreview() {
  const form = $("#contact-form");
  if (!form || !state.config) return;
  syncBg(form);
  preview("contact", readContact(form), () => C.renderContact(CONFIG.contact));
}

function openContactDialog() {
  const form = $("#contact-form");
  if (!form) return console.error("[secciones] Falta #contact-form");
  const contact = state.config.contact || {};
  const newsletter = state.config.newsletter || {};

  form.reset();
  setVal(form, "contactId", contact.id);
  setVal(form, "contactNavLabel", contact.navLabel);
  setVal(form, "contactTitle", contact.title);
  setVal(form, "contactText", contact.text);
  socials.set(state.config.socials || []);
  setBg(form, "contact", contact.background);
  for (const key of ["email", "title", "label", "placeholder", "button", "sending", "success", "error", "note"]) {
    setVal(form, `newsletter${key[0].toUpperCase()}${key.slice(1)}`, newsletter[key]);
  }
  setError(form);
  openDialog("#contact-dialog");
  updateContactPreview();
}

async function submitContact(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const data = readContact(form);
  if (data.socials.some(s => !s.name || !s.url || !s.icon)) return setError(form, "Cada red social necesita nombre, URL e ícono.");
  const next = { ...clone(state.config), ...data };
  const ok = await busy(form, () => saveConfig(next, "edición Contacto y redes", form));
  if (ok) closeDialog("#contact-dialog");
}

/* ==== LISTAS EDITABLES (ofrecimientos, media, redes) ==== */
function rowEditor({ list, add, row, blank, onChange }) {
  let rows = [];
  const draw = () => { const el = $(list); if (el) el.innerHTML = rows.map(row).join(""); };
  on(list, "input", e => {
    const { index, field } = e.target.dataset;
    if (field === undefined || !rows[index]) return;
    rows[index][field] = e.target.value;
    onChange();
  });
  on(list, "click", e => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    rows.splice(Number(btn.dataset.remove), 1);
    draw();
    onChange();
  });
  on(add, "click", () => { rows.push({ ...blank }); draw(); onChange(); });
  return { get: () => rows, set: next => { rows = clone(next) || []; draw(); } };
}

const input = (row, index, field, placeholder) =>
  `<input type="text" placeholder="${placeholder}" value="${esc(row[field] ?? "")}" data-index="${index}" data-field="${field}">`;
const removeBtn = index => `<button class="btn btn--danger btn--sm" type="button" data-remove="${index}" aria-label="Quitar">✕</button>`;

/* ==== INIT ==== */
function bind() {
  const titles = { about: "Fondo de la sección", area: "Fondo de la sección", contact: "Fondo de la sección", agenda: "Fondo de la agenda" };
  document.querySelectorAll("[data-bg]").forEach(box => { box.innerHTML = bgFields(box.dataset.bg, titles[box.dataset.bg] || "Fondo"); });
  document.querySelectorAll("[data-image-field]").forEach(box => { box.innerHTML = uploadField(box.dataset.imageField, "Ruta o URL de la imagen"); });
  const palette = $("#theme-colors");
  if (palette) palette.innerHTML = Object.entries(U.THEME_COLORS).map(([key, { label }]) => `<label class="admin__color"><input type="color" name="color-${key}"><span>${label}</span></label>`).join("");
  const tone = $("#style-form [name=heroTone]");
  if (tone) tone.innerHTML = toneOptions;

  on("#sections-list", "click", e => {
    if (!state.config) return;
    if (e.target.closest("[data-edit-style]")) openStyleDialog();
    else if (e.target.closest("[data-edit-about]")) openAboutDialog();
    else if (e.target.closest("[data-edit-areas]")) openAreasDialog();
    else if (e.target.closest("[data-edit-contact]")) openContactDialog();
  });

  offerings = rowEditor({
    list: "#offerings-list", add: "#add-offering", onChange: updateAreaPreview,
    blank: { title: "", meta: "", text: "" },
    row: (o, i) => `<div class="admin__item-row">
      ${input(o, i, "title", "Título")}${input(o, i, "meta", "Meta")}${removeBtn(i)}
      <textarea placeholder="Texto" rows="2" data-index="${i}" data-field="text" style="grid-column:1/-1">${esc(o.text ?? "")}</textarea>
    </div>`
  });

  media = rowEditor({
    list: "#media-list", add: "#add-media", onChange: updateAreaPreview,
    blank: { type: "", kind: "", title: "", url: "", embed: "", tone: "" },
    row: (m, i) => `<div class="admin__item-row" style="grid-template-columns:repeat(3,1fr) auto">
      ${input(m, i, "type", "Tipo")}${input(m, i, "title", "Título")}${input(m, i, "url", "URL")}${removeBtn(i)}
      ${input(m, i, "kind", "Kind")}${input(m, i, "embed", "Embed")}${input(m, i, "tone", "Tone")}
    </div>`
  });

  socials = rowEditor({
    list: "#socials-list", add: "#add-social", onChange: updateContactPreview,
    blank: { name: "", url: "", icon: "" },
    row: (s, i) => `<div class="admin__item-row" style="grid-template-columns:repeat(3,1fr) auto">
      ${input(s, i, "name", "Nombre")}${input(s, i, "url", "URL")}${input(s, i, "icon", "Ícono")}${removeBtn(i)}
    </div>`
  });

  on("#about-form", "submit", submitAbout);
  on("#about-form", "input", updateAboutPreview);
  on("#area-form", "submit", submitArea);
  on("#area-form", "input", updateAreaPreview);
  on("#contact-form", "submit", submitContact);
  on("#contact-form", "input", updateContactPreview);

  on("#style-form", "submit", submitStyle);
  on("#style-form", "input", updateStylePreview);
  on("#theme-reset", "click", () => { setColors($("#style-form")); updateStylePreview(); });
  for (const name of ["style", "about", "area", "contact"]) on(`#${name}-form`, "change", onUpload);

  for (const name of ["style", "about", "area", "contact"]) {
    on(`#${name}-form [data-cancel]`, "click", () => closeDialog(`#${name}-dialog`));
  }
  on("#areas-dialog [data-cancel]", "click", () => closeDialog("#areas-dialog"));

  on("#areas-list", "click", onAreasListClick);
  on("#new-area", "click", () => openAreaForm());
  on("#area-dialog", "close", openAreasDialog);
  on("#accent-picker", "click", e => {
    const opt = e.target.closest("[data-color]");
    const form = $("#area-form");
    if (!opt || !form) return;
    setVal(form, "areaAccent", opt.dataset.color);
    updateAccentPicker(opt.dataset.color);
    updateAreaPreview();
  });
}

let bound = false;
export async function init() {
  if (!bound) { bind(); bound = true; }
  if (!state.config) listMessage("Cargando secciones…");
  rawEvents = await fetch(U.EVENTS_URL, { cache: "no-cache" }).then(r => (r.ok ? r.json() : [])).catch(() => []);
  await loadConfig();
}
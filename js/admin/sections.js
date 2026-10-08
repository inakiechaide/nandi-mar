// js/admin/sections.js
import * as U from '../modules/utils.js';
import * as C from '../modules/components.js';

const { $, esc } = U;
const state = { config: null, sha: null };

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
    renderSections();
    toast("Guardado. El sitio se actualiza en un minuto.");
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

function renderSections() {
  const list = $("#sections-list");
  if (!list || !state.config) return;
  const areas = state.config.areas || [];
  list.innerHTML = `
    <li class="admin__section-item">
      <div><h3>Sobre mí</h3><p class="admin__meta">Título, lead, párrafos, cita e imagen</p></div>
      <span class="admin__btns"><button class="btn btn--ghost btn--sm" type="button" data-edit-about>Editar</button></span>
    </li>
    <li class="admin__section-item">
      <div><h3>Áreas</h3><p class="admin__meta">${areas.length} áreas: ${areas.map(a => esc(a.navLabel ?? "")).join(", ")}</p></div>
      <span class="admin__btns"><button class="btn btn--ghost btn--sm" type="button" data-edit-areas>Editar</button></span>
    </li>
    <li class="admin__section-item">
      <div><h3>Contacto y redes</h3><p class="admin__meta">Texto de contacto, redes sociales y newsletter</p></div>
      <span class="admin__btns"><button class="btn btn--ghost btn--sm" type="button" data-edit-contact>Editar</button></span>
    </li>`;
}

/* ==== VISTA PREVIA ====
   Cada vista previa es un iframe que carga las mismas hojas de estilo que el sitio
   (sin admin.css) y se dibuja a ancho real de escritorio o de celular, escalado para
   entrar en el panel. Así los media queries y las fuentes se comportan como en la web. */
const VIEWPORTS = { desktop: 1280, mobile: 390 };
const PREVIEW_CSS = "html{scroll-behavior:auto}body{display:flow-root;overflow:hidden}.reveal{opacity:1!important;transform:none!important}";

function siteHead() {
  const links = [...document.querySelectorAll('link[rel~="stylesheet"],link[rel~="preconnect"]')]
    .filter(l => !/admin[^/]*\.css/i.test(l.getAttribute("href") || ""))
    .map(l => `<link rel="${l.rel}" href="${l.href}"${l.hasAttribute("crossorigin") ? " crossorigin" : ""}>`);
  const styles = [...document.querySelectorAll("style")].map(s => `<style>${s.textContent}</style>`);
  return [...links, ...styles].join("");
}

function createPreview(host) {
  let mode = "desktop", doc = null, root = null, html = "", timer;

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
    root.innerHTML = html;
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
    render(next) {
      html = next;
      clearTimeout(timer);
      timer = setTimeout(paint, 120);
    }
  };
}

const previews = {};
function preview(name, build) {
  const host = $(`#${name}-preview`);
  if (!host) return;
  previews[name] ??= createPreview(host);
  let html;
  try {
    html = build();
  } catch (err) {
    console.error(`[secciones] Vista previa "${name}":`, err);
    html = `<p style="padding:2rem;color:#E39A70">No se pudo generar la vista previa: ${esc(err.message)}</p>`;
  }
  previews[name].render(html);
}

function component(name) {
  if (typeof C[name] !== "function") throw new Error(`components.js no exporta ${name}()`);
  return C[name];
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
    paragraphs: (form.elements.aboutParagraphs?.value ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    quote: val(form, "aboutQuote"),
    image: { ...base.image, src: val(form, "aboutImage"), alt: val(form, "aboutImageAlt") }
  };
}

function updateAboutPreview() {
  const form = $("#about-form");
  if (form && state.config) preview("about", () => component("renderAbout")(readAbout(form)));
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
    media: trimRows(media.get())
  };
}

function updateAreaPreview() {
  const form = $("#area-form");
  if (!form || !state.config) return;
  // Se pasa la posición real del área para que respete la alternancia de diseño del sitio.
  const index = editingAreaIndex ?? state.config.areas.length;
  preview("area", () => component("renderArea")(readArea(form), index));
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
      text: val(form, "contactText")
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
  preview("contact", () => {
    const { contact, socials: list, newsletter } = readContact(form);
    return `
      <section id="${esc(contact.id || "contacto")}" class="section contact" data-nav>
        <div class="container prose reveal">
          <h2 class="h2">${esc(contact.title)}</h2>
          <p>${esc(contact.text)}</p>
          ${typeof U.divider === "function" ? U.divider() : ""}
          ${component("renderSocials")(list)}
          ${component("renderNewsletter")(newsletter)}
        </div>
      </section>`;
  });
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
  on("#sections-list", "click", e => {
    if (!state.config) return;
    if (e.target.closest("[data-edit-about]")) openAboutDialog();
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

  for (const name of ["about", "area", "contact"]) {
    on(`#${name}-form [data-cancel]`, "click", () => closeDialog(`#${name}-dialog`));
  }

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
  await loadConfig();
}
import { CONFIG } from '../modules/config.js';
import { $, esc, UI, accentStyle, toDate, rangeLabel, TODAY } from '../modules/utils.js';

const views = ["loading", "login", "events", "sections"];
const state = { events: [], sha: null };
const areaById = id => CONFIG.areas.find(a => a.id === id);

function show(name) {
  views.forEach(v => { $(`#view-${v}`).hidden = v !== name; });
  $("#logout").hidden = name !== "events" && name !== "sections";
  $("#nav-events").hidden = name === "login" || name === "loading";
  $("#nav-sections").hidden = name === "login" || name === "loading";
}

let toastTimer;
function toast(text, error = false) {
  const el = $("#toast");
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

async function withBusy(button, fn) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Guardando…";
  try { return await fn(); } finally { button.disabled = false; button.textContent = label; }
}

function handleAuthError(err) {
  if (err.status !== 401) return false;
  show("login");
  toast(err.message, true);
  return true;
}

/* ==== NAVIGATION ==== */
$("#nav-events").addEventListener("click", () => {
  show("events");
  loadEvents();
});

$("#nav-sections").addEventListener("click", async () => {
  show("sections");
  try {
    const module = await import("./sections.js");
    await module.init();
  } catch (err) {
    console.error("Error loading sections module:", err);
    toast("Error al cargar módulo de secciones", true);
  }
});

/* ==== LISTADO ==== */
const isPastEvent = ev => toDate(ev.endDate || ev.date) < TODAY;

function renderList() {
  const area = $("#filter-area").value, showPast = $("#filter-past").checked;
  const rows = state.events
    .map((ev, index) => ({ ev, index }))
    .filter(({ ev }) => (area === "all" || ev.area === area) && (showPast || !isPastEvent(ev)))
    .sort((a, b) => a.ev.date.localeCompare(b.ev.date));

  $("#event-list").innerHTML = rows.length ? rows.map(({ ev, index }) => {
    const ar = areaById(ev.area);
    return `<li class="admin__item${isPastEvent(ev) ? " is-past" : ""}" style="${ar ? accentStyle(ar) : ""}">
      <span class="admin__date">${esc(rangeLabel(ev))}</span>
      <div><h3>${esc(ev.title)}</h3><p class="admin__meta">${esc(ar?.navLabel || ev.area)} • ${esc(ev.type)} • ${esc(ev.place)}, ${esc(ev.city)}</p></div>
      <div class="admin__row-actions">
        <span class="badge badge--${esc(ev.status)}">${esc(UI.status[ev.status] || ev.status)}</span>
        <span class="admin__btns"><button class="btn btn--ghost btn--sm" type="button" data-edit="${index}">Editar</button>
        <button class="btn btn--danger btn--sm" type="button" data-delete="${index}">Borrar</button></span>
      </div>
    </li>`;
  }).join("") : `<li class="admin__empty">No hay eventos${showPast ? "" : " próximos"} para mostrar.</li>`;
}

async function loadEvents() {
  const data = await api("events");
  state.events = data.events;
  state.sha = data.sha;
  renderList();
}

async function save(events, message, errorEl = null) {
  try {
    const data = await api("events", { method: "PUT", body: { events, sha: state.sha, message } });
    state.events = data.events;
    state.sha = data.sha;
    renderList();
    toast("Guardado. El sitio se actualiza en un minuto.");
    return true;
  } catch (err) {
    if (handleAuthError(err)) return false;
    if (err.status === 409) await loadEvents().catch(() => {});
    if (errorEl) errorEl.textContent = err.message; else toast(err.message, true);
    return false;
  }
}

/* ==== FORMULARIO ==== */
const dialog = $("#event-dialog"), form = $("#event-form");
let editing = null;

function fillSelects() {
  const areas = CONFIG.areas.map(a => `<option value="${esc(a.id)}">${esc(a.navLabel)}</option>`).join("");
  form.elements.area.innerHTML = areas;
  $("#filter-area").innerHTML = `<option value="all">Todas</option>${areas}`;
  form.elements.status.innerHTML = Object.entries(UI.status).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("");
}

// Secciones avisa cuando cambian las áreas, así los selectores no quedan viejos.
document.addEventListener("config:changed", () => {
  const filter = $("#filter-area").value;
  fillSelects();
  if ([...$("#filter-area").options].some(o => o.value === filter)) $("#filter-area").value = filter;
});

function openForm(index = null) {
  editing = index;
  const ev = index === null ? { country: "Argentina", status: "open", area: $("#filter-area").value === "all" ? CONFIG.areas[0].id : $("#filter-area").value } : state.events[index];
  form.reset();
  [...form.elements].forEach(el => { if (el.name) { el.value = ev[el.name] ?? ""; el.removeAttribute("aria-invalid"); } });
  $("[data-title]", form).textContent = index === null ? "Nuevo evento" : "Editar evento";
  $("[data-error]", form).textContent = "";
  dialog.showModal();
  form.elements.title.focus();
}

function readForm() {
  const ev = {};
  [...form.elements].forEach(el => { if (el.name && el.value.trim()) ev[el.name] = el.value.trim(); });
  return ev;
}

function validate() {
  let first = null;
  [...form.elements].forEach(el => {
    if (!el.name) return;
    const bad = !el.checkValidity();
    if (bad) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    if (bad && !first) first = el;
  });
  if (!first && form.elements.endDate.value && form.elements.endDate.value < form.elements.date.value) {
    first = form.elements.endDate;
    first.setAttribute("aria-invalid", "true");
    $("[data-error]", form).textContent = "La fecha de fin debe ser igual o posterior a la fecha.";
  } else {
    $("[data-error]", form).textContent = first ? "Revisá los campos marcados." : "";
  }
  first?.focus();
  return !first;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!validate()) return;
  const ev = readForm();
  const events = [...state.events];
  if (editing === null) events.push(ev); else events[editing] = ev;
  const message = `${editing === null ? "alta" : "edición"} "${ev.title}"`;
  const ok = await withBusy($('button[type="submit"]', form), () => save(events, message, $("[data-error]", form)));
  if (ok) dialog.close();
});
$("[data-cancel]", form).addEventListener("click", () => dialog.close());

/* ==== ACCIONES ==== */
$("#event-list").addEventListener("click", async e => {
  const edit = e.target.closest("[data-edit]");
  if (edit) return openForm(Number(edit.dataset.edit));
  const del = e.target.closest("[data-delete]");
  if (!del) return;
  const index = Number(del.dataset.delete), ev = state.events[index];
  if (!confirm(`¿Borrar "${ev.title}"?`)) return;
  await withBusy(del, () => save(state.events.filter((_, i) => i !== index), `baja "${ev.title}"`));
});

$("#new-event").addEventListener("click", () => openForm());
$("#filter-area").addEventListener("change", renderList);
$("#filter-past").addEventListener("change", renderList);

$("#download").addEventListener("click", () => {
  const blob = new Blob([`${JSON.stringify(state.events, null, 2)}\n`], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "events.json" });
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#logout").addEventListener("click", async () => {
  await api("logout", { method: "POST" }).catch(() => {});
  state.events = [];
  show("login");
});

/* ==== LOGIN ==== */
const loginForm = $("#login-form");
loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const error = $("[data-error]", loginForm), btn = $('button[type="submit"]', loginForm);
  error.textContent = "";
  btn.disabled = true;
  try {
    await api("login", { method: "POST", body: { user: loginForm.user.value, password: loginForm.password.value } });
    loginForm.reset();
    await enterPanel();
  } catch (err) {
    error.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

async function enterPanel() {
  show("events");
  $("#event-list").innerHTML = `<li class="admin__empty">Cargando eventos…</li>`;
  try {
    await loadEvents();
  } catch (err) {
    if (!handleAuthError(err)) $("#event-list").innerHTML = `<li class="admin__empty">${esc(err.message)}</li>`;
  }
}

async function init() {
  fillSelects();
  try {
    await api("session");
    await enterPanel();
  } catch (err) {
    show("login");
    if (err.status !== 401) $("[data-error]", loginForm).textContent = err.message;
  }
}

init();

import { $, esc } from '../modules/utils.js';

const state = { config: null, sha: null };

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

async function loadConfig() {
  try {
    console.log("Loading config...");
    const data = await api("config");
    console.log("Config loaded:", data);
    state.config = data.config;
    state.sha = data.sha;
    renderSections();
  } catch (err) {
    console.error("Error loading config:", err);
    if (err.status === 401) {
      toast("Sesión vencida, volvé a ingresar", true);
      window.location.reload();
    } else {
      toast(`Error: ${err.message}`, true);
    }
  }
}

async function saveConfig(message, errorEl = null) {
  try {
    const data = await api("config", { method: "PUT", body: { config: state.config, sha: state.sha, message } });
    state.config = data.config;
    state.sha = data.sha;
    toast("Guardado. El sitio se actualiza en un minuto.");
    return true;
  } catch (err) {
    if (err.status === 401) {
      toast("Sesión vencida, volvé a ingresar", true);
      window.location.reload();
      return false;
    }
    if (err.status === 409) await loadConfig().catch(() => {});
    if (errorEl) errorEl.textContent = err.message; else toast(err.message, true);
    return false;
  }
}

function renderSections() {
  console.log("renderSections called, config:", state.config);
  if (!state.config) {
    console.error("No config available");
    return;
  }

  const container = $("#sections-list");
  if (!container) {
    console.error("sections-list not found");
    return;
  }

  console.log("Rendering sections");
  container.innerHTML = `
    <li class="admin__section-item" data-section="about">
      <h3>Sobre mí</h3>
      <p class="admin__meta">Información personal, lead, párrafos y quote</p>
      <button class="btn btn--ghost btn--sm" type="button" data-edit-about>Editar</button>
    </li>
    <li class="admin__section-item" data-section="areas">
      <h3>Áreas</h3>
      <p class="admin__meta">${state.config.areas.length} áreas: ${state.config.areas.map(a => esc(a.navLabel)).join(", ")}</p>
      <button class="btn btn--ghost btn--sm" type="button" data-edit-areas>Editar</button>
    </li>
    <li class="admin__section-item" data-section="contact">
      <h3>Contacto y redes</h3>
      <p class="admin__meta">Información de contacto, redes sociales y newsletter</p>
      <button class="btn btn--ghost btn--sm" type="button" data-edit-contact>Editar</button>
    </li>
  `;
  console.log("Sections rendered");
}

$("#sections-list").addEventListener("click", async e => {
  if (e.target.closest("[data-edit-about]")) openAboutDialog();
  if (e.target.closest("[data-edit-areas]")) openAreasDialog();
  if (e.target.closest("[data-edit-contact]")) openContactDialog();
});

/* ==== ABOUT DIALOG ==== */
function openAboutDialog() {
  const dialog = $("#about-dialog");
  const form = $("#about-form");
  if (!dialog || !form) {
    console.error("Dialog or form not found");
    return;
  }
  const about = state.config.about;

  form.reset();
  form.elements.aboutId.value = about.id || "";
  form.elements.aboutNavLabel.value = about.navLabel || "";
  form.elements.aboutTitle.value = about.title || "";
  form.elements.aboutLead.value = about.lead || "";
  form.elements.aboutQuote.value = about.quote || "";

  form.elements.aboutParagraphs.value = (about.paragraphs || []).join("\n\n");

  $("[data-error]", form).textContent = "";
  dialog.showModal();
}

$("#about-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const paragraphs = form.elements.aboutParagraphs.value.split("\n\n").filter(p => p.trim());
  
  state.config.about = {
    id: form.elements.aboutId.value.trim(),
    navLabel: form.elements.aboutNavLabel.value.trim(),
    title: form.elements.aboutTitle.value.trim(),
    lead: form.elements.aboutLead.value.trim(),
    paragraphs: paragraphs,
    quote: form.elements.aboutQuote.value.trim()
  };
  
  const ok = await saveConfig("Edición 'Sobre mí'", $("[data-error]", form));
  if (ok) {
    dialog.close();
    renderSections();
  }
});

$("[data-cancel]", $("#about-form")).addEventListener("click", () => $("#about-dialog").close());

/* ==== AREAS DIALOG ==== */
let editingAreaIndex = null;

function openAreasDialog() {
  const dialog = $("#areas-dialog");
  const list = $("#areas-list");
  if (!dialog || !list) {
    console.error("Dialog or list not found");
    return;
  }

  list.innerHTML = state.config.areas.map((area, index) => `
    <li class="admin__area-item">
      <span>${esc(area.navLabel)}</span>
      <div class="admin__btns">
        <button class="btn btn--ghost btn--sm" type="button" data-edit-area="${index}">Editar</button>
        <button class="btn btn--danger btn--sm" type="button" data-delete-area="${index}">Borrar</button>
      </div>
    </li>
  `).join("");

  dialog.showModal();
}

function openAreaForm(index = null) {
  const dialog = $("#area-dialog");
  const form = $("#area-form");
  if (!dialog || !form) {
    console.error("Dialog or form not found");
    return;
  }
  editingAreaIndex = index;

  const area = index === null ? { id: "", navLabel: "", title: "", accent: "ocre", subtitle: "", description: "" } : state.config.areas[index];

  form.reset();
  form.elements.areaId.value = area.id || "";
  form.elements.areaNavLabel.value = area.navLabel || "";
  form.elements.areaTitle.value = area.title || "";
  form.elements.areaAccent.value = area.accent || "ocre";
  form.elements.areaSubtitle.value = area.subtitle || "";
  form.elements.areaDescription.value = area.description || "";

  $("[data-title]", form).textContent = index === null ? "Nueva área" : "Editar área";
  $("[data-error]", form).textContent = "";
  dialog.showModal();
}

$("#area-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  
  const area = {
    id: form.elements.areaId.value.trim(),
    navLabel: form.elements.areaNavLabel.value.trim(),
    title: form.elements.areaTitle.value.trim(),
    accent: form.elements.areaAccent.value,
    subtitle: form.elements.areaSubtitle.value.trim(),
    description: form.elements.areaDescription.value.trim(),
    image: editingAreaIndex !== null ? state.config.areas[editingAreaIndex].image : { src: "", alt: "" },
    offerings: editingAreaIndex !== null ? state.config.areas[editingAreaIndex].offerings : [],
    media: editingAreaIndex !== null ? state.config.areas[editingAreaIndex].media : []
  };
  
  const areas = [...state.config.areas];
  if (editingAreaIndex === null) areas.push(area); else areas[editingAreaIndex] = area;
  
  state.config.areas = areas;
  const ok = await saveConfig(`${editingAreaIndex === null ? "Alta" : "Edición"} área "${area.navLabel}"`, $("[data-error]", form));
  if (ok) {
    dialog.close();
    openAreasDialog();
    renderSections();
  }
});

$("[data-cancel]", $("#area-form")).addEventListener("click", () => $("#area-dialog").close());

$("#areas-list").addEventListener("click", async e => {
  const edit = e.target.closest("[data-edit-area]");
  if (edit) {
    $("#areas-dialog").close();
    openAreaForm(Number(edit.dataset.editArea));
  }
  const del = e.target.closest("[data-delete-area]");
  if (del) {
    const index = Number(del.dataset.deleteArea);
    const area = state.config.areas[index];
    if (!confirm(`¿Borrar "${area.navLabel}"?`)) return;
    state.config.areas = state.config.areas.filter((_, i) => i !== index);
    const ok = await saveConfig(`Baja área "${area.navLabel}"`);
    if (ok) {
      openAreasDialog();
      renderSections();
    }
  }
});

$("#new-area").addEventListener("click", () => openAreaForm());

/* ==== CONTACT DIALOG ==== */
function openContactDialog() {
  const dialog = $("#contact-dialog");
  const form = $("#contact-form");
  if (!dialog || !form) {
    console.error("Dialog or form not found");
    return;
  }
  const contact = state.config.contact;
  const socials = state.config.socials;
  const newsletter = state.config.newsletter;

  form.reset();
  form.elements.contactId.value = contact.id || "";
  form.elements.contactNavLabel.value = contact.navLabel || "";
  form.elements.contactTitle.value = contact.title || "";
  form.elements.contactText.value = contact.text || "";

  form.elements.socialsJson.value = JSON.stringify(socials, null, 2);

  form.elements.newsletterEmail.value = newsletter.email || "";
  form.elements.newsletterTitle.value = newsletter.title || "";
  form.elements.newsletterLabel.value = newsletter.label || "";
  form.elements.newsletterPlaceholder.value = newsletter.placeholder || "";
  form.elements.newsletterButton.value = newsletter.button || "";
  form.elements.newsletterSending.value = newsletter.sending || "";
  form.elements.newsletterSuccess.value = newsletter.success || "";
  form.elements.newsletterError.value = newsletter.error || "";
  form.elements.newsletterNote.value = newsletter.note || "";

  $("[data-error]", form).textContent = "";
  dialog.showModal();
}

$("#contact-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  
  let socials;
  try {
    socials = JSON.parse(form.elements.socialsJson.value);
  } catch (err) {
    $("[data-error]", form).textContent = "El JSON de redes sociales es inválido";
    return;
  }
  
  state.config.contact = {
    id: form.elements.contactId.value.trim(),
    navLabel: form.elements.contactNavLabel.value.trim(),
    title: form.elements.contactTitle.value.trim(),
    text: form.elements.contactText.value.trim()
  };
  
  state.config.socials = socials;
  
  state.config.newsletter = {
    email: form.elements.newsletterEmail.value.trim(),
    title: form.elements.newsletterTitle.value.trim(),
    label: form.elements.newsletterLabel.value.trim(),
    placeholder: form.elements.newsletterPlaceholder.value.trim(),
    button: form.elements.newsletterButton.value.trim(),
    sending: form.elements.newsletterSending.value.trim(),
    success: form.elements.newsletterSuccess.value.trim(),
    error: form.elements.newsletterError.value.trim(),
    note: form.elements.newsletterNote.value.trim()
  };
  
  const ok = await saveConfig("Edición 'Contacto y redes'", $("[data-error]", form));
  if (ok) {
    dialog.close();
    renderSections();
  }
});

$("[data-cancel]", $("#contact-form")).addEventListener("click", () => $("#contact-dialog").close());

/* ==== INIT ==== */
let initialized = false;

export async function init() {
  console.log("sections.js init called, initialized:", initialized);
  if (initialized) {
    console.log("Already initialized, skipping");
    return;
  }
  initialized = true;
  console.log("Initializing sections module");
  await loadConfig();
}

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
    console.log("Checking session...");
    await api("session");
    console.log("Session valid, loading config...");
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
  form.elements.aboutImage.value = about.image?.src || "";
  form.elements.aboutImageAlt.value = about.image?.alt || "";

  form.elements.aboutParagraphs.value = (about.paragraphs || []).join("\n");

  $("[data-error]", form).textContent = "";
  dialog.showModal();
  updateAboutPreview();
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
    quote: form.elements.aboutQuote.value.trim(),
    image: {
      src: form.elements.aboutImage.value.trim(),
      alt: form.elements.aboutImageAlt.value.trim()
    }
  };

  const ok = await saveConfig("Edición 'Sobre mí'", $("[data-error]", form));
  if (ok) {
    dialog.close();
    renderSections();
  }
});

$("[data-cancel]", $("#about-form")).addEventListener("click", () => $("#about-dialog").close());

// Live preview for about form
$("#about-form").addEventListener("input", updateAboutPreview);

function updateAboutPreview() {
  const form = $("#about-form");
  const preview = $("#about-preview");
  if (!form || !preview) return;

  const paragraphs = form.elements.aboutParagraphs.value.split("\n").filter(p => p.trim());
  const about = {
    title: form.elements.aboutTitle.value.trim() || "Título",
    lead: form.elements.aboutLead.value.trim() || "Lead...",
    paragraphs: paragraphs.length ? paragraphs : ["Párrafo de ejemplo"],
    quote: form.elements.aboutQuote.value.trim() || "Quote de ejemplo",
    image: {
      src: form.elements.aboutImage.value.trim(),
      alt: form.elements.aboutImageAlt.value.trim() || "Imagen"
    }
  };

  preview.innerHTML = `
    <div class="preview-section">
      <h2>${esc(about.title)}</h2>
      <p class="preview-lead">${esc(about.lead)}</p>
      ${about.image?.src ? `<img src="${esc(about.image.src)}" alt="${esc(about.image.alt)}" style="max-width:100%;border-radius:8px;margin:20px 0;">` : '<div style="background:var(--c-earth-3);border-radius:8px;margin:20px 0;padding:40px;text-align:center;color:var(--c-mute)">Sin imagen</div>'}
      ${about.paragraphs.map(p => `<p>${esc(p)}</p>`).join("")}
      <blockquote class="preview-quote">${esc(about.quote)}</blockquote>
    </div>
  `;
}

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

  const area = index === null ? { id: "", navLabel: "", title: "", accent: "ocre", subtitle: "", description: "", image: { src: "", alt: "" }, offerings: [], media: [] } : state.config.areas[index];

  form.reset();
  form.elements.areaId.value = area.id || "";
  form.elements.areaNavLabel.value = area.navLabel || "";
  form.elements.areaTitle.value = area.title || "";
  form.elements.areaAccent.value = area.accent || "ocre";
  form.elements.areaSubtitle.value = area.subtitle || "";
  form.elements.areaDescription.value = area.description || "";
  form.elements.areaImage.value = area.image?.src || "";
  form.elements.areaImageAlt.value = area.image?.alt || "";

  areaOfferings = [...(area.offerings || [])];
  areaMedia = [...(area.media || [])];

  renderOfferingsList();
  renderMediaList();

  $("[data-title]", form).textContent = index === null ? "Nueva área" : "Editar área";
  $("[data-error]", form).textContent = "";
  dialog.showModal();
  updateAreaPreview();
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
    image: {
      src: form.elements.areaImage.value.trim(),
      alt: form.elements.areaImageAlt.value.trim()
    },
    offerings: areaOfferings,
    media: areaMedia
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

// Live preview for area form
$("#area-form").addEventListener("input", updateAreaPreview);

function updateAreaPreview() {
  const form = $("#area-form");
  const preview = $("#area-preview");
  if (!form || !preview) return;

  const accent = form.elements.areaAccent.value || "ocre";
  const accentColors = {
    ocre: "#d4a574",
    terra: "#8b5a2b",
    musgo: "#4a6b5a",
    selva: "#2d5016"
  };

  const area = {
    title: form.elements.areaTitle.value.trim() || "Título",
    subtitle: form.elements.areaSubtitle.value.trim() || "Subtítulo",
    description: form.elements.areaDescription.value.trim() || "Descripción...",
    image: {
      src: form.elements.areaImage.value.trim(),
      alt: form.elements.areaImageAlt.value.trim() || "Imagen"
    },
    offerings: areaOfferings.length ? areaOfferings : [{ title: "Ofrecimiento de ejemplo", meta: "Meta", text: "Texto de ejemplo" }],
    media: areaMedia.length ? areaMedia : [{ type: "spotify", title: "Media de ejemplo" }]
  };

  preview.innerHTML = `
    <div class="preview-section" style="border-left: 4px solid ${accentColors[accent]}">
      <h2 style="color: ${accentColors[accent]}">${esc(area.title)}</h2>
      <p class="preview-subtitle">${esc(area.subtitle)}</p>
      ${area.image?.src ? `<img src="${esc(area.image.src)}" alt="${esc(area.image.alt)}" style="max-width:100%;border-radius:8px;margin:20px 0;">` : '<div style="background:var(--c-earth-3);border-radius:8px;margin:20px 0;padding:40px;text-align:center;color:var(--c-mute)">Sin imagen</div>'}
      <p>${esc(area.description)}</p>
      <h3 style="color: ${accentColors[accent]}">Offerings</h3>
      <ul>
        ${area.offerings.map(o => `<li><strong>${esc(o.title)}</strong> — ${esc(o.meta)}<br>${esc(o.text)}</li>`).join("")}
      </ul>
      <h3 style="color: ${accentColors[accent]}">Media</h3>
      <ul>
        ${area.media.map(m => `<li>${esc(m.type)}: ${esc(m.title)}</li>`).join("")}
      </ul>
    </div>
  `;
}

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
let contactSocials = [];

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

  contactSocials = [...socials];
  renderSocialsList();

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
  updateContactPreview();
}

$("#contact-form").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;

  state.config.contact = {
    id: form.elements.contactId.value.trim(),
    navLabel: form.elements.contactNavLabel.value.trim(),
    title: form.elements.contactTitle.value.trim(),
    text: form.elements.contactText.value.trim()
  };

  state.config.socials = contactSocials;

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

// Live preview for contact form
$("#contact-form").addEventListener("input", updateContactPreview);

function updateContactPreview() {
  const form = $("#contact-form");
  const preview = $("#contact-preview");
  if (!form || !preview) return;

  const contact = {
    title: form.elements.contactTitle.value.trim() || "Título",
    text: form.elements.contactText.value.trim() || "Texto de contacto..."
  };

  const newsletter = {
    title: form.elements.newsletterTitle.value.trim() || "Newsletter",
    label: form.elements.newsletterLabel.value.trim() || "Email",
    placeholder: form.elements.newsletterPlaceholder.value.trim() || "tu@email.com",
    button: form.elements.newsletterButton.value.trim() || "Suscribirme",
    note: form.elements.newsletterNote.value.trim() || "Nota de ejemplo"
  };

  preview.innerHTML = `
    <div class="preview-section">
      <h2>${esc(contact.title)}</h2>
      <p>${esc(contact.text)}</p>
      <h3>Redes sociales</h3>
      <ul>
        ${contactSocials.map(s => `<li>${esc(s.name)}: <a href="${esc(s.url)}" target="_blank">${esc(s.url)}</a></li>`).join("") || "<li>Sin redes sociales</li>"}
      </ul>
      <h3>Newsletter</h3>
      <div style="background:var(--c-earth-3);padding:var(--s-4);border-radius:var(--r-sm)">
        <h4>${esc(newsletter.title)}</h4>
        <label style="display:block;margin:var(--s-2)0">${esc(newsletter.label)}</label>
        <input type="email" placeholder="${esc(newsletter.placeholder)}" style="width:100%;padding:var(--s-2);margin-bottom:var(--s-2);border:1px solid var(--c-line);border-radius:var(--r-sm);background:var(--c-earth);color:var(--c-cream)">
        <button style="padding:var(--s-2) var(--s-4);background:var(--c-ocre);border:none;border-radius:var(--r-sm);color:var(--c-earth-2);cursor:pointer">${esc(newsletter.button)}</button>
        <p style="margin-top:var(--s-2);font-size:var(--fs-sm);color:var(--c-mute)">${esc(newsletter.note)}</p>
      </div>
    </div>
  `;
}

// Socials list management
function renderSocialsList() {
  const list = $("#socials-list");
  if (!list) return;

  list.innerHTML = contactSocials.map((social, index) => `
    <div class="admin__item-row">
      <input type="text" placeholder="Nombre" value="${esc(social.name)}" data-social-index="${index}" data-social-field="name">
      <input type="text" placeholder="URL" value="${esc(social.url)}" data-social-index="${index}" data-social-field="url">
      <input type="text" placeholder="Icono" value="${esc(social.icon)}" data-social-index="${index}" data-social-field="icon">
      <button class="btn btn--danger btn--sm" type="button" data-remove-social="${index}">✕</button>
    </div>
  `).join("");
}

$("#socials-list").addEventListener("input", e => {
  if (e.target.dataset.socialIndex !== undefined) {
    const index = Number(e.target.dataset.socialIndex);
    const field = e.target.dataset.socialField;
    contactSocials[index][field] = e.target.value.trim();
    updateContactPreview();
  }
});

$("#socials-list").addEventListener("click", e => {
  if (e.target.dataset.removeSocial !== undefined) {
    const index = Number(e.target.dataset.removeSocial);
    contactSocials = contactSocials.filter((_, i) => i !== index);
    renderSocialsList();
    updateContactPreview();
  }
});

$("#add-social").addEventListener("click", () => {
  contactSocials.push({ name: "", url: "", icon: "" });
  renderSocialsList();
  updateContactPreview();
});

// Offerings list management
let areaOfferings = [];

function renderOfferingsList() {
  const list = $("#offerings-list");
  if (!list) return;

  list.innerHTML = areaOfferings.map((offering, index) => `
    <div class="admin__item-row">
      <input type="text" placeholder="Título" value="${esc(offering.title)}" data-offering-index="${index}" data-offering-field="title">
      <input type="text" placeholder="Meta" value="${esc(offering.meta)}" data-offering-index="${index}" data-offering-field="meta">
      <button class="btn btn--danger btn--sm" type="button" data-remove-offering="${index}">✕</button>
      <textarea placeholder="Texto" rows="2" data-offering-index="${index}" data-offering-field="text">${esc(offering.text)}</textarea>
    </div>
  `).join("");
}

$("#offerings-list").addEventListener("input", e => {
  if (e.target.dataset.offeringIndex !== undefined) {
    const index = Number(e.target.dataset.offeringIndex);
    const field = e.target.dataset.offeringField;
    areaOfferings[index][field] = e.target.value.trim();
    updateAreaPreview();
  }
});

$("#offerings-list").addEventListener("click", e => {
  if (e.target.dataset.removeOffering !== undefined) {
    const index = Number(e.target.dataset.removeOffering);
    areaOfferings = areaOfferings.filter((_, i) => i !== index);
    renderOfferingsList();
    updateAreaPreview();
  }
});

$("#add-offering").addEventListener("click", () => {
  areaOfferings.push({ title: "", meta: "", text: "" });
  renderOfferingsList();
  updateAreaPreview();
});

// Media list management
let areaMedia = [];

function renderMediaList() {
  const list = $("#media-list");
  if (!list) return;

  list.innerHTML = areaMedia.map((media, index) => `
    <div class="admin__item-row" style="grid-template-columns:repeat(3,1fr) auto">
      <input type="text" placeholder="Tipo" value="${esc(media.type)}" data-media-index="${index}" data-media-field="type">
      <input type="text" placeholder="Título" value="${esc(media.title)}" data-media-index="${index}" data-media-field="title">
      <input type="text" placeholder="URL" value="${esc(media.url)}" data-media-index="${index}" data-media-field="url">
      <button class="btn btn--danger btn--sm" type="button" data-remove-media="${index}">✕</button>
      <input type="text" placeholder="Kind" value="${esc(media.kind)}" data-media-index="${index}" data-media-field="kind">
      <input type="text" placeholder="Embed" value="${esc(media.embed)}" data-media-index="${index}" data-media-field="embed">
      <input type="text" placeholder="Tone" value="${esc(media.tone)}" data-media-index="${index}" data-media-field="tone">
    </div>
  `).join("");
}

$("#media-list").addEventListener("input", e => {
  if (e.target.dataset.mediaIndex !== undefined) {
    const index = Number(e.target.dataset.mediaIndex);
    const field = e.target.dataset.mediaField;
    areaMedia[index][field] = e.target.value.trim();
    updateAreaPreview();
  }
});

$("#media-list").addEventListener("click", e => {
  if (e.target.dataset.removeMedia !== undefined) {
    const index = Number(e.target.dataset.removeMedia);
    areaMedia = areaMedia.filter((_, i) => i !== index);
    renderMediaList();
    updateAreaPreview();
  }
});

$("#add-media").addEventListener("click", () => {
  areaMedia.push({ type: "", kind: "", title: "", url: "", embed: "", tone: "" });
  renderMediaList();
  updateAreaPreview();
});

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

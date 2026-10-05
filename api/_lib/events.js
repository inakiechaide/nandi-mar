const EVENTS_PATH = "data/events.json";
const STATUSES = ["open", "soldout", "soon"];
const FIELDS = ["area", "title", "date", "endDate", "place", "city", "country", "type", "status", "link", "description"];
const REQUIRED = ["area", "title", "date", "place", "city", "country", "type", "status"];
const MAX = { title: 140, place: 140, city: 80, country: 80, type: 80, link: 500, description: 600 };
const LABELS = { area: "área", title: "título", date: "fecha", endDate: "fecha de fin", place: "lugar", city: "ciudad", country: "país", type: "formato", status: "estado", link: "link", description: "descripción" };

const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

function normalizeEvent(raw, index) {
  const where = `Evento ${index + 1}`;
  if (!raw || typeof raw !== "object") throw new Error(`${where}: formato inválido`);
  const ev = {};
  for (const key of FIELDS) {
    const value = typeof raw[key] === "string" ? raw[key].trim() : "";
    if (value) ev[key] = value;
  }
  for (const key of REQUIRED) if (!ev[key]) throw new Error(`${where}: falta ${LABELS[key]}`);
  for (const [key, max] of Object.entries(MAX)) if (ev[key] && ev[key].length > max) throw new Error(`${where}: ${LABELS[key]} supera ${max} caracteres`);
  if (!/^[a-z0-9-]+$/.test(ev.area)) throw new Error(`${where}: área inválida`);
  if (!STATUSES.includes(ev.status)) throw new Error(`${where}: estado inválido`);
  if (!isDate(ev.date)) throw new Error(`${where}: fecha inválida`);
  if (ev.endDate && (!isDate(ev.endDate) || ev.endDate < ev.date)) throw new Error(`${where}: la fecha de fin debe ser igual o posterior a la fecha`);
  if (ev.link && !/^https?:\/\/\S+$/i.test(ev.link)) throw new Error(`${where}: el link debe empezar con http:// o https://`);
  return ev;
}

function normalizeEvents(list) {
  if (!Array.isArray(list)) throw new Error("La lista de eventos es inválida");
  if (list.length > 500) throw new Error("Demasiados eventos");
  return list.map(normalizeEvent).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

const serialize = events => `${JSON.stringify(events, null, 2)}\n`;

module.exports = { EVENTS_PATH, normalizeEvents, serialize };

const { send, allow, checkEnv, isJson, readJson } = require("./_lib/http");
const { getSession } = require("./_lib/session");
const { readFile, writeFile } = require("./_lib/github");
const { EVENTS_PATH, normalizeEvents, serialize } = require("./_lib/events");

const commitMessage = msg => `Eventos: ${String(msg || "actualización").replace(/[\r\n]+/g, " ").slice(0, 100)}`;

module.exports = async (req, res) => {
  if (!allow(req, res, ["GET", "PUT"]) || !checkEnv(res)) return;
  if (!getSession(req)) return send(res, 401, { error: "Sesión vencida, volvé a ingresar" });

  try {
    if (req.method === "GET") {
      const { sha, text } = await readFile(EVENTS_PATH);
      return send(res, 200, { sha, events: text ? JSON.parse(text) : [] });
    }

    if (!isJson(req)) return send(res, 415, { error: "Se esperaba JSON" });
    let body;
    try { body = await readJson(req); } catch { return send(res, 400, { error: "JSON inválido" }); }

    let events;
    try { events = normalizeEvents(body.events); } catch (err) { return send(res, 400, { error: err.message }); }

    const sha = await writeFile(EVENTS_PATH, serialize(events), body.sha || null, commitMessage(body.message));
    send(res, 200, { sha, events });
  } catch (err) {
    if (err.status === 409 || err.status === 422) return send(res, 409, { error: "Los eventos cambiaron mientras editabas. Se recargó la lista, probá de nuevo." });
    console.error(err);
    send(res, 502, { error: `No se pudo hablar con GitHub: ${err.message}` });
  }
};

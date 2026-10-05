const { send, allow, checkEnv } = require("./_lib/http");
const { getSession } = require("./_lib/session");

module.exports = (req, res) => {
  if (!allow(req, res, ["GET"]) || !checkEnv(res)) return;
  const session = getSession(req);
  if (!session) return send(res, 401, { error: "No autenticado" });
  send(res, 200, session);
};

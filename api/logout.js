const { send, allow } = require("./_lib/http");
const { endSession } = require("./_lib/session");

module.exports = (req, res) => {
  if (!allow(req, res, ["POST"])) return;
  endSession(req, res);
  send(res, 200, { ok: true });
};

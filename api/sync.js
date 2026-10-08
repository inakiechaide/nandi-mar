const { send, allow, checkEnv } = require("./_lib/http");
const { getSession } = require("./_lib/session");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

module.exports = async (req, res) => {
  if (!allow(req, res, ["POST"]) || !checkEnv(res)) return;
  if (!getSession(req)) return send(res, 401, { error: "Sesión vencida, volvé a ingresar" });

  try {
    console.log("Syncing with GitHub...");
    const { stdout, stderr } = await execAsync("git pull origin main");
    console.log("Git pull output:", stdout);
    if (stderr) console.error("Git pull stderr:", stderr);

    send(res, 200, { success: true, message: "Sincronizado con GitHub", output: stdout });
  } catch (err) {
    console.error("Error syncing:", err);
    send(res, 500, { error: `Error al sincronizar: ${err.message}` });
  }
};

const crypto = require("crypto");

const COOKIE = "nm_admin";
const MAX_AGE = 60 * 60 * 8;

const digest = value => crypto.createHash("sha256").update(String(value ?? "")).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

// La firma incluye las credenciales: si se cambia la contraseña en Vercel, las sesiones viejas dejan de valer.
const sign = payload => crypto
  .createHmac("sha256", process.env.SESSION_SECRET)
  .update(`${payload}|${process.env.ADMIN_USER}|${digest(process.env.ADMIN_PASSWORD).toString("hex")}`)
  .digest("base64url");

function checkCredentials(user, password) {
  const userOk = safeEqual(user, process.env.ADMIN_USER);
  const passOk = safeEqual(password, process.env.ADMIN_PASSWORD);
  return userOk && passOk;
}

function cookieAttrs(req, maxAge) {
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "");
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${local ? "" : "; Secure"}`;
}

function startSession(req, res) {
  const payload = Buffer.from(JSON.stringify({ u: process.env.ADMIN_USER, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  res.setHeader("Set-Cookie", `${COOKIE}=${payload}.${sign(payload)}; ${cookieAttrs(req, MAX_AGE)}`);
}

function endSession(req, res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; ${cookieAttrs(req, 0)}`);
}

function readCookie(req) {
  const header = req.headers.cookie || "";
  const pair = header.split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`));
  return pair ? decodeURIComponent(pair.slice(COOKIE.length + 1)) : "";
}

function getSession(req) {
  const [payload, signature] = readCookie(req).split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? { user: data.u } : null;
  } catch {
    return null;
  }
}

module.exports = { checkCredentials, startSession, endSession, getSession };

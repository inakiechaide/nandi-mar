const API = process.env.GITHUB_API_URL || "https://api.github.com";
const REPO = process.env.GITHUB_REPO || "inakiechaide/nandi-mar";
const BRANCH = process.env.GITHUB_BRANCH || "main";

class GitHubError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function request(path, { method = "GET", body, raw = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "nandi-mar-admin",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (raw && res.ok) return res.text();
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new GitHubError(res.status, json?.message || `GitHub respondió ${res.status}`);
  return json;
}

const contentsPath = path => `/repos/${REPO}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;

async function readFile(path) {
  try {
    const url = `${contentsPath(path)}?ref=${encodeURIComponent(BRANCH)}`;
    const file = await request(url);
    if (Array.isArray(file) || file.type !== "file") return { sha: null, text: null };
    // Para archivos de más de 1 MB GitHub devuelve "content" vacío: hay que pedir el contenido crudo.
    const text = file.content || !file.size
      ? Buffer.from(file.content || "", "base64").toString("utf8")
      : await request(url, { raw: true });
    return { sha: file.sha, text };
  } catch (err) {
    if (err.status === 404) return { sha: null, text: null };
    throw err;
  }
}

// `content` puede ser texto o un Buffer (imágenes).
async function writeFile(path, content, sha, message) {
  const data = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  const body = { message, content: data.toString("base64"), branch: BRANCH, ...(sha ? { sha } : {}) };
  const res = await request(contentsPath(path), { method: "PUT", body });
  return res.content.sha;
}

module.exports = { readFile, writeFile, GitHubError };

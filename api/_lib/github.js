const API = process.env.GITHUB_API_URL || "https://api.github.com";
const REPO = process.env.GITHUB_REPO || "inakiechaide/nandi-mar";
const BRANCH = process.env.GITHUB_BRANCH || "main";

class GitHubError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "nandi-mar-admin",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new GitHubError(res.status, json?.message || `GitHub respondió ${res.status}`);
  return json;
}

const contentsPath = path => `/repos/${REPO}/contents/${path}`;

async function readFile(path) {
  try {
    const file = await request(`${contentsPath(path)}?ref=${encodeURIComponent(BRANCH)}`);
    return { sha: file.sha, text: Buffer.from(file.content, "base64").toString("utf8") };
  } catch (err) {
    if (err.status === 404) return { sha: null, text: null };
    throw err;
  }
}

async function writeFile(path, text, sha, message) {
  const body = { message, content: Buffer.from(text, "utf8").toString("base64"), branch: BRANCH, ...(sha ? { sha } : {}) };
  const res = await request(contentsPath(path), { method: "PUT", body });
  return res.content.sha;
}

module.exports = { readFile, writeFile, GitHubError };

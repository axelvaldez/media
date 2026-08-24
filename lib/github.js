// All GitHub interaction goes through the REST + Git Data API — no local
// clone, no shelling out to `git`. Node-only (uses process.env), used by
// Netlify Functions, not the edge function.

const GITHUB_API = "https://api.github.com";
const IMAGE_PATH_RE = /^images\/(\d{4})\/(\d{2})\/([^/]+)$/;

function config() {
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, PUBLIC_BASE_URL } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    throw new Error("Missing GITHUB_TOKEN or GITHUB_REPO environment variables");
  }
  return {
    token: GITHUB_TOKEN,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH || "main",
    publicBaseUrl: PUBLIC_BASE_URL || "",
  };
}

async function githubRequest(token, path, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function monthLabel(year, month) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

// Returns months sorted newest-first, each with images sorted newest-first.
export async function listTree() {
  const { token, repo, branch, publicBaseUrl } = config();
  const data = await githubRequest(token, `/repos/${repo}/git/trees/${branch}?recursive=1`);

  const monthsMap = new Map();
  for (const entry of data.tree || []) {
    if (entry.type !== "blob") continue;
    const match = entry.path.match(IMAGE_PATH_RE);
    if (!match) continue;
    const [, year, month, filename] = match;
    const key = `${year}-${month}`;
    if (!monthsMap.has(key)) {
      monthsMap.set(key, { key, label: monthLabel(year, month), images: [] });
    }
    monthsMap.get(key).images.push({
      name: filename,
      path: entry.path,
      url: `${publicBaseUrl}/images/${year}/${month}/${filename}`,
    });
  }

  const months = Array.from(monthsMap.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  for (const month of months) {
    month.images.sort((a, b) => (a.name < b.name ? 1 : -1));
  }
  return months;
}

async function getBaseTree(token, repo, branch) {
  const ref = await githubRequest(token, `/repos/${repo}/git/refs/heads/${branch}`);
  const commitSha = ref.object.sha;
  const commit = await githubRequest(token, `/repos/${repo}/git/commits/${commitSha}`);
  return { commitSha, treeSha: commit.tree.sha };
}

async function commitTreeEntries(entries, message) {
  const { token, repo, branch } = config();
  const { commitSha, treeSha } = await getBaseTree(token, repo, branch);

  const newTree = await githubRequest(token, `/repos/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: treeSha, tree: entries }),
  });

  const newCommit = await githubRequest(token, `/repos/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [commitSha] }),
  });

  await githubRequest(token, `/repos/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return newCommit.sha;
}

// files: [{ path, contentBase64 }]. Creates one blob per file, one tree,
// one commit — a single push for the whole batch.
export async function commitFiles(files, message) {
  const { token, repo } = config();
  const entries = [];
  for (const file of files) {
    const blob = await githubRequest(token, `/repos/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: file.contentBase64, encoding: "base64" }),
    });
    entries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  return commitTreeEntries(entries, message);
}

// paths: ["images/2026/08/....jpg"]. A tree entry with sha: null deletes
// that path — no need to reconstruct the full tree by hand.
export async function deleteFiles(paths, message) {
  const entries = paths.map((path) => ({ path, mode: "100644", type: "blob", sha: null }));
  return commitTreeEntries(entries, message);
}

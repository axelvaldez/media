import { verifySession } from "../../lib/auth.js";
import { deleteFiles } from "../../lib/github.js";
import { resultPage } from "../../lib/html.js";

export default async (req) => {
  const session = await verifySession(req.headers.get("cookie"), process.env.SESSION_SECRET);
  if (!session) {
    return resultPage("Not authorized.", 401);
  }
  if (req.method !== "POST") {
    return resultPage("Method not allowed.", 405);
  }

  const form = await req.formData();
  const paths = form.getAll("paths").map(String).filter(Boolean);

  if (paths.length === 0) {
    return resultPage("No images were selected for deletion.", 400);
  }

  try {
    await deleteFiles(paths, `Delete ${paths.length} image${paths.length === 1 ? "" : "s"}`);
  } catch (err) {
    return resultPage(`Delete failed: ${err.message}`, 500);
  }

  await purgeJsdelivr(paths);

  return resultPage(`🗑️ ${paths.length} image${paths.length === 1 ? "" : "s"} deleted.`, 200, true);
};

// Best-effort: the git delete already succeeded, so a purge failure
// shouldn't fail the request — it just means the CDN edge might keep
// serving the stale file a little longer.
async function purgeJsdelivr(paths) {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!repo) return;
  await Promise.all(
    paths.map((path) =>
      fetch(`https://purge.jsdelivr.net/gh/${repo}@${branch}/${path}`).catch(() => {})
    )
  );
}

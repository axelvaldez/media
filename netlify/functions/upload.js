import { verifySession } from "../../lib/auth.js";
import { commitFiles } from "../../lib/github.js";
import { resultPage } from "../../lib/html.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/svg+xml"]);

export default async (req) => {
  const session = await verifySession(req.headers.get("cookie"), process.env.SESSION_SECRET);
  if (!session) {
    return resultPage("Not authorized.", 401);
  }
  if (req.method !== "POST") {
    return resultPage("Method not allowed.", 405);
  }

  const form = await req.formData();
  const files = form.getAll("files").filter(isFileLike);

  if (files.length === 0) {
    return resultPage("No files were uploaded.", 400);
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const timestamp = now.getTime();

  const staged = [];
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return resultPage(`"${file.name}" isn't a supported image type.`, 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    staged.push({
      path: `images/${year}/${month}/${timestamp}-${sanitizeFilename(file.name)}`,
      contentBase64: bufferToBase64(bytes),
    });
  }

  try {
    await commitFiles(staged, `Add ${staged.length} image${staged.length === 1 ? "" : "s"}`);
  } catch (err) {
    return resultPage(`Upload failed: ${err.message}`, 500);
  }

  return resultPage(`✅ ${staged.length} image${staged.length === 1 ? "" : "s"} added to ${monthLabel(year, month)}.`, 200, true);
};

function isFileLike(entry) {
  return entry && typeof entry === "object" && typeof entry.arrayBuffer === "function" && entry.size > 0;
}

function sanitizeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function bufferToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function monthLabel(year, month) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

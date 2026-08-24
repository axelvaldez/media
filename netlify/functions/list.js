import { verifySession } from "../../lib/auth.js";
import { listTree } from "../../lib/github.js";

export default async (req) => {
  const session = await verifySession(req.headers.get("cookie"), process.env.SESSION_SECRET);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const months = await listTree();
    return json({ months });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

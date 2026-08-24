// Gates /admin/* (see netlify.toml). Deno runtime — this is why lib/auth.js
// only uses Web Crypto rather than node:crypto, so it works unmodified here.
import { verifySession } from "../../lib/auth.js";

export default async (request, context) => {
  const secret = Deno.env.get("SESSION_SECRET");
  const session = await verifySession(request.headers.get("cookie"), secret);

  if (!session) {
    return Response.redirect(new URL("/login/", request.url), 302);
  }

  return context.next();
};

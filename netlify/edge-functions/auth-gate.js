import { verifySession } from "../../lib/auth.js";

export default async (request, context) => {
  const secret = Deno.env.get("SESSION_SECRET");
  const session = await verifySession(request.headers.get("cookie"), secret);

  if (!session) {
    return Response.redirect(new URL("/login/", request.url), 302);
  }

  return context.next();
};

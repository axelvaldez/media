import { buildClearedSessionCookie } from "../../lib/auth.js";

export default async () => {
  return new Response(null, {
    status: 303,
    headers: {
      "Set-Cookie": buildClearedSessionCookie(),
      Location: "/login/",
    },
  });
};

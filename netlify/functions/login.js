import { verifyPassword, createSessionToken, buildSessionCookie } from "../../lib/auth.js";
import { escapeHtml } from "../../lib/html.js";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { AUTH_USERNAME, AUTH_PASSWORD_HASH, SESSION_SECRET } = process.env;
  if (!AUTH_USERNAME || !AUTH_PASSWORD_HASH || !SESSION_SECRET) {
    return loginErrorPage("The app isn't configured yet — missing auth environment variables.");
  }

  const form = await req.formData();
  const username = String(form.get("username") || "");
  const password = String(form.get("password") || "");

  const usernameOk = username === AUTH_USERNAME;
  const passwordOk = await verifyPassword(password, AUTH_PASSWORD_HASH);

  if (!usernameOk || !passwordOk) {
    return loginErrorPage("Incorrect username or password.");
  }

  const token = await createSessionToken(SESSION_SECRET, username);
  return new Response(null, {
    status: 303,
    headers: {
      "Set-Cookie": buildSessionCookie(token),
      Location: "/admin/",
    },
  });
};

function loginErrorPage(message) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Log in — media</title>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <main class="login-page">
    <h1>media</h1>
    <p class="result-error">${escapeHtml(message)}</p>
    <form method="post" action="/.netlify/functions/login">
      <p>
        <label for="username">Username</label>
        <input type="text" id="username" name="username" autocomplete="username" required autofocus>
      </p>
      <p>
        <label for="password">Password</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </p>
      <button type="submit">Log in</button>
    </form>
  </main>
</body>
</html>`;
  return new Response(html, { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

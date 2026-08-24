export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A small standalone HTML page functions redirect real form submissions to
// — the browser's own navigation is the "please wait" state, this is just
// the result screen once it's done.
export function resultPage(message, status, ok = false) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>media</title>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <main class="result-page">
    <p class="${ok ? "result-ok" : "result-error"}">${escapeHtml(message)}</p>
    <p><a href="/admin/">Back to gallery</a></p>
  </main>
</body>
</html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

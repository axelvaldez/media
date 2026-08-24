# media

A tiny single-user image vault: drag images in, they land in this repo
under `images/YYYY/MM/`, and each one gets a stable public URL to
hotlink from other sites. No database — GitHub's own file tree is the
source of truth. No build step for viewing — the gallery reads the
live GitHub tree on every load.

## How it fits together

- **Admin app** (`public/`, `netlify/functions/`, `netlify/edge-functions/`):
  a small static UI plus a handful of Netlify Functions, deployed by
  Netlify. This is the *only* thing behind auth.
- **Images** (`images/YYYY/MM/*`): committed straight to this repo via
  GitHub's API from the `upload`/`delete` functions — not through
  Netlify's build/deploy at all.
- **Public image URLs**: `media.axel.mx/images/2026/08/....jpg`
  proxies (via a Netlify redirect, see `netlify.toml`) to
  `cdn.jsdelivr.net/gh/OWNER/REPO@main/images/...`. Because jsdelivr
  reads straight from GitHub, an image is fetchable moments after the
  commit lands — no Netlify deploy has to finish first.

Zero npm dependencies — everything uses Web-standard APIs (`fetch`,
`Request.formData()`, Web Crypto) so it runs unmodified in both the
Node-based Functions and the Deno-based Edge Function.

## One-time setup

1. **Create the GitHub repo** and push this scaffold to it.
2. **Fill in `netlify.toml`**: replace `OWNER/REPO` in the `/images/*`
   redirect with the real `owner/repo`.
3. **GitHub token**: create a fine-grained personal access token scoped
   to just this repo, with **Contents: Read and write** permission.
4. **Hash a password**:
   ```bash
   npm run hash-password
   ```
   Paste the printed `salt:hash` value into the `AUTH_PASSWORD_HASH`
   env var below.
5. **Create the Netlify site**, linked to the repo. Set these
   environment variables in the Netlify dashboard:
   | Variable | Value |
   |---|---|
   | `AUTH_USERNAME` | your chosen username |
   | `AUTH_PASSWORD_HASH` | output of `npm run hash-password` |
   | `SESSION_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
   | `GITHUB_TOKEN` | the fine-grained PAT from step 3 |
   | `GITHUB_REPO` | `owner/repo` |
   | `GITHUB_BRANCH` | `main` |
   | `PUBLIC_BASE_URL` | `https://media.axel.mx` (your custom domain, no trailing slash) |
6. **Custom domain**: point `media.axel.mx` (or whatever you choose) at
   the Netlify site in the Netlify dashboard's Domain settings — this
   is a manual DNS step, not something in this repo.

## Local development

```bash
npm install -g netlify-cli   # if you don't have it already
netlify link                 # connect this folder to the Netlify site
netlify dev
```

`netlify dev` runs the functions, the edge function, and the redirects
together locally, reading env vars from the linked site (or a local
`.env` file, which is gitignored).

## Known limits

- Netlify Functions have a request body ceiling in the low single-digit
  MB for synchronous invocations — fine for a normal handful-of-photos
  batch, but a very large multi-photo drop could exceed it. Not solved
  here; if it becomes a real problem, the fix is chunking uploads into
  multiple requests.
- No brute-force lockout on login (single low-value personal target;
  the password comparison is constant-time, but there's no rate limit).
- Deleting purges the jsdelivr cache best-effort — if that call fails,
  the file is still gone from git, but the CDN edge might serve a
  stale copy briefly.

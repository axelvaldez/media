Images are committed here as `YYYY/MM/<timestamp>-<filename>` by the
`upload` function — you shouldn't need to add files by hand. This
folder is intentionally outside `public/`, Netlify's publish directory,
so it's never part of a Netlify deploy; images are served by proxying
to jsdelivr's GitHub CDN instead (see `netlify.toml`).

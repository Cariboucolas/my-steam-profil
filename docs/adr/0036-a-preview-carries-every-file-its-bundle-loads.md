# A preview carries every file its bundle loads

`preview.yml` uploads its artifact with `include-hidden-files: true`, and `preview-deploy.yml`
refuses to deploy a web bundle that names a file under `/assets/` the artifact does not hold, or
that names none at all.

## What it amends

[ADR-0035](0035-a-preview-is-built-by-the-pull-request-and-deployed-by-main.md) handed `dist` and
`storybook-static` over through `actions/upload-artifact`, which by default leaves out every file
whose path has a segment beginning with `.`. The Expo export keeps every font under
`dist/assets/__node_modules/.pnpm/…`, so no preview since ADR-0035 carried one. Pages answered
each font URL with `index.html` (`200 text/html`), the browser refused it as a font, and the app,
which waits on its fonts, stayed black. Every check was green: production, built and deployed in
one job by `deploy.yml`, never crosses an artifact and served its fonts.

## What it binds

- The artifact `preview` includes hidden files.
- Before deploying, `preview-deploy.yml` lists every `"/assets/…"` string in
  `dist/_expo/static/js/web/*.js` — the form in which the export names the files it loads — and
  fails if one of them is not a file of the artifact. It fails too when it finds none: the app
  ships fonts, so an empty list means the step no longer sees them, not that they are all there.
- The step reads the artifact with `grep` and `test` only and runs nothing of it, as ADR-0035
  requires.

## What remains open

- Only the web app's bundle is checked. The gallery's `storybook-static` is not.
- A reference the export would write in another form than a quoted `/assets/…` path — encoded,
  or built at run time — is not seen. The check then passes on what it does see, as long as it
  sees at least one.

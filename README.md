# Krishna Anandam lead slider (Next.js)

Next.js static export of `source/index.html`, deployed to Cloudflare Pages at https://lead.krishnaanandam.com.

## Local development

```bash
npm install
npm run dev
```

## Sync changes from the original HTML

Edit `source/index.html`, then regenerate the extracted CSS, markup and JavaScript:

```bash
node scripts/sync-from-html.mjs
npm run build
```

The generator writes:

- `app/globals.css` — styles from the original `<style>` block
- `lib/legacy-page.ts` — body markup rendered by `app/page.tsx`
- `public/legacy.js` — original inline JavaScript loaded after hydration

## Deployment

- GitHub: `pariflex1/ka-lead-next`
- Cloudflare Pages project: `ka-lead-form` (already owns `lead.krishnaanandam.com` and `www.lead.krishnaanandam.com`)
- Build command: `npm run build`
- Build output: `out`

Direct deploy from this machine:

```bash
npm run build
npx wrangler pages deploy out --project-name ka-lead-form --branch main
```

Cloudflare Pages Git integration can be connected to this repository with build command `npm run build` and build output `out` if automatic deploys on push are needed.

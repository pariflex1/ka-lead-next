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

Images are stored in `source/images` and copied to `public/images`, so all page images are served from the same Cloudflare Pages domain.

The generator writes:

- `app/globals.css` — styles from the original `<style>` block
- `lib/legacy-page.ts` — body markup rendered by `app/page.tsx`
- `public/legacy.js` — original inline JavaScript loaded after hydration

## Deployment

- GitHub: `pariflex1/ka-lead-next`
- Cloudflare Pages project: `ka-lead-next` (https://ka-lead-next.pages.dev)
- Custom domains: `lead.krishnaanandam.com`, `www.lead.krishnaanandam.com`
- Build command: `npm run build`
- Build output: `out`

DNS records required in the `krishnaanandam.com` zone (proxied CNAMEs):

| Name | Target |
| --- | --- |
| `lead` | `ka-lead-next.pages.dev` |
| `www.lead` | `ka-lead-next.pages.dev` |

Do not add a `wrangler.toml` with `pages_build_output_dir` to this repository: Wrangler treats it as the source of truth and removes the Pages custom domains on deploy.

Direct deploy from this machine:

```bash
npm run build
npx wrangler pages deploy out --project-name ka-lead-next --branch main
```

Cloudflare Pages Git integration can be connected to this repository with build command `npm run build` and build output `out` if automatic deploys on push are needed.

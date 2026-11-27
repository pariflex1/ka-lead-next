import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('source/index.html', 'utf8')

const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
  .map((match) => match[1])
  .join('\n')

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)
if (!bodyMatch) throw new Error('Could not find body in source/index.html')

const scripts = [...bodyMatch[1].matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .join('\n')

const body = bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')

const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');\n\n${styles.trim()}\n`

writeFileSync('app/globals.css', css)
writeFileSync('public/legacy.js', `${scripts.trim()}\n`)
writeFileSync('lib/legacy-page.ts', `export const bodyHtml = ${JSON.stringify(body)}\n`)

console.log(`Synced ${styles.length} chars of CSS, ${body.length} chars of markup and ${scripts.length} chars of JS.`)

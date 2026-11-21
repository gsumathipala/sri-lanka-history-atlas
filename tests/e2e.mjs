#!/usr/bin/env node
/**
 * End-to-end browser tests against the production build (vite preview).
 * Needs playwright-core and a Chromium. Set CHROMIUM_PATH, or a Playwright browser cache is searched.
 * Skips (exit 0) with a message if no browser is available.
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

let chromium
try {
  ;({ chromium } = await import('playwright-core'))
} catch {
  console.log('SKIP e2e: playwright-core not installed (npm i -D playwright-core)')
  process.exit(0)
}
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  for (const base of [join(homedir(), 'Library/Caches/ms-playwright'), join(homedir(), '.cache/ms-playwright')]) {
    if (!existsSync(base)) continue
    for (const d of readdirSync(base).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
      for (const rel of ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome', 'chrome-linux64/chrome']) {
        const p = join(base, d, rel)
        if (existsSync(p)) return p
      }
    }
  }
}
const exe = findChromium()
if (!exe) {
  console.log('SKIP e2e: no Chromium found (set CHROMIUM_PATH)')
  process.exit(0)
}
const PORT = 4199
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const URL = `http://localhost:${PORT}/`
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
let failures = 0
async function check(name, fn) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  try {
    await fn(page)
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '))
    console.log(`  ✔ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✖ ${name}\n      ${String(e.message).split('\n')[0]}`)
  } finally {
    await page.close()
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m)
}
console.log('e2e:')
await check('home loads with map, timeline and event list', async (p) => {
  await p.goto(URL)
  await p.waitForSelector('.leaflet-container')
  assert((await p.locator('.timeline svg').count()) === 1, 'no timeline')
  assert((await p.locator('.event-row').count()) > 3, 'no events listed')
})
await check('event permalink shows evidence and citations', async (p) => {
  await p.goto(URL + '#event=chola-conquest')
  await p.waitForSelector('.evidence li')
  assert((await p.locator('.evidence li').count()) >= 3, 'evidence missing')
  assert((await p.textContent('.now-year'))?.includes('993'), 'timeline did not move')
})
await check('chronicle chip opens the text with cited verses highlighted', async (p) => {
  await p.goto(URL + '#event=abhayagiri-founded')
  await p.click('button.chron-dipavamsa')
  await p.waitForSelector('.verse.hl')
  assert((await p.locator('.verse.hl').count()) === 4, 'expected verses 14-17 highlighted')
})
await check('ruler page with succession and chronicle links', async (p) => {
  await p.goto(URL + '#ruler=parakramabahu-i')
  await p.waitForSelector('.succession')
  assert((await p.locator('.chron-chips button').count()) >= 5, 'chronicle chips missing')
})
await check('relic journey draws numbered stations', async (p) => {
  await p.goto(URL)
  await p.click('nav button:nth-child(4)')
  await p.click('.event-row >> nth=0')
  await p.waitForSelector('.station')
  assert((await p.locator('.station').count()) === 14, 'tooth relic should have 14 stations')
})
await check('guided tour moves map and timeline', async (p) => {
  await p.goto(URL)
  await p.click('nav button:nth-child(2)')
  await p.click('.event-row:has-text("Dutthagamani")')
  for (let i = 0; i < 3; i++) await p.click('.tour-controls button:nth-child(3)')
  assert((await p.textContent('.tour h2')) === 'Four months at Vijitanagara', 'wrong tour step')
})
await check('Sinhala and Tamil interface', async (p) => {
  await p.goto(URL)
  await p.selectOption('select.lang', 'si')
  assert((await p.textContent('h1')) === 'කාලය හරහා ලංකාව', 'Sinhala title')
  await p.selectOption('select.lang', 'ta')
  assert((await p.textContent('.now-year'))?.includes('கி.மு.'), 'Tamil era label')
  await p.selectOption('select.lang', 'en')
})
await check('historical map overlay loads', async (p) => {
  await p.goto(URL)
  await p.selectOption('select[aria-label="Historical map overlay"]', 'arrowsmith-1805')
  await p.waitForSelector('img.leaflet-image-layer')
})
await check('3D flyover opens and loads its style', async (p) => {
  await p.goto(URL + '#place=ruwanwelisaya')
  await p.click('.flyover-btn')
  await p.waitForSelector('.flyover-map canvas', { timeout: 20000 })
  assert((await p.locator('.flyover-bar button:has-text("Reconstruction")').count()) === 1, 'no reconstruction toggle')
})
await browser.close()
server.kill()
console.log(failures ? `${failures} e2e failure(s)` : 'all e2e checks passed')
process.exit(failures ? 1 : 0)

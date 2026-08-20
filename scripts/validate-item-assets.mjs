import { readdirSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const assetDirectory = resolve(
  root,
  'public/assets/items/rifts-ultimate-edition',
)
const catalogPath = resolve(root, 'src/data/items/rifts-ultimate-edition.json')

export const ALLOWED_UNUSED_ITEM_ASSETS = Object.freeze([
  'explorer-lightweight-environmental-body-armor.webp',
  'hover-platform.webp',
  'ng-45lp-long-pistol.webp',
  'ng-56-light-ion-pistol.webp',
  'ng-59-ion-blaster.webp',
  'wilderness-crusader-armored-all-terrain-vehicle.webp',
])

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
const assetNames = new Set(
  readdirSync(assetDirectory).filter((name) => name.endsWith('.webp')),
)
const referencedNames = new Set(
  catalog.items.map(({ image }) => image && basename(image)).filter(Boolean),
)
const missing = [...referencedNames]
  .filter((name) => !assetNames.has(name))
  .sort()
const unused = [...assetNames]
  .filter((name) => !referencedNames.has(name))
  .sort()
const unexpectedUnused = unused.filter(
  (name) => !ALLOWED_UNUSED_ITEM_ASSETS.includes(name),
)
const staleAllowlist = ALLOWED_UNUSED_ITEM_ASSETS.filter(
  (name) => !unused.includes(name),
)

console.log(
  `Item assets: ${referencedNames.size} referenced, ${unused.length} intentionally unused.`,
)

if (missing.length || unexpectedUnused.length || staleAllowlist.length) {
  if (missing.length) console.error(`Missing assets: ${missing.join(', ')}`)
  if (unexpectedUnused.length)
    console.error(`Unexpected unused assets: ${unexpectedUnused.join(', ')}`)
  if (staleAllowlist.length)
    console.error(`Stale unused-asset allowlist: ${staleAllowlist.join(', ')}`)
  process.exitCode = 1
}

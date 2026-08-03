import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import packageMetadata from '../../package.json'
import packageLock from '../../package-lock.json'

const root = new URL('../../', import.meta.url)
const fromRoot = path => fileURLToPath(new URL(path, root))

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesBelow(path) : [path]
  })
}

describe('project structure', () => {
  it('keeps automated tests in the centralized test directory', () => {
    const sourceFiles = filesBelow(fromRoot('src'))
    expect(sourceFiles.filter(path => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path))).toEqual([])
  })

  it.each([
    ['tw-calculator', 'TwCalculatorPage.vue'],
    ['tw-device-browser', 'TwDeviceBrowserPage.vue'],
    ['initiative-tracker', 'InitiativeTrackerPage.vue'],
    ['character-sheet', 'CharacterSheetPage.vue'],
  ])('keeps the %s page behind a stable wrapper and components directory', (page, wrapper) => {
    const pageRoot = `src/pages/${page}/`
    expect(existsSync(fromRoot(`${pageRoot}index.js`))).toBe(true)
    expect(existsSync(fromRoot(`${pageRoot}${wrapper}`))).toBe(true)
    expect(existsSync(fromRoot(`${pageRoot}components`))).toBe(true)
  })

  it('keeps package and lockfile release versions synchronized', () => {
    expect(packageLock.version).toBe(packageMetadata.version)
    expect(packageLock.packages[''].version).toBe(packageMetadata.version)
  })

  it('keeps the project maintenance agent valid and tracked by convention', () => {
    const agentPath = fromRoot('.codex/agents/maintenance-cleaner.toml')
    expect(extname(agentPath)).toBe('.toml')
    const agent = readFileSync(agentPath, 'utf8')
    expect(agent).toMatch(/^name\s*=\s*"maintenance_cleaner"/m)
    expect(agent).toMatch(/^description\s*=\s*".+"/m)
    expect(agent).toMatch(/^developer_instructions\s*=\s*"""[\s\S]+"""/m)
  })
})

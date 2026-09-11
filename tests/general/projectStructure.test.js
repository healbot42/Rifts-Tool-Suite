import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import packageMetadata from '../../package.json'
import packageLock from '../../package-lock.json'

const root = new URL('../../', import.meta.url)
const fromRoot = (path) => fileURLToPath(new URL(path, root))

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesBelow(path) : [path]
  })
}

describe('project structure', () => {
  it('keeps automated tests in the centralized test directory', () => {
    const sourceFiles = filesBelow(fromRoot('src'))
    expect(
      sourceFiles.filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path)),
    ).toEqual([])
  })

  it.each([
    ['tw-calculator', 'TwCalculatorPage.vue'],
    ['tw-device-browser', 'TwDeviceBrowserPage.vue'],
    ['initiative-tracker', 'InitiativeTrackerPage.vue'],
    ['character-sheet', 'CharacterSheetPage.vue'],
    ['deal-watchlist', 'DealWatchlistPage.vue'],
  ])(
    'keeps the %s page behind a stable wrapper and components directory',
    (page, wrapper) => {
      const pageRoot = `src/pages/${page}/`
      expect(existsSync(fromRoot(`${pageRoot}index.js`))).toBe(true)
      expect(existsSync(fromRoot(`${pageRoot}${wrapper}`))).toBe(true)
      expect(existsSync(fromRoot(`${pageRoot}components`))).toBe(true)
    },
  )

  it('keeps package and lockfile release versions synchronized', () => {
    expect(packageLock.version).toBe(packageMetadata.version)
    expect(packageLock.packages[''].version).toBe(packageMetadata.version)
  })

  it('keeps linting and formatting in the required quality gate', () => {
    expect(existsSync(fromRoot('eslint.config.js'))).toBe(true)
    expect(existsSync(fromRoot('.prettierrc.json'))).toBe(true)
    expect(existsSync(fromRoot('ruff.toml'))).toBe(true)
    expect(packageMetadata.scripts.lint).toBeTruthy()
    expect(packageMetadata.scripts['format:check']).toBeTruthy()
    expect(packageMetadata.scripts.check).toContain('npm run lint')
    expect(packageMetadata.scripts.check).toContain('npm run format:check')
  })

  it('keeps canonical game data in the shared data directory', () => {
    expect(existsSync(fromRoot('src/data/README.md'))).toBe(true)
    expect(existsSync(fromRoot('src/data/magic/spells.js'))).toBe(true)
    expect(existsSync(fromRoot('src/data/tw-devices/tw-devices.json'))).toBe(
      true,
    )
    expect(existsSync(fromRoot('src/data/character/occs.js'))).toBe(true)
    expect(
      existsSync(fromRoot('src/data/items/rifts-ultimate-edition.json')),
    ).toBe(true)
    expect(
      existsSync(
        fromRoot('src/data/items/rifts-ultimate-edition.reviewed.json'),
      ),
    ).toBe(true)

    const pageDataDirectories = readdirSync(fromRoot('src/pages'), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `src/pages/${entry.name}/data`)
      .filter((path) => existsSync(fromRoot(path)))
    expect(pageDataDirectories).toEqual([])
  })

  it('keeps the project maintenance agent valid and tracked by convention', () => {
    const agentPath = fromRoot('.codex/agents/maintenance-cleaner.toml')
    expect(extname(agentPath)).toBe('.toml')
    const agent = readFileSync(agentPath, 'utf8')
    expect(agent).toMatch(/^name\s*=\s*"maintenance_cleaner"/m)
    expect(agent).toMatch(/^description\s*=\s*".+"/m)
    expect(agent).toMatch(/^developer_instructions\s*=\s*"""[\s\S]+"""/m)
  })

  it('keeps the shared game-data agent valid and tracked by convention', () => {
    const agentPath = fromRoot('.codex/agents/game-data-maintainer.toml')
    expect(extname(agentPath)).toBe('.toml')
    const agent = readFileSync(agentPath, 'utf8')
    expect(agent).toMatch(/^name\s*=\s*"game_data_maintainer"/m)
    expect(agent).toMatch(/^description\s*=\s*".+"/m)
    expect(agent).toMatch(/^developer_instructions\s*=\s*"""[\s\S]+"""/m)
  })

  it('keeps the code-comment agent valid and tracked by convention', () => {
    const agentPath = fromRoot('.codex/agents/code-comment-maintainer.toml')
    expect(extname(agentPath)).toBe('.toml')
    const agent = readFileSync(agentPath, 'utf8')
    expect(agent).toMatch(/^name\s*=\s*"code_comment_maintainer"/m)
    expect(agent).toMatch(/^description\s*=\s*".+"/m)
    expect(agent).toMatch(/^developer_instructions\s*=\s*"""[\s\S]+"""/m)
    expect(agent).toContain('Use JSDoc')
    expect(agent).toContain('Do not narrate syntax')
    const instructions = readFileSync(fromRoot('AGENTS.md'), 'utf8')
    const endOfDay = instructions.slice(
      instructions.indexOf('## End-of-day workflow'),
    )
    const maintenanceStep = endOfDay.indexOf('`maintenance_cleaner` agent')
    const commentStep = endOfDay.indexOf('`code_comment_maintainer` agent')
    const verificationStep = endOfDay.indexOf(
      'Run `npm run check` and `git diff --check`',
    )
    expect(maintenanceStep).toBeGreaterThan(-1)
    expect(commentStep).toBeGreaterThan(maintenanceStep)
    expect(verificationStep).toBeGreaterThan(commentStep)
  })

  it('keeps the item-image generator agent valid and tracked by convention', () => {
    const agentPath = fromRoot('.codex/agents/item-image-generator.toml')
    expect(extname(agentPath)).toBe('.toml')
    const agent = readFileSync(agentPath, 'utf8')
    expect(agent).toMatch(/^name\s*=\s*"item_image_generator"/m)
    expect(agent).toContain('opaque solid dark-navy background')
    expect(agent).toContain(
      'Never request, generate, key out, or post-process transparency',
    )
    expect(agent).toContain('bold saturated blue/orange palette')
    expect(agent).toContain(
      'Perform a balanced-detail acceptance check against the TW-45 benchmark',
    )
    expect(agent).toContain(
      'layered blue primary contours plus secondary pale-blue or white structural outlines',
    )
    expect(agent).toMatch(/^description\s*=\s*".+"/m)
    expect(agent).toMatch(/^developer_instructions\s*=\s*"""[\s\S]+"""/m)
    expect(agent).toContain('Generate every item as a brand-new image')
    expect(agent).toContain('must not resemble a sword or handheld blade')
    expect(agent).toContain("Preserve the item's natural proportions")
    expect(agent).toContain('Perform a structural-continuity trace')
  })
})

import { describe, expect, it } from 'vitest'
import {
  assetCatalog,
  assetsByType,
} from '../../../src/data/character/assetCatalog.js'
import {
  createOwnedAsset,
  normalizeOwnedAssets,
  ownedAssetStats,
} from '../../../src/pages/character-sheet/lib/ownedAssets.js'

describe('owned stat-bearing assets', () => {
  it('provides stable source-backed power armor and robot records', () => {
    expect(assetCatalog.map((asset) => asset.id)).toEqual([
      'usa-g10-glitter-boy',
      'ft-005-flying-titan',
      'ng-x9-samson',
      'tr-001-combat-titan',
    ])
    for (const asset of assetCatalog) {
      expect(asset.source).toMatchObject({
        book: 'Rifts Ultimate Edition',
        pages: expect.any(String),
      })
      expect(asset.mainMdc).toBeGreaterThan(0)
      expect(asset.weapons.length).toBeGreaterThan(0)
    }
    expect(assetsByType('giant-robot').map((asset) => asset.id)).toEqual([
      'tr-001-combat-titan',
    ])
  })

  it('separates the immutable catalog snapshot from mutable current state', () => {
    const owned = createOwnedAsset('usa-g10-glitter-boy', 'owned-1')
    owned.current.mainMdc = 123
    owned.current.ammo['boom-gun'] = 42
    expect(owned.snapshot.mainMdc).toBe(770)
    expect(owned.snapshot.weapons[0].payload).toBe(1000)
    expect(ownedAssetStats(owned).id).toBe('usa-g10-glitter-boy')
  })

  it('migrates old references and retains snapshots when a catalog record is unavailable', () => {
    const migrated = normalizeOwnedAssets([
      { catalogId: 'ft-005-flying-titan', current: { mainMdc: 12 } },
    ])[0]
    expect(migrated.snapshot.name).toBe('FT-005 Flying Titan')
    expect(migrated.current.mainMdc).toBe(12)
    const retired = normalizeOwnedAssets([
      {
        id: 'old',
        catalogId: 'retired',
        name: 'Old robot',
        snapshot: { name: 'Old robot', mainMdc: 99, weapons: [] },
      },
    ])[0]
    expect(ownedAssetStats(retired).mainMdc).toBe(99)
  })
})

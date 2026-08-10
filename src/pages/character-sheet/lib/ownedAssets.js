import { assetCatalogById } from '../../../data/character/assetCatalog.js'

export function createOwnedAsset(catalogId, id) {
  const catalog = assetCatalogById[catalogId]
  if (!catalog) return null
  return {
    id,
    catalogId,
    name: catalog.name,
    snapshot: { ...catalog },
    current: {
      mainMdc: catalog.mainMdc,
      ammo: Object.fromEntries(
        catalog.weapons.map((weapon) => [
          weapon.id,
          typeof weapon.payload === 'number' ? weapon.payload : null,
        ]),
      ),
    },
  }
}

export function normalizeOwnedAssets(saved = []) {
  return saved.filter(Boolean).map((owned, index) => {
    const catalog = assetCatalogById[owned.catalogId]
    const snapshot = owned.snapshot || (catalog ? { ...catalog } : null)
    return {
      id: owned.id || `asset-${index}`,
      catalogId: owned.catalogId || '',
      name: owned.name || snapshot?.name || 'Owned asset',
      snapshot,
      current: {
        mainMdc: owned.current?.mainMdc ?? snapshot?.mainMdc ?? 0,
        ammo: { ...(owned.current?.ammo || {}) },
      },
    }
  })
}

export function ownedAssetStats(owned) {
  return owned?.snapshot || assetCatalogById[owned?.catalogId] || null
}

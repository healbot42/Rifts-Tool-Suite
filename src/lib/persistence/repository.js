function clonePayload(payload, replacer) {
  return JSON.parse(JSON.stringify(payload, replacer))
}

function warning(error, degraded = false) {
  return { ...error, degraded }
}

/**
 * Creates the async document boundary shared by local and future remote stores.
 * Saves are serialized so an older watcher snapshot can never finish last.
 */
export function createDocumentRepository({
  key,
  type,
  schemaVersion = 1,
  primary,
  legacy,
  replacer,
  now = () => new Date().toISOString(),
}) {
  let lastRevision = 0
  let saveChain = Promise.resolve()

  async function load() {
    const primaryResult = await primary.get(key)
    if (primaryResult.ok && primaryResult.value) {
      lastRevision = Number(primaryResult.value.revision || 0)
      return {
        ok: true,
        value: primaryResult.value.payload,
        envelope: primaryResult.value,
      }
    }

    const primaryError = primaryResult.ok ? null : primaryResult.error
    const legacyResult = await legacy.get(key)
    if (!legacyResult.ok) return legacyResult
    if (legacyResult.value === null)
      return primaryError
        ? { ok: false, error: primaryError }
        : { ok: true, value: null, envelope: null }

    const payload = clonePayload(legacyResult.value, replacer)
    const envelope = {
      key,
      type,
      schemaVersion,
      revision: 1,
      updatedAt: now(),
      payload,
    }
    const migrated = await primary.put(envelope)
    if (migrated.ok) {
      lastRevision = 1
      return { ok: true, value: payload, envelope, migrated: true }
    }
    return {
      ok: true,
      value: payload,
      envelope: null,
      fallback: true,
      warning: warning(migrated.error),
    }
  }

  function save(payload) {
    const snapshot = clonePayload(payload, replacer)
    const operation = saveChain.then(async () => {
      const envelope = {
        key,
        type,
        schemaVersion,
        revision: lastRevision + 1,
        updatedAt: now(),
        payload: snapshot,
      }
      const primaryResult = await primary.put(envelope)
      if (primaryResult.ok) {
        lastRevision = envelope.revision
        const mirrorResult = await legacy.put(envelope, replacer)
        return mirrorResult.ok
          ? { ok: true, value: envelope }
          : {
              ok: true,
              value: envelope,
              warning: warning(mirrorResult.error, true),
            }
      }
      const fallbackResult = await legacy.put(envelope, replacer)
      return fallbackResult.ok
        ? {
            ok: true,
            value: envelope,
            fallback: true,
            warning: warning(primaryResult.error),
          }
        : fallbackResult
    })
    saveChain = operation.catch(() => undefined)
    return operation
  }

  async function remove() {
    await saveChain
    const primaryResult = await primary.remove(key)
    const legacyResult = await legacy.remove(key)
    if (!primaryResult.ok && !legacyResult.ok) return legacyResult
    if (!primaryResult.ok)
      return { ok: true, fallback: true, warning: warning(primaryResult.error) }
    if (!legacyResult.ok)
      return { ok: true, warning: warning(legacyResult.error, true) }
    lastRevision = 0
    return { ok: true }
  }

  return { key, type, schemaVersion, load, save, remove }
}

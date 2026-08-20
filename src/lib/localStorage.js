function failure(operation, key, kind, cause) {
  return {
    ok: false,
    error: {
      operation,
      key,
      kind,
      name: cause?.name || 'Error',
      message: cause?.message || String(cause),
      cause,
    },
  }
}

function resolveStorage(storage) {
  try {
    return { ok: true, value: storage ?? globalThis.localStorage }
  } catch (error) {
    return failure('access', '', 'unavailable', error)
  }
}

/**
 * Reads and parses JSON without allowing browser storage failures to escape.
 * A missing key is a successful read with a null value.
 */
export function readLocalJson(key, storage) {
  const resolved = resolveStorage(storage)
  if (!resolved.ok) return { ...resolved, error: { ...resolved.error, key } }

  let serialized
  try {
    serialized = resolved.value.getItem(key)
  } catch (error) {
    return failure('read', key, 'unavailable', error)
  }
  if (serialized === null) return { ok: true, value: null }

  try {
    return { ok: true, value: JSON.parse(serialized) }
  } catch (error) {
    return failure('parse', key, 'malformed', error)
  }
}

export function writeLocalJson(key, value, storage, replacer) {
  let serialized
  try {
    serialized = JSON.stringify(value, replacer)
  } catch (error) {
    return failure('serialize', key, 'serialization', error)
  }

  const resolved = resolveStorage(storage)
  if (!resolved.ok) return { ...resolved, error: { ...resolved.error, key } }
  try {
    resolved.value.setItem(key, serialized)
    return { ok: true, value: undefined }
  } catch (error) {
    const kind = error?.name === 'QuotaExceededError' ? 'quota' : 'unavailable'
    return failure('write', key, kind, error)
  }
}

export function removeLocalValue(key, storage) {
  const resolved = resolveStorage(storage)
  if (!resolved.ok) return { ...resolved, error: { ...resolved.error, key } }
  try {
    resolved.value.removeItem(key)
    return { ok: true, value: undefined }
  } catch (error) {
    return failure('remove', key, 'unavailable', error)
  }
}

export function localStorageErrorMessage(error, subject) {
  if (error.operation === 'parse')
    return `${subject} could not be loaded because the saved data is malformed. Your current work is still available.`
  if (error.kind === 'quota')
    return `${subject} could not be saved because browser storage is full. Your current work is still available.`
  if (error.operation === 'remove')
    return `${subject} could not be cleared from browser storage. Your current work is still available.`
  if (error.operation === 'read' || error.operation === 'access')
    return `${subject} could not be loaded because browser storage is unavailable. Your current work is still available.`
  return `${subject} could not be saved because browser storage is unavailable. Your current work is still available.`
}

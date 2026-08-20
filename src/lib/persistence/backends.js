import {
  readLocalJson,
  removeLocalValue,
  writeLocalJson,
} from '../localStorage.js'

export const DATABASE_NAME = 'rifts-tool-suite'
export const DATABASE_VERSION = 1
export const DOCUMENT_STORE = 'documents'

function backendFailure(operation, key, cause) {
  return {
    ok: false,
    error: {
      operation,
      key,
      kind: cause?.name === 'QuotaExceededError' ? 'quota' : 'unavailable',
      name: cause?.name || 'Error',
      message: cause?.message || String(cause),
      cause,
    },
  }
}

export function createIndexedDbBackend(indexedDB = globalThis.indexedDB) {
  let databasePromise
  function open() {
    if (!indexedDB) return Promise.reject(new Error('IndexedDB is unavailable'))
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(DOCUMENT_STORE))
            request.result.createObjectStore(DOCUMENT_STORE, { keyPath: 'key' })
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        request.onblocked = () => reject(new Error('IndexedDB upgrade blocked'))
      }).catch((error) => {
        databasePromise = undefined
        throw error
      })
    }
    return databasePromise
  }

  async function transact(mode, operation, key, action) {
    try {
      const database = await open()
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(DOCUMENT_STORE, mode)
        const request = action(transaction.objectStore(DOCUMENT_STORE))
        let value = null
        request.onsuccess = () => {
          value = request.result ?? null
        }
        request.onerror = () => reject(request.error)
        transaction.onabort = () => reject(transaction.error)
        transaction.oncomplete = () => resolve({ ok: true, value })
      })
    } catch (error) {
      return backendFailure(operation, key, error)
    }
  }

  return {
    kind: 'indexeddb',
    get: (key) => transact('readonly', 'read', key, (store) => store.get(key)),
    put: (envelope) =>
      transact('readwrite', 'write', envelope.key, (store) =>
        store.put(envelope),
      ),
    remove: (key) =>
      transact('readwrite', 'remove', key, (store) => store.delete(key)),
  }
}

export function createLegacyBackend(storage) {
  return {
    kind: 'localstorage',
    async get(key) {
      return readLocalJson(key, storage)
    },
    async put(envelope, replacer) {
      return writeLocalJson(envelope.key, envelope.payload, storage, replacer)
    },
    async remove(key) {
      return removeLocalValue(key, storage)
    },
  }
}

export function createMemoryBackend(initial = []) {
  const documents = new Map(
    initial.map((item) => [item.key, structuredClone(item)]),
  )
  return {
    kind: 'memory',
    async get(key) {
      return { ok: true, value: structuredClone(documents.get(key) ?? null) }
    },
    async put(envelope) {
      documents.set(envelope.key, structuredClone(envelope))
      return { ok: true, value: undefined }
    },
    async remove(key) {
      documents.delete(key)
      return { ok: true, value: undefined }
    },
  }
}

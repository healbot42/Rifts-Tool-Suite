import { createIndexedDbBackend, createLegacyBackend } from './backends.js'
import { createDocumentRepository } from './repository.js'
import { localStorageErrorMessage } from '../localStorage.js'

export const PERSISTENCE_DOCUMENTS = Object.freeze({
  twDevice: { key: 'rifts-tw-device', type: 'tw-device' },
  character: { key: 'rifts-character-sheet', type: 'character' },
  initiativeEncounter: {
    key: 'rifts-initiative-tracker',
    type: 'initiative-encounter',
  },
  initiativePresets: {
    key: 'rifts-initiative-presets',
    type: 'initiative-presets',
  },
})

const transientTwFields = (key, value) =>
  key === 'searchOpen' ? undefined : value

export function createRepositories({
  primary = createIndexedDbBackend(),
  legacy = createLegacyBackend(),
  now,
} = {}) {
  const make = (document, options = {}) =>
    createDocumentRepository({ ...document, primary, legacy, now, ...options })
  const character = make(PERSISTENCE_DOCUMENTS.character)
  return {
    twDevice: make(PERSISTENCE_DOCUMENTS.twDevice, {
      replacer: transientTwFields,
    }),
    character: { ...character, importSaved: character.load },
    initiativeEncounter: make(PERSISTENCE_DOCUMENTS.initiativeEncounter),
    initiativePresets: make(PERSISTENCE_DOCUMENTS.initiativePresets),
  }
}

export const repositories = createRepositories()

export function persistenceErrorMessage(error, subject) {
  if (error.degraded)
    return `${subject} was saved, but its rollback-compatible copy could not be updated. Export current work before using an older app version.`
  if (error.kind === 'unavailable' && error.operation !== 'parse')
    return `${subject} is using compatibility storage because the browser database is unavailable. Your current work is still available.`
  return localStorageErrorMessage(error, subject)
}

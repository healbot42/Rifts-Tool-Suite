import spellDescriptions from './spell-descriptions.json'
import { RIFTS_ULTIMATE_SPELLS } from './spells.js'

const descriptionRecords = Object.entries(spellDescriptions.spells)
const runtimeByKey = new Map(
  RIFTS_ULTIMATE_SPELLS.map((spell) => [
    `${spell.level}:${spell.name.toLocaleLowerCase()}`,
    spell,
  ]),
)

/** Canonical invocation records shared by character spellbooks and tools. */
export const invocations = Object.freeze(
  descriptionRecords
    .map(([id, details]) => {
      const runtime = runtimeByKey.get(
        `${details.level}:${details.name.toLocaleLowerCase()}`,
      )
      if (!runtime)
        throw new Error(`Missing runtime invocation data for ${details.name}`)
      return Object.freeze({
        id,
        name: details.name,
        level: details.level,
        ppe: runtime.ppe,
        cost:
          runtime.ppeText === 'Special'
            ? 'Special'
            : `${runtime.ppeText || runtime.ppe} P.P.E.`,
        description: details.description,
        source: details.source,
      })
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
)

export const invocationsById = Object.freeze(
  Object.fromEntries(invocations.map((spell) => [spell.id, spell])),
)

export function groupInvocationsByLevel(spells) {
  const groups = new Map()
  for (const spell of [...spells].sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name),
  )) {
    if (!groups.has(spell.level)) groups.set(spell.level, [])
    groups.get(spell.level).push(spell)
  }
  return [...groups].map(([level, entries]) => ({ level, entries }))
}

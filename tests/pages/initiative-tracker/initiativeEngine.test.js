import { describe, expect, it } from 'vitest'
import {
  RIFTS_ULTIMATE_EDITION,
  RIFTS_CONDITIONS,
  RIFTS_MULTI_ACTION_MOVES,
  advanceConditions,
  availableActions,
  buildTurnSequence,
  createParticipant,
  findInitiativeTies,
  orderParticipants,
  loseInitiative,
  reorderTurnWithinPass,
  removeLastRemainingTurn,
  rollInitiative,
  setManualInitiative,
} from '../../../src/pages/initiative-tracker/lib/initiativeEngine.js'

function combatant(id, total, actions = 2, createdOrder = 0) {
  return {
    id,
    initiativeTotal: total,
    actionsPerRound: actions,
    createdOrder,
  }
}

describe('initiative engine', () => {
  it('defines concise rules for every condition and multi-action move', () => {
    expect(
      RIFTS_CONDITIONS.every((condition) => condition.rule.length > 20),
    ).toBe(true)
    expect(
      RIFTS_CONDITIONS.every((condition) => condition.rule.length < 180),
    ).toBe(true)
    expect(
      RIFTS_MULTI_ACTION_MOVES.every((move) => move.rule.length > 20),
    ).toBe(true)
  })
  it('creates participants when randomUUID is unavailable', () => {
    const originalCrypto = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    })
    try {
      expect(createParticipant().id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      })
    }
  })

  it('rolls the configured die and applies an initiative bonus', () => {
    const result = rollInitiative(
      { initiativeBonus: 3 },
      RIFTS_ULTIMATE_EDITION,
      () => 0.49,
    )
    expect(result.initiativeRoll).toBe(10)
    expect(result.initiativeTotal).toBe(13)
  })

  it('accepts a manually entered total without inventing a die roll', () => {
    const result = setManualInitiative({}, '17')
    expect(result.initiativeRoll).toBeNull()
    expect(result.initiativeTotal).toBe(17)
  })

  it('orders rolled combatants from highest initiative to lowest', () => {
    const ordered = orderParticipants([
      combatant('slow', 8),
      combatant('fast', 19),
    ])
    expect(ordered.map(({ id }) => id)).toEqual(['fast', 'slow'])
  })

  it('identifies tied totals that must be rerolled in Rifts', () => {
    const ties = findInitiativeTies([
      combatant('one', 14),
      combatant('two', 14),
      combatant('three', 9),
    ])
    expect(ties).toEqual([['one', 'two']])
  })

  it('allows members of one initiative group to share a total', () => {
    const one = { ...combatant('one', 14), group: 'minions' }
    const two = { ...combatant('two', 14), group: 'minions' }
    expect(findInitiativeTies([one, two])).toEqual([])
    expect(findInitiativeTies([one, two, combatant('hero', 14)])).toEqual([
      ['one', 'two', 'hero'],
    ])
  })

  it('cycles initiative order once per action pass', () => {
    const turns = buildTurnSequence([
      combatant('fast', 18, 3),
      combatant('slow', 10, 2),
    ])
    expect(turns).toEqual([
      { participantId: 'fast', action: 1 },
      { participantId: 'slow', action: 1 },
      { participantId: 'fast', action: 2 },
      { participantId: 'slow', action: 2 },
      { participantId: 'fast', action: 3 },
    ])
  })

  it('reorders turns only within the selected initiative pass', () => {
    const sequence = [
      { participantId: 'one', action: 1 },
      { participantId: 'two', action: 1 },
      { participantId: 'one', action: 2 },
      { participantId: 'two', action: 2 },
    ]
    expect(reorderTurnWithinPass(sequence, 'two', 1, 'one')).toEqual([
      { participantId: 'two', action: 1 },
      { participantId: 'one', action: 1 },
      { participantId: 'one', action: 2 },
      { participantId: 'two', action: 2 },
    ])
    expect(reorderTurnWithinPass(sequence, 'two', 1, 'one')).not.toBe(sequence)
  })

  it('does not move a turn to a target in another pass', () => {
    const sequence = [
      { participantId: 'one', action: 1 },
      { participantId: 'two', action: 2 },
    ]
    expect(reorderTurnWithinPass(sequence, 'one', 1, 'two')).toBe(sequence)
  })

  it('spends the last remaining action without removing completed turns', () => {
    const sequence = [
      { participantId: 'one', action: 1 },
      { participantId: 'two', action: 1 },
      { participantId: 'one', action: 2 },
      { participantId: 'two', action: 2 },
      { participantId: 'one', action: 3 },
    ]
    expect(removeLastRemainingTurn(sequence, 'one', 2)).toEqual([
      { participantId: 'one', action: 1 },
      { participantId: 'two', action: 1 },
      { participantId: 'one', action: 2 },
      { participantId: 'two', action: 2 },
    ])
  })

  it('leaves the queue unchanged when no actions remain', () => {
    const sequence = [{ participantId: 'one', action: 1 }]
    expect(removeLastRemainingTurn(sequence, 'one', 1)).toBe(sequence)
  })

  it('applies action debt and condition action limits', () => {
    expect(
      availableActions({
        actionsPerRound: 5,
        actionDebt: 1,
        conditions: [{ id: 'stunned-dazed', rounds: 2 }],
      }),
    ).toBe(1)
    expect(
      availableActions({
        actionsPerRound: 5,
        conditions: [{ id: 'knocked-out', rounds: 1 }],
      }),
    ).toBe(0)
  })

  it('moves a combatant to the end of each remaining pass', () => {
    const sequence = [
      { participantId: 'one', action: 1 },
      { participantId: 'two', action: 1 },
      { participantId: 'one', action: 2 },
      { participantId: 'two', action: 2 },
    ]
    expect(loseInitiative(sequence, 'one')).toEqual([
      { participantId: 'two', action: 1 },
      { participantId: 'one', action: 1 },
      { participantId: 'two', action: 2 },
      { participantId: 'one', action: 2 },
    ])
  })

  it('expires round-based conditions', () => {
    expect(
      advanceConditions([
        { id: 'held', rounds: 1 },
        { id: 'stunned-dazed', rounds: 2 },
      ]),
    ).toEqual([{ id: 'stunned-dazed', rounds: 1 }])
  })
})

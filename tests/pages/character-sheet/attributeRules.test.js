import { describe, expect, it } from 'vitest'
import {
  attributeOrder,
  evaluateAttributeRequirements,
  generateAttributes,
  rollOccAttributeBonuses,
} from '../../../src/data/character/attributeRules.js'
import {
  crazy,
  cyberKnight,
  headhunter,
  juicer,
  robotPilot,
} from '../../../src/data/character/occs.js'

function randomSequence(dieResults) {
  let index = 0
  return () => ((dieResults[index++] ?? 1) - 0.5) / 6
}

describe('RUE attribute generation', () => {
  it('rolls attributes in canonical order and stops exceptional dice after two', () => {
    const dice = [6, 6, 6, 6, 6, ...Array(7).fill([3, 3, 3]).flat()]
    const result = generateAttributes(randomSequence(dice))

    expect(attributeOrder).toEqual([
      'iq',
      'me',
      'ma',
      'ps',
      'pp',
      'pe',
      'pb',
      'spd',
    ])
    expect(result.values.iq).toBe(30)
    expect(result.rolls.iq).toEqual({
      baseDice: [6, 6, 6],
      baseTotal: 18,
      exceptionalDice: [6, 6],
      total: 30,
    })
    expect(result.rolls.me.exceptionalDice).toEqual([])
  })

  it('returns the player-choice compensation roll for one attribute below seven', () => {
    const dice = [...[1, 1, 1], ...Array(7).fill([3, 3, 3]).flat(), 6]
    const result = generateAttributes(randomSequence(dice))
    expect(result.lowAttributeCompensation).toMatchObject({
      lowAttributes: ['iq'],
      perceptionBonus: 0,
      operations: [{ target: null, value: 7, formula: '1D4+3' }],
    })
    expect(
      result.lowAttributeCompensation.operations[0].eligibleTargets,
    ).not.toContain('iq')
  })

  it('returns both player-choice bonuses and Perception +2 for multiple low attributes', () => {
    const dice = [
      ...[1, 1, 1],
      ...[2, 2, 2],
      ...Array(6).fill([3, 3, 3]).flat(),
      4,
    ]
    const result = generateAttributes(randomSequence(dice))
    expect(result.lowAttributeCompensation).toMatchObject({
      lowAttributes: ['iq', 'me'],
      perceptionBonus: 2,
      operations: [
        { target: null, value: 8, formula: '1D4+5' },
        { target: null, value: 3, formula: '+3' },
      ],
    })
  })

  it('dispatches named generation strategies and rejects unsupported R.C.C. rules', () => {
    expect(
      generateAttributes(() => 0, { generationStrategy: 'human-rue' })
        .generationStrategy,
    ).toBe('human-rue')
    expect(() =>
      generateAttributes(() => 0, { generationStrategy: 'dragon-rue' }),
    ).toThrow('Unsupported attribute generation strategy: dragon-rue')
  })
})

describe('O.C.C. attribute rules', () => {
  it('evaluates required and recommended thresholds separately', () => {
    expect(
      evaluateAttributeRequirements(cyberKnight.attributeRequirements, {
        iq: 9,
        me: 11,
        ps: 9,
        pe: 11,
      }),
    ).toMatchObject({
      met: true,
      results: [
        { attribute: 'me', met: true },
        { attribute: 'pe', met: true },
        { attribute: 'iq', met: false, recommended: true },
        { attribute: 'ps', met: false, recommended: true },
      ],
    })
    expect(
      evaluateAttributeRequirements(robotPilot.attributeRequirements, {
        ps: 10,
        pp: 11,
        pe: 12,
      }).met,
    ).toBe(false)
  })

  it('rolls Crazy, Headhunter, and Juicer attribute operations from data', () => {
    expect(rollOccAttributeBonuses(crazy, () => 0).operations).toMatchObject([
      { target: 'sdcBonus', operation: 'add', value: 30 },
      { target: 'hpBonus', operation: 'add', value: 5 },
      { target: 'pe', operation: 'add', value: 1 },
      { target: 'ps', operation: 'add', value: 2 },
      { target: 'ps', operation: 'minimum', value: 19 },
      { target: 'spd', operation: 'add', value: 4 },
      { target: 'pp', operation: 'add', value: 1 },
      { target: 'pp', operation: 'minimum', value: 17 },
    ])
    expect(
      rollOccAttributeBonuses(headhunter, () => 0).operations.map(
        (x) => x.value,
      ),
    ).toEqual([3, 1, 1])
    expect(rollOccAttributeBonuses(juicer, () => 0).operations).toMatchObject([
      { target: 'sdcBonus', value: 100, formula: '1D4x100' },
      { target: 'hpBonus', value: 10, formula: '1D4x10' },
      { target: 'pe', value: 2 },
      { target: 'ps', value: 2 },
      { target: 'ps', operation: 'minimum', value: 22 },
      { target: 'spd', value: 20, formula: '2D4x10' },
      { target: 'pp', value: 2 },
    ])
  })
})

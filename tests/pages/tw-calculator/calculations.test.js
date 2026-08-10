import { describe, expect, it } from 'vitest'
import {
  buildFinalSummary,
  calculateChainActivation,
  calculateChainBasePpe,
  calculateConstructionCredits,
  calculateConstructionHours,
  calculateModePpe,
  calculateNetSkillRollModifier,
  calculateRequiredGemCost,
  calculateSelectionPercent,
} from '../../../src/pages/tw-calculator/lib/calculations.js'

describe('variable spell P.P.E.', () => {
  it('supports fixed, additive, maximum, and per-unit modes', () => {
    expect(calculateModePpe({ ppe: 10 }, 99)).toBe(10)
    expect(
      calculateModePpe({ ppe: 10, calculation: 'add', multiplier: 2 }, 3),
    ).toBe(16)
    expect(
      calculateModePpe({ ppe: 10, calculation: 'max', multiplier: 4 }, 3),
    ).toBe(12)
    expect(
      calculateModePpe({ calculation: 'perUnit', unit: 5, ppePerUnit: 8 }, 11),
    ).toBe(24)
    expect(
      calculateModePpe(
        { ppe: 10, calculation: 'perUnitAdd', unit: 5, ppePerUnit: 8 },
        11,
      ),
    ).toBe(34)
  })
})

describe('device calculations', () => {
  const chain = {
    primaryGemCarats: 2,
    mode: 'standard',
    spells: [{ ppe: 10 }, { ppe: 5 }],
  }

  it('calculates standard, ley-line, hybrid, and single-use construction P.P.E.', () => {
    expect(
      calculateChainBasePpe({ deviceLevel: 2, singleUse: false }, chain),
    ).toBe(150)
    expect(
      calculateChainBasePpe(
        { deviceLevel: 2, singleUse: false },
        { ...chain, mode: 'ley-only' },
      ),
    ).toBe(225)
    expect(
      calculateChainBasePpe(
        { deviceLevel: 2, singleUse: false },
        { ...chain, mode: 'ley-hybrid' },
      ),
    ).toBe(300)
    expect(
      calculateChainBasePpe({ deviceLevel: 2, singleUse: true }, chain),
    ).toBe(15)
  })

  it('uses zero activation for ley-line-only and single-use devices', () => {
    expect(calculateChainActivation({ singleUse: false }, chain, 150)).toBe(7.5)
    expect(
      calculateChainActivation(
        { singleUse: false },
        { ...chain, mode: 'ley-only' },
        225,
      ),
    ).toBe(0)
    expect(calculateChainActivation({ singleUse: true }, chain, 15)).toBe(0)
  })

  it('prices the primary gem by entered carats and every secondary gem at one carat', () => {
    const gems = new Map([
      ['primary', { pricePerCarat: 100 }],
      ['secondary', { pricePerCarat: 40 }],
    ])
    const gemChain = {
      primaryGemCarats: 2.5,
      spells: [{ name: 'primary' }, { name: 'secondary' }],
    }
    expect(
      calculateRequiredGemCost(gemChain, (spell) => gems.get(spell.name)),
    ).toBe(290)
  })

  it('keeps skill-roll modifiers separate and uses book signs', () => {
    expect(calculateNetSkillRollModifier(50, 20, 5)).toBe(-25)
  })

  it('totals repeatable selections and ignores unknown entries', () => {
    const catalog = new Map([
      ['fixed', { percent: 10 }],
      ['repeatable', { percent: 5, repeatable: true }],
    ])
    expect(
      calculateSelectionPercent(
        [
          { id: 'fixed', quantity: 9 },
          { id: 'repeatable', quantity: 3 },
          { id: 'missing', quantity: 100 },
        ],
        catalog,
      ),
    ).toBe(25)
  })

  it('keeps the before-gems subtotal separate from the gem-inclusive total', () => {
    expect(calculateConstructionCredits(100, 2, 500, 75)).toEqual({
      beforeGems: 2500,
      total: 2575,
    })
  })

  it('applies book construction-time multipliers before assistant reduction', () => {
    const state = {
      deviceLevel: 2,
      existingTechnology: false,
      singleUse: false,
      assistantTimeReduction: 25,
    }
    expect(calculateConstructionHours(state, 100, 2 / 3)).toBe(10)
    expect(calculateConstructionHours(state, 100, 1 / 3)).toBe(5)
    expect(calculateConstructionHours(state, 100, 4 / 3)).toBe(20)
    expect(calculateConstructionHours(state, 100, 2)).toBe(30)
  })

  it('applies existing-technology, mechanical-skill, and single-use time rules', () => {
    const state = {
      deviceLevel: 2,
      existingTechnology: true,
      creatorHasMechanicalSkill: true,
      singleUse: true,
      assistantTimeReduction: 0,
    }
    expect(calculateConstructionHours(state, 100, 1)).toBe(50)
  })

  it('rounds only final summary values upward', () => {
    const summary = buildFinalSummary({
      ppeConstruction: 10.01,
      activationPpe: 2.001,
      constructionHours: 7.2,
      constructionCredits: 101.01,
      constructionCreditsBeforeGems: 80.2,
      gemsCredits: 20.81,
      skillRollModifier: -4.2,
      hasLeyLineOnlyFunctions: true,
      allFunctionsRequireLeyLine: false,
    })
    expect(summary).toEqual({
      ppeConstruction: 11,
      activationPpe: 3,
      constructionHours: 8,
      constructionCredits: 102,
      constructionCreditsBeforeGems: 81,
      gemsCredits: 21,
      skillRollModifier: -4,
      hasLeyLineOnlyFunctions: true,
      allFunctionsRequireLeyLine: false,
    })
  })
})

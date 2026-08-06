import { describe, expect, it } from 'vitest'
import { attributeBonus, hitPoints, movement, skillTotal, weightLimits } from '../../../src/pages/character-sheet/lib/calculations.js'
import { skillCategories, skillsById } from '../../../src/pages/character-sheet/data/skills.js'
import { languages } from '../../../src/pages/character-sheet/data/languages.js'
import { skillDescription } from '../../../src/pages/character-sheet/lib/skillDescriptions.js'
import { skillEffects, skillSynergies } from '../../../src/pages/character-sheet/data/skillEffects.js'
import { combatCyborg, combatCyborgRelated, secondaryEligible } from '../../../src/pages/character-sheet/data/occs.js'

describe('character sheet calculations', () => {
  it('applies exceptional attribute bonuses from the RUE chart', () => {
    expect(attributeBonus('iq', 16)).toBe(2)
    expect(attributeBonus('pp', 22)).toBe(4)
    expect(attributeBonus('ps', 32)).toBe(17)
    expect(attributeBonus('peComa', 31)).toBe(31)
  })

  it('derives movement and lifting values', () => {
    expect(movement(22, 4)).toEqual({ mph: 15, perMinute: 440, perMelee: 110, perAttack: 27.5 })
    expect(weightLimits(15)).toEqual({ carry: 150, lift: 300 })
    expect(weightLimits(18)).toEqual({ carry: 360, lift: 720 })
    expect(weightLimits(24, 'supernatural')).toEqual({ carry: 1200, lift: 2400 })
  })

  it('adds recorded hit point rolls and bonuses', () => {
    expect(hitPoints(14, 3, 4, 7, 2)).toBe(27)
  })

  it('shows a transparent skill breakdown and caps totals at 98%', () => {
    const skill = skillsById.swimming
    expect(skillTotal(skill, { learnedLevel: 1, currentLevel: 4, occBonus: 10, otherBonus: 2 }, 4)).toBe(81)
    expect(skillTotal(skill, { learnedLevel: 1, currentLevel: 15, occBonus: 20, otherBonus: 20 }, 16)).toBe(98)
  })

  it('does not apply base or bonuses to an unselected skill', () => {
    const skill = skillsById.swimming
    expect(skillTotal(skill, { selected: false, learnedLevel: 1, currentLevel: 10, occBonus: 20, otherBonus: 20 }, 16)).toBe(0)
    expect(skillTotal(skillsById['wp-sword'], { selected: false }, 16)).toBe(0)
    expect(skillTotal(skill, { selected: true, learnedLevel: 1, currentLevel: 1, occBonus: 0, otherBonus: 0 }, 0)).toBe(50)
  })

  it('renders cross-listed skills from one canonical definition', () => {
    const categories = Object.fromEntries(skillCategories)
    expect(categories.Communication).toContain('sing')
    expect(categories.Domestic).toContain('sing')
    expect(categories.Espionage).toContain('pick-locks')
    expect(categories.Rogue).toContain('pick-locks')
    expect(skillsById.sing.base).toBe(35)
  })

  it('keeps language choices and skill help free of extraction artifacts', () => {
    expect(languages).toContain('Dragonese/Elven')
    expect(languages).toContain('Demongogian')
    expect(new Set(languages).size).toBe(languages.length)
    for (const language of languages) expect(language).toMatch(/^\S(?:.*\S)?$/)
    for (const skill of Object.values(skillsById)) {
      const description = skillDescription(skill)
      expect(skill.name).not.toMatch(/\s{2,}|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/)
      expect(description).not.toMatch(/\s{2,}|[\u0000-\u0008\u000B\u000C\u000E-\u001F]|Â|ï¿½/)
      expect(description.length).toBeGreaterThan(35)
    }
  })

  it('references valid skills for trained effects and synergies', () => {
    for (const [id, effect] of Object.entries(skillEffects)) {
      expect(skillsById[id], `missing effect source ${id}`).toBeDefined()
      for (const target of Object.keys(effect.skillBonuses || {})) expect(skillsById[target], `missing effect target ${target}`).toBeDefined()
      if (effect.sdcDice) expect(effect.sdcDice).toMatch(/^\d+D\d+$/)
      if (effect.speedDice) expect(effect.speedDice).toMatch(/^\d+D\d+$/)
    }
    for (const [source, bonuses] of Object.entries(skillSynergies)) {
      expect(skillsById[source], `missing synergy source ${source}`).toBeDefined()
      for (const target of Object.keys(bonuses)) expect(skillsById[target], `missing synergy target ${target}`).toBeDefined()
    }
  })

  it('defines a valid Combat Cyborg O.C.C. package', () => {
    expect(combatCyborg.relatedAtLevel(1)).toBe(5)
    expect(combatCyborg.relatedAtLevel(13)).toBe(9)
    expect(combatCyborg.secondaryAtLevel(1)).toBe(4)
    expect(combatCyborg.secondaryAtLevel(12)).toBe(7)
    expect(combatCyborg.defaults).toMatchObject({ ps:24, pp:18, spd:132, strengthType:'robot', isp:0 })
    for (const [id] of combatCyborg.automaticSkills) expect(skillsById[id], `missing automatic skill ${id}`).toBeDefined()
    for (const choice of combatCyborg.choices) for (const id of choice.options) expect(skillsById[id], `missing choice ${id}`).toBeDefined()
    expect(combatCyborgRelated('radio-basic')).toEqual({ eligible:true, bonus:10, category:'Communication' })
    expect(combatCyborgRelated('first-aid')).toEqual({ eligible:true, bonus:5, category:'Medical' })
    expect(combatCyborgRelated('wilderness-survival').eligible).toBe(false)
    expect(secondaryEligible('swimming')).toBe(true)
    expect(secondaryEligible('cryptography')).toBe(false)
  })
})

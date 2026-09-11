import { describe, expect, it } from 'vitest'
import {
  attributeBonus,
  hitPoints,
  movement,
  skillTotal,
  weightLimits,
} from '../../../src/pages/character-sheet/lib/calculations.js'
import {
  skillCategories,
  skillsById,
} from '../../../src/data/character/skills.js'
import { languages } from '../../../src/data/character/languages.js'
import { skillDescription } from '../../../src/pages/character-sheet/lib/skillDescriptions.js'
import {
  skillEffects,
  skillSynergies,
} from '../../../src/data/character/skillEffects.js'
import {
  categoryChoiceAvailable,
  countsTowardSkillAllowance,
  skillChoiceAvailable,
} from '../../../src/pages/character-sheet/lib/skillAvailability.js'
import {
  blankSpecializationState,
  normalizeSpecializationState,
  specializationHasDuplicateChoices,
  specializationIncomplete,
} from '../../../src/pages/character-sheet/lib/specializations.js'
import {
  combatCyborg,
  combatCyborgRelated,
  crazy,
  crazyRelated,
  defineOcc,
  mercSoldier,
  occs,
  robotPilot,
  secondaryEligible,
} from '../../../src/data/character/occs.js'

describe('character sheet calculations', () => {
  it('highlights only unselected skills with a remaining eligible choice', () => {
    expect(
      skillChoiceAvailable({
        selected: false,
        relatedEligible: true,
        relatedRemaining: 1,
      }),
    ).toBe(true)
    expect(
      skillChoiceAvailable({
        selected: true,
        relatedEligible: true,
        relatedRemaining: 1,
      }),
    ).toBe(false)
    expect(
      skillChoiceAvailable({
        selected: false,
        occSkill: true,
        relatedEligible: true,
        relatedRemaining: 1,
      }),
    ).toBe(false)
    expect(
      skillChoiceAvailable({
        selected: false,
        relatedEligible: false,
        relatedRemaining: 1,
      }),
    ).toBe(false)
    expect(
      skillChoiceAvailable({
        selected: false,
        relatedEligible: true,
        relatedRemaining: 0,
      }),
    ).toBe(false)
    expect(
      categoryChoiceAvailable(
        ['selected', 'available'],
        (id) => id === 'available',
      ),
    ).toBe(true)
    expect(categoryChoiceAvailable(['selected'], () => false)).toBe(false)
  })

  it('counts only selected related or secondary skills toward their allowances', () => {
    expect(
      countsTowardSkillAllowance(
        { selected: true, trainingType: 'related' },
        'related',
      ),
    ).toBe(true)
    expect(
      countsTowardSkillAllowance(
        { selected: false, trainingType: 'related' },
        'related',
      ),
    ).toBe(false)
    expect(
      countsTowardSkillAllowance(
        { selected: true, trainingType: 'occ' },
        'related',
      ),
    ).toBe(false)
    expect(
      countsTowardSkillAllowance(
        { selected: true, trainingType: 'occ-choice' },
        'related',
      ),
    ).toBe(false)
    expect(
      countsTowardSkillAllowance(
        { selected: true, trainingType: 'secondary' },
        'secondary',
      ),
    ).toBe(true)
    expect(
      countsTowardSkillAllowance(
        { selected: true, trainingType: 'custom' },
        'secondary',
      ),
    ).toBe(true)
    expect(
      countsTowardSkillAllowance(
        { selected: true, trainingType: '' },
        'secondary',
      ),
    ).toBe(true)
    expect(
      countsTowardSkillAllowance(
        { selected: true, trainingType: 'related' },
        'secondary',
      ),
    ).toBe(false)
    expect(
      countsTowardSkillAllowance(
        { selected: true, trainingType: 'occ' },
        'secondary',
      ),
    ).toBe(false)
  })

  it('applies exceptional attribute bonuses from the RUE chart', () => {
    expect(attributeBonus('iq', 16)).toBe(2)
    expect(attributeBonus('pp', 22)).toBe(4)
    expect(attributeBonus('ps', 32)).toBe(17)
    expect(attributeBonus('peComa', 31)).toBe(31)
  })

  it('derives movement and lifting values', () => {
    expect(movement(22, 4)).toEqual({
      mph: 15,
      perMinute: 440,
      perMelee: 110,
      perAttack: 27.5,
    })
    expect(weightLimits(15)).toEqual({ carry: 150, lift: 300 })
    expect(weightLimits(18)).toEqual({ carry: 360, lift: 720 })
    expect(weightLimits(24, 'supernatural')).toEqual({
      carry: 1200,
      lift: 2400,
    })
  })

  it('adds recorded hit point rolls and bonuses', () => {
    expect(hitPoints(14, 3, 4, 7, 2)).toBe(27)
  })

  it('shows a transparent skill breakdown and caps totals at 98%', () => {
    const skill = skillsById.swimming
    expect(
      skillTotal(
        skill,
        { learnedLevel: 1, currentLevel: 4, occBonus: 10, otherBonus: 2 },
        4,
      ),
    ).toBe(81)
    expect(
      skillTotal(
        skill,
        { learnedLevel: 1, currentLevel: 15, occBonus: 20, otherBonus: 20 },
        16,
      ),
    ).toBe(98)
  })

  it('does not apply base or bonuses to an unselected skill', () => {
    const skill = skillsById.swimming
    expect(
      skillTotal(
        skill,
        {
          selected: false,
          learnedLevel: 1,
          currentLevel: 10,
          occBonus: 20,
          otherBonus: 20,
        },
        16,
      ),
    ).toBe(0)
    expect(skillTotal(skillsById['wp-sword'], { selected: false }, 16)).toBe(0)
    expect(
      skillTotal(
        skill,
        {
          selected: true,
          learnedLevel: 1,
          currentLevel: 1,
          occBonus: 0,
          otherBonus: 0,
        },
        0,
      ),
    ).toBe(50)
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
      expect(skill.name).not.toMatch(
        /\s{2,}|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/,
      )
      expect(description).not.toMatch(
        /\s{2,}|[\u0000-\u0008\u000B\u000C\u000E-\u001F]|Â|ï¿½/,
      )
      expect(description.length).toBeGreaterThan(35)
    }
  })

  it('references valid skills for trained effects and synergies', () => {
    for (const [id, effect] of Object.entries(skillEffects)) {
      expect(skillsById[id], `missing effect source ${id}`).toBeDefined()
      for (const target of Object.keys(effect.skillBonuses || {}))
        expect(
          skillsById[target],
          `missing effect target ${target}`,
        ).toBeDefined()
      if (effect.sdcDice) expect(effect.sdcDice).toMatch(/^\d+D\d+$/)
      if (effect.speedDice) expect(effect.speedDice).toMatch(/^\d+D\d+$/)
    }
    for (const [source, bonuses] of Object.entries(skillSynergies)) {
      expect(
        skillsById[source],
        `missing synergy source ${source}`,
      ).toBeDefined()
      for (const target of Object.keys(bonuses))
        expect(
          skillsById[target],
          `missing synergy target ${target}`,
        ).toBeDefined()
    }
  })

  it('defines a valid Combat Cyborg O.C.C. package', () => {
    expect(combatCyborg.relatedAtLevel(1)).toBe(5)
    expect(combatCyborg.relatedAtLevel(13)).toBe(9)
    expect(combatCyborg.secondaryAtLevel(1)).toBe(4)
    expect(combatCyborg.secondaryAtLevel(12)).toBe(7)
    expect(combatCyborg.defaults).toMatchObject({
      ps: 24,
      pp: 18,
      spd: 132,
      strengthType: 'robot',
      isp: 0,
    })
    for (const [id] of combatCyborg.automaticSkills)
      expect(skillsById[id], `missing automatic skill ${id}`).toBeDefined()
    for (const choice of combatCyborg.choices)
      for (const id of choice.options)
        expect(skillsById[id], `missing choice ${id}`).toBeDefined()
    expect(combatCyborgRelated('radio-basic')).toEqual({
      eligible: true,
      bonus: 10,
      category: 'Communication',
    })
    expect(combatCyborgRelated('first-aid')).toEqual({
      eligible: true,
      bonus: 5,
      category: 'Medical',
    })
    expect(combatCyborgRelated('wilderness-survival').eligible).toBe(false)
    expect(secondaryEligible('swimming')).toBe(true)
    expect(secondaryEligible('cryptography')).toBe(true)
  })

  it('defines the Crazies O.C.C. package from the next class in the book', () => {
    expect(crazy.relatedAtLevel(1)).toBe(7)
    expect(crazy.relatedAtLevel(12)).toBe(15)
    expect(crazy.secondaryAtLevel(1)).toBe(6)
    expect(crazy.secondaryAtLevel(12)).toBe(10)
    expect(crazy.defaults).toMatchObject({ strengthType: 'augmented' })
    expect(crazy.defaults).not.toHaveProperty('ps')
    expect(crazy.defaults).not.toHaveProperty('pp')
    for (const [id] of crazy.automaticSkills)
      expect(skillsById[id], `missing automatic skill ${id}`).toBeDefined()
    for (const choice of crazy.choices)
      for (const id of choice.options)
        expect(skillsById[id], `missing choice ${id}`).toBeDefined()
    expect(crazyRelated('detect-ambush')).toEqual({
      eligible: true,
      bonus: 10,
      category: 'Espionage',
    })
    expect(crazyRelated('first-aid')).toEqual({
      eligible: true,
      bonus: 10,
      category: 'Medical',
    })
    expect(crazyRelated('basic-electronics').eligible).toBe(false)
  })

  it('normalizes optional class capabilities for safe editing and play mode', () => {
    const minimal = defineOcc({ id: 'minimal', name: 'Minimal O.C.C.' })
    expect(minimal).toMatchObject({
      defaults: {},
      mdc: null,
      combatBonuses: {},
      automaticSkills: [],
      choices: [],
      specializations: [],
      abilities: [],
    })
    expect(minimal.relatedAtLevel(10)).toBe(0)
    expect(minimal.secondaryAtLevel(10)).toBe(0)
    expect(minimal.relatedSkillInfo('swimming')).toEqual({
      eligible: false,
      bonus: 0,
      category: '',
    })
    for (const occ of occs) {
      expect(occ.languages).toMatchObject({
        nativeBase: expect.any(Number),
        nativeBonus: expect.any(Number),
        otherBonus: expect.any(Number),
        otherCount: expect.any(Number),
        literacyOtherCount: expect.any(Number),
        literacyOtherBonus: expect.any(Number),
      })
      expect(Array.isArray(occ.automaticSkills)).toBe(true)
      expect(Array.isArray(occ.choices)).toBe(true)
      expect(Array.isArray(occ.specializations)).toBe(true)
      expect(Array.isArray(occ.abilities)).toBe(true)
      expect(Array.isArray(occ.creationNotes)).toBe(true)
      expect(Array.isArray(occ.resourceNotes)).toBe(true)
      expect(Array.isArray(occ.equipmentNotes)).toBe(true)
      expect(Array.isArray(occ.situationalBonuses)).toBe(true)
    }
  })

  it('defines complete, reusable MOS bundles with valid skill references', () => {
    expect(mercSoldier.specializations.map((option) => option.id)).toEqual([
      'communications-expert',
      'eod-demolitions',
      'soldier-grunt',
      'point-man-scout',
      'pigman-heavy-weapons',
      'transportation-specialist',
      'medic',
    ])
    expect(robotPilot.specializations.map((option) => option.id)).toEqual([
      'power-armor-pilot',
      'robot-pilot',
    ])
    for (const occ of [mercSoldier, robotPilot])
      for (const option of occ.specializations) {
        expect(option).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          automaticSkills: expect.any(Array),
          choices: expect.any(Array),
          selections: expect.any(Array),
          requirements: expect.any(Array),
          notes: expect.any(Array),
        })
        expect(new Set(option.choices.map((choice) => choice.id)).size).toBe(
          option.choices.length,
        )
        for (const [id] of option.automaticSkills)
          expect(
            skillsById[id],
            `${occ.id}/${option.id}: missing automatic skill ${id}`,
          ).toBeDefined()
        for (const requiredChoice of option.choices) {
          expect(requiredChoice.count).toBeGreaterThan(0)
          for (const id of requiredChoice.options)
            expect(
              skillsById[id],
              `${occ.id}/${option.id}: missing choice ${id}`,
            ).toBeDefined()
        }
      }
  })

  it('migrates and validates specialization selections without disturbing other saved state', () => {
    expect(normalizeSpecializationState(mercSoldier, undefined)).toEqual({
      id: '',
      choices: {},
      selections: {},
    })
    const option = robotPilot.specializations[0]
    const blankState = blankSpecializationState(option)
    expect(blankState.selections.eliteTypes).toEqual(['', ''])
    expect(specializationIncomplete(robotPilot, blankState)).toBe(true)
    const restored = normalizeSpecializationState(robotPilot, {
      id: option.id,
      choices: {
        mechanicsOrAcrobatics: 'basic-mechanics',
        airCombatPilot: 'pilot-combat-helicopter',
        pilot: 'pilot-airplane',
      },
      selections: {
        eliteTypes: ['Samson', 'Predator', 'ignored'],
        startingMachine: 'Titan',
      },
      legacyValue: 'preserved elsewhere',
    })
    expect(restored.selections.eliteTypes).toEqual(['Samson', 'Predator'])
    expect(specializationIncomplete(robotPilot, restored)).toBe(false)
    restored.choices.pilot = restored.choices.airCombatPilot
    expect(specializationHasDuplicateChoices(robotPilot, restored)).toBe(true)
    const grunt = blankSpecializationState(
      mercSoldier.specializations.find((entry) => entry.id === 'soldier-grunt'),
    )
    grunt.choices = { physical: ['physical-6', 'physical-6'] }
    expect(
      specializationHasDuplicateChoices(
        {
          specializations: [
            {
              ...mercSoldier.specializations[2],
              choices: [{ id: 'physical', count: 2 }],
            },
          ],
        },
        grunt,
      ),
    ).toBe(true)
  })

  it('covers every Ultimate Edition Men-at-Arms class with auditable skills and sources', () => {
    expect(occs.map((occ) => occ.id)).toEqual([
      'combat-cyborg',
      'crazy',
      'cyber-knight',
      'glitter-boy',
      'headhunter',
      'juicer',
      'merc-soldier',
      'robot-pilot',
      'body-fixer',
      'city-rat',
      'cyber-doc',
      'operator',
      'rogue-scholar',
      'rogue-scientist',
      'vagabond',
      'wilderness-scout',
    ])
    for (const occ of occs.slice(2)) {
      expect(occ.source).toMatchObject({
        book: 'Rifts Ultimate Edition',
        pages: expect.any(String),
      })
      expect(occ.relatedAtLevel(15)).toBeGreaterThanOrEqual(
        occ.relatedAtLevel(1),
      )
      expect(occ.secondaryAtLevel(15)).toBeGreaterThanOrEqual(
        occ.secondaryAtLevel(1),
      )
      for (const [id] of occ.automaticSkills)
        expect(
          skillsById[id],
          `${occ.id}: missing automatic skill ${id}`,
        ).toBeDefined()
      for (const requiredChoice of occ.choices)
        for (const id of requiredChoice.options)
          expect(
            skillsById[id],
            `${occ.id}: missing choice ${id}`,
          ).toBeDefined()
    }
  })

  it('models the first five Adventurers & Scholars classes in source order', () => {
    const adventurers = occs.slice(8, 13)
    expect(adventurers.map((occ) => [occ.id, occ.source.pages])).toEqual([
      ['body-fixer', '86-88'],
      ['city-rat', '88-89'],
      ['cyber-doc', '89-91'],
      ['operator', '91-93'],
      ['rogue-scholar', '93-95'],
    ])
    for (const occ of adventurers) {
      expect(occ.attributeBonusSource).toMatchObject({
        book: 'Rifts Ultimate Edition',
        pages: expect.any(String),
      })
      expect(
        occ.abilities.length +
          occ.creationNotes.length +
          occ.resourceNotes.length +
          occ.equipmentNotes.length +
          occ.situationalBonuses.length,
      ).toBeGreaterThan(0)
      expect(occ.relatedAtLevel(15)).toBeGreaterThan(occ.relatedAtLevel(1))
      for (const [id] of occ.automaticSkills)
        expect(skillsById[id], `${occ.id}: missing ${id}`).toBeDefined()
      for (const requiredChoice of occ.choices)
        for (const id of requiredChoice.options)
          expect(
            skillsById[id],
            `${occ.id}: missing choice ${id}`,
          ).toBeDefined()
    }
  })

  it('keeps class creation and calculated rules out of play abilities', () => {
    for (const occ of occs) {
      const abilities = occ.abilities.join(' ')
      expect(abilities, occ.id).not.toMatch(
        /attribute requirements|minimum P\.[A-Z]|choose .*language|select one MOS|record .* manually|P\.P\.E\. base|adds? \+?\d+ to .*skill/i,
      )
    }
  })

  it('keeps applied Crazies bonuses out of the play-time ability list', () => {
    const crazy = occs.find((occ) => occ.id === 'crazy')
    const abilities = crazy.abilities.join(' ')

    expect(abilities).not.toMatch(/add \d|builder applies|record .* manually/i)
    expect(abilities).toContain('carry and lift twice normal')
    expect(abilities).toContain('heals twice normal')
    expect(abilities).not.toMatch(
      /automatic dodge|saving throws|delicate touch|minor psionics|P\.P\.E\. base|bionics/i,
    )
    expect(crazy.combatProgression).toEqual({
      automaticDodge: [1, 3, 6, 9, 12, 15],
      roll: [2, 5, 10, 15],
    })
    expect(crazy.saveBonuses).toEqual({
      psionics: 2,
      possession: 2,
      mindControl: 6,
      toxins: 4,
    })
    expect(crazy.situationalBonuses.join(' ')).toMatch(
      /exceptional sight.*scent recognition.*delicate touch/i,
    )
  })

  it('completes the Adventurers & Scholars section through its source boundary', () => {
    const remaining = occs.slice(-3)
    expect(remaining.map((occ) => [occ.id, occ.source.pages])).toEqual([
      ['rogue-scientist', '95-97'],
      ['vagabond', '97-99'],
      ['wilderness-scout', '99-100'],
    ])
    expect(remaining[0].relatedAtLevel(1)).toBe(15)
    expect(remaining[1].secondaryAtLevel(13)).toBe(14)
    expect(remaining[2].attributeRequirements).toEqual([
      { attribute: 'iq', minimum: 8 },
      { attribute: 'pe', minimum: 12 },
    ])
    expect(remaining.map((occ) => occ.languages.otherCount)).toEqual([3, 2, 2])
    expect(remaining[0].languages).toMatchObject({
      literacyOtherCount: 2,
      literacyOtherBonus: 35,
    })
    for (const occ of remaining) {
      expect(occ.attributeBonusSource).toMatchObject({
        book: 'Rifts Ultimate Edition',
        pages: expect.any(String),
      })
      for (const [id] of occ.automaticSkills)
        expect(skillsById[id], `${occ.id}: missing ${id}`).toBeDefined()
      for (const requiredChoice of occ.choices)
        for (const id of requiredChoice.options)
          expect(
            skillsById[id],
            `${occ.id}: missing choice ${id}`,
          ).toBeDefined()
    }
  })
})

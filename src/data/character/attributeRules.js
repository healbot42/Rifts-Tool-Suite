export const attributeDefinitions = Object.freeze([
  { id: 'iq', name: 'Intelligence Quotient', abbreviation: 'I.Q.' },
  { id: 'me', name: 'Mental Endurance', abbreviation: 'M.E.' },
  { id: 'ma', name: 'Mental Affinity', abbreviation: 'M.A.' },
  { id: 'ps', name: 'Physical Strength', abbreviation: 'P.S.' },
  { id: 'pp', name: 'Physical Prowess', abbreviation: 'P.P.' },
  { id: 'pe', name: 'Physical Endurance', abbreviation: 'P.E.' },
  { id: 'pb', name: 'Physical Beauty', abbreviation: 'P.B.' },
  { id: 'spd', name: 'Speed', abbreviation: 'Spd' },
])

export const attributeOrder = Object.freeze(
  attributeDefinitions.map(({ id }) => id),
)

const ruleset = 'rue-human'

function rollDie(sides, randomFn) {
  const random = Number(randomFn())
  const bounded = Number.isFinite(random)
    ? Math.min(Math.max(random, 0), 1 - Number.EPSILON)
    : 0
  return Math.floor(bounded * sides) + 1
}

function rollDice({ count, sides, multiplier = 1 }, randomFn) {
  const dice = Array.from({ length: count }, () => rollDie(sides, randomFn))
  return {
    dice,
    total: dice.reduce((sum, value) => sum + value, 0) * multiplier,
  }
}

function lowAttributeCompensation(values, randomFn) {
  const lowAttributes = attributeOrder.filter((id) => values[id] < 7)
  if (!lowAttributes.length)
    return { lowAttributes, operations: [], perceptionBonus: 0 }

  const eligibleTargets = attributeOrder.filter(
    (id) => !lowAttributes.includes(id),
  )
  if (lowAttributes.length === 1) {
    const die = rollDie(4, randomFn)
    return {
      lowAttributes,
      operations: [
        {
          operation: 'add',
          target: null,
          eligibleTargets,
          distinctTargetGroup: 'low-attribute-compensation',
          value: die + 3,
          dice: [die],
          formula: '1D4+3',
          label: 'Low-attribute compensation',
        },
      ],
      perceptionBonus: 0,
    }
  }

  const die = rollDie(4, randomFn)
  return {
    lowAttributes,
    operations: [
      {
        operation: 'add',
        target: null,
        eligibleTargets,
        distinctTargetGroup: 'low-attribute-compensation',
        value: die + 5,
        dice: [die],
        formula: '1D4+5',
        label: 'Primary low-attribute compensation',
      },
      {
        operation: 'add',
        target: null,
        eligibleTargets,
        distinctTargetGroup: 'low-attribute-compensation',
        value: 3,
        dice: [],
        formula: '+3',
        label: 'Secondary low-attribute compensation',
      },
    ],
    perceptionBonus: 2,
  }
}

function generateRueHumanAttributes(randomFn) {
  const values = {}
  const rolls = {}
  for (const id of attributeOrder) {
    const base = rollDice({ count: 3, sides: 6 }, randomFn)
    const exceptionalDice = []
    if (base.total >= 16) {
      exceptionalDice.push(rollDie(6, randomFn))
      if (exceptionalDice[0] === 6) exceptionalDice.push(rollDie(6, randomFn))
    }
    const total =
      base.total + exceptionalDice.reduce((sum, value) => sum + value, 0)
    values[id] = total
    rolls[id] = {
      baseDice: base.dice,
      baseTotal: base.total,
      exceptionalDice,
      total,
    }
  }
  return {
    ruleset,
    generationStrategy: 'human-rue',
    values,
    rolls,
    lowAttributeCompensation: lowAttributeCompensation(values, randomFn),
  }
}

/**
 * Named dispatch keeps nonhuman R.C.C. dice rules from leaking into the human
 * generator. Add a source-backed strategy here when its catalog is introduced.
 */
export const attributeGenerationStrategies = Object.freeze({
  'human-rue': generateRueHumanAttributes,
})

/** Rolls attributes using the selected, source-backed generation strategy. */
export function generateAttributes(
  randomFn = Math.random,
  { generationStrategy = 'human-rue' } = {},
) {
  const generator = attributeGenerationStrategies[generationStrategy]
  if (!generator)
    throw new RangeError(
      `Unsupported attribute generation strategy: ${generationStrategy}`,
    )
  return generator(randomFn)
}

export function evaluateAttributeRequirements(
  requirements = [],
  attributes = {},
) {
  const results = requirements.map((requirement) => {
    const actual = Number(attributes[requirement.attribute]) || 0
    return {
      ...requirement,
      actual,
      met: actual >= requirement.minimum,
      label:
        requirement.label ||
        `${requirement.attribute.toUpperCase()} ${requirement.minimum} or higher`,
    }
  })
  return {
    met: results
      .filter(({ recommended }) => !recommended)
      .every(({ met }) => met),
    results,
  }
}

export function rollOccAttributeBonuses(occ, randomFn = Math.random) {
  const operations = []
  const rolls = []
  for (const bonus of occ?.attributeBonuses || []) {
    let value = Number(bonus.value) || 0
    let dice = []
    let formula = bonus.formula || `${bonus.operation} ${value}`
    if (bonus.dice) {
      const result = rollDice(bonus.dice, randomFn)
      value = result.total + (Number(bonus.modifier) || 0)
      dice = result.dice
      const multiplier = bonus.dice.multiplier
        ? `x${bonus.dice.multiplier}`
        : ''
      formula = `${bonus.dice.count}D${bonus.dice.sides}${multiplier}`
      if (bonus.modifier)
        formula += bonus.modifier > 0 ? `+${bonus.modifier}` : bonus.modifier
      rolls.push({ id: bonus.id, dice, total: value, formula })
    }
    operations.push({
      id: bonus.id,
      target: bonus.target,
      operation: bonus.operation,
      value,
      dice,
      formula,
      label: bonus.label,
    })
  }
  return { occId: occ?.id || null, operations, rolls }
}

export const attributeRulesSource = Object.freeze({
  book: 'Rifts Ultimate Edition',
  pages: '279-282',
  topics: [
    'Eight Attributes',
    'Exceptional right off the bat',
    'Bonus to Compensate for a Low Attribute',
  ],
})

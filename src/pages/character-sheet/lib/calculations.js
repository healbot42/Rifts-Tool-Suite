const ATTRIBUTE_BONUSES = {
  16: { iq: 2, mePsionics: 1, meInsanity: 1, ma: 40, ps: 1, pp: 1, peComa: 4, peSave: 1, pb: 30 },
  17: { iq: 3, mePsionics: 1, meInsanity: 1, ma: 45, ps: 2, pp: 1, peComa: 5, peSave: 1, pb: 35 },
  18: { iq: 4, mePsionics: 2, meInsanity: 2, ma: 50, ps: 3, pp: 2, peComa: 6, peSave: 2, pb: 40 },
  19: { iq: 5, mePsionics: 2, meInsanity: 2, ma: 55, ps: 4, pp: 2, peComa: 8, peSave: 2, pb: 45 },
  20: { iq: 6, mePsionics: 3, meInsanity: 3, ma: 60, ps: 5, pp: 3, peComa: 10, peSave: 3, pb: 50 },
  21: { iq: 7, mePsionics: 3, meInsanity: 4, ma: 65, ps: 6, pp: 3, peComa: 12, peSave: 3, pb: 55 },
  22: { iq: 8, mePsionics: 4, meInsanity: 5, ma: 70, ps: 7, pp: 4, peComa: 14, peSave: 4, pb: 60 },
  23: { iq: 9, mePsionics: 4, meInsanity: 6, ma: 75, ps: 8, pp: 4, peComa: 16, peSave: 4, pb: 65 },
  24: { iq: 10, mePsionics: 5, meInsanity: 7, ma: 80, ps: 9, pp: 5, peComa: 18, peSave: 5, pb: 70 },
  25: { iq: 11, mePsionics: 5, meInsanity: 8, ma: 84, ps: 10, pp: 5, peComa: 20, peSave: 5, pb: 75 },
  26: { iq: 12, mePsionics: 6, meInsanity: 9, ma: 88, ps: 11, pp: 6, peComa: 22, peSave: 6, pb: 80 },
  27: { iq: 13, mePsionics: 6, meInsanity: 10, ma: 92, ps: 12, pp: 6, peComa: 24, peSave: 6, pb: 83 },
  28: { iq: 14, mePsionics: 7, meInsanity: 11, ma: 94, ps: 13, pp: 7, peComa: 26, peSave: 7, pb: 86 },
  29: { iq: 15, mePsionics: 7, meInsanity: 12, ma: 96, ps: 14, pp: 7, peComa: 28, peSave: 7, pb: 90 },
  30: { iq: 16, mePsionics: 8, meInsanity: 13, ma: 97, ps: 15, pp: 8, peComa: 30, peSave: 8, pb: 92 },
}

export function attributeBonus(attribute, score) {
  const value = Math.max(0, Number(score) || 0)
  if (value < 16) return 0
  const row = ATTRIBUTE_BONUSES[Math.min(value, 30)]
  if (attribute === 'ps' && value > 30) return 15 + value - 30
  if (attribute === 'peComa' && value > 30) return value
  if (attribute === 'ppInitiative' && value > 30) return Math.min(6, Math.floor((value - 28) / 3))
  return row?.[attribute] ?? 0
}

export function movement(speed, attacks = 1) {
  const value = Math.max(0, Number(speed) || 0)
  const actions = Math.max(1, Number(attacks) || 1)
  return {
    mph: Number((value * 0.681818).toFixed(1)),
    perMinute: value * 20,
    perMelee: value * 5,
    perAttack: Number(((value * 5) / actions).toFixed(1)),
  }
}

export function weightLimits(ps, strengthType = 'normal') {
  const value = Math.max(0, Number(ps) || 0)
  let multiplier = value >= 17 ? 20 : 10
  if (strengthType === 'robot') multiplier = value >= 40 ? 100 : value >= 17 ? 25 : 10
  if (strengthType === 'supernatural') multiplier = value >= 18 ? 50 : 20
  let carry = value * multiplier
  if (strengthType === 'normal' && value > 30) carry *= 1 + Math.floor((value - 30) / 5) * 0.3
  return { carry: Math.round(carry), lift: Math.round(carry * 2) }
}

export function hitPoints(pe, level, firstLevelRoll, laterLevelRolls = 0, bonuses = 0) {
  const levelsAfterFirst = Math.max(0, (Number(level) || 1) - 1)
  return Math.max(0, Number(pe) || 0) + Math.max(0, Number(firstLevelRoll) || 0)
    + (levelsAfterFirst ? Math.max(0, Number(laterLevelRolls) || 0) : 0) + (Number(bonuses) || 0)
}

export function skillTotal(skill, record, iqBonus = 0) {
  if (record.selected === false) return 0
  if (skill.base == null) return null
  const learnedLevel = Math.max(1, Number(record.learnedLevel) || 1)
  const currentLevel = Math.max(learnedLevel, Number(record.currentLevel) || learnedLevel)
  const levelBonus = (currentLevel - learnedLevel) * (skill.perLevel || 0)
  return Math.min(98, Math.max(0, skill.base + (Number(record.occBonus) || 0)
    + (Number(record.otherBonus) || 0) + (record.useIq === false ? 0 : iqBonus) + levelBonus))
}

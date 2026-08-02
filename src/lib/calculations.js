export const clampNumber = (value, min = 0) => Math.max(min, Number(value) || 0)
export const roundUp = value => Math.ceil(Number(value) || 0)

export function calculateModePpe(mode, inputValue) {
  const input = Math.max(mode.inputMin ?? 0, Number(inputValue ?? mode.inputDefault) || 0)
  if (mode.calculation === 'add') return mode.ppe + input * (mode.multiplier ?? 1)
  if (mode.calculation === 'max') return Math.max(mode.ppe, input * (mode.multiplier ?? 1))
  if (mode.calculation === 'perUnit') return Math.ceil(input / mode.unit) * mode.ppePerUnit
  if (mode.calculation === 'perUnitAdd') return mode.ppe + Math.ceil(input / mode.unit) * mode.ppePerUnit
  return mode.ppe
}

export function calculateRequiredGemCost(chain, gemForSpell, primaryGemCarats = chain.primaryGemCarats) {
  return chain.spells.reduce((total, spell, index) => {
    const gemPrice = clampNumber(gemForSpell(spell)?.pricePerCarat)
    const carats = index === 0 ? clampNumber(primaryGemCarats) : 1
    return total + gemPrice * carats
  }, 0)
}

export function calculateChainBasePpe(state, chain, primaryGemCarats = chain.primaryGemCarats) {
  const spellPpe = chain.spells.reduce((sum, spell) => sum + clampNumber(spell.ppe), 0)
  const carats = Math.max(0.5, clampNumber(primaryGemCarats, 0.5))
  let result = spellPpe * clampNumber(state.deviceLevel, 1) * 10 / carats
  if (state.singleUse) result /= 10
  if (chain.mode === 'ley-only') result *= 1.5
  if (chain.mode === 'ley-hybrid') result *= 2
  return result
}

export function calculateChainActivation(state, chain, constructionPpe) {
  return state.singleUse || chain.mode === 'ley-only' ? 0 : constructionPpe / 20
}

export function calculateNetSkillRollModifier(penalties, bonuses, custom = 0) {
  return (Number(bonuses) || 0) - (Number(penalties) || 0) + (Number(custom) || 0)
}

export function calculateSelectionPercent(selections, catalogById) {
  return (selections || []).reduce((total, selection) => {
    const entry = catalogById.get(selection.id)
    if (!entry) return total
    const quantity = entry.repeatable ? Math.max(1, Number(selection.quantity) || 1) : 1
    return total + entry.percent * quantity
  }, 0)
}

export function calculateConstructionCredits(constructionPpe, deviceLevel, formCost, gemCost) {
  const beforeGems = clampNumber(constructionPpe) * 10 * clampNumber(deviceLevel, 1) + clampNumber(formCost)
  return { beforeGems, total: beforeGems + clampNumber(gemCost) }
}

export function buildFinalSummary(values) {
  return {
    ppeConstruction: roundUp(values.ppeConstruction),
    activationPpe: roundUp(values.activationPpe),
    constructionHours: roundUp(values.constructionHours),
    constructionCredits: roundUp(values.constructionCredits),
    constructionCreditsBeforeGems: roundUp(values.constructionCreditsBeforeGems),
    gemsCredits: roundUp(values.gemsCredits),
    skillRollModifier: roundUp(values.skillRollModifier),
    hasLeyLineOnlyFunctions: Boolean(values.hasLeyLineOnlyFunctions),
    allFunctionsRequireLeyLine: Boolean(values.allFunctionsRequireLeyLine),
  }
}

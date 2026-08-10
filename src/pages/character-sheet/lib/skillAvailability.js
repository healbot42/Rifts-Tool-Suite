export function countsTowardSkillAllowance(record, allowanceType) {
  if (!record.selected) return false
  if (allowanceType === 'related') return record.trainingType === 'related'
  if (allowanceType === 'secondary')
    return !['occ', 'occ-choice', 'related'].includes(record.trainingType)
  return false
}

export function skillChoiceAvailable({
  selected,
  occSkill,
  relatedEligible,
  relatedRemaining,
}) {
  if (selected || occSkill) return false
  return relatedEligible && relatedRemaining > 0
}

export function categoryChoiceAvailable(ids, availabilityFor) {
  return ids.some((id) => availabilityFor(id))
}

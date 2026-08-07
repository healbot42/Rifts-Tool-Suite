export function skillChoiceAvailable({ selected, relatedEligible, secondaryEligible, relatedRemaining, secondaryRemaining }) {
  if (selected) return false
  return (relatedEligible && relatedRemaining > 0) || (secondaryEligible && secondaryRemaining > 0)
}

export function categoryChoiceAvailable(ids, availabilityFor) {
  return ids.some(id => availabilityFor(id))
}

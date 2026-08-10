export function specializationById(occ, id) {
  return occ?.specializations?.find((option) => option.id === id) || null
}

export function blankSpecializationState(option = null) {
  return {
    id: option?.id || '',
    choices: Object.fromEntries(
      (option?.choices || []).map((choice) => [
        choice.id,
        choice.count > 1 ? Array(choice.count).fill('') : '',
      ]),
    ),
    selections: Object.fromEntries(
      (option?.selections || []).map((selection) => [
        selection.id,
        selection.count > 1 ? Array(selection.count).fill('') : '',
      ]),
    ),
  }
}

export function normalizeSpecializationState(occ, saved) {
  const option = specializationById(occ, saved?.id)
  if (!option) return blankSpecializationState()
  const normalized = blankSpecializationState(option)
  for (const group of ['choices', 'selections']) {
    for (const [id, initial] of Object.entries(normalized[group])) {
      const value = saved?.[group]?.[id]
      if (Array.isArray(initial))
        normalized[group][id] = Array.from(
          { length: initial.length },
          (_, index) => String(value?.[index] || ''),
        )
      else normalized[group][id] = String(value || '')
    }
  }
  return normalized
}

export function specializationIncomplete(occ, state) {
  if (!occ?.specializations?.length) return false
  const option = specializationById(occ, state?.id)
  if (!option) return true
  return [
    ...option.choices,
    ...option.selections.filter((selection) =>
      specializationSelectionVisible(selection, state),
    ),
  ].some((group) => {
    const value = (
      option.choices.includes(group) ? state?.choices : state?.selections
    )?.[group.id]
    return group.count > 1
      ? !Array.isArray(value) ||
          value.length < group.count ||
          value.some((entry) => !String(entry).trim())
      : !String(value || '').trim()
  })
}

export function specializationHasDuplicateChoices(occ, state) {
  const option = specializationById(occ, state?.id)
  const values = (option?.choices || [])
    .flatMap((choice) =>
      Array.isArray(state?.choices?.[choice.id])
        ? state.choices[choice.id]
        : [state?.choices?.[choice.id]],
    )
    .filter(Boolean)
  return new Set(values).size !== values.length
}

export function specializationSelectionVisible(selection, state) {
  if (!selection.whenChoice) return true
  const value = state?.choices?.[selection.whenChoice.id]
  return (Array.isArray(value) ? value : [value]).includes(
    selection.whenChoice.value,
  )
}

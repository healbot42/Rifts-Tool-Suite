export const RIFTS_ULTIMATE_EDITION = {
  id: 'rifts-ultimate-edition',
  name: 'Rifts Ultimate Edition',
  initiativeDie: 20,
  roundLabel: 'Melee round',
  roundDuration: '15 seconds',
  rerollTies: true,
}

export const PARTICIPANT_TYPES = [
  { id: 'pc', label: 'PC' },
  { id: 'npc', label: 'NPC' },
  { id: 'enemy', label: 'Enemy' },
]

export const RIFTS_CONDITIONS = [
  {
    id: 'knocked-down',
    name: 'Knocked Down',
    defaultRounds: 1,
    actionPenalty: 1,
    losesInitiative: true,
    rule: 'Lose initiative and one action. If knocked back several yards, lose two actions instead. Standing is included in the penalty.',
  },
  {
    id: 'stunned-dazed',
    name: 'Stunned / Dazed',
    defaultRounds: 2,
    maximumActions: 1,
    rule: 'Limited to one action per melee round and receives no combat bonuses. The usual duration is 1D4 rounds.',
  },
  {
    id: 'knocked-out',
    name: 'Knocked Out',
    defaultRounds: 3,
    maximumActions: 0,
    rule: 'Cannot act while unconscious. Use the effect duration, commonly 1D6 melee rounds.',
  },
  {
    id: 'held',
    name: 'Held',
    defaultRounds: 1,
    maximumActions: 0,
    rule: 'Cannot attack, parry, or dodge while held. Opposed D20 plus P.P. rolls can break the hold.',
  },
  {
    id: 'entangled',
    name: 'Entangled',
    defaultRounds: 1,
    rule: 'The trapped weapon or arm remains entangled. Maintaining it costs the attacker one action each round; escape uses a dodge roll.',
  },
]

export const RIFTS_MULTI_ACTION_MOVES = [
  {
    id: 'power-punch',
    name: 'Power Punch',
    rule: 'Uses two actions and lands on the second action.',
  },
  {
    id: 'power-kick',
    name: 'Power Kick',
    rule: 'Uses two actions and inflicts double kick damage.',
  },
  {
    id: 'leap-kick',
    name: 'Leap Kick',
    rule: 'Uses two actions and requires an eligible combat style.',
  },
  {
    id: 'death-blow',
    name: 'Death Blow',
    rule: 'A declared unrestricted death blow uses two actions.',
  },
]

export function activeConditionRules(participant) {
  return (participant.conditions || [])
    .map((condition) => ({
      ...RIFTS_CONDITIONS.find((rule) => rule.id === condition.id),
      ...condition,
    }))
    .filter((condition) => condition.id)
}

export function availableActions(participant) {
  const conditions = activeConditionRules(participant)
  let actions = Math.max(
    0,
    Number(participant.actionsPerRound || 0) -
      Number(participant.actionDebt || 0),
  )
  for (const condition of conditions) {
    actions = Math.max(0, actions - Number(condition.actionPenalty || 0))
    if (condition.maximumActions != null) {
      actions = Math.min(actions, Number(condition.maximumActions))
    }
  }
  return actions
}

export function rollDie(sides, random = Math.random) {
  return Math.floor(random() * sides) + 1
}

export function rollInitiative(
  participant,
  system = RIFTS_ULTIMATE_EDITION,
  random = Math.random,
) {
  const roll = rollDie(system.initiativeDie, random)
  return {
    ...participant,
    initiativeRoll: roll,
    initiativeTotal: roll + Number(participant.initiativeBonus || 0),
  }
}

export function setManualInitiative(participant, total) {
  if (total === '' || total === null || total === undefined) {
    return {
      ...participant,
      initiativeRoll: null,
      initiativeTotal: null,
    }
  }
  const parsedTotal = Number(total)
  return {
    ...participant,
    initiativeRoll: null,
    initiativeTotal: Number.isFinite(parsedTotal) ? parsedTotal : null,
  }
}

export function orderParticipants(participants) {
  return [...participants]
    .filter((participant) => Number.isFinite(participant.initiativeTotal))
    .sort((left, right) => {
      const initiativeDifference = right.initiativeTotal - left.initiativeTotal
      if (initiativeDifference !== 0) return initiativeDifference
      return left.createdOrder - right.createdOrder
    })
}

export function findInitiativeTies(participants) {
  const totals = new Map()
  for (const participant of orderParticipants(participants)) {
    const matches = totals.get(participant.initiativeTotal) || []
    matches.push(participant.id)
    totals.set(participant.initiativeTotal, matches)
  }
  return [...totals.values()].filter((ids) => {
    const tieKeys = new Set(
      ids.map((id) => {
        const participant = participants.find((entry) => entry.id === id)
        return participant?.group ? `group:${participant.group}` : `id:${id}`
      }),
    )
    return tieKeys.size > 1
  })
}

export function buildTurnSequence(participants) {
  const ordered = orderParticipants(participants)
  const maximumActions = Math.max(
    0,
    ...ordered.map((participant) => availableActions(participant)),
  )
  const turns = []
  for (let action = 1; action <= maximumActions; action += 1) {
    for (const participant of ordered) {
      if (availableActions(participant) >= action) {
        turns.push({ participantId: participant.id, action })
      }
    }
  }
  return turns
}

export function reorderTurnWithinPass(
  sequence,
  draggedParticipantId,
  action,
  targetParticipantId,
) {
  const fromIndex = sequence.findIndex(
    (turn) =>
      turn.participantId === draggedParticipantId && turn.action === action,
  )
  const targetIndex = sequence.findIndex(
    (turn) =>
      turn.participantId === targetParticipantId && turn.action === action,
  )
  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) {
    return sequence
  }
  const reordered = [...sequence]
  const [dragged] = reordered.splice(fromIndex, 1)
  reordered.splice(targetIndex, 0, dragged)
  return reordered
}

export function removeLastRemainingTurn(
  sequence,
  participantId,
  currentIndex = 0,
) {
  let removalIndex = -1
  for (let index = sequence.length - 1; index >= currentIndex; index -= 1) {
    if (sequence[index].participantId === participantId) {
      removalIndex = index
      break
    }
  }
  if (removalIndex < 0) return sequence
  return sequence.filter((turn, index) => index !== removalIndex)
}

export function loseInitiative(sequence, participantId, currentIndex = 0) {
  const result = [...sequence]
  const actions = [
    ...new Set(
      result
        .slice(currentIndex)
        .filter((turn) => turn.participantId === participantId)
        .map((turn) => turn.action),
    ),
  ]
  for (const action of actions) {
    const passIndexes = result
      .map((turn, index) => ({ turn, index }))
      .filter(
        ({ turn, index }) => index >= currentIndex && turn.action === action,
      )
      .map(({ index }) => index)
    const participantIndex = passIndexes.find(
      (index) => result[index].participantId === participantId,
    )
    const lastIndex = passIndexes[passIndexes.length - 1]
    if (participantIndex == null || participantIndex === lastIndex) continue
    const [turn] = result.splice(participantIndex, 1)
    result.splice(lastIndex, 0, turn)
  }
  return result
}

export function advanceConditions(conditions = []) {
  return conditions
    .map((condition) => ({
      ...condition,
      rounds: Math.max(0, Number(condition.rounds || 1) - 1),
    }))
    .filter((condition) => condition.rounds > 0)
}

export function createParticipant(overrides = {}, createdOrder = 0) {
  return {
    id: createRuntimeId(),
    name: '',
    type: 'enemy',
    initiativeBonus: 0,
    actionsPerRound: 4,
    initiativeRoll: null,
    initiativeTotal: null,
    createdOrder,
    active: true,
    actionDebt: 0,
    conditions: [],
    group: '',
    pendingMove: null,
    ...overrides,
  }
}
import { createRuntimeId } from '../../../lib/runtimeId.js'

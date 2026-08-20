<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  PARTICIPANT_TYPES,
  RIFTS_CONDITIONS,
  RIFTS_MULTI_ACTION_MOVES,
  RIFTS_ULTIMATE_EDITION,
  activeConditionRules,
  advanceConditions,
  buildTurnSequence,
  createParticipant,
  findInitiativeTies,
  loseInitiative,
  orderParticipants,
  reorderTurnWithinPass,
  removeLastRemainingTurn,
  rollInitiative,
  setManualInitiative,
} from '../lib/initiativeEngine.js'
import {
  persistenceErrorMessage,
  repositories,
} from '../../../lib/persistence/index.js'

const SPEND_ACTION_TOOLTIP =
  'Remove the last remaining action, or add next-round debt if none remain.'
const ACTION_DEBT_TOOLTIP =
  'Actions spent after this combatant ran out are deducted from the next round.'
const systems = [RIFTS_ULTIMATE_EDITION]
const showSystemSelection = false
const selectedSystemId = ref(RIFTS_ULTIMATE_EDITION.id)
const participants = ref([])
const round = ref(1)
const turnIndex = ref(0)
const trackerStarted = ref(false)
const turnSequence = ref([])
const dragState = ref(null)
const showAddCombatant = ref(false)
const combatantDraft = ref(createCombatantDraft())
const history = ref([])
const conditionChoices = ref({})
const conditionRounds = ref({})
const selectedMoveId = ref('')
const presets = ref([])
const presetName = ref('')
const selectedPresetId = ref('')
const storageStatus = ref('')
let hydrated = false

function reportStorageFailure(result, subject = 'The initiative tracker') {
  console.error('Initiative Tracker local storage failed', result.error)
  storageStatus.value = persistenceErrorMessage(result.error, subject)
}

const selectedSystem = computed(
  () =>
    systems.find((system) => system.id === selectedSystemId.value) ||
    RIFTS_ULTIMATE_EDITION,
)
const activeParticipants = computed(() =>
  participants.value.filter((participant) => participant.active),
)
const orderedParticipants = computed(() =>
  orderParticipants(activeParticipants.value),
)
const ties = computed(() => findInitiativeTies(activeParticipants.value))
const tiedIds = computed(() => new Set(ties.value.flat()))
const currentTurn = computed(() => turnSequence.value[turnIndex.value] || null)
const currentParticipant = computed(() =>
  participants.value.find(
    (participant) => participant.id === currentTurn.value?.participantId,
  ),
)
const turnQueue = computed(() => {
  if (!trackerStarted.value) {
    return activeParticipants.value.map((participant, sequenceIndex) => ({
      participantId: participant.id,
      action: 1,
      sequenceIndex,
      participant,
      completed: false,
    }))
  }
  const entries = turnSequence.value.map((turn, sequenceIndex) => ({
    ...turn,
    sequenceIndex,
    participant: participants.value.find(
      (participant) => participant.id === turn.participantId,
    ),
    completed: sequenceIndex < turnIndex.value,
  }))
  return [
    ...entries.slice(turnIndex.value),
    ...entries.slice(0, turnIndex.value),
  ]
})
const canStart = computed(
  () =>
    activeParticipants.value.length > 0 &&
    orderedParticipants.value.length === activeParticipants.value.length &&
    ties.value.length === 0,
)

function createCombatantDraft(type = 'enemy') {
  return {
    name: '',
    type,
    initiativeBonus: 0,
    actionsPerRound: 4,
    quantity: 1,
    group: '',
  }
}

function openAddCombatant(type = 'enemy') {
  combatantDraft.value = createCombatantDraft(type)
  showAddCombatant.value = true
}

function closeAddCombatant() {
  showAddCombatant.value = false
}

function addParticipant() {
  const quantity = Math.max(1, Math.min(50, combatantDraft.value.quantity || 1))
  const participantDraft = { ...combatantDraft.value }
  delete participantDraft.quantity
  for (let index = 0; index < quantity; index += 1) {
    const suffix = quantity > 1 ? ` ${index + 1}` : ''
    participants.value.push(
      createParticipant(
        {
          ...participantDraft,
          name: `${combatantDraft.value.name.trim()}${suffix}`,
        },
        participants.value.length,
      ),
    )
  }
  closeAddCombatant()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function recordHistory(label) {
  history.value.push({
    label,
    participants: clone(participants.value),
    turnSequence: clone(turnSequence.value),
    round: round.value,
    turnIndex: turnIndex.value,
    trackerStarted: trackerStarted.value,
  })
  if (history.value.length > 30) history.value.shift()
}

function undo() {
  const snapshot = history.value.pop()
  if (!snapshot) return
  participants.value = snapshot.participants
  turnSequence.value = snapshot.turnSequence
  round.value = snapshot.round
  turnIndex.value = snapshot.turnIndex
  trackerStarted.value = snapshot.trackerStarted
  clearTurnDrag()
}

function removeParticipant(id) {
  participants.value = participants.value.filter(
    (participant) => participant.id !== id,
  )
  resetTurnProgress()
}

function rollOne(participant) {
  Object.assign(participant, rollInitiative(participant, selectedSystem.value))
  resetTurnProgress()
}

function rollAll() {
  for (const participant of activeParticipants.value) rollOne(participant)
}

function updateManualInitiative(participant, event) {
  Object.assign(
    participant,
    setManualInitiative(participant, event.target.value),
  )
  resetTurnProgress()
}

function rerollTied() {
  const processedGroups = new Set()
  for (const id of tiedIds.value) {
    const participant = participants.value.find((entry) => entry.id === id)
    if (!participant) continue
    if (participant.group) {
      if (processedGroups.has(participant.group)) continue
      processedGroups.add(participant.group)
      rollGroup(participant)
    } else rollOne(participant)
  }
}

function resetTurnProgress() {
  clearTurnDrag()
  trackerStarted.value = false
  turnIndex.value = 0
  turnSequence.value = []
}

function startRound() {
  if (!canStart.value) return
  turnSequence.value = buildTurnSequence(activeParticipants.value)
  for (const participant of activeParticipants.value) {
    if (
      activeConditionRules(participant).some(
        (condition) => condition.losesInitiative,
      )
    ) {
      turnSequence.value = loseInitiative(turnSequence.value, participant.id)
    }
    participant.actionDebt = 0
  }
  trackerStarted.value = true
  turnIndex.value = 0
}

function beginTurnDrag(entry, event) {
  if (entry.completed) return
  const handle = event.currentTarget
  const card = handle.closest('.queue-entry')
  const queue = handle.closest('.turn-queue')
  const passCards = [...queue.querySelectorAll('.queue-entry')].filter(
    (element) =>
      Number(element.dataset.action) === entry.action &&
      element.dataset.completed === 'false',
  )
  const cardBounds = card.getBoundingClientRect()
  const passBounds = passCards.map((element) => element.getBoundingClientRect())
  handle.setPointerCapture(event.pointerId)
  dragState.value = {
    participantId: entry.participantId,
    action: entry.action,
    pointerId: event.pointerId,
    pointerOffsetY: event.clientY - cardBounds.top,
    cardHeight: cardBounds.height,
    passTop: Math.min(...passBounds.map((bounds) => bounds.top)),
    passBottom: Math.max(...passBounds.map((bounds) => bounds.bottom)),
    handle,
    lastClientY: event.clientY,
    reordering: false,
    historyRecorded: false,
    offsetY: 0,
  }
  window.addEventListener('pointermove', moveTurnDrag, { passive: false })
  window.addEventListener('pointerup', endTurnDrag)
  window.addEventListener('pointercancel', endTurnDrag)
  window.addEventListener('blur', endTurnDrag)
}

async function moveTurnDrag(event) {
  if (!dragState.value || dragState.value.pointerId !== event.pointerId) return
  event.preventDefault()
  dragState.value.lastClientY = event.clientY
  positionDraggedCard(event.clientY)
  if (dragState.value.reordering) return
  const queue = dragState.value.handle.closest('.turn-queue')
  const candidates = [...queue.querySelectorAll('.queue-entry')].filter(
    (element) =>
      Number(element.dataset.action) === dragState.value.action &&
      element.dataset.completed === 'false' &&
      element.dataset.participantId !== dragState.value.participantId,
  )
  if (!candidates.length) return
  const target = candidates.reduce(
    (closest, candidate) => {
      const candidateDistance = Math.abs(
        event.clientY -
          (candidate.getBoundingClientRect().top +
            candidate.getBoundingClientRect().height / 2),
      )
      return candidateDistance < closest.distance
        ? { element: candidate, distance: candidateDistance }
        : closest
    },
    { element: candidates[0], distance: Number.POSITIVE_INFINITY },
  ).element
  const fromIndex = turnSequence.value.findIndex(
    (turn) =>
      turn.participantId === dragState.value.participantId &&
      turn.action === dragState.value.action,
  )
  const targetIndex = turnSequence.value.findIndex(
    (turn) =>
      turn.participantId === target.dataset.participantId &&
      turn.action === dragState.value.action,
  )
  const targetBounds = target.getBoundingClientRect()
  const targetMiddle = targetBounds.top + targetBounds.height / 2
  const draggedTop = Math.min(
    dragState.value.passBottom - dragState.value.cardHeight,
    Math.max(
      dragState.value.passTop,
      event.clientY - dragState.value.pointerOffsetY,
    ),
  )
  const draggedMiddle = draggedTop + dragState.value.cardHeight / 2
  const crossedTarget =
    (fromIndex < targetIndex && draggedMiddle >= targetMiddle) ||
    (fromIndex > targetIndex && draggedMiddle <= targetMiddle)
  if (!crossedTarget) return
  if (!dragState.value.historyRecorded) {
    recordHistory('Reorder queue')
    dragState.value.historyRecorded = true
  }
  dragState.value.reordering = true
  turnSequence.value = reorderTurnWithinPass(
    turnSequence.value,
    dragState.value.participantId,
    dragState.value.action,
    target.dataset.participantId,
  )
  await nextTick()
  if (!dragState.value) return
  dragState.value.reordering = false
  positionDraggedCard(dragState.value.lastClientY)
}

function endTurnDrag(event) {
  if (!dragState.value) return
  if (
    event.pointerId !== undefined &&
    dragState.value.pointerId !== event.pointerId
  ) {
    return
  }
  clearTurnDrag()
}

function positionDraggedCard(clientY) {
  const state = dragState.value
  if (!state) return
  const queue = state.handle.closest('.turn-queue')
  const card = [...queue.querySelectorAll('.queue-entry')].find(
    (element) =>
      element.dataset.participantId === state.participantId &&
      Number(element.dataset.action) === state.action,
  )
  if (!card) return
  const currentBounds = card.getBoundingClientRect()
  const baseTop = currentBounds.top - state.offsetY
  const desiredTop = Math.min(
    state.passBottom - state.cardHeight,
    Math.max(state.passTop, clientY - state.pointerOffsetY),
  )
  state.offsetY = desiredTop - baseTop
}

function clearTurnDrag() {
  const state = dragState.value
  if (state?.handle?.hasPointerCapture(state.pointerId)) {
    state.handle.releasePointerCapture(state.pointerId)
  }
  dragState.value = null
  window.removeEventListener('pointermove', moveTurnDrag)
  window.removeEventListener('pointerup', endTurnDrag)
  window.removeEventListener('pointercancel', endTurnDrag)
  window.removeEventListener('blur', endTurnDrag)
}

function draggedEntryStyle(entry) {
  if (
    dragState.value?.participantId !== entry.participantId ||
    dragState.value?.action !== entry.action
  ) {
    return undefined
  }
  return { transform: `translateY(${dragState.value.offsetY}px)` }
}

function turnDragLabel(entry) {
  const name = entry.participant?.name || 'combatant'
  return `Move ${name} within initiative pass ${entry.action}`
}

function isNextAppearance(entry, queueIndex) {
  return (
    !entry.completed &&
    turnQueue.value.findIndex(
      (turn) => !turn.completed && turn.participantId === entry.participantId,
    ) === queueIndex
  )
}

function spendRemainingAction(participantId) {
  clearTurnDrag()
  recordHistory('Spend action')
  const updated = removeLastRemainingTurn(
    turnSequence.value,
    participantId,
    turnIndex.value,
  )
  if (updated === turnSequence.value) {
    const participant = participants.value.find(
      (entry) => entry.id === participantId,
    )
    if (participant)
      participant.actionDebt = Number(participant.actionDebt || 0) + 1
    return
  }
  turnSequence.value = updated
  if (turnIndex.value >= turnSequence.value.length) nextRound()
}

function spendActionLabel(entry) {
  const name = entry.participant?.name || 'combatant'
  return `Spend one remaining action for ${name}`
}

function advanceTurn() {
  recordHistory('Advance turn')
  if (
    currentParticipant.value?.pendingMove &&
    currentTurn.value?.action >= currentParticipant.value.pendingMove.resolvesAt
  ) {
    currentParticipant.value.pendingMove = null
  }
  if (turnIndex.value < turnSequence.value.length - 1) {
    turnIndex.value += 1
    return
  }
  nextRound()
}

function nextRound() {
  round.value += 1
  resetTurnProgress()
  for (const participant of participants.value) {
    participant.initiativeRoll = null
    participant.initiativeTotal = null
    participant.conditions = advanceConditions(participant.conditions)
    participant.pendingMove = null
  }
}

function startNewCombat() {
  recordHistory('New combat')
  round.value = 1
  resetTurnProgress()
  for (const participant of participants.value) {
    participant.initiativeRoll = null
    participant.initiativeTotal = null
    participant.actionDebt = 0
    participant.conditions = []
    participant.pendingMove = null
    participant.active = true
  }
}

function addCondition(participant) {
  const conditionId = conditionChoices.value[participant.id]
  const rule = RIFTS_CONDITIONS.find((entry) => entry.id === conditionId)
  if (!rule) return
  recordHistory(`Add ${rule.name}`)
  const rounds = Math.max(
    1,
    Number(conditionRounds.value[participant.id] || rule.defaultRounds),
  )
  participant.conditions = [
    ...(participant.conditions || []).filter(
      (condition) => condition.id !== conditionId,
    ),
    { id: conditionId, rounds },
  ]
  if (trackerStarted.value) applyConditionToQueue(participant, rule)
  conditionChoices.value[participant.id] = ''
  conditionRounds.value[participant.id] = ''
}

function applyConditionToQueue(participant, rule) {
  if (rule.losesInitiative) {
    turnSequence.value = loseInitiative(
      turnSequence.value,
      participant.id,
      turnIndex.value,
    )
  }
  const completed = turnSequence.value
    .slice(0, turnIndex.value)
    .filter((turn) => turn.participantId === participant.id).length
  const allowedRemaining = Math.max(
    0,
    Math.min(
      participant.actionsPerRound,
      rule.maximumActions ?? participant.actionsPerRound,
    ) -
      completed -
      Number(rule.actionPenalty || 0),
  )
  while (
    turnSequence.value
      .slice(turnIndex.value)
      .filter((turn) => turn.participantId === participant.id).length >
    allowedRemaining
  ) {
    turnSequence.value = removeLastRemainingTurn(
      turnSequence.value,
      participant.id,
      turnIndex.value,
    )
  }
}

function removeCondition(participant, conditionId) {
  recordHistory('Remove condition')
  participant.conditions = (participant.conditions || []).filter(
    (condition) => condition.id !== conditionId,
  )
}

function conditionRule(condition) {
  return RIFTS_CONDITIONS.find((rule) => rule.id === condition.id)
}

function selectedConditionRule(participantId) {
  return RIFTS_CONDITIONS.find(
    (rule) => rule.id === conditionChoices.value[participantId],
  )
}

function conditionAriaLabel(condition) {
  const rule = conditionRule(condition)
  return `${rule?.name}: ${rule?.rule}. Remove condition.`
}

function startMultiActionMove() {
  const participant = currentParticipant.value
  const move = RIFTS_MULTI_ACTION_MOVES.find(
    (entry) => entry.id === selectedMoveId.value,
  )
  if (!participant || !move || !currentTurn.value) return
  const resolution = turnSequence.value
    .slice(turnIndex.value + 1)
    .find((turn) => turn.participantId === participant.id)
  if (!resolution) return
  recordHistory(`Start ${move.name}`)
  participant.pendingMove = {
    id: move.id,
    name: move.name,
    rule: move.rule,
    resolvesAt: resolution.action,
  }
  selectedMoveId.value = ''
}

function canStartMultiActionMove() {
  if (!currentParticipant.value || !selectedMoveId.value) return false
  return turnSequence.value
    .slice(turnIndex.value + 1)
    .some((turn) => turn.participantId === currentParticipant.value.id)
}

function loseParticipantInitiative(participantId) {
  recordHistory('Lose initiative')
  turnSequence.value = loseInitiative(
    turnSequence.value,
    participantId,
    turnIndex.value,
  )
}

function removeFromCombat(participantId) {
  recordHistory('Remove from combat')
  const participant = participants.value.find(
    (entry) => entry.id === participantId,
  )
  if (participant) participant.active = false
  turnSequence.value = turnSequence.value.filter(
    (turn, index) =>
      index < turnIndex.value || turn.participantId !== participantId,
  )
  if (turnIndex.value >= turnSequence.value.length) nextRound()
}

function returnToCombat(participant) {
  participant.active = true
  resetTurnProgress()
}

function duplicateParticipant(participant) {
  const participantCopy = clone(participant)
  delete participantCopy.id
  const copyNumber = participants.value.filter((entry) =>
    entry.name.startsWith(participant.name),
  ).length
  participants.value.push(
    createParticipant(
      {
        ...participantCopy,
        name: `${participant.name} ${copyNumber + 1}`,
        initiativeRoll: null,
        initiativeTotal: null,
        conditions: [],
        actionDebt: 0,
        pendingMove: null,
      },
      participants.value.length,
    ),
  )
  resetTurnProgress()
}

function rollGroup(participant) {
  const members = participants.value.filter(
    (entry) => entry.active && entry.group && entry.group === participant.group,
  )
  if (!members.length) return
  const roll =
    Math.floor(Math.random() * selectedSystem.value.initiativeDie) + 1
  for (const member of members) {
    member.initiativeRoll = roll
    member.initiativeTotal = roll + Number(member.initiativeBonus || 0)
  }
  resetTurnProgress()
}

async function importSavedCharacter() {
  const saved = await repositories.character.importSaved()
  if (!saved.ok) {
    reportStorageFailure(saved, 'The saved character')
    return
  }
  const character = saved.value
  if (!character?.identity?.name) return
  participants.value.push(
    createParticipant(
      {
        name: character.identity.name,
        type: 'pc',
        initiativeBonus: Number(character.combat?.initiative || 0),
        actionsPerRound: Number(character.attacks || 4),
      },
      participants.value.length,
    ),
  )
}

function savePreset() {
  const name = presetName.value.trim()
  if (!name || !participants.value.length) return
  presets.value.push({
    id: `${Date.now()}`,
    name,
    participants: clone(participants.value),
  })
  presetName.value = ''
  savePresets()
}

function loadPreset() {
  const preset = presets.value.find(
    (entry) => entry.id === selectedPresetId.value,
  )
  if (!preset) return
  participants.value = preset.participants.map((participant, index) => {
    const participantCopy = clone(participant)
    delete participantCopy.id
    return createParticipant(
      {
        ...participantCopy,
        initiativeRoll: null,
        initiativeTotal: null,
        conditions: [],
        actionDebt: 0,
        pendingMove: null,
        active: true,
      },
      index,
    )
  })
  round.value = 1
  resetTurnProgress()
}

function deletePreset() {
  presets.value = presets.value.filter(
    (entry) => entry.id !== selectedPresetId.value,
  )
  selectedPresetId.value = ''
  savePresets()
}

async function savePresets() {
  const result = await repositories.initiativePresets.save(presets.value)
  if (!result.ok || result.warning)
    reportStorageFailure(
      { error: result.error || result.warning },
      'The encounter presets',
    )
}

async function clearTracker() {
  if (!confirm('Clear the saved initiative encounter?')) return
  const result = await repositories.initiativeEncounter.remove()
  if (!result.ok || result.warning) {
    reportStorageFailure({ error: result.error || result.warning })
    return
  }
  participants.value = []
  round.value = 1
  resetTurnProgress()
}

onMounted(async () => {
  const savedTracker = await repositories.initiativeEncounter.load()
  if (savedTracker.ok && savedTracker.value) {
    participants.value = savedTracker.value.participants || []
    round.value = savedTracker.value.round || 1
  } else if (!savedTracker.ok || savedTracker.warning) {
    reportStorageFailure({ error: savedTracker.error || savedTracker.warning })
  }
  participants.value = participants.value.map((participant, index) => ({
    ...createParticipant({}, index),
    ...participant,
    conditions: participant.conditions || [],
    actionDebt: Number(participant.actionDebt || 0),
    active: participant.active !== false,
  }))
  const savedPresets = await repositories.initiativePresets.load()
  if (savedPresets.ok) presets.value = savedPresets.value || []
  if (!savedPresets.ok || savedPresets.warning)
    reportStorageFailure(
      { error: savedPresets.error || savedPresets.warning },
      'The encounter presets',
    )
  await nextTick()
  hydrated = true
})

onBeforeUnmount(clearTurnDrag)

watch(
  [participants, round],
  async () => {
    if (!hydrated) return
    const result = await repositories.initiativeEncounter.save({
      participants: participants.value,
      round: round.value,
    })
    if (!result.ok || result.warning)
      reportStorageFailure({ error: result.error || result.warning })
  },
  { deep: true },
)
</script>

<template>
  <section class="initiative-page">
    <header class="panel initiative-header">
      <div>
        <p class="eyebrow">Combat manager</p>
        <h1>Initiative Tracker</h1>
        <p>Track every PC, NPC, and enemy through a complete melee round.</p>
      </div>
      <label
        v-if="showSystemSelection"
        class="field"
      >
        Game system
        <select v-model="selectedSystemId">
          <option
            v-for="system in systems"
            :key="system.id"
            :value="system.id"
          >
            {{ system.name }}
          </option>
        </select>
      </label>
      <div
        v-else
        class="system-badge"
      >
        <span>Game system</span>
        <strong>{{ selectedSystem.name }}</strong>
      </div>
    </header>

    <p
      v-if="storageStatus"
      class="storage-status panel"
      role="alert"
    >
      {{ storageStatus }}
    </p>

    <section
      class="panel tracker-controls"
      aria-label="Round controls"
    >
      <div>
        <span class="control-label">{{ selectedSystem.roundLabel }}</span>
        <strong class="round-number">{{ round }}</strong>
        <span class="duration">{{ selectedSystem.roundDuration }}</span>
      </div>
      <div class="button-row">
        <button
          v-if="ties.length"
          type="button"
          class="secondary"
          @click="rerollTied"
        >
          Reroll ties
        </button>
        <button
          type="button"
          class="secondary"
          :disabled="!participants.length"
          @click="startNewCombat"
        >
          New combat
        </button>
        <button
          type="button"
          class="secondary"
          :disabled="!history.length"
          @click="undo"
        >
          Undo{{
            history.length ? `: ${history[history.length - 1].label}` : ''
          }}
        </button>
        <button
          type="button"
          class="danger"
          @click="clearTracker"
        >
          Clear
        </button>
      </div>
    </section>

    <section class="panel encounter-presets">
      <div>
        <strong>Encounter presets</strong>
        <span>Save or restore a reusable roster.</span>
      </div>
      <div class="preset-controls">
        <input
          v-model="presetName"
          type="text"
          placeholder="Preset name"
          aria-label="New encounter preset name"
        />
        <button
          type="button"
          :disabled="!presetName.trim() || !participants.length"
          @click="savePreset"
        >
          Save roster
        </button>
        <select
          v-model="selectedPresetId"
          aria-label="Saved encounter preset"
        >
          <option value="">Choose preset</option>
          <option
            v-for="preset in presets"
            :key="preset.id"
            :value="preset.id"
          >
            {{ preset.name }}
          </option>
        </select>
        <button
          type="button"
          class="secondary"
          :disabled="!selectedPresetId"
          @click="loadPreset"
        >
          Load
        </button>
        <button
          type="button"
          class="danger"
          :disabled="!selectedPresetId"
          @click="deletePreset"
        >
          Delete
        </button>
      </div>
    </section>

    <div class="tracker-workspace has-turn-order">
      <section
        class="panel turn-order"
        aria-live="polite"
      >
        <div class="section-heading">
          <div>
            <p class="eyebrow">Live order</p>
            <h2>Upcoming turns</h2>
          </div>
          <div class="live-order-tools">
            <span class="queue-help">
              {{
                trackerStarted
                  ? 'Next to act is always at the top.'
                  : 'Previewed in roster order until combat starts.'
              }}
            </span>
            <div
              v-if="!trackerStarted"
              class="button-row"
            >
              <button
                type="button"
                :disabled="!participants.length"
                @click="rollAll"
              >
                Roll all
              </button>
              <button
                type="button"
                class="secondary"
                :disabled="!canStart"
                @click="startRound"
              >
                Start round
              </button>
            </div>
            <div
              v-else
              class="active-turn-tools"
            >
              <select
                v-model="selectedMoveId"
                aria-label="Two-action move"
              >
                <option value="">Two-action move</option>
                <option
                  v-for="move in RIFTS_MULTI_ACTION_MOVES"
                  :key="move.id"
                  :value="move.id"
                  :title="move.rule"
                >
                  {{ move.name }}
                </option>
              </select>
              <button
                type="button"
                class="secondary"
                :disabled="!canStartMultiActionMove()"
                @click="startMultiActionMove"
              >
                Start move
              </button>
              <button
                type="button"
                class="secondary"
                @click="advanceTurn"
              >
                Next turn
              </button>
            </div>
          </div>
        </div>
        <p
          v-if="!turnQueue.length"
          class="empty-state queue-empty"
        >
          Add combatants to preview the first initiative pass.
        </p>
        <ol
          v-else
          class="turn-queue"
        >
          <template
            v-for="(entry, queueIndex) in turnQueue"
            :key="`${entry.action}-${entry.participantId}`"
          >
            <li
              v-if="entry.completed && !turnQueue[queueIndex - 1]?.completed"
              class="pass-divider completed-divider"
            >
              Completed turns
            </li>
            <li
              v-else-if="
                !entry.completed &&
                (queueIndex === 0 ||
                  turnQueue[queueIndex - 1]?.action !== entry.action)
              "
              class="pass-divider"
            >
              Initiative pass {{ entry.action }}
              <span v-if="trackerStarted && queueIndex === 0">
                Current pass
              </span>
            </li>
            <li
              class="queue-entry"
              :data-action="entry.action"
              :data-completed="entry.completed"
              :data-participant-id="entry.participantId"
              :class="[
                `type-${entry.participant?.type}`,
                {
                  next: trackerStarted && queueIndex === 0,
                  completed: entry.completed,
                  dragging:
                    dragState?.participantId === entry.participantId &&
                    dragState?.action === entry.action,
                },
              ]"
              :style="draggedEntryStyle(entry)"
            >
              <button
                type="button"
                class="drag-handle"
                :disabled="entry.completed || !trackerStarted"
                :aria-label="turnDragLabel(entry)"
                @pointerdown.prevent="beginTurnDrag(entry, $event)"
              >
                <span aria-hidden="true">⠿</span>
              </button>
              <span class="queue-position">
                {{ entry.completed ? 'Done' : queueIndex + 1 }}
              </span>
              <strong>
                {{ entry.participant?.name || 'Unnamed combatant' }}
                <small
                  v-if="entry.participant?.pendingMove"
                  class="pending-move"
                  :title="entry.participant.pendingMove.rule"
                >
                  {{
                    entry.action === entry.participant.pendingMove.resolvesAt
                      ? `Resolve ${entry.participant.pendingMove.name}`
                      : `Preparing ${entry.participant.pendingMove.name}`
                  }}
                </small>
              </strong>
              <span class="type-chip">{{ entry.participant?.type }}</span>
              <span>Initiative {{ entry.participant?.initiativeTotal }}</span>
              <span>Action {{ entry.action }}</span>
              <div
                v-if="trackerStarted && isNextAppearance(entry, queueIndex)"
                class="queue-entry-actions"
              >
                <button
                  type="button"
                  class="spend-action-button"
                  :aria-label="spendActionLabel(entry)"
                  title="Remove this combatant's last remaining action"
                  @click="spendRemainingAction(entry.participantId)"
                >
                  Spend action
                </button>
                <button
                  type="button"
                  class="secondary"
                  title="Move this combatant to the end of each remaining pass"
                  @click="loseParticipantInitiative(entry.participantId)"
                >
                  Lose init
                </button>
                <button
                  type="button"
                  class="danger"
                  title="Remove remaining turns but keep the roster record"
                  @click="removeFromCombat(entry.participantId)"
                >
                  Leave
                </button>
              </div>
            </li>
          </template>
        </ol>
      </section>

      <section class="panel roster">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Roster</p>
            <h2>Combatants</h2>
          </div>
          <div class="button-row">
            <button
              type="button"
              class="secondary"
              @click="importSavedCharacter"
            >
              Import saved PC
            </button>
            <button
              type="button"
              @click="openAddCombatant('pc')"
            >
              Add combatant
            </button>
          </div>
        </div>

        <p
          v-if="!participants.length"
          class="empty-state"
        >
          Add a combatant to begin. Rolls and changes are saved on this device.
        </p>

        <div
          v-else
          class="combatant-list"
        >
          <article
            v-for="participant in participants"
            :key="participant.id"
            class="combatant-card"
            :class="[
              `type-${participant.type}`,
              { current: currentParticipant?.id === participant.id },
            ]"
          >
            <div class="combatant-identity">
              <label class="field grow">
                Name
                <input
                  v-model="participant.name"
                  type="text"
                  placeholder="Combatant name"
                />
              </label>
              <label class="field type-field">
                Type
                <select v-model="participant.type">
                  <option
                    v-for="type in PARTICIPANT_TYPES"
                    :key="type.id"
                    :value="type.id"
                  >
                    {{ type.label }}
                  </option>
                </select>
              </label>
              <span
                v-if="!participant.active"
                class="inactive-badge"
              >
                Out of combat
              </span>
            </div>

            <div class="combatant-stats">
              <label class="field compact">
                Init bonus
                <input
                  v-model.number="participant.initiativeBonus"
                  type="number"
                />
              </label>
              <label class="field compact">
                Actions
                <input
                  v-model.number="participant.actionsPerRound"
                  type="number"
                  min="1"
                  max="20"
                />
              </label>
              <label class="field compact">
                Total
                <input
                  :value="participant.initiativeTotal ?? ''"
                  type="number"
                  placeholder="Manual"
                  @input="updateManualInitiative(participant, $event)"
                />
              </label>
              <button
                type="button"
                @click="rollOne(participant)"
              >
                Roll d{{ selectedSystem.initiativeDie }}
              </button>
              <button
                type="button"
                class="danger remove-button"
                :aria-label="`Remove ${participant.name || 'combatant'}`"
                @click="removeParticipant(participant.id)"
              >
                Remove
              </button>
            </div>

            <p
              v-if="participant.initiativeRoll"
              class="roll-detail"
            >
              Rolled {{ participant.initiativeRoll }}
              <template v-if="participant.initiativeBonus">
                {{ participant.initiativeBonus > 0 ? '+' : ''
                }}{{ participant.initiativeBonus }}
              </template>
              = <strong>{{ participant.initiativeTotal }}</strong>
            </p>
            <p
              v-if="tiedIds.has(participant.id)"
              class="tie-warning"
            >
              Initiative tie - reroll tied combatants.
            </p>
            <div class="roster-utilities">
              <label class="field">
                Group
                <input
                  v-model="participant.group"
                  type="text"
                  placeholder="Optional group"
                />
              </label>
              <button
                type="button"
                class="secondary"
                @click="duplicateParticipant(participant)"
              >
                Duplicate
              </button>
              <button
                v-if="!participant.active"
                type="button"
                class="secondary"
                @click="returnToCombat(participant)"
              >
                Return
              </button>
              <button
                type="button"
                class="secondary"
                :disabled="!participant.group"
                title="Use one die roll for every active member of this group"
                @click="rollGroup(participant)"
              >
                Roll group
              </button>
              <button
                v-if="trackerStarted"
                type="button"
                class="secondary"
                :title="SPEND_ACTION_TOOLTIP"
                @click="spendRemainingAction(participant.id)"
              >
                Spend action
              </button>
            </div>
            <div class="condition-panel">
              <div class="condition-controls">
                <select
                  v-model="conditionChoices[participant.id]"
                  aria-label="Condition"
                >
                  <option value="">Add condition</option>
                  <option
                    v-for="condition in RIFTS_CONDITIONS"
                    :key="condition.id"
                    :value="condition.id"
                    :title="condition.rule"
                  >
                    {{ condition.name }}
                  </option>
                </select>
                <input
                  v-model.number="conditionRounds[participant.id]"
                  type="number"
                  min="1"
                  max="99"
                  placeholder="Rounds"
                  aria-label="Condition duration in rounds"
                />
                <button
                  type="button"
                  class="secondary"
                  :disabled="!conditionChoices[participant.id]"
                  @click="addCondition(participant)"
                >
                  Apply
                </button>
              </div>
              <div
                v-if="participant.conditions?.length"
                class="condition-chips"
              >
                <button
                  v-for="condition in participant.conditions"
                  :key="condition.id"
                  type="button"
                  class="condition-chip"
                  :title="conditionRule(condition)?.rule"
                  :data-tooltip="conditionRule(condition)?.rule"
                  :aria-label="conditionAriaLabel(condition)"
                  @click="removeCondition(participant, condition.id)"
                >
                  {{ conditionRule(condition)?.name }}
                  <span>{{ condition.rounds }}r</span>
                  <span aria-hidden="true">x</span>
                </button>
              </div>
              <p
                v-if="selectedConditionRule(participant.id)"
                class="condition-rule-preview"
              >
                {{ selectedConditionRule(participant.id).rule }}
              </p>
              <p
                v-if="participant.actionDebt"
                class="action-debt"
                :title="ACTION_DEBT_TOOLTIP"
              >
                Next-round action debt: {{ participant.actionDebt }}
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>

    <aside class="panel rules-note">
      <h2>Rifts turn rules</h2>
      <p>
        Roll initiative once per 15-second melee round. Highest acts first; ties
        reroll. Each combatant takes their first action in initiative order,
        then their second, continuing until all attacks/actions are spent. A
        successful unseen sneak or long-range attack has initiative and limits
        the defender's response to the first attack; apply that result manually.
        Defensive actions spent after a combatant runs out are carried as debt
        into the next round.
      </p>
    </aside>

    <div
      v-if="showAddCombatant"
      class="modal-backdrop"
      role="presentation"
      @click.self="closeAddCombatant"
      @keydown.esc="closeAddCombatant"
    >
      <form
        class="panel add-combatant-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-combatant-title"
        @submit.prevent="addParticipant"
      >
        <div class="section-heading">
          <div>
            <p class="eyebrow">New roster entry</p>
            <h2 id="add-combatant-title">Add combatant</h2>
          </div>
          <button
            type="button"
            class="secondary close-button"
            aria-label="Close add combatant dialog"
            @click="closeAddCombatant"
          >
            Close
          </button>
        </div>
        <label class="field">
          Name
          <input
            v-model="combatantDraft.name"
            type="text"
            placeholder="Combatant name"
            autofocus
            required
          />
        </label>
        <label class="field">
          Type
          <select v-model="combatantDraft.type">
            <option
              v-for="type in PARTICIPANT_TYPES"
              :key="type.id"
              :value="type.id"
            >
              {{ type.label }}
            </option>
          </select>
        </label>
        <div class="modal-fields">
          <label class="field">
            Initiative bonus
            <input
              v-model.number="combatantDraft.initiativeBonus"
              type="number"
            />
          </label>
          <label class="field">
            Attacks/actions per round
            <input
              v-model.number="combatantDraft.actionsPerRound"
              type="number"
              min="1"
              max="20"
              required
            />
          </label>
          <label class="field">
            Quantity
            <input
              v-model.number="combatantDraft.quantity"
              type="number"
              min="1"
              max="50"
              required
            />
          </label>
          <label class="field">
            Group
            <input
              v-model="combatantDraft.group"
              type="text"
              placeholder="Optional shared group"
            />
          </label>
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="secondary"
            @click="closeAddCombatant"
          >
            Cancel
          </button>
          <button type="submit">Add to roster</button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.initiative-page {
  width: 100%;
  display: grid;
  gap: 1rem;
}
.tracker-workspace {
  display: grid;
  gap: 1rem;
}
.tracker-workspace.has-turn-order {
  grid-template-columns: minmax(34rem, 1.35fr) minmax(24rem, 0.65fr);
  align-items: start;
}
.turn-order {
  position: sticky;
  top: 4.25rem;
  max-height: calc(100vh - 5.25rem);
  overflow-y: auto;
}
.queue-empty {
  margin: 1rem 0 0;
}
.live-order-tools {
  display: grid;
  justify-items: end;
  gap: 0.55rem;
}
.initiative-header,
.tracker-controls,
.section-heading,
.combatant-identity,
.combatant-stats,
.button-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.initiative-header,
.tracker-controls,
.section-heading {
  justify-content: space-between;
}
.initiative-header.panel,
.tracker-controls.panel,
.encounter-presets.panel {
  box-shadow: none;
}
.initiative-header p {
  max-width: 46rem;
  margin-bottom: 0;
}
.system-badge {
  min-width: 15rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  background: rgba(77, 163, 255, 0.08);
}
.system-badge span,
.control-label,
.duration,
.queue-help {
  display: block;
  color: var(--color-text-muted);
  font-size: 0.78rem;
}
.round-number {
  margin-right: 0.5rem;
  color: var(--color-accent-bright);
  font-size: 2rem;
}
.button-row {
  flex-wrap: wrap;
}
.encounter-presets,
.preset-controls,
.active-turn-tools,
.roster-utilities,
.condition-controls,
.queue-entry-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.encounter-presets {
  justify-content: space-between;
  border-left: 3px solid var(--color-blue);
}
.encounter-presets > div:first-child {
  display: grid;
  gap: 0.2rem;
}
.encounter-presets span {
  color: var(--color-text-muted);
  font-size: 0.78rem;
}
.preset-controls {
  flex-wrap: wrap;
  justify-content: flex-end;
}
.preset-controls input,
.preset-controls select,
.active-turn-tools select {
  min-height: 2.55rem;
  padding: 0.5rem 0.65rem;
}
button {
  min-height: 2.55rem;
  padding: 0.55rem 0.8rem;
}
h2 {
  margin: 0;
}
.turn-queue {
  display: grid;
  gap: 1px;
  overflow: hidden;
  margin: 1rem 0 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-border);
  list-style: none;
}
.pass-divider {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0;
  padding: 0.55rem 0.75rem;
  background: rgba(255, 145, 31, 0.1);
  color: var(--color-accent-bright);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pass-divider::after {
  height: 1px;
  flex: 1;
  background: var(--color-accent);
  content: '';
}
.pass-divider span {
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: rgba(242, 140, 40, 0.15);
  font-size: 0.65rem;
}
.completed-divider {
  color: var(--color-text-muted);
}
.completed-divider::after {
  background: var(--color-border);
}
.queue-entry {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 2.25rem 3rem minmax(10rem, 1fr) auto auto auto auto;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.55rem 0.75rem;
  border: 0;
  border-left: 4px solid var(--color-blue);
  border-radius: 0;
  background: var(--color-input);
  transition:
    transform 80ms ease,
    border-color 120ms ease;
}
.queue-entry.type-npc {
  border-left-color: var(--color-positive);
}
.queue-entry.type-enemy {
  border-left-color: var(--color-negative);
}
.queue-entry.next {
  background: rgba(242, 140, 40, 0.12);
  box-shadow: 0 0 0 1px var(--color-accent);
}
.queue-entry.completed {
  opacity: 0.48;
}
.queue-entry.dragging {
  z-index: 100;
  opacity: 1;
  background: var(--color-input);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
  isolation: isolate;
  transition: none;
}
.drag-handle {
  width: 2rem;
  min-height: 2rem;
  padding: 0;
  color: var(--color-text-muted);
  background: transparent;
  cursor: grab;
  touch-action: none;
}
.drag-handle:hover:not(:disabled) {
  color: var(--color-accent-bright);
  background: rgba(77, 163, 255, 0.1);
}
.drag-handle:active {
  cursor: grabbing;
}
.spend-action-button {
  min-height: 2rem;
  padding: 0.35rem 0.55rem;
  color: var(--color-text);
  background: #263b67;
  font-size: 0.72rem;
  white-space: nowrap;
}
.queue-entry-actions button {
  min-height: 2rem;
  padding: 0.35rem 0.5rem;
  font-size: 0.68rem;
  white-space: nowrap;
}
.pending-move {
  display: block;
  margin-top: 0.2rem;
  color: var(--color-accent-bright);
  font-size: 0.68rem;
}
.queue-position,
.type-chip {
  color: var(--color-text-muted);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}
.type-chip {
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
}
.combatant-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}
.roster.panel,
.turn-order.panel {
  box-shadow: none;
}
.combatant-card {
  padding: 0.85rem;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-blue);
  border-radius: 12px;
  background: rgba(10, 17, 37, 0.72);
}
.combatant-card.type-npc {
  border-left-color: var(--color-positive);
}
.combatant-card.type-enemy {
  border-left-color: var(--color-negative);
}
.combatant-card.current {
  outline: 2px solid var(--color-accent);
}
.roster-utilities,
.condition-panel {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}
.roster-utilities .field {
  flex: 1;
}
.condition-panel {
  display: grid;
  gap: 0.55rem;
}
.condition-controls select {
  min-width: 0;
  flex: 1;
}
.condition-controls input {
  width: 5.25rem;
  min-width: 0;
}
.condition-controls select,
.condition-controls input {
  min-height: 2.35rem;
  padding: 0.45rem 0.55rem;
}
.condition-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.condition-chip {
  position: relative;
  min-height: 2rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--color-accent);
  color: var(--color-text);
  background: rgba(242, 140, 40, 0.12);
  font-size: 0.72rem;
}
.condition-chip::after {
  position: absolute;
  z-index: 250;
  bottom: calc(100% + 0.45rem);
  left: 0;
  width: min(18rem, 70vw);
  padding: 0.6rem;
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  color: var(--color-text);
  background: #050b1d;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
  content: attr(data-tooltip);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.35;
  text-align: left;
  white-space: normal;
  opacity: 0;
  pointer-events: none;
  transform: translateY(0.25rem);
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}
.condition-chip:hover::after,
.condition-chip:focus-visible::after {
  opacity: 1;
  transform: translateY(0);
}
.condition-rule-preview {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}
.inactive-badge {
  align-self: end;
  padding: 0.45rem 0.55rem;
  border-radius: 999px;
  color: var(--color-text-muted);
  background: #263b67;
  font-size: 0.68rem;
  font-weight: 800;
}
.condition-chip span {
  margin-left: 0.3rem;
}
.action-debt {
  margin: 0;
  color: var(--color-negative);
  font-size: 0.75rem;
  font-weight: 800;
}
.combatant-identity {
  margin-bottom: 0.7rem;
}
.combatant-stats {
  align-items: end;
}
.roster .combatant-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.roster .compact {
  width: 100%;
}
.roster .combatant-stats > button:not(.remove-button) {
  grid-column: span 2;
}
.roster .remove-button {
  width: 100%;
}
.field {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
  font-size: 0.78rem;
  font-weight: 700;
}
.field input,
.field select {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 2.55rem;
  padding: 0.55rem 0.65rem;
}
.grow {
  flex: 1;
}
.type-field {
  width: 8rem;
}
.compact {
  width: 7rem;
}
.remove-button {
  margin-left: auto;
}
.roll-detail,
.tie-warning {
  margin: 0.65rem 0 0;
  font-size: 0.85rem;
}
.tie-warning {
  color: var(--color-negative);
  font-weight: 800;
}
.empty-state {
  padding: 2rem;
  border: 1px dashed var(--color-border-strong);
  border-radius: 12px;
  text-align: center;
}
.rules-note p {
  max-width: 75rem;
  margin-bottom: 0;
}
.modal-backdrop {
  position: fixed;
  z-index: 500;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 5, 15, 0.78);
  backdrop-filter: blur(5px);
}
.add-combatant-modal {
  width: min(34rem, 100%);
  display: grid;
  gap: 1rem;
}
.close-button {
  min-height: auto;
}
.modal-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
}
@media (max-width: 1050px) {
  .tracker-workspace.has-turn-order {
    grid-template-columns: 1fr;
  }
  .turn-order {
    position: static;
    max-height: none;
  }
}
@media (max-width: 760px) {
  .initiative-header,
  .tracker-controls,
  .section-heading,
  .combatant-stats {
    align-items: stretch;
    flex-direction: column;
  }
  .system-badge,
  .compact,
  .type-field {
    width: 100%;
  }
  .combatant-stats button,
  .button-row {
    width: 100%;
  }
  .button-row > button {
    flex: 1;
  }
  .remove-button {
    margin-left: 0;
  }
  .queue-entry {
    grid-template-columns: 2.25rem 2.5rem 1fr auto;
  }
  .queue-entry > span:nth-last-child(-n + 2) {
    grid-column: 3 / -1;
  }
  .spend-action-button {
    grid-column: 3 / -1;
  }
  .queue-entry-actions {
    grid-column: 3 / -1;
    flex-wrap: wrap;
  }
  .encounter-presets,
  .preset-controls,
  .active-turn-tools,
  .roster-utilities,
  .condition-controls {
    align-items: stretch;
    flex-direction: column;
  }
  .preset-controls > *,
  .active-turn-tools > *,
  .roster-utilities > *,
  .condition-controls > * {
    width: 100%;
  }
  .modal-fields {
    grid-template-columns: 1fr;
  }
  .roster .combatant-stats {
    grid-template-columns: 1fr;
  }
  .roster .combatant-stats > button:not(.remove-button) {
    grid-column: auto;
  }
  .live-order-tools {
    justify-items: stretch;
  }
}
</style>

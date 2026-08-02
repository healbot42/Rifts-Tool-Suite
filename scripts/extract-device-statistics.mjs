import fs from 'node:fs'

const catalogPath = new URL('../src/pages/tw-device-browser/data/tw-devices.json', import.meta.url)
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

const normalize = value => value.replace(/\s+/g, ' ').trim()

const normalizeDice = value => normalize(value)
  .replace(/\b[IiLl]D(?=\d)/g, '1D')
  .replace(/\b([1-9])0(4|6|8|10|12|20)(?=\b|x)/g, '$1D$2')
  .replace(/x(?:J|l|I)\s*[Oo0]/g, 'x10')
  .replace(/x1[Oo0]/g, 'x10')
  .replace(/S\.D\.C\.[lI]Hit/gi, 'S.D.C./Hit')

function extractDamage(description) {
  const damageHeading = /(?:Mega-Damage(?:\s*&\s*Payload)?|Damage to Vampires|Stun Damage|Damage):\s*/gi
  const nextHeading = /\s+(?:Mega-Damage(?:\s*&\s*Payload)?|Powers?|Magic Powers?|Magical Powers?|Stun Damage|M\.D\.C\.[^:]{0,35}|Device Level|P\.P\.E\.[^:]{0,35}|I\.S\.P\.[^:]{0,35}|Rate of Fire|Effective Range|Range|Payload|Duration[^:]{0,30}|Bonuses?|Penalt(?:y|ies)|Requirements? to Create|Spells? (?:Needed|Required)|Cost|Note):/gi
  const values = []
  for (const match of description.matchAll(damageHeading)) {
    const remainder = description.slice(match.index + match[0].length)
    const end = remainder.search(nextHeading)
    const value = normalizeDice(end < 0 ? remainder : remainder.slice(0, end))
    if (value && value.length < 1600) values.push(value)
  }
  if (!values.length) return null
  const combined = [...new Set(values)].join('; ')
  const effectMarker = combined.search(/\s+(?:Those struck|Those hit|Against |Additionally|Targets? (?:can|must|are|suffer)|Victims? |A successful save|Whatever is hit|Special:)/i)
  return effectMarker > 0
    ? { label: 'Damage', value: combined.slice(0, effectMarker).trim(), details: combined.slice(effectMarker).trim() }
    : { label: 'Damage', value: combined }
}

function canonicalLabel(rawLabel) {
  const label = normalize(rawLabel).replace(/^(?:and|the|each|takes?\b[^.]*\.)\s*/i, '')
  if (/mega-damage|stun damage|damage to|\bdamage\b/i.test(label)) return 'Damage'
  if (/market|price|\bcost\b|value/i.test(label) && !/p\.?p\.?e|i\.?s\.?p|activate|charge|recharge|fire|launch|load/i.test(label)) return 'Price / Cost'
  if (/p\.?p\.?e|i\.?s\.?p|activate|charge|recharge|fire|launch|load/i.test(label) && /cost|required|points|p\.?p\.?e|i\.?s\.?p/i.test(label)) return 'Activation / Energy Cost'
  if (/rate of fire/i.test(label)) return 'Rate of Fire'
  if (/payload|pay load/i.test(label)) return 'Payload'
  if (/effective range|maximum range|\brange\b/i.test(label)) return 'Range'
  if (/duration/i.test(label)) return 'Duration'
  if (/magic powers?|magical powers?|powers?|psionic abilities|special magical properties|enchantment/i.test(label)) return 'Powers'
  if (/bonus/i.test(label)) return 'Bonuses'
  if (/penalt|limitation|vulnerabil/i.test(label)) return 'Penalties / Limitations'
  if (/requirements?|spells? (?:needed|required)|creation spells|physical requirements?/i.test(label)) return 'Creation Requirements'
  if (/time to build|hours? of work|months? to (?:make|build)/i.test(label)) return 'Construction Time'
  if (/m\.?d\.?c|main body|armor rating|\ba\.?r\.?\b|special protection/i.test(label)) return 'Durability / Protection'
  if (/weight capacity|\bweight\b/i.test(label)) return 'Weight / Capacity'
  if (/maximum speed|flying speed|speed when|enhanced speed/i.test(label)) return 'Speed'
  if (/altitude/i.test(label)) return 'Altitude'
  if (/crew/i.test(label)) return 'Crew'
  if (/manufacturer|model/i.test(label)) return 'Model / Manufacturer'
  if (/effect|protection|sonic blast|fuel flame|cross spotlight|circle of protection|force field|breathe without air/i.test(label)) return 'Effect / Mode'
  if (/launcher|cannon|blaster|mini.?gun|combat tentacles|ranged attack|grenade$/i.test(label)) return `Mode — ${label}`
  return null
}

function extractStatistics(description) {
  const headings = []
  const headingPattern = /([A-Z][A-Za-z0-9.()/'’ -]{1,64}):\s*/g
  for (const match of description.matchAll(headingPattern)) {
    const label = canonicalLabel(match[1])
    if (label) headings.push({ label, start: match.index, valueStart: match.index + match[0].length })
  }

  const statistics = []
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]
    const end = headings[index + 1]?.start ?? description.length
    const value = normalize(description.slice(heading.valueStart, end)).replace(/\s+(?:Requirements? to Create|Cost)$/i, '')
    if (!value || value.length > 1800) continue
    const previous = statistics.at(-1)
    if (previous?.label === heading.label) previous.value = `${previous.value}; ${value}`
    else statistics.push({ label: heading.label, value })
  }

  const damage = extractDamage(description)
  if (damage) {
    const withoutGenericDamage = statistics.filter(statistic => statistic.label !== 'Damage')
    statistics.length = 0
    statistics.push(damage, ...withoutGenericDamage)
  }

  if (!statistics.some(stat => stat.label === 'Activation / Energy Cost')) {
    const activation = description.match(/(?:costs?|requires?)\s+([^.!]{0,80}(?:P\.?P\.?E\.?|I\.?S\.?P\.?)[^.!]{0,80})/i)
    if (activation) statistics.push({ label: 'Activation / Energy Cost', value: normalize(activation[1]) })
  }
  if (!statistics.some(stat => stat.label === 'Duration')) {
    const duration = description.match(/duration\s+(?:is|of|lasts?)\s+([^.!]{1,140})/i)
    if (duration) statistics.push({ label: 'Duration', value: normalize(duration[1]) })
  }

  const order = ['Damage', 'Price / Cost', 'Activation / Energy Cost', 'Powers', 'Effect / Mode', 'Range', 'Rate of Fire', 'Payload', 'Duration', 'Durability / Protection', 'Bonuses', 'Penalties / Limitations', 'Speed', 'Altitude', 'Weight / Capacity', 'Crew', 'Model / Manufacturer', 'Construction Time', 'Creation Requirements']
  return statistics.sort((left, right) => {
    const leftRank = left.label.startsWith('Mode —') ? 4 : order.indexOf(left.label)
    const rightRank = right.label.startsWith('Mode —') ? 4 : order.indexOf(right.label)
    return (leftRank < 0 ? order.length : leftRank) - (rightRank < 0 ? order.length : rightRank)
  })
}

const weaponCategories = new Set(['Melee Weapons', 'Pistols & Revolvers', 'Rifles & Shotguns', 'Heavy Weapons', 'Explosives & Pyrotechnics', 'Vampire-Slaying Weapons'])
const damageFallbacks = {
  'mega-blades-splugorth-tw-item': "Equal to the weapon's normal S.D.C. damage, converted to Mega-Damage.",
  'tw-arrows': 'Varies by the selected Goblin Bomb spell effect.',
  'naut-vii-tw-grenades': 'Sonic Blast mode: 4D6 M.D. in a 20 foot (6.1 m) blast diameter; Black Water mode uses the spell effect.',
  'tw-vampire-water-field': '3D6 Hit Point damage each time a vampire enters the water field.',
  'tw-storm-flare': '4D6x10 Hit Point damage every half melee round (7.5 seconds) that a vampire remains exposed to the storm.',
  'water-dagger-tww-1050-by-jason-richards': '1 S.D.C./Hit Point to most targets; 2D6 Hit Points to vampires.',
}

const damageOverrides = {
  'tw-naut-yii-sonic-wand': {
    label: 'Damage',
    value: '2D6 M.D. per individual sonic blast, or 6D6 M.D. as one combined powerful blast.',
    details: 'Stun mode requires a save vs magic (14 or higher). On a failed save, the target suffers 3D6 S.D.C.; 2D4 of that damage passes through body or power armor. The target is -6 to strike, parry, and dodge, with Speed and attacks per melee reduced by half for 1D4 melee rounds. The wand also inflicts 2D6 S.D.C. as a blunt weapon.',
  },
}

for (const device of catalog.devices) {
  device.statistics = extractStatistics(device.description)
  if (['mega-blades-splugorth-tw-item', 'water-dagger-tww-1050-by-jason-richards'].includes(device.id)) {
    device.statistics = device.statistics.filter(statistic => statistic.label !== 'Damage')
    device.statistics.unshift({ label: 'Damage', value: damageFallbacks[device.id] })
  }
  if (damageOverrides[device.id]) {
    device.statistics = device.statistics.filter(statistic => statistic.label !== 'Damage')
    device.statistics.unshift(damageOverrides[device.id])
  }
  if (weaponCategories.has(device.category) && !device.statistics.some(statistic => statistic.label === 'Damage')) {
    const fallback = damageFallbacks[device.id]
    if (fallback) device.statistics.unshift({ label: 'Damage', value: fallback })
  }
}

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
const populated = catalog.devices.filter(device => device.statistics.length).length
console.log(`Extracted structured statistics for ${populated} of ${catalog.devices.length} devices.`)

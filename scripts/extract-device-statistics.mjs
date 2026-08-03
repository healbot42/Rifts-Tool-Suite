import fs from 'node:fs'
import { STATISTIC_ORDER } from '../src/pages/tw-device-browser/data/statistics.js'

const catalogPath = new URL('../src/pages/tw-device-browser/data/tw-devices.json', import.meta.url)
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

const normalize = value => value.replace(/\s+/g, ' ').trim()
const normalizeDice = value => normalize(value)
  .replace(/\b[IiLl]D(?=\d)/g, '1D')
  .replace(/\b([1-9])0(4|6|8|10|12|20)(?=\b|x)/g, '$1D$2')
  .replace(/x(?:J|l|I)\s*[Oo0]/g, 'x10')
  .replace(/x1[Oo0]/g, 'x10')
  .replace(/S\.D\.C\.[lI]Hit/gi, 'S.D.C./Hit')
  .replace(/\bl\.S\.P\./g, 'I.S.P.')
  .replace(/([+-])\s*[Il](?=\s|$)/g, '$1 1')
  .replace(/\bo f\b/gi, 'of')

// Only actual sourcebook field names belong here. The previous generic colon parser
// treated numbered powers such as "Command Ghouls (10 P.P.E.):" as new cards.
const SOURCE_HEADING = /(?:Mega-Damage(?:\s*&\s*Payload)?|Damage to Vampires|Stun Damage|Damage|Magic Powers?|Magical Powers?|Powers?|Psionic Abilities|Special Magical Properties|Enchantments?|Special Features?|Effects?|Modes?|Effective Range(?: of[^:]{0,40})?|Maximum Range|Range|Rate of Fire|Payload|Pay Load|Duration(?:\/Payload)?(?: of Charge)?(?:\s*\([^:]{0,45}\))?|Bonus(?:es)?|Penalt(?:y|ies)|Limitations?|Vulnerabilit(?:y|ies)|M\.?D\.?C\.?|Main Body|Armor Rating|A\.?R\.?|Special Protection|Weight Capacity|Weight|Maximum Speed|Flying Speed|Speed|Altitude|Crew|Manufacturer|Model|Device Level|P\.?P\.?E\.? Construction Cost|P\.?P\.?E\.? Cost to Make|Initial P\.?P\.?E\.? Cost|Creation Cost|P\.?P\.?E\.? Cost to Acti\s*vate|P\.?P\.?E\.? to Acti\s*vate|Cost to Acti\s*vate|Cost to Charge and Re\s*charge(?: the [^:]{0,30})?|Cost to Re\s*charge|To Re\s*charge|Activation Cost|Reload Cost|Cost to Reload|Requirements? to Create|Physical Requirements?|Spell Chains? Needed|Spells? Needed|Spells? Required|Creation Spells|Construction Time|Time to Build|Black Market Cost|Market Cost|Market Value|Price|Cost):\s*/gi

function canonicalLabel(rawLabel) {
  const label = normalize(rawLabel)
  if (/mega-damage|stun damage|damage to|^damage$/i.test(label)) return 'Damage'
  if (/magic powers?|magical powers?|^powers?$|psionic abilities|special magical properties|enchantment|special features|^effects?$/i.test(label)) return 'Powers / Effects'
  if (/^modes?$/i.test(label)) return 'Modes'
  if (/rate of fire/i.test(label)) return 'Rate of Fire'
  if (/duration/i.test(label)) return 'Duration'
  if (/payload|pay load/i.test(label)) return 'Payload'
  if (/range/i.test(label)) return 'Range'
  if (/bonus/i.test(label)) return 'Bonuses'
  if (/penalt|limitation|vulnerabil/i.test(label)) return 'Penalties / Limitations'
  if (/requirements?|spells? (?:needed|required)|creation spells|spell chains?/i.test(label)) return 'Construction Requirements'
  if (/construction time|time to build/i.test(label)) return 'Construction Time'
  if (/construction cost|cost to make|initial p\.?p\.?e|creation cost/i.test(label)) return 'Construction Cost'
  if (/acti\s*vate|re\s*charge|reload|charge and re\s*charge/i.test(label)) return 'Activation / Reload Cost'
  if (/market|price|^cost$/i.test(label)) return 'Price'
  if (/m\.?d\.?c|main body|armor rating|^a\.?r\.?|special protection/i.test(label)) return 'Durability / Protection'
  if (/weight/i.test(label)) return 'Weight / Capacity'
  if (/speed/i.test(label)) return 'Speed'
  if (/altitude/i.test(label)) return 'Altitude'
  if (/crew/i.test(label)) return 'Crew'
  if (/manufacturer|model/i.test(label)) return 'Model / Manufacturer'
  return null
}

function concise(value) {
  return normalizeDice(value)
    .replace(/\bThe (?:character|user|wielder|operator) (?:of the (?:device|weapon) )?can\b/gi, 'Can')
    .replace(/\bFundamentally the same as casting\b/gi, 'As')
    .replace(/\bEffectively the same as\b/gi, 'As')
    .replace(/\bthe same as\b/gi, 'as')
    .replace(/\bIn other words,?\s*/gi, '')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
}

function concisePrice(value) {
  const boundary = value.search(/\s+(?:Note:|TW Firearms|Techno-Wizard Bionics|Techno-Wizard Vehicles|Flare:|Grenade:|\d+\.\s+[A-Z][A-Za-z -]{2,35}:)/i)
  let result = boundary > 0 ? value.slice(0, boundary) : value
  if (result.length > 700) {
    const sentences = result.match(/.*?[.!?](?:\s|$)/g)
    if (sentences?.length) result = sentences.slice(0, 2).join(' ')
  }
  return result.trim()
}

function prefixFor(label, rawLabel, value) {
  if (label === 'Activation / Reload Cost') {
    if (/reload(?!.*recharge)/i.test(rawLabel)) return `Reload: ${value}`
    if (/re\s*charge|charge/i.test(rawLabel)) return `Recharge: ${value}`
    return `Activation: ${value}`
  }
  if (label === 'Price' && /^cost$/i.test(rawLabel)) return value
  return value
}

function mergeStatistic(statistics, statistic) {
  const previous = statistics.find(item => item.label === statistic.label)
  if (!previous) {
    statistics.push(statistic)
    return
  }
  if (!previous.value.includes(statistic.value)) previous.value = `${previous.value}; ${statistic.value}`
  if (statistic.details && !previous.details?.includes(statistic.details)) {
    previous.details = previous.details ? `${previous.details} ${statistic.details}` : statistic.details
  }
}

function splitDamage(value) {
  const marker = value.search(/\s+(?:Those struck|Those hit|Against |Additionally|Targets? (?:can|must|are|suffer)|Victims? |A successful save|Whatever is hit|Special:|The person using)/i)
  return marker > 0
    ? { label: 'Damage', value: value.slice(0, marker).trim(), details: value.slice(marker).trim() }
    : { label: 'Damage', value }
}

function extractPrefixPowers(description, firstHeadingStart) {
  if (firstHeadingStart <= 0) return null
  const prefix = concise(description.slice(0, firstHeadingStart))
  const marker = prefix.search(/\b(?:has|have|offers?|provides?|performs?) (?:two|three|four|five|six|several|the following) (?:functions?|powers?|modes?)\b|\b\d+\)\s+/i)
  if (marker < 0) return null
  const powerText = prefix.slice(marker)
    .replace(/^.*?\b(?:functions?|powers?|modes?)\.?\s*/i, '')
    .trim()
  return powerText.length > 20 ? { label: 'Powers / Effects', value: powerText } : null
}

function extractStatistics(description) {
  const headings = [...description.matchAll(SOURCE_HEADING)].map(match => ({
    rawLabel: normalize(match[0].replace(/:\s*$/, '')),
    label: canonicalLabel(match[0].replace(/:\s*$/, '')),
    start: match.index,
    valueStart: match.index + match[0].length,
  }))

  const statistics = []
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]
    if (!heading.label) continue
    const end = headings[index + 1]?.start ?? description.length
    let value = concise(description.slice(heading.valueStart, end))
    if (!value) continue
    if (heading.label === 'Price') value = concisePrice(value)
    value = prefixFor(heading.label, heading.rawLabel, value)
    if (heading.label === 'Damage') {
      const nextMode = value.search(/\s+2\)\s+/)
      if (nextMode > 0) {
        mergeStatistic(statistics, splitDamage(value.slice(0, nextMode)))
        mergeStatistic(statistics, { label: 'Powers / Effects', value: value.slice(nextMode).trim() })
      } else mergeStatistic(statistics, splitDamage(value))
    } else {
      if (heading.label === 'Construction Requirements') {
        const constructionPpe = value.match(/^(\d[\d,]*)\s+P\.?P\.?E\.?(?:\s+points?)?[,.;]\s*|(?:,?\s+and\s+)(\d[\d,]*)\s+P\.?P\.?E\.?\s+points?\.?$/i)
        if (constructionPpe) {
          mergeStatistic(statistics, { label: 'Construction Cost', value: `${constructionPpe[1] ?? constructionPpe[2]} P.P.E.` })
          value = value.replace(constructionPpe[0], constructionPpe.index === 0 ? '' : '.').trim()
        }
      }
      if (value) mergeStatistic(statistics, { label: heading.label, value })
    }
  }

  const prefixPower = extractPrefixPowers(description, headings[0]?.start ?? description.length)
  if (prefixPower) mergeStatistic(statistics, prefixPower)

  if (!statistics.some(stat => stat.label === 'Activation / Reload Cost')) {
    const activation = description.match(/(?:costs?|requires?)\s+([^.!]{0,100}(?:P\.?P\.?E\.?|I\.?S\.?P\.?)[^.!]{0,100})/i)
    if (activation) statistics.push({ label: 'Activation / Reload Cost', value: `Activation: ${concise(activation[1])}` })
  }
  if (!statistics.some(stat => stat.label === 'Duration')) {
    const duration = description.match(/duration\s+(?:is|of|lasts?)\s+([^.!]{1,180})/i)
    if (duration) statistics.push({ label: 'Duration', value: concise(duration[1]) })
  }

  return statistics.sort((left, right) => STATISTIC_ORDER.indexOf(left.label) - STATISTIC_ORDER.indexOf(right.label))
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
    label: 'Damage', value: '2D6 M.D. per sonic blast or 6D6 M.D. as one combined blast.',
    details: 'Stun mode: save vs magic (14+). Failure causes 3D6 S.D.C. (2D4 bypasses armor), -6 to strike/parry/dodge, half Speed and attacks for 1D4 melee rounds. Also inflicts 2D6 S.D.C. as a blunt weapon.',
  },
}
const powerOverrides = {
  'lightning-axe-new': {
    label: 'Powers / Effects',
    value: 'After the axe embeds in an object (2D6 M.D.; one attack), each electrical surge inflicts 2D6 M.D. and costs one attack. Double surge damage against machines with electronics (not body/power armor). Each surge has a 45% chance to disable one system: 01-20 communications; 21-40 primary sensors; 41-50 optics; 51-60 computers/targeting; 61-70 locomotion (half Speed/dodge); 71-80 secondary weapon/capability; 81-90 main weapon/capability; 91-00 cockpit fire (2D4 rounds to extinguish; half attacks and piloting, no combat bonuses).',
  },
}

for (const device of catalog.devices) {
  device.statistics = extractStatistics(device.description)
  const forcedDamage = damageOverrides[device.id] ?? (damageFallbacks[device.id] ? { label: 'Damage', value: damageFallbacks[device.id] } : null)
  if (forcedDamage && (damageOverrides[device.id] || ['mega-blades-splugorth-tw-item', 'water-dagger-tww-1050-by-jason-richards'].includes(device.id))) {
    device.statistics = device.statistics.filter(statistic => statistic.label !== 'Damage')
    device.statistics.unshift(forcedDamage)
  }
  if (weaponCategories.has(device.category) && !device.statistics.some(statistic => statistic.label === 'Damage') && damageFallbacks[device.id]) {
    device.statistics.unshift({ label: 'Damage', value: damageFallbacks[device.id] })
  }
  if (powerOverrides[device.id]) {
    device.statistics = device.statistics.filter(statistic => statistic.label !== 'Powers / Effects')
    device.statistics.push(powerOverrides[device.id])
    device.statistics.sort((left, right) => STATISTIC_ORDER.indexOf(left.label) - STATISTIC_ORDER.indexOf(right.label))
  }
}

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Extracted standardized statistics for ${catalog.devices.filter(device => device.statistics.length).length} of ${catalog.devices.length} devices.`)

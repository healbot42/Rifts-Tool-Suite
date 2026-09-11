import { skillCategories } from './skills.js'

const categoryIds = Object.fromEntries(skillCategories)
const all = (category) => categoryIds[category] || []

export function defineOcc(occ) {
  return {
    description: '',
    defaults: {},
    generationStrategy: 'human-rue',
    attributeRequirements: [],
    attributeBonuses: [],
    attributeBonusSource: null,
    mdc: null,
    combatBonuses: {},
    combatProgression: {},
    saveBonuses: {},
    saveProgression: {},
    situationalBonuses: [],
    creationNotes: [],
    resourceNotes: [],
    equipmentNotes: [],
    automaticSkills: [],
    choices: [],
    specializations: [],
    abilities: [],
    source: null,
    relatedAtLevel: () => 0,
    secondaryAtLevel: () => 0,
    relatedSkillInfo: () => ({ eligible: false, bonus: 0, category: '' }),
    ...occ,
    languages: {
      nativeBase: 88,
      nativeBonus: 0,
      otherBonus: 0,
      otherCount: 1,
      literacyOtherCount: 0,
      literacyOtherBonus: 0,
      ...(occ.languages || {}),
    },
  }
}

const ancientWps = () =>
  all('Weapon Proficiencies').filter(
    (id) =>
      ![
        'wp-handguns',
        'wp-rifles',
        'wp-shotgun',
        'wp-submachine-gun',
        'wp-heavy-military-weapons',
        'wp-military-flamethrowers',
        'wp-harpoon-spear-gun',
        'wp-energy-pistol',
        'wp-energy-rifle',
        'wp-heavy-m-d-weapons',
      ].includes(id),
  )
const modernWps = () =>
  all('Weapon Proficiencies').filter((id) => !ancientWps().includes(id))
const choice = (id, label, count, bonus, options, description) => ({
  id,
  label,
  count,
  bonus,
  options,
  description,
})
const mos = (
  id,
  name,
  automaticSkills,
  choices = [],
  selections = [],
  details = {},
) => ({
  id,
  name,
  automaticSkills,
  choices,
  selections,
  requirements: [],
  notes: [],
  ...details,
})

export const combatCyborg = defineOcc({
  id: 'combat-cyborg',
  name: 'Combat Cyborg O.C.C.',
  description:
    'A full-conversion cyborg built as a Mega-Damage combatant with Robot Strength, heavy armor, integrated systems, and military training.',
  defaults: { ps: 24, pp: 18, spd: 132, strengthType: 'robot', isp: 0 },
  saveBonuses: { possession: 5, magic: 3 },
  creationNotes: [
    'Starts at Robot P.S. 24, P.P. 18, and Speed 132. Purchased upgrades may raise these to the class limits.',
  ],
  resourceNotes: [
    'Full conversion eliminates psionic powers and I.S.P.; only 10% of any former P.P.E. remains.',
  ],
  equipmentNotes: [
    'MI-B2 Medium Infantry Armor provides 230 M.D.C. and imposes -15% on applicable Physical skills.',
  ],
  situationalBonuses: [
    'Simulated touch is 35-55%.',
    'Prowl suffers -20%.',
    'Art, Forgery, Locksmith, Palming, Pick Locks, Play Musical Instrument, and similar fine-hand skills suffer -40%.',
  ],
  languages: { nativeBase: 88, nativeBonus: 8, otherBonus: 20 },
  mdc: { mainBody: 180, armor: 230, total: 410 },
  automaticSkills: [
    ['general-repair-maintenance', 15],
    ['land-navigation', 15],
    ['pilot-military-tanks-apcs', 5],
    ['radio-basic', 10],
    ['sensory-equipment', 10],
    ['weapon-systems', 5],
    ['climbing', 5],
    ['wp-energy-rifle', 0],
    ['physical-2', 0],
  ],
  choices: [
    {
      id: 'basicTrade',
      label: 'Basic technical skill',
      count: 1,
      bonus: 10,
      options: ['basic-electronics', 'basic-mechanics'],
      description:
        'Choose Basic Electronics or Basic Mechanics as an automatic O.C.C. skill at +10%.',
    },
    {
      id: 'pilot',
      label: 'Pilot skill',
      count: 1,
      bonus: 10,
      options: all('Pilot').filter(
        (id) =>
          ![
            'robot-combat-basic',
            'robot-combat-elite',
            'pilot-robots-power-armor',
          ].includes(id),
      ),
      description:
        'Choose one Pilot skill at +10%; Robot and Power Armor skills are excluded.',
    },
    {
      id: 'ancientWp',
      label: 'Ancient W.P.',
      count: 1,
      bonus: 0,
      options: all('Weapon Proficiencies').filter(
        (id) =>
          ![
            'wp-energy-pistol',
            'wp-energy-rifle',
            'wp-handguns',
            'wp-rifles',
            'wp-shotgun',
            'wp-submachine-gun',
            'wp-heavy-military-weapons',
            'wp-military-flamethrowers',
            'wp-harpoon-spear-gun',
            'wp-heavy-m-d-weapons',
          ].includes(id),
      ),
      description: 'Choose one ancient Weapon Proficiency.',
    },
    {
      id: 'modernWp',
      label: 'Modern W.P.',
      count: 2,
      bonus: 0,
      options: all('Weapon Proficiencies').filter((id) =>
        [
          'wp-handguns',
          'wp-rifles',
          'wp-shotgun',
          'wp-submachine-gun',
          'wp-heavy-military-weapons',
          'wp-military-flamethrowers',
          'wp-harpoon-spear-gun',
          'wp-energy-pistol',
          'wp-heavy-m-d-weapons',
        ].includes(id),
      ),
      description:
        'Choose two modern Weapon Proficiencies; Heavy M.D. Weapons may be selected.',
    },
  ],
  relatedAtLevel(level) {
    return 5 + [3, 7, 10, 13].filter((value) => level >= value).length
  },
  secondaryAtLevel(level) {
    return 4 + [4, 8, 12].filter((value) => level >= value).length
  },
  abilities: [
    'Full-conversion cyborg: an M.D.C. being with Robot P.S. and no normal physical S.D.C. or Hit Point damage from ordinary attacks.',
    'Impervious to psionic Bio-Manipulation, Telemechanics, See Aura, and attacks that inflict damage directly to Hit Points.',
    'Full conversion prevents the use of magic and Techno-Wizard devices.',
  ],
})

export const crazy = defineOcc({
  id: 'crazy',
  name: 'Crazies O.C.C.',
  description:
    'A flamboyant M.O.M.-augmented warrior with superhuman endurance, reflexes, senses, healing, minor psionics, and progressive mental instability.',
  defaults: {
    strengthType: 'augmented',
    isp: 0,
  },
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '55' },
  attributeBonuses: [
    {
      id: 'crazy-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 3, sides: 6, multiplier: 10 },
      label: 'Super Endurance S.D.C.',
    },
    {
      id: 'crazy-hp',
      target: 'hpBonus',
      operation: 'add',
      dice: { count: 5, sides: 6 },
      label: 'Super Endurance Hit Points',
    },
    {
      id: 'crazy-pe',
      target: 'pe',
      operation: 'add',
      dice: { count: 1, sides: 6 },
      label: 'Super Endurance',
    },
    {
      id: 'crazy-ps',
      target: 'ps',
      operation: 'add',
      dice: { count: 2, sides: 4 },
      label: 'Increased Strength',
    },
    {
      id: 'crazy-ps-minimum',
      target: 'ps',
      operation: 'minimum',
      value: 19,
      label: 'Minimum Augmented P.S.',
    },
    {
      id: 'crazy-spd',
      target: 'spd',
      operation: 'add',
      dice: { count: 4, sides: 6 },
      label: 'Increased Speed',
    },
    {
      id: 'crazy-pp',
      target: 'pp',
      operation: 'add',
      dice: { count: 1, sides: 6 },
      label: 'Heightened Reflexes',
    },
    {
      id: 'crazy-pp-minimum',
      target: 'pp',
      operation: 'minimum',
      value: 17,
      label: 'Minimum P.P.',
    },
  ],
  languages: { nativeBase: 95, nativeBonus: 0, otherBonus: 15 },
  combatBonuses: {
    initiative: 2,
    roll: 4,
    attacks: 1,
    perception: 3,
    coma: 15,
  },
  combatProgression: {
    automaticDodge: [1, 3, 6, 9, 12, 15],
    roll: [2, 5, 10, 15],
  },
  saveBonuses: {
    psionics: 2,
    possession: 2,
    mindControl: 6,
    toxins: 4,
  },
  situationalBonuses: [
    'Enhanced Senses: exceptional sight and hearing.',
    'Scent recognition and tracking from enhanced smell.',
    '+10% to skills requiring a delicate touch.',
  ],
  automaticSkills: [
    ['climbing', 20],
    ['dance', 15],
    ['detect-ambush', 10],
    ['detect-concealment', 15],
    ['electronic-countermeasures', 10],
    ['escape-artist', 10],
    ['gymnastics', 20],
    ['land-navigation', 10],
    ['prowl', 20],
    ['radio-basic', 10],
    ['streetwise', 10],
    ['tailing', 15],
    ['swimming', 20],
    ['wp-energy-rifle', 0],
  ],
  choices: [
    {
      id: 'handToHand',
      label: 'Hand to Hand',
      count: 1,
      bonus: 0,
      options: ['physical-3', 'physical-4'],
      description:
        'Choose Martial Arts, or Assassin for an evil alignment. Commando may instead be purchased with two O.C.C. Related Skill selections.',
    },
    {
      id: 'ancientWp',
      label: 'Ancient W.P.',
      count: 2,
      bonus: 0,
      options: all('Weapon Proficiencies').filter(
        (id) =>
          ![
            'wp-handguns',
            'wp-rifles',
            'wp-shotgun',
            'wp-submachine-gun',
            'wp-heavy-military-weapons',
            'wp-military-flamethrowers',
            'wp-harpoon-spear-gun',
            'wp-energy-pistol',
            'wp-energy-rifle',
            'wp-heavy-m-d-weapons',
          ].includes(id),
      ),
      description: 'Choose two ancient Weapon Proficiencies.',
    },
    {
      id: 'modernWp',
      label: 'Modern W.P.',
      count: 2,
      bonus: 0,
      options: [
        'wp-handguns',
        'wp-rifles',
        'wp-shotgun',
        'wp-submachine-gun',
        'wp-heavy-military-weapons',
        'wp-military-flamethrowers',
        'wp-harpoon-spear-gun',
        'wp-energy-pistol',
        'wp-heavy-m-d-weapons',
      ],
      description: 'Choose two modern Weapon Proficiencies.',
    },
  ],
  relatedAtLevel(level) {
    return 7 + 2 * [3, 6, 9, 12].filter((value) => level >= value).length
  },
  secondaryAtLevel(level) {
    return 6 + [2, 4, 8, 12].filter((value) => level >= value).length
  },
  abilities: [
    'Super Endurance: carry and lift twice normal, endure ten times longer, remain fully alert for 72 hours, and need only four hours of sleep.',
    'Increased Speed: running leap 20 feet across and 15 feet high, or half from a dead stop.',
    'Heightened Reflexes: +20% to maintain balance.',
    'Enhanced Healing: heals twice normal and ignores pain penalties until reduced to 10 Hit Points or fewer.',
    'Crazies Bio-Regeneration: a helpless 2D4-minute trance restores 2D6 Hit Points and 3D6 S.D.C.; six hours restores all S.D.C. plus 4D6 Hit Points.',
    'Insanity progression: Phobia at level 2; Affective Disorder at 3; Crazy Insanity at 4; Obsession at 6; Phobia at 8; Neurosis at 10; Psychosis at 12; Random Insanity at 14.',
  ],
})

export const cyberKnight = defineOcc({
  id: 'cyber-knight',
  name: 'Cyber-Knight O.C.C.',
  description:
    'A chivalric psychic warrior trained to defend life and justice with discipline, a Psi-Sword, cyber-armor, and special awareness of technology.',
  languages: {
    nativeBase: 96,
    nativeBonus: 0,
    otherBonus: 30,
    otherCount: 2,
  },
  creationNotes: [
    'Dragones/Elf is also known at 96%.',
    'O.C.C. Related selections must include at least two Physical skills and three W.P.s.',
  ],
  attributeRequirements: [
    { attribute: 'me', minimum: 11 },
    { attribute: 'pe', minimum: 11 },
    { attribute: 'iq', minimum: 10, recommended: true },
    { attribute: 'ps', minimum: 10, recommended: true },
  ],
  automaticSkills: [
    ['literacy-native', 20],
    ['anthropology', 15],
    ['physical-3', 0],
    ['physical-9', 0],
    ['climbing', 10],
    ['gymnastics', 5],
    ['horsemanship-cyber-knight', 0],
    ['land-navigation', 12],
    ['lore-demons-monsters', 20],
    ['paramedic', 10],
    ['swimming', 10],
  ],
  choices: [
    choice(
      'ancientWp',
      'Ancient W.P.',
      2,
      0,
      ancientWps(),
      'Choose two ancient Weapon Proficiencies.',
    ),
    choice(
      'modernWp',
      'Modern W.P.',
      2,
      0,
      modernWps(),
      'Choose two modern Weapon Proficiencies.',
    ),
  ],
  relatedAtLevel(level) {
    return (
      12 +
      2 * [3, 6, 9].filter((v) => level >= v).length +
      3 * (level >= 5) +
      (level >= 12)
    )
  },
  secondaryAtLevel(level) {
    return 6 + 2 * [5, 10, 15].filter((v) => level >= v).length
  },
  abilities: [
    'Cyber-armor, a Psi-Sword, psionics, combat training, and Zen Combat abilities improve with level; consult the class pages for the complete progression.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '61-66' },
})

export const glitterBoy = defineOcc({
  id: 'glitter-boy',
  name: 'Glitter Boy O.C.C.',
  description:
    'The hereditary or newly trained pilot of the legendary laser-resistant Glitter Boy power armor and its Boom Gun.',
  languages: {
    nativeBase: 95,
    nativeBonus: 0,
    otherBonus: 20,
    otherCount: 2,
  },
  creationNotes: [
    'A pilot descended from generations of Glitter Boy pilots receives the listed hereditary combat, Horror Factor, S.D.C., and armor-attack bonuses.',
  ],
  equipmentNotes: [
    'The USA-G10 Glitter Boy suit has 770 main-body M.D.C., and lasers inflict half damage to it.',
  ],
  attributeRequirements: [{ attribute: 'pp', minimum: 10 }],
  automaticSkills: [
    ['basic-electronics', 10],
    ['basic-mechanics', 15],
    ['general-repair-maintenance', 10],
    ['land-navigation', 6],
    ['pilot-robots-power-armor', 0],
    ['robot-combat-elite', 0],
    ['robot-combat-basic', 0],
    ['radio-basic', 10],
    ['sensory-equipment', 10],
    ['weapon-systems', 10],
    ['wp-energy-pistol', 0],
    ['wp-energy-rifle', 0],
    ['wp-heavy-m-d-weapons', 0],
    ['physical-1', 0],
  ],
  choices: [
    choice(
      'pilot',
      'Pilot skill',
      1,
      0,
      all('Pilot').filter(
        (id) => !['robot-combat-basic', 'robot-combat-elite'].includes(id),
      ),
      'Choose one Pilot skill.',
    ),
  ],
  relatedAtLevel(level) {
    return 7 + 2 * (level >= 3) + [6, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 6 + 2 * [4, 8, 12].filter((v) => level >= v).length
  },
  abilities: [],
  source: { book: 'Rifts Ultimate Edition', pages: '67-73' },
})

export const headhunter = defineOcc({
  id: 'headhunter',
  name: 'Headhunter Techno-Warrior O.C.C.',
  description:
    'A heavily armed partial-conversion techno-warrior, tracker, and mercenary augmented with cybernetics and bionics.',
  languages: { nativeBase: 94, nativeBonus: 0, otherBonus: 20 },
  attributeRequirements: [
    { attribute: 'pe', minimum: 12 },
    { attribute: 'pp', minimum: 12 },
  ],
  attributeBonuses: [
    {
      id: 'headhunter-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 3, sides: 6 },
      label: 'Headhunter O.C.C. S.D.C. bonus',
    },
    {
      id: 'headhunter-ps',
      target: 'ps',
      operation: 'add',
      dice: { count: 1, sides: 4 },
      label: 'Headhunter O.C.C. bonus',
    },
    {
      id: 'headhunter-pe',
      target: 'pe',
      operation: 'add',
      dice: { count: 1, sides: 4 },
      label: 'Headhunter O.C.C. bonus',
    },
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '76' },
  combatBonuses: { initiative: 1, roll: 3, perception: 2, coma: 10 },
  combatProgression: { initiative: [4, 9, 13] },
  saveBonuses: { possession: 2, magic: 1 },
  saveProgression: { horrorFactor: [2, 4, 6, 9, 12, 15] },
  creationNotes: [
    'Choose either three other languages at +20%, or one language at +20% and two Lore skills at +10%.',
  ],
  resourceNotes: [
    "The partial-conversion package halves I.S.P. and leaves 10% of the character's P.P.E.",
  ],
  automaticSkills: [
    ['literacy-other', 10],
    ['computer-operation', 10],
    ['detect-ambush', 10],
    ['detect-concealment', 15],
    ['electronic-countermeasures', 10],
    ['land-navigation', 10],
    ['lore-demons-monsters', 10],
    ['pilot-military-tanks-apcs', 10],
    ['radio-basic', 15],
    ['sensory-equipment', 10],
    ['recognize-weapon-quality', 15],
    ['tracking-people', 10],
    ['weapon-systems', 10],
    ['wilderness-survival', 10],
    ['physical-2', 0],
  ],
  choices: [
    choice(
      'pilotJet',
      'Jet pack or hovercycle',
      1,
      10,
      ['pilot-jet-packs', 'pilot-hovercycles'],
      'Choose Jet Pack (+12% in the book; adjust manually) or Hovercycle (+10%).',
    ),
    choice(
      'pilot',
      'Pilot skills',
      2,
      10,
      all('Pilot').filter(
        (id) => !['robot-combat-basic', 'robot-combat-elite'].includes(id),
      ),
      'Choose two Pilot skills.',
    ),
    choice(
      'weapons',
      'Weapon Proficiencies',
      5,
      0,
      all('Weapon Proficiencies'),
      'Choose five W.P.s; at least three must be modern energy weapons.',
    ),
  ],
  relatedAtLevel(level) {
    return 4 + [3, 6, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 6 + 2 * [3, 6, 9, 12].filter((v) => level >= v).length
  },
  abilities: [],
  source: { book: 'Rifts Ultimate Edition', pages: '74-77' },
})

export const juicer = defineOcc({
  id: 'juicer',
  name: 'Juicer O.C.C.',
  description:
    'A chemically augmented super-warrior with extraordinary speed, reflexes, endurance, healing, and a drastically shortened lifespan.',
  languages: {
    nativeBase: 92,
    nativeBonus: 0,
    otherBonus: 10,
    otherCount: 2,
  },
  situationalBonuses: [
    'Juicer augmentation supplies the class combat bonuses and automatic dodge described on pages 78-79.',
  ],
  attributeBonuses: [
    {
      id: 'juicer-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 1, sides: 4, multiplier: 100 },
      label: 'Super-Endurance S.D.C.',
    },
    {
      id: 'juicer-hp',
      target: 'hpBonus',
      operation: 'add',
      dice: { count: 1, sides: 4, multiplier: 10 },
      label: 'Super-Endurance Hit Points',
    },
    {
      id: 'juicer-pe',
      target: 'pe',
      operation: 'add',
      dice: { count: 2, sides: 6 },
      label: 'Super-Endurance',
    },
    {
      id: 'juicer-ps',
      target: 'ps',
      operation: 'add',
      dice: { count: 2, sides: 6 },
      label: 'Super-Strength',
    },
    {
      id: 'juicer-ps-minimum',
      target: 'ps',
      operation: 'minimum',
      value: 22,
      label: 'Minimum Augmented P.S.',
    },
    {
      id: 'juicer-spd',
      target: 'spd',
      operation: 'add',
      dice: { count: 2, sides: 4, multiplier: 10 },
      label: 'Super-Speed',
    },
    {
      id: 'juicer-pp',
      target: 'pp',
      operation: 'add',
      dice: { count: 2, sides: 4 },
      label: 'Super-Reflexes and Reaction Time',
    },
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '78' },
  automaticSkills: [
    ['physical-6', 15],
    ['climbing', 20],
    ['land-navigation', 5],
    ['radio-basic', 10],
    ['recognize-weapon-quality', 10],
    ['running', 0],
    ['swimming', 10],
    ['wp-knife', 0],
    ['wp-energy-pistol', 0],
    ['wilderness-survival', 5],
    ['wp-energy-rifle', 0],
    ['physical-2', 0],
  ],
  choices: [
    choice(
      'pilot',
      'Pilot skills',
      2,
      10,
      all('Pilot').filter(
        (id) => !['robot-combat-basic', 'robot-combat-elite'].includes(id),
      ),
      'Choose two Pilot skills.',
    ),
    choice(
      'weapons',
      'Weapon Proficiencies',
      2,
      0,
      all('Weapon Proficiencies'),
      'Choose two W.P.s.',
    ),
  ],
  relatedAtLevel(level) {
    return 8 + [2, 5, 7, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 2 * [1, 3, 6, 8, 10, 12].filter((v) => level >= v).length
  },
  abilities: [
    'Juicer augmentation supplies the enhanced healing and endurance described on pages 78-79.',
    'A Juicer dies after five years plus 4D6 months unless detoxified. Detoxification and its permanent penalties use the table on pages 79-80.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '78-80' },
})

export const mercSoldier = defineOcc({
  id: 'merc-soldier',
  name: 'Merc Soldier/Hired Gun O.C.C.',
  description:
    'A professional soldier whose core training is supplemented by one military occupational specialty (MOS).',
  languages: { nativeBase: 95, nativeBonus: 0, otherBonus: 10 },
  automaticSkills: [
    ['climbing', 10],
    ['physical-8', 0],
    ['mathematics-basic', 5],
    ['military-etiquette', 10],
    ['radio-basic', 10],
    ['recognize-weapon-quality', 10],
    ['running', 0],
    ['sign-language', 5],
    ['wp-knife', 0],
    ['wp-energy-pistol', 0],
    ['wp-energy-rifle', 0],
    ['physical-1', 0],
  ],
  specializations: [
    mos(
      'communications-expert',
      'Communications Expert',
      [
        ['literacy-native', 10],
        ['computer-operation', 15],
        ['basic-electronics', 10],
        ['electronic-countermeasures', 15],
        ['radio-basic', 20],
        ['sensory-equipment', 20],
      ],
      [
        choice(
          'opticOrSurveillance',
          'Optics specialty',
          1,
          14,
          ['optic-systems', 'surveillance'],
          'Choose Optic Systems or Surveillance Systems at +14%.',
        ),
        choice(
          'cryptoOrLanguage',
          'Cryptography or language',
          1,
          15,
          ['cryptography', 'language-other'],
          'Choose Cryptography or one additional Language skill at +15%.',
        ),
        choice(
          'videoOrProgramming',
          'Video specialty',
          1,
          10,
          ['tv-video', 'computer-programming'],
          'Choose TV/Video or Computer Programming at +10%.',
        ),
      ],
      [
        {
          id: 'additionalLanguage',
          label: 'Additional language',
          count: 1,
          placeholder: 'Language',
          whenChoice: { id: 'cryptoOrLanguage', value: 'language-other' },
        },
      ],
    ),
    mos(
      'eod-demolitions',
      'EOD/Demolitions Expert',
      [
        ['basic-electronics', 20],
        ['basic-mechanics', 15],
        ['demolitions', 15],
        ['demolitions-disposal', 20],
        ['demolitions-underwater', 10],
        ['trap-mine-detection', 10],
        ['wp-heavy-m-d-weapons', 0],
      ],
      [],
      [],
      { requirements: ['I.Q. 10 or higher', 'P.P. 12 or higher'] },
    ),
    mos(
      'soldier-grunt',
      'Soldier/Grunt',
      [
        ['forced-march', 0],
        ['land-navigation', 5],
      ],
      [
        choice(
          'physical',
          'Physical skill',
          1,
          0,
          all('Physical'),
          'Choose one Physical skill.',
        ),
        choice(
          'pilot',
          'Pilot skill',
          1,
          10,
          all('Pilot').filter(
            (id) =>
              ![
                'pilot-robots-power-armor',
                'robot-combat-basic',
                'robot-combat-elite',
                'pilot-boat-ships',
                'pilot-military-warships',
              ].includes(id),
          ),
          'Choose one Pilot skill at +10%; power armor, robots, and ships are excluded.',
        ),
        choice(
          'ancientWp',
          'Ancient W.P.',
          1,
          0,
          ancientWps(),
          'Choose one ancient W.P.',
        ),
        choice(
          'modernWp',
          'Modern W.P.',
          1,
          0,
          modernWps(),
          'Choose one modern W.P.',
        ),
      ],
    ),
    mos(
      'point-man-scout',
      'Point Man/Scout',
      [
        ['detect-ambush', 15],
        ['detect-concealment', 10],
        ['intelligence', 15],
        ['land-navigation', 14],
        ['prowl', 10],
        ['wilderness-survival', 10],
      ],
      [
        choice(
          'surveillanceOrTailing',
          'Surveillance specialty',
          1,
          15,
          ['surveillance', 'tailing'],
          'Choose Surveillance or Tailing at +15%.',
        ),
      ],
      [],
      { requirements: ['I.Q. 9 or higher'] },
    ),
    mos(
      'pigman-heavy-weapons',
      'Pigman/Heavy Weapons',
      [
        ['recognize-weapon-quality', 20],
        ['weapon-systems', 10],
        ['wp-rifles', 0],
        ['wp-heavy-military-weapons', 0],
        ['wp-heavy-m-d-weapons', 0],
      ],
      [
        {
          ...choice(
            'weaponsOrDemolitions',
            'Additional weapon or demolitions skills',
            2,
            0,
            [
              ...all('Weapon Proficiencies'),
              'demolitions',
              'demolitions-disposal',
              'demolitions-underwater',
            ],
            'Choose two W.P.s, or two Demolitions skills at +5%.',
          ),
          bonusByOption: {
            demolitions: 5,
            'demolitions-disposal': 5,
            'demolitions-underwater': 5,
          },
        },
      ],
      [],
      { requirements: ['P.S. 14 or higher', 'P.E. 12 or higher'] },
    ),
    mos(
      'transportation-specialist',
      'Transportation Specialist',
      [
        ['navigation', 10],
        ['pilot-military-tanks-apcs', 10],
        ['pilot-truck', 10],
      ],
      [
        {
          ...choice(
            'mechanicsOrDriving',
            'Mechanical specialty',
            1,
            10,
            ['basic-mechanics', 'combat-driving'],
            'Choose Basic Mechanics (+10%) or Combat Driving (+5%).',
          ),
          bonusByOption: { 'combat-driving': 5 },
        },
        choice(
          'roadVehicle',
          'Road vehicle',
          1,
          20,
          ['pilot-automobile', 'pilot-motorcycles-snowmobiles'],
          'Choose Automobile or Motorcycle at +20%.',
        ),
        choice(
          'hoverVehicle',
          'Hover vehicle',
          1,
          15,
          ['pilot-hover-craft', 'pilot-hovercycles'],
          'Choose ground Hover Craft or Hovercycle at +15%.',
        ),
        choice(
          'pilot',
          'Additional Pilot skill',
          1,
          10,
          all('Pilot').filter(
            (id) =>
              ![
                'pilot-robots-power-armor',
                'robot-combat-basic',
                'robot-combat-elite',
              ].includes(id),
          ),
          'Choose one Pilot skill at +10%; robots and power armor are excluded.',
        ),
      ],
    ),
    mos(
      'medic',
      'Medic',
      [
        ['brewing', 5],
        ['biology', 15],
        ['field-surgery', 15],
        ['medical-doctor', 5],
        ['sewing', 10],
      ],
      [
        choice(
          'pathologyOrChemistry',
          'Medical science',
          1,
          10,
          ['pathology', 'chemistry'],
          'Choose Pathology or Chemistry at +10%.',
        ),
      ],
      [],
      { requirements: ['I.Q. 11 or higher', 'P.P. 11 or higher'] },
    ),
  ],
  relatedAtLevel(level) {
    return 4 + [3, 5, 7, 10, 13].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 2 * [1, 4, 8, 12].filter((v) => level >= v).length
  },
  creationNotes: [
    'Select one MOS; its skills and required choices are applied automatically.',
    'Hand to Hand: Basic may be upgraded to Expert for one Related selection, or Martial Arts/Assassin for two.',
  ],
  abilities: [],
  source: { book: 'Rifts Ultimate Edition', pages: '81-83' },
})

export const robotPilot = defineOcc({
  id: 'robot-pilot',
  name: 'Robot Pilot O.C.C.',
  attributeRequirements: [
    { attribute: 'ps', minimum: 10 },
    { attribute: 'pp', minimum: 12 },
    { attribute: 'pe', minimum: 12 },
  ],
  description:
    'A heavy-combat specialist trained to operate either power armor or giant robots through a dedicated MOS.',
  languages: { nativeBase: 94, nativeBonus: 0, otherBonus: 20 },
  automaticSkills: [
    ['mathematics-basic', 20],
    ['physical-9', 0],
    ['climbing', 5],
    ['computer-operation', 10],
    ['military-etiquette', 15],
    ['combat-driving', 15],
    ['radio-basic', 10],
    ['running', 0],
    ['sensory-equipment', 15],
    ['wp-energy-rifle', 0],
    ['physical-2', 0],
  ],
  specializations: [
    mos(
      'power-armor-pilot',
      'Power Armor Pilot',
      [
        ['mathematics-advanced', 15],
        ['navigation', 15],
        ['pilot-robots-power-armor', 20],
        ['robot-combat-basic', 0],
        ['robot-combat-elite', 0],
      ],
      [
        choice(
          'mechanicsOrAcrobatics',
          'Technical or physical skill',
          1,
          15,
          ['basic-mechanics', 'physical-6'],
          'Choose Basic Mechanics at +15% or Acrobatics.',
        ),
        choice(
          'airCombatPilot',
          'Air combat Pilot skill',
          1,
          15,
          ['pilot-military-jet-fighters', 'pilot-combat-helicopter'],
          'Choose Jet Fighter or Combat Helicopter at +15%.',
        ),
        choice(
          'pilot',
          'Additional Pilot skill',
          1,
          12,
          all('Pilot').filter(
            (id) => !['robot-combat-basic', 'robot-combat-elite'].includes(id),
          ),
          'Choose one Pilot skill at +12%.',
        ),
      ],
      [
        {
          id: 'eliteTypes',
          label: 'Starting elite power armor types',
          count: 2,
          placeholder: 'Power armor type',
        },
        {
          id: 'startingMachine',
          label: 'Second starting power armor',
          count: 1,
          placeholder: 'Open-market model',
        },
      ],
      {
        notes: [
          'Robot Combat: Elite adds one more power armor type at levels 3, 6, 9, and 12.',
        ],
      },
    ),
    mos(
      'robot-pilot',
      'Robot Pilot',
      [
        ['land-navigation', 12],
        ['pilot-robots-power-armor', 10],
        ['robot-combat-basic', 0],
        ['robot-combat-elite', 0],
        ['pilot-military-tanks-apcs', 0],
        ['pilot-tracked-construction', 20],
        ['weapon-systems', 15],
        ['wp-heavy-m-d-weapons', 0],
      ],
      [],
      [
        {
          id: 'eliteTypes',
          label: 'Starting elite giant robot types',
          count: 2,
          placeholder: 'Giant robot type',
        },
        {
          id: 'startingMachine',
          label: 'Starting giant robot',
          count: 1,
          placeholder: 'Open-market model',
        },
      ],
      {
        notes: [
          'Robot Combat: Elite adds one more giant robot type at levels 3, 6, 9, and 12.',
        ],
      },
    ),
  ],
  choices: [
    choice(
      'pilot',
      'Pilot skill',
      1,
      15,
      all('Pilot').filter(
        (id) => !['robot-combat-basic', 'robot-combat-elite'].includes(id),
      ),
      'Choose one Pilot skill.',
    ),
    choice(
      'ancientWp',
      'Ancient W.P.',
      1,
      0,
      ancientWps(),
      'Choose one ancient W.P.',
    ),
    choice(
      'modernWp',
      'Modern W.P.',
      1,
      0,
      modernWps(),
      'Choose one modern W.P.',
    ),
  ],
  relatedAtLevel(level) {
    return 5 + [2, 4, 6, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 2 * [1, 4, 8, 12].filter((v) => level >= v).length
  },
  creationNotes: [
    'Select either the Power Armor Pilot MOS or Robot Pilot MOS; its skills and machine selections are applied automatically.',
  ],
  abilities: [],
  source: { book: 'Rifts Ultimate Edition', pages: '83-85' },
})

export const bodyFixer = defineOcc({
  id: 'body-fixer',
  name: 'Body Fixer O.C.C.',
  description:
    'A courageous, often itinerant medical doctor who treats humans and D-Bees alike despite Coalition persecution.',
  languages: { nativeBase: 96, nativeBonus: 0, otherBonus: 20, otherCount: 2 },
  attributeRequirements: [{ attribute: 'iq', minimum: 10 }],
  attributeBonuses: [
    {
      id: 'body-fixer-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 1, sides: 6 },
      modifier: 4,
      label: 'Body Fixer O.C.C. bonus',
    },
    ...['ma', 'ps', 'pp', 'pe'].map((target) => ({
      id: `body-fixer-${target}`,
      target,
      operation: 'add',
      value: 1,
      label: 'Body Fixer O.C.C. bonus',
    })),
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '87' },
  combatBonuses: { dodge: 1, disarm: 1, perception: 2 },
  saveBonuses: {
    poison: 2,
    drugs: 2,
    disease: 3,
    insanity: 3,
    horrorFactor: 2,
  },
  creationNotes: [
    'A high P.P. and M.A. are suggested, but the source gives no numeric recommendation.',
    'The eleven first-level O.C.C. Related selections must include three Medical skills; the remaining eight may include additional Medical skills.',
  ],
  situationalBonuses: [
    'Disease Diagnostic Specialist adds +20% to Medical Doctor and +10% to Brewing and Holistic Medicine for diagnosis and cures.',
    'Perception is +4 instead of +2 for medical conditions, procedures, drugs, chemicals, and poison.',
    'Sensory Equipment receives +20% for medical use and +5% otherwise.',
    'W.P. Knife receives +1 to strike.',
  ],
  automaticSkills: [
    ['literacy-native', 30],
    ['mathematics-basic', 15],
    ['biology', 30],
    ['brewing-medicinal', 20],
    ['chemistry', 20],
    ['lore-d-bee', 25],
    ['medical-doctor', 20],
    ['outdoorsmanship', 0],
    ['pathology', 30],
    ['sensory-equipment', 20],
    ['wp-knife', 0],
    ['xenology', 20],
  ],
  choices: [
    choice(
      'athleticsOrBodyBuilding',
      'Physical training',
      1,
      0,
      ['physical-8', 'physical-9'],
      'Choose Athletics (General) or Body Building & Weightlifting.',
    ),
    choice(
      'pilot',
      'Pilot skill',
      1,
      10,
      all('Pilot').filter((id) => !id.startsWith('robot-combat-')),
      'Choose one Pilot skill.',
    ),
  ],
  relatedAtLevel(level) {
    return 11 + 2 * [3, 6, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 6 + [3, 6, 9, 12, 15].filter((v) => level >= v).length
  },
  abilities: [
    'Familiarity with known D-Bees removes the usual medical penalty; extremely alien physiology is only -20%. Bionic and alien augmentation work retains the listed penalties.',
    'Disease Diagnostic Specialist can halve symptoms and duration after a successful diagnosis.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '86-88' },
})

export const cityRat = defineOcc({
  id: 'city-rat',
  name: 'City Rat O.C.C.',
  description:
    'A young urban survivor, hacker, petty rogue, and streetwise denizen of the cities and Burbs.',
  languages: { nativeBase: 92, nativeBonus: 0, otherBonus: 10, otherCount: 1 },
  attributeRequirements: [],
  attributeBonuses: [
    {
      id: 'city-rat-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 2, sides: 4 },
      label: 'City Rat O.C.C. bonus',
    },
    {
      id: 'city-rat-spd',
      target: 'spd',
      operation: 'add',
      dice: { count: 1, sides: 6 },
      modifier: 1,
      label: 'City Rat O.C.C. bonus',
    },
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '88' },
  combatBonuses: { perception: 3 },
  creationNotes: [
    'No universal attribute minimum applies. Hacker archetypes require I.Q. 10; thieves P.P. 10; assassins I.Q. 10 and P.P. 14; hero or thug muscle archetypes P.S. 14.',
    'At least three first-level O.C.C. Related selections must come from Physical or Rogue skills.',
    'Hand to Hand: Basic is automatic; Expert costs one Related selection, Martial Arts or evil-alignment Assassin costs two.',
  ],
  resourceNotes: [
    'P.P.E. base is 1D10+4 and is halved at age 22; record it during character creation.',
  ],
  equipmentNotes: [
    'Cybernetic implants are optional: choose up to 1D4+2 common Commercial or Black Market implants.',
  ],
  automaticSkills: [
    ['literacy-native', 15],
    ['barter', 15],
    ['computer-operation', 15],
    ['streetwise', 20],
    ['tailing', 20],
    ['pilot-automobile', 10],
    ['pilot-bicycling', 20],
    ['mathematics-basic', 10],
    ['running', 0],
    ['physical-1', 0],
  ],
  choices: [
    {
      ...choice(
        'motorcycleOrHovercycle',
        'Motorcycle or Hovercycle',
        1,
        0,
        ['pilot-motorcycles-snowmobiles', 'pilot-hovercycles'],
        'Choose Pilot: Motorcycle or Hovercycle.',
      ),
      bonusByOption: {
        'pilot-motorcycles-snowmobiles': 15,
        'pilot-hovercycles': 10,
      },
    },
    choice(
      'wp',
      'Weapon Proficiency',
      1,
      0,
      all('Weapon Proficiencies'),
      'Choose one W.P.',
    ),
  ],
  relatedAtLevel(level) {
    return 10 + [2, 4, 6, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 8 + [3, 6, 10, 15].filter((v) => level >= v).length
  },
  abilities: [],
  source: { book: 'Rifts Ultimate Edition', pages: '88-89' },
})

export const cyberDoc = defineOcc({
  id: 'cyber-doc',
  name: 'Cyber-Doc O.C.C.',
  description:
    'An underground surgeon and cybernetics specialist who installs, repairs, and improves bionics.',
  languages: { nativeBase: 96, nativeBonus: 0, otherBonus: 20, otherCount: 1 },
  attributeRequirements: [
    { attribute: 'iq', minimum: 11 },
    { attribute: 'pp', minimum: 12 },
  ],
  attributeBonuses: [
    ...['me'].map((target) => ({
      id: `cyber-doc-${target}`,
      target,
      operation: 'add',
      value: 1,
      label: 'Cyber-Doc O.C.C. bonus',
    })),
    {
      id: 'cyber-doc-pp',
      target: 'pp',
      operation: 'add',
      value: 2,
      label: 'Cyber-Doc O.C.C. bonus',
    },
  ],
  saveBonuses: {
    horrorFactor: 4,
    pain: 2,
    poison: 1,
    drugs: 1,
    disease: 1,
  },
  creationNotes: [
    'A high M.E. is helpful, but the source gives no numeric recommendation.',
    'At least two first-level O.C.C. Related selections must come from Technical skills.',
  ],
  situationalBonuses: [
    'Find Bionics and Cybernetics Contraband adds +20% and grants source-listed professional discounts.',
    'Recognize Quality of Bionics & Cybernetics: 60% +3% per level.',
    'W.P. Knife receives +1 to strike.',
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '90' },
  automaticSkills: [
    ['literacy-native', 40],
    ['mathematics-advanced', 10],
    ['mathematics-basic', 30],
    ['basic-mechanics', 20],
    ['basic-electronics', 15],
    ['biology', 20],
    ['chemistry', 10],
    ['computer-operation', 5],
    ['find-contraband', 10],
    ['medical-doctor', 0],
    ['cybernetic-medicine', 10],
    ['pathology', 10],
    ['wp-knife', 0],
  ],
  choices: [],
  relatedAtLevel(level) {
    return 9 + [2, 4, 6, 8, 10, 12, 14].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 4 + [3, 6, 9, 12, 15].filter((v) => level >= v).length
  },
  abilities: [
    'Can install and remove cybernetics and bionics with the source-listed cumulative penalties; a makeshift operating room is required.',
    'Can repair bionics cheaply, restore M.D.C., and maximize one listed performance trait or add one feature per body area under the class rules.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '89-91' },
})

export const operator = defineOcc({
  id: 'operator',
  name: 'Operator O.C.C.',
  description:
    'A resourceful master mechanic and electrical engineer who repairs, modifies, and improves machines and vehicles.',
  languages: { nativeBase: 92, nativeBonus: 0, otherBonus: 20, otherCount: 1 },
  attributeRequirements: [{ attribute: 'iq', minimum: 9 }],
  attributeBonuses: [
    {
      id: 'operator-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 2, sides: 6 },
      modifier: 6,
      label: 'Operator O.C.C. bonus',
    },
    {
      id: 'operator-iq',
      target: 'iq',
      operation: 'add',
      value: 1,
      label: 'Operator O.C.C. bonus',
    },
    {
      id: 'operator-ps',
      target: 'ps',
      operation: 'add',
      value: 2,
      label: 'Operator O.C.C. bonus',
    },
    {
      id: 'operator-pp',
      target: 'pp',
      operation: 'add',
      value: 1,
      label: 'Operator O.C.C. bonus',
    },
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '92' },
  combatBonuses: { perception: 2 },
  saveBonuses: { fatigue: 2, disease: 2 },
  creationNotes: [
    'A high P.P. and P.S. are handy, but the source gives no numeric recommendation.',
    'At least two first-level O.C.C. Related selections must come from Mechanical skills.',
    'Optional Psi-Operator is a Major psychic package that halves available O.C.C. Related selections; the current flat allowance model does not automate this optional variant.',
  ],
  situationalBonuses: [
    'Find Parts and Components adds +20% for the listed machine and vehicle goods and grants source-listed discounts.',
    'Recognize Machine Quality: 58% +3% per level.',
  ],
  automaticSkills: [
    ['mathematics-basic', 20],
    ['computer-operation', 10],
    ['computer-repair', 10],
    ['electrical-engineer', 20],
    ['find-contraband', 15],
    ['jury-rig', 20],
    ['mechanical-engineer', 20],
    ['radio-basic', 15],
    ['sensory-equipment', 20],
    ['weapons-engineer', 15],
    ['wp-blunt', 0],
    ['physical-1', 0],
  ],
  choices: [
    choice(
      'pilot',
      'Pilot skills',
      3,
      15,
      all('Pilot').filter((id) => !id.startsWith('robot-combat-')),
      'Choose three Pilot skills.',
    ),
    choice(
      'modernWp',
      'Modern W.P.',
      1,
      0,
      modernWps(),
      'Choose one modern W.P.',
    ),
  ],
  relatedAtLevel(level) {
    return 8 + 2 * [3, 6, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 4 + [4, 8, 12, 14].filter((v) => level >= v).length
  },
  abilities: [
    'Jury-rigged repairs take half the usual time and last twice as long.',
    'Can repair machines cheaply, restore or increase vehicle/body-armor M.D.C., maximize performance, and add features under the class rules. These abilities exclude bionics and cybernetics and are -20% for robots/power armor without the required skills.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '91-93' },
})

export const rogueScholar = defineOcc({
  id: 'rogue-scholar',
  name: 'Rogue Scholar O.C.C.',
  description:
    'A charismatic truth-seeker, educator, explorer, and keeper of forbidden history and culture.',
  languages: {
    nativeBase: 98,
    nativeBonus: 0,
    otherBonus: 25,
    otherCount: 2,
    literacyOtherCount: 3,
    literacyOtherBonus: 30,
  },
  attributeRequirements: [
    { attribute: 'iq', minimum: 10 },
    { attribute: 'ma', minimum: 10 },
  ],
  attributeBonuses: [
    {
      id: 'rogue-scholar-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 2, sides: 6 },
      label: 'Rogue Scholar O.C.C. bonus',
    },
    {
      id: 'rogue-scholar-iq',
      target: 'iq',
      operation: 'add',
      value: 1,
      label: 'Rogue Scholar O.C.C. bonus',
    },
    {
      id: 'rogue-scholar-ma',
      target: 'ma',
      operation: 'add',
      value: 2,
      label: 'Rogue Scholar O.C.C. bonus',
    },
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '94' },
  combatBonuses: { perception: 5 },
  creationNotes: [
    'A high M.E. is helpful, but the source gives no numeric recommendation.',
    'At least four first-level O.C.C. Related selections must come from Technical skills.',
  ],
  situationalBonuses: [
    'Find Books and Historical Artifacts adds +20% and grants source-listed professional discounts.',
    'Recognize Authenticity: 58% +3% per level.',
    'Professional Restoration: 58% +3% per level and +10% to Art, Calligraphy, Forgery, and Photography.',
  ],
  automaticSkills: [
    ['literacy-native', 50],
    ['appraise-goods', 20],
    ['mathematics-basic', 25],
    ['computer-operation', 20],
    ['computer-programming', 15],
    ['creative-writing', 15],
    ['find-contraband', 15],
    ['history-pre-rifts', 22],
    ['history-post-apocalypse', 20],
    ['public-speaking', 20],
    ['research', 30],
  ],
  choices: [
    choice(
      'pilot',
      'Automobile or Hover Vehicle',
      1,
      10,
      ['pilot-automobile', 'pilot-hover-craft'],
      'Choose Pilot: Automobile or Hover Vehicle.',
    ),
    choice(
      'ancientWp',
      'Ancient W.P.',
      1,
      0,
      ancientWps(),
      'Choose one ancient W.P.',
    ),
    choice(
      'rangedWp',
      'Ranged W.P.',
      1,
      0,
      [
        'wp-energy-pistol',
        'wp-energy-rifle',
        'wp-handguns',
        'wp-rifles',
        'wp-shotgun',
        'wp-submachine-gun',
      ],
      'Choose Energy Pistol, Energy Rifle, or an S.D.C. firearm W.P.',
    ),
  ],
  relatedAtLevel(level) {
    return 11 + 2 * [3, 6, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 3 + [2, 5, 8, 12, 15].filter((v) => level >= v).length
  },
  abilities: [
    'Storyteller & Teacher can teach a Secondary Skill after 1D6+8 weeks under the source-listed study schedule.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '93-95' },
})

export const rogueScientist = defineOcc({
  id: 'rogue-scientist',
  name: 'Rogue Scientist O.C.C.',
  description:
    'A self-reliant explorer and field scientist driven to investigate ruins, alien life, technology, magic, and the unknown.',
  languages: {
    nativeBase: 96,
    nativeBonus: 0,
    otherBonus: 20,
    otherCount: 3,
    literacyOtherCount: 2,
    literacyOtherBonus: 35,
  },
  attributeRequirements: [{ attribute: 'iq', minimum: 12 }],
  attributeBonuses: [
    {
      id: 'rogue-scientist-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 1, sides: 6 },
      modifier: 6,
      label: 'Rogue Scientist O.C.C. bonus',
    },
    {
      id: 'rogue-scientist-iq',
      target: 'iq',
      operation: 'add',
      value: 2,
      label: 'Rogue Scientist O.C.C. bonus',
    },
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '96' },
  combatBonuses: { perception: 4 },
  saveBonuses: { insanity: 2, disease: 2 },
  creationNotes: [
    'A high M.E. and P.E. are helpful, but the source gives no numeric recommendation.',
    'The fifteen first-level O.C.C. Related selections must include three Science, two Medical, and two Technical skills; the other eight may include more from those categories.',
  ],
  situationalBonuses: [
    'Analyze adds +10% to the listed analytical skills and +1 Perception while focused on analysis.',
    'Hypothesize adds +20% to Jury-Rig and Brewing for a temporary insight and halves penalties for extremely alien physiology or technology.',
    'Find the Exotic adds +20% for scientific equipment, medicine, rare specimens, and related parts; +10% for electrical, mechanical, scholastic, or bionic contraband, with source-listed discounts.',
    'Recognize Scientific Authenticity and Quality: 57% +3% per level; halved for unknown alien items and inapplicable to magic items.',
  ],
  automaticSkills: [
    ['astronomy-navigation', 20],
    ['mathematics-basic', 30],
    ['mathematics-advanced', 30],
    ['basic-electronics', 20],
    ['computer-operation', 20],
    ['find-contraband', 10],
    ['pilot-automobile', 10],
    ['radio-basic', 10],
    ['recycle', 20],
    ['salvage', 20],
  ],
  choices: [
    choice(
      'rangedWp',
      'Energy W.P.',
      1,
      0,
      ['wp-energy-pistol', 'wp-energy-rifle'],
      'Choose W.P. Energy Pistol or Energy Rifle.',
    ),
  ],
  relatedAtLevel(level) {
    return 15 + 2 * [3, 6, 9, 12, 15].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 4 + [2, 4, 7, 10, 13].filter((v) => level >= v).length
  },
  abilities: [],
  source: { book: 'Rifts Ultimate Edition', pages: '95-97' },
})

export const vagabond = defineOcc({
  id: 'vagabond',
  name: 'Vagabond O.C.C.',
  description:
    'A curious, adaptable drifter who learns from the world and survives through wits, luck, and friendliness.',
  languages: { nativeBase: 88, nativeBonus: 0, otherBonus: 15, otherCount: 2 },
  attributeBonuses: [
    {
      id: 'vagabond-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 2, sides: 6 },
      modifier: 10,
      label: 'Vagabond O.C.C. bonus',
    },
    {
      id: 'vagabond-ma',
      target: 'ma',
      operation: 'add',
      dice: { count: 1, sides: 4 },
      label: 'Vagabond O.C.C. bonus',
    },
    {
      id: 'vagabond-ps',
      target: 'ps',
      operation: 'add',
      value: 1,
      label: 'Vagabond O.C.C. bonus',
    },
    {
      id: 'vagabond-pe',
      target: 'pe',
      operation: 'add',
      value: 2,
      label: 'Vagabond O.C.C. bonus',
    },
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '97' },
  combatBonuses: { perception: 4 },
  saveBonuses: { possession: 1, psionics: 1, horrorFactor: 2 },
  creationNotes: [
    'Hand to Hand: Basic is automatic; Expert costs one Related selection, Martial Arts or evil-alignment Assassin costs two.',
  ],
  situationalBonuses: [
    'Eyeball a Fella: 56% +3% per level to size up a person after a few minutes of observation; adds +10% to Barter, Cardsharp, Gambling, I.D. Undercover Agent, conversational Research, and Seduction.',
  ],
  automaticSkills: [
    ['barter', 16],
    ['begging', 10],
    ['cook', 15],
    ['id-undercover-agent', 10],
    ['radio-basic', 5],
    ['streetwise', 10],
    ['physical-1', 0],
  ],
  choices: [
    choice(
      'domestic',
      'Domestic skills',
      2,
      15,
      all('Domestic'),
      'Choose two Domestic skills practiced professionally.',
    ),
    {
      ...choice(
        'pilot',
        'Automobile or Motorcycle',
        1,
        0,
        ['pilot-automobile', 'pilot-motorcycles-snowmobiles'],
        'Choose Pilot: Automobile or Motorcycle.',
      ),
      bonusByOption: {
        'pilot-automobile': 10,
        'pilot-motorcycles-snowmobiles': 12,
      },
    },
    {
      ...choice(
        'repairOrHorse',
        'Repair or Horsemanship',
        1,
        0,
        ['general-repair-maintenance', 'horsemanship-general'],
        'Choose General Repair & Maintenance or Horsemanship: General.',
      ),
      bonusByOption: {
        'general-repair-maintenance': 10,
        'horsemanship-general': 5,
      },
    },
    choice(
      'ancientWp',
      'Ancient W.P.',
      1,
      0,
      ancientWps(),
      'Choose one ancient W.P.',
    ),
    choice(
      'rangedWp',
      'Ranged W.P.',
      1,
      0,
      ['wp-energy-pistol', 'wp-energy-rifle'],
      'Choose W.P. Energy Pistol or Energy Rifle.',
    ),
  ],
  relatedAtLevel(level) {
    return 5 + [3, 6, 9, 12].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 8 + [3, 5, 7, 9, 11, 13].filter((v) => level >= v).length
  },
  abilities: [],
  source: { book: 'Rifts Ultimate Edition', pages: '97-99' },
})

export const wildernessScout = defineOcc({
  id: 'wilderness-scout',
  name: 'Wilderness Scout O.C.C.',
  description:
    'A hardy trailblazer, hunter, tracker, guide, and master of survival in the wilds.',
  languages: { nativeBase: 94, nativeBonus: 0, otherBonus: 15, otherCount: 2 },
  attributeRequirements: [
    { attribute: 'iq', minimum: 8 },
    { attribute: 'pe', minimum: 12 },
  ],
  attributeBonuses: [
    {
      id: 'wilderness-scout-sdc',
      target: 'sdcBonus',
      operation: 'add',
      dice: { count: 3, sides: 6 },
      modifier: 10,
      label: 'Wilderness Scout O.C.C. bonus',
    },
    {
      id: 'wilderness-scout-ps',
      target: 'ps',
      operation: 'add',
      dice: { count: 1, sides: 4 },
      label: 'Wilderness Scout O.C.C. bonus',
    },
    {
      id: 'wilderness-scout-pe',
      target: 'pe',
      operation: 'add',
      dice: { count: 1, sides: 4 },
      label: 'Wilderness Scout O.C.C. bonus',
    },
  ],
  attributeBonusSource: { book: 'Rifts Ultimate Edition', pages: '99' },
  combatBonuses: { initiative: 1, perception: 3, roll: 2, coma: 10 },
  saveBonuses: { poison: 2, disease: 2 },
  saveProgression: { horrorFactor: [2, 4, 6, 9, 12, 15] },
  creationNotes: [
    'A high P.S. and M.E. are helpful, but the source gives no numeric recommendation.',
    'The nine first-level O.C.C. Related selections must include two Physical and one Wilderness skill; the remaining six may come from any eligible category.',
    'Pilot O.C.C. Related choices exclude robots, power armor, military vehicles, and large noisy vehicles; the last category remains a manual eligibility judgment because the shared Pilot catalog does not classify vehicle size or noise.',
  ],
  situationalBonuses: [
    'Trail Blazing: 20% +5% per level.',
    'Cross-Country Pacing: 35% +5% per level, with the source-listed sustained travel rates and trip-time estimates.',
    'Cartography: 40% +5% per level; includes fixed Basic Math 50% or gives +5% to a separately selected Math: Basic skill.',
  ],
  automaticSkills: [
    ['physical-8', 0],
    ['cook', 15],
    ['climbing', 20],
    ['fishing', 15],
    ['horsemanship-general', 20],
    ['identify-plants-fruit', 20],
    ['hunting', 0],
    ['land-navigation', 20],
    ['prowl', 15],
    ['radio-basic', 10],
    ['track-trap-animals', 20],
    ['wilderness-survival', 20],
    ['wp-knife', 0],
    ['physical-1', 0],
  ],
  choices: [
    {
      ...choice(
        'transport',
        'Travel skill',
        1,
        0,
        [
          'pilot-motorcycles-snowmobiles',
          'pilot-hovercycles',
          'horsemanship-exotic',
        ],
        'Choose Pilot: Motorcycle, Pilot: Hovercycle, or Horsemanship: Exotic Animals.',
      ),
      bonusByOption: {
        'pilot-motorcycles-snowmobiles': 14,
        'pilot-hovercycles': 10,
        'horsemanship-exotic': 0,
      },
    },
    choice(
      'wps',
      'Weapon Proficiencies',
      3,
      0,
      all('Weapon Proficiencies'),
      'Choose three ancient and/or modern W.P.s.',
    ),
  ],
  relatedAtLevel(level) {
    return 9 + [2, 5, 8, 11, 14].filter((v) => level >= v).length
  },
  secondaryAtLevel(level) {
    return 4 + [3, 6, 9, 12].filter((v) => level >= v).length
  },
  abilities: [],
  source: { book: 'Rifts Ultimate Edition', pages: '99-100' },
})

export const occs = [
  combatCyborg,
  crazy,
  cyberKnight,
  glitterBoy,
  headhunter,
  juicer,
  mercSoldier,
  robotPilot,
  bodyFixer,
  cityRat,
  cyberDoc,
  operator,
  rogueScholar,
  rogueScientist,
  vagabond,
  wildernessScout,
]
export const occsById = Object.fromEntries(occs.map((occ) => [occ.id, occ]))

export function combatCyborgRelated(id) {
  const rules = [
    ['Communication', 10],
    ['Domestic', 0],
    ['Military', 10],
    ['Physical', 0],
    ['Pilot Related', 0],
    ['Technical', 5],
    ['Weapon Proficiencies', 0],
  ]
  for (const [category, bonus] of rules)
    if (all(category).includes(id)) return { eligible: true, bonus, category }
  if (id === 'basic-electronics')
    return { eligible: true, bonus: 5, category: 'Electrical' }
  if (['intelligence', 'tracking-people'].includes(id))
    return { eligible: true, bonus: 0, category: 'Espionage' }
  if (id === 'horsemanship-general')
    return { eligible: true, bonus: 0, category: 'Horsemanship' }
  if (['basic-mechanics', 'automotive-mechanics'].includes(id))
    return { eligible: true, bonus: 5, category: 'Mechanical' }
  if (id === 'first-aid')
    return { eligible: true, bonus: 5, category: 'Medical' }
  if (
    all('Pilot').includes(id) &&
    ![
      'robot-combat-basic',
      'robot-combat-elite',
      'pilot-robots-power-armor',
    ].includes(id)
  )
    return { eligible: true, bonus: 5, category: 'Pilot' }
  if (['gambling-standard', 'find-contraband'].includes(id))
    return { eligible: true, bonus: 0, category: 'Rogue' }
  if (['mathematics-basic', 'mathematics-advanced'].includes(id))
    return { eligible: true, bonus: 0, category: 'Science' }
  return { eligible: false, bonus: 0, category: '' }
}

export function crazyRelated(id) {
  const categoryRules = [
    ['Communication', 5],
    ['Domestic', 0],
    ['Espionage', 10],
    ['Military', 5],
    ['Physical', 10],
    ['Pilot', 5],
    ['Pilot Related', 0],
    ['Rogue', 5],
    ['Technical', 0],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 0],
  ]
  for (const [category, bonus] of categoryRules)
    if (all(category).includes(id)) return { eligible: true, bonus, category }
  if (['horsemanship-general', 'horsemanship-exotic'].includes(id))
    return { eligible: true, bonus: 5, category: 'Horsemanship' }
  if (['automotive-mechanics', 'locksmith'].includes(id))
    return { eligible: true, bonus: 0, category: 'Mechanical' }
  if (['first-aid', 'paramedic', 'holistic-medicine'].includes(id))
    return { eligible: true, bonus: 10, category: 'Medical' }
  if (
    [
      'mathematics-basic',
      'mathematics-advanced',
      'astronomy-navigation',
    ].includes(id)
  )
    return { eligible: true, bonus: 0, category: 'Science' }
  return { eligible: false, bonus: 0, category: '' }
}

combatCyborg.relatedSkillInfo = combatCyborgRelated
crazy.relatedSkillInfo = crazyRelated

function categoryRelated(rules, exceptions = {}) {
  return (id) => {
    if (exceptions[id]) return { eligible: true, ...exceptions[id] }
    for (const [category, bonus = 0] of rules)
      if (all(category).includes(id)) return { eligible: true, bonus, category }
    return { eligible: false, bonus: 0, category: '' }
  }
}

function filteredCategoryRelated(rules, exceptions = {}, excluded = []) {
  const base = categoryRelated(rules, exceptions)
  const excludedIds = new Set(excluded)
  return (id) =>
    excludedIds.has(id) ? { eligible: false, bonus: 0, category: '' } : base(id)
}

cyberKnight.relatedSkillInfo = categoryRelated(
  [
    ['Communication', 0],
    ['Domestic', 0],
    ['Espionage', 5],
    ['Military', 5],
    ['Physical', 5],
    ['Pilot', 0],
    ['Pilot Related', 5],
    ['Rogue', 0],
    ['Science', 0],
    ['Technical', 5],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 5],
  ],
  {
    'breaking-taming': { bonus: 10, category: 'Cowboy' },
    'trick-riding': { bonus: 0, category: 'Cowboy' },
    'basic-electronics': { bonus: 0, category: 'Electrical' },
    'horsemanship-exotic': { bonus: 10, category: 'Horsemanship' },
    'automotive-mechanics': { bonus: 0, category: 'Mechanical' },
    'basic-mechanics': { bonus: 0, category: 'Mechanical' },
  },
)
glitterBoy.relatedSkillInfo = categoryRelated(
  [
    ['Communication', 0],
    ['Domestic', 0],
    ['Military', 10],
    ['Physical', 0],
    ['Pilot', 5],
    ['Pilot Related', 10],
    ['Rogue', 0],
    ['Technical', 0],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 0],
  ],
  {
    'detect-ambush': { bonus: 10, category: 'Espionage' },
    'detect-concealment': { bonus: 5, category: 'Espionage' },
    intelligence: { bonus: 5, category: 'Espionage' },
    'wilderness-survival': { bonus: 5, category: 'Espionage' },
    'automotive-mechanics': { bonus: 5, category: 'Mechanical' },
    'first-aid': { bonus: 0, category: 'Medical' },
    paramedic: { bonus: 0, category: 'Medical' },
  },
)
headhunter.relatedSkillInfo = categoryRelated(
  [
    ['Communication', 5],
    ['Domestic', 0],
    ['Espionage', 5],
    ['Military', 15],
    ['Physical', 0],
    ['Pilot', 0],
    ['Pilot Related', 0],
    ['Rogue', 0],
    ['Technical', 0],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 5],
  ],
  {
    'basic-electronics': { bonus: 0, category: 'Electrical' },
    'horsemanship-general': { bonus: 0, category: 'Horsemanship' },
    'automotive-mechanics': { bonus: 5, category: 'Mechanical' },
    paramedic: { bonus: 0, category: 'Medical' },
    'mathematics-basic': { bonus: 0, category: 'Science' },
    'mathematics-advanced': { bonus: 0, category: 'Science' },
  },
)
juicer.relatedSkillInfo = categoryRelated(
  [
    ['Communication', 0],
    ['Domestic', 0],
    ['Military', 10],
    ['Physical', 10],
    ['Pilot', 0],
    ['Pilot Related', 5],
    ['Technical', 0],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 5],
  ],
  {
    'breaking-taming': { bonus: 0, category: 'Cowboy' },
    roping: { bonus: 0, category: 'Cowboy' },
    'trick-riding': { bonus: 0, category: 'Cowboy' },
    'basic-electronics': { bonus: 0, category: 'Electrical' },
    'horsemanship-general': { bonus: 0, category: 'Horsemanship' },
    'horsemanship-exotic': { bonus: 0, category: 'Horsemanship' },
    'automotive-mechanics': { bonus: 0, category: 'Mechanical' },
    'basic-mechanics': { bonus: 0, category: 'Mechanical' },
    'first-aid': { bonus: 0, category: 'Medical' },
    prowl: { bonus: 15, category: 'Rogue' },
    'mathematics-basic': { bonus: 0, category: 'Science' },
    'mathematics-advanced': { bonus: 0, category: 'Science' },
  },
)
mercSoldier.relatedSkillInfo = categoryRelated(
  [
    ['Domestic', 0],
    ['Military', 5],
    ['Physical', 0],
    ['Rogue', 0],
    ['Technical', 5],
    ['Weapon Proficiencies', 0],
  ],
  {
    'basic-electronics': { bonus: 0, category: 'Electrical' },
    'horsemanship-general': { bonus: 0, category: 'Horsemanship' },
    'horsemanship-exotic': { bonus: 0, category: 'Horsemanship' },
    'automotive-mechanics': { bonus: 0, category: 'Mechanical' },
    'basic-mechanics': { bonus: 0, category: 'Mechanical' },
    'mathematics-advanced': { bonus: 5, category: 'Science' },
    'astronomy-navigation': { bonus: 0, category: 'Science' },
    'land-navigation': { bonus: 0, category: 'Wilderness' },
    'wilderness-survival': { bonus: 0, category: 'Wilderness' },
  },
)
robotPilot.relatedSkillInfo = categoryRelated(
  [
    ['Communication', 10],
    ['Domestic', 0],
    ['Military', 10],
    ['Physical', 0],
    ['Pilot', 10],
    ['Pilot Related', 10],
    ['Technical', 5],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 0],
  ],
  {
    'basic-electronics': { bonus: 0, category: 'Electrical' },
    'detect-concealment': { bonus: 0, category: 'Espionage' },
    'wilderness-survival': { bonus: 0, category: 'Espionage' },
    'aircraft-mechanics': { bonus: 5, category: 'Mechanical' },
    'automotive-mechanics': { bonus: 5, category: 'Mechanical' },
    'basic-mechanics': { bonus: 5, category: 'Mechanical' },
    'first-aid': { bonus: 5, category: 'Medical' },
    cardsharp: { bonus: 0, category: 'Rogue' },
    seduction: { bonus: 0, category: 'Rogue' },
    'mathematics-basic': { bonus: 10, category: 'Science' },
    'mathematics-advanced': { bonus: 10, category: 'Science' },
    'astronomy-navigation': { bonus: 15, category: 'Science' },
  },
)
bodyFixer.relatedSkillInfo = filteredCategoryRelated(
  [
    ['Domestic', 10],
    ['Medical', 15],
    ['Pilot', 5],
    ['Pilot Related', 0],
    ['Science', 10],
    ['Technical', 10],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 5],
  ],
  {
    barter: { bonus: 5, category: 'Communication' },
    'creative-writing': { bonus: 5, category: 'Communication' },
    'public-speaking': { bonus: 5, category: 'Communication' },
    'radio-basic': { bonus: 5, category: 'Communication' },
    'language-other': { bonus: 5, category: 'Communication' },
    'literacy-other': { bonus: 5, category: 'Communication' },
    'basic-electronics': { bonus: 5, category: 'Electrical' },
    'wilderness-survival': { bonus: 10, category: 'Espionage' },
    'horsemanship-general': { bonus: 0, category: 'Horsemanship' },
    'basic-mechanics': { bonus: 0, category: 'Mechanical' },
    'automotive-mechanics': { bonus: 0, category: 'Mechanical' },
    streetwise: { bonus: 4, category: 'Rogue' },
  },
  [
    'physical-6',
    'physical-10',
    'wrestling',
    'wp-heavy-military-weapons',
    'wp-heavy-m-d-weapons',
  ],
)
cityRat.relatedSkillInfo = filteredCategoryRelated(
  [
    ['Communication', 10],
    ['Domestic', 5],
    ['Physical', 5],
    ['Rogue', 15],
    ['Technical', 10],
    ['Weapon Proficiencies', 0],
  ],
  {
    'basic-electronics': { bonus: 5, category: 'Electrical' },
    'computer-repair': { bonus: 5, category: 'Electrical' },
    'automotive-mechanics': { bonus: 10, category: 'Mechanical' },
    'basic-mechanics': { bonus: 10, category: 'Mechanical' },
    'first-aid': { bonus: 10, category: 'Medical' },
    paramedic: { bonus: 10, category: 'Medical' },
    'mathematics-basic': { bonus: 0, category: 'Science' },
    'mathematics-advanced': { bonus: 0, category: 'Science' },
    chemistry: { bonus: 0, category: 'Science' },
    'pilot-jet-packs': { bonus: 10, category: 'Pilot' },
    'robot-combat-basic': { bonus: 10, category: 'Pilot' },
  },
  [
    'fencing',
    'forced-march',
    'outdoorsmanship',
    'scuba',
    'wp-heavy-military-weapons',
    'wp-heavy-m-d-weapons',
  ],
)
cyberDoc.relatedSkillInfo = filteredCategoryRelated(
  [
    ['Domestic', 0],
    ['Electrical', 5],
    ['Mechanical', 5],
    ['Medical', 10],
    ['Physical', 0],
    ['Pilot', 5],
    ['Pilot Related', 10],
    ['Science', 5],
    ['Technical', 10],
    ['Weapon Proficiencies', 0],
  ],
  {
    'horsemanship-general': { bonus: 0, category: 'Horsemanship' },
    streetwise: { bonus: 0, category: 'Rogue' },
    palming: { bonus: 0, category: 'Rogue' },
    hunting: { bonus: 5, category: 'Wilderness' },
    'skin-prepare-hides': { bonus: 5, category: 'Wilderness' },
  },
  ['cryptography', 'performance', 'physical-6', 'wrestling'],
)
operator.relatedSkillInfo = filteredCategoryRelated(
  [
    ['Communication', 15],
    ['Domestic', 0],
    ['Electrical', 10],
    ['Mechanical', 10],
    ['Military', 5],
    ['Physical', 0],
    ['Pilot', 10],
    ['Pilot Related', 10],
    ['Technical', 10],
    ['Weapon Proficiencies', 0],
  ],
  {
    'first-aid': { bonus: 0, category: 'Medical' },
    'computer-hacking': { bonus: 15, category: 'Rogue' },
    'pick-locks': { bonus: 15, category: 'Rogue' },
    roadwise: { bonus: 15, category: 'Rogue' },
    'mathematics-advanced': { bonus: 5, category: 'Science' },
    chemistry: { bonus: 5, category: 'Science' },
    'chemistry-analytical': { bonus: 5, category: 'Science' },
    'boat-building': { bonus: 5, category: 'Wilderness' },
    carpentry: { bonus: 5, category: 'Wilderness' },
  },
  ['physical-6', 'gymnastics', 'wrestling'],
)
rogueScholar.relatedSkillInfo = filteredCategoryRelated(
  [
    ['Communication', 10],
    ['Domestic', 10],
    ['Science', 10],
    ['Technical', 15],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 5],
  ],
  {
    'basic-electronics': { bonus: 5, category: 'Electrical' },
    'computer-repair': { bonus: 5, category: 'Electrical' },
    forgery: { bonus: 0, category: 'Espionage' },
    intelligence: { bonus: 0, category: 'Espionage' },
    'horsemanship-general': { bonus: 0, category: 'Horsemanship' },
    'basic-mechanics': { bonus: 5, category: 'Mechanical' },
    'automotive-mechanics': { bonus: 5, category: 'Mechanical' },
    'first-aid': { bonus: 10, category: 'Medical' },
    'naval-history': { bonus: 0, category: 'Military' },
    'nbc-warfare': { bonus: 0, category: 'Military' },
    'recognize-weapon-quality': { bonus: 0, category: 'Military' },
    'computer-hacking': { bonus: 10, category: 'Rogue' },
  },
  [
    'physical-6',
    'gymnastics',
    'kick-boxing',
    'wrestling',
    'wp-heavy-military-weapons',
    'wp-heavy-m-d-weapons',
  ],
)
rogueScientist.relatedSkillInfo = filteredCategoryRelated(
  [
    ['Communication', 5],
    ['Domestic', 5],
    ['Electrical', 10],
    ['Mechanical', 5],
    ['Medical', 10],
    ['Pilot', 5],
    ['Pilot Related', 10],
    ['Rogue', 0],
    ['Science', 20],
    ['Technical', 15],
    ['Wilderness', 10],
    ['Weapon Proficiencies', 0],
  ],
  {
    cryptography: { bonus: 15, category: 'Communication' },
    'laser-communications': { bonus: 15, category: 'Communication' },
    'optic-systems': { bonus: 15, category: 'Communication' },
    'wilderness-survival': { bonus: 10, category: 'Espionage' },
    'horsemanship-general': { bonus: 0, category: 'Horsemanship' },
    'trap-mine-detection': { bonus: 5, category: 'Military' },
  },
  [
    'physical-6',
    'gymnastics',
    'wrestling',
    'wp-heavy-military-weapons',
    'wp-military-flamethrowers',
    'wp-heavy-m-d-weapons',
  ],
)
vagabond.relatedSkillInfo = filteredCategoryRelated(
  [
    ['Communication', 0],
    ['Domestic', 10],
    ['Physical', 0],
    ['Pilot', 5],
    ['Pilot Related', 0],
    ['Rogue', 4],
    ['Technical', 5],
    ['Wilderness', 0],
    ['Weapon Proficiencies', 0],
  ],
  {
    barter: { bonus: 0, category: 'Communication' },
    'creative-writing': { bonus: 0, category: 'Communication' },
    'language-other': { bonus: 0, category: 'Communication' },
    performance: { bonus: 0, category: 'Communication' },
    'public-speaking': { bonus: 0, category: 'Communication' },
    'radio-basic': { bonus: 0, category: 'Communication' },
    'sign-language': { bonus: 0, category: 'Communication' },
    sing: { bonus: 0, category: 'Communication' },
    branding: { bonus: 0, category: 'Cowboy' },
    'breaking-taming': { bonus: 0, category: 'Cowboy' },
    'herding-cattle': { bonus: 0, category: 'Cowboy' },
    'basic-electronics': { bonus: 5, category: 'Electrical' },
    'horsemanship-general': { bonus: 0, category: 'Horsemanship' },
    'basic-mechanics': { bonus: 5, category: 'Mechanical' },
    'automotive-mechanics': { bonus: 5, category: 'Mechanical' },
    'first-aid': { bonus: 5, category: 'Medical' },
    'astronomy-navigation': { bonus: 5, category: 'Science' },
    'mathematics-basic': { bonus: 5, category: 'Science' },
    'mathematics-advanced': { bonus: 5, category: 'Science' },
  },
  [
    'cryptography',
    'laser-communications',
    'optic-systems',
    'surveillance',
    'physical-6',
    'gymnastics',
    'wrestling',
    'pilot-jet-aircraft',
    'pilot-military-jet-fighters',
    'pilot-boat-ships',
    'pilot-robots-power-armor',
    'pilot-military-tanks-apcs',
    'pilot-military-submersibles',
    'pilot-military-warships',
    'robot-combat-basic',
    'robot-combat-elite',
    'wp-heavy-military-weapons',
    'wp-military-flamethrowers',
    'wp-heavy-m-d-weapons',
  ],
)
wildernessScout.relatedSkillInfo = filteredCategoryRelated(
  [
    ['Domestic', 10],
    ['Espionage', 10],
    ['Physical', 10],
    ['Pilot', 0],
    ['Pilot Related', 0],
    ['Technical', 5],
    ['Weapon Proficiencies', 0],
    ['Wilderness', 20],
  ],
  {
    barter: { bonus: 0, category: 'Communication' },
    'language-other': { bonus: 10, category: 'Communication' },
    'literacy-other': { bonus: 0, category: 'Communication' },
    performance: { bonus: 0, category: 'Communication' },
    'public-speaking': { bonus: 0, category: 'Communication' },
    'basic-electronics': { bonus: 0, category: 'Electrical' },
    'horsemanship-exotic': { bonus: 5, category: 'Horsemanship' },
    'automotive-mechanics': { bonus: 0, category: 'Mechanical' },
    'first-aid': { bonus: 10, category: 'Medical' },
    'holistic-medicine': { bonus: 20, category: 'Medical' },
    'gambling-standard': { bonus: 5, category: 'Rogue' },
    'gambling-dirty-tricks': { bonus: 5, category: 'Rogue' },
    'imitate-voices-sounds': { bonus: 5, category: 'Rogue' },
    tailing: { bonus: 5, category: 'Rogue' },
    'mathematics-basic': { bonus: 0, category: 'Science' },
    anthropology: { bonus: 0, category: 'Science' },
    biology: { bonus: 0, category: 'Science' },
    botany: { bonus: 0, category: 'Science' },
    'breed-dogs': { bonus: 15, category: 'Technical' },
    'lore-american-indians': { bonus: 15, category: 'Technical' },
    'lore-cattle': { bonus: 15, category: 'Technical' },
    'lore-d-bee': { bonus: 15, category: 'Technical' },
    'lore-demons-monsters': { bonus: 15, category: 'Technical' },
    'lore-faeries-magic-creatures': { bonus: 15, category: 'Technical' },
    'lore-juicers': { bonus: 15, category: 'Technical' },
    'lore-magic': { bonus: 15, category: 'Technical' },
    'lore-psychics-psionics': { bonus: 15, category: 'Technical' },
    'rope-works': { bonus: 15, category: 'Technical' },
  },
  [
    'forgery',
    'pick-locks',
    'physical-6',
    'pilot-jet-aircraft',
    'pilot-military-jet-fighters',
    'pilot-boat-ships',
    'pilot-military-tanks-apcs',
    'pilot-military-submersibles',
    'pilot-military-warships',
    'pilot-robots-power-armor',
    'robot-combat-basic',
    'robot-combat-elite',
  ],
)

export function secondaryEligible(id) {
  return Boolean(id)
}

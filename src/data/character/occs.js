import { skillCategories } from './skills.js'

const categoryIds = Object.fromEntries(skillCategories)
const all = (category) => categoryIds[category] || []

export function defineOcc(occ) {
  return {
    description: '',
    defaults: {},
    languages: { nativeBase: 88, nativeBonus: 0, otherBonus: 0 },
    mdc: null,
    combatBonuses: {},
    automaticSkills: [],
    choices: [],
    specializations: [],
    abilities: [],
    source: null,
    relatedAtLevel: () => 0,
    secondaryAtLevel: () => 0,
    relatedSkillInfo: () => ({ eligible: false, bonus: 0, category: '' }),
    ...occ,
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
    'Starts at Robot P.S. 24, P.P. 18, and Speed 132. Purchased upgrades may raise these to the class limits.',
    '+5 to save vs possession and +3 to save vs magic.',
    'Impervious to psionic Bio-Manipulation, Telemechanics, See Aura, and attacks that inflict damage directly to Hit Points.',
    'Full conversion eliminates psionic powers and I.S.P.; only 10% of any former P.P.E. remains, and magic or Techno-Wizard devices cannot be used.',
    'Simulated touch is 35-55%. Prowl suffers -20%; Art, Forgery, Locksmith, Palming, Pick Locks, Play Musical Instrument, and similar fine-hand skills suffer -40%.',
    'MI-B2 Medium Infantry Armor provides 230 M.D.C. and imposes -15% on applicable Physical skills.',
    'Starts with mechanical eyes with polarized filters, clock-calendar, two additional sensory choices, four bionic weapons/tools, and four bionic features/accessories.',
    'Upgrade fund: 3D6x1,000 + 15,000 credits. Starting cash: 1D4x1,000 credits plus 4D4x100 in saleable Black Market items.',
  ],
})

export const crazy = defineOcc({
  id: 'crazy',
  name: 'Crazies O.C.C.',
  description:
    'A flamboyant M.O.M.-augmented warrior with superhuman endurance, reflexes, senses, healing, minor psionics, and progressive mental instability.',
  defaults: {
    ps: 19,
    pp: 17,
    pe: 10,
    spd: 10,
    strengthType: 'augmented',
    isp: 0,
  },
  languages: { nativeBase: 95, nativeBonus: 0, otherBonus: 15 },
  combatBonuses: {
    initiative: 2,
    roll: 4,
    attacks: 1,
    perception: 3,
    coma: 15,
  },
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
    'Super Endurance: add 3D6x10 S.D.C., 5D6 Hit Points, and 1D6 P.E.; carry and lift twice normal, endure ten times longer, remain fully alert for 72 hours, and need only four hours of sleep.',
    'Increased Strength: add 2D4 P.S.; minimum P.S. 19 and Augmented strength. The builder applies the minimum and strength category; record the rolled increase manually.',
    'Increased Speed: add 4D6 Spd; running leap 20 feet across and 15 feet high, or half from a dead stop. Record the rolled increase manually.',
    'Heightened Reflexes: add 1D6 P.P. (minimum 17), +2 initiative, +1 attack per melee, +4 roll with impact, and +20% to maintain balance. The builder applies the minimum and fixed bonuses.',
    'Enhanced Senses: +3 Perception; exceptional sight and hearing, automatic dodge at +1 on levels 1, 3, 6, 9, 12, and 15; additional roll-with-impact bonuses at levels 2, 5, 10, and 15.',
    'Enhanced smell, taste, and touch include scent recognition/tracking and +10% to skills requiring a delicate touch; apply these situationally.',
    'Saving throws: +2 vs psionics and possession, +6 vs mind control, and +4 vs toxic gases, poisons, drugs, and disease.',
    'Enhanced Healing: heals twice normal, +15% vs coma/death, and ignores pain penalties until reduced to 10 Hit Points or fewer.',
    'Crazies Bio-Regeneration: a helpless 2D4-minute trance restores 2D6 Hit Points and 3D6 S.D.C.; six hours restores all S.D.C. plus 4D6 Hit Points.',
    'Minor Psionics: choose three Sensitive or Physical powers, excluding Astral Projection, Ectoplasm, Object Read, and Telekinesis. I.S.P. is 6D6 + M.E., plus 1D6 per level starting at level two; save vs psionics on 12 or higher.',
    'Insanity progression: Phobia at level 2; Affective Disorder at 3; Crazy Insanity at 4; Obsession at 6; Phobia at 8; Neurosis at 10; Psychosis at 12; Random Insanity at 14.',
    'P.P.E. base is 6D6. M.O.M. is designed for humans and Ogres; it does not work on supernatural beings or creatures of magic.',
    'Starts with light or medium M.D.C. armor, covert and dress clothing, survival gear, two ancient weapons, a Vibro-Knife, an energy handgun and rifle with four spare E-Clips each, but no vehicle.',
    'Starting money: 2D6x100 credits and one Black Market item worth 1D6x1,000 credits. Avoids bionics other than M.O.M., but may consider limited implants.',
  ],
})

export const cyberKnight = defineOcc({
  id: 'cyber-knight',
  name: 'Cyber-Knight O.C.C.',
  description:
    'A chivalric psychic warrior trained to defend life and justice with discipline, a Psi-Sword, cyber-armor, and special awareness of technology.',
  languages: { nativeBase: 96, nativeBonus: 0, otherBonus: 30 },
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
    'Attribute requirements: M.E. 11 and P.E. 11; I.Q. and P.S. 10 are suggested.',
    'Choose two additional spoken languages at +30%; Dragones/Elf is also known at 96%.',
    'Cyber-armor, a Psi-Sword, psionics, combat training, and Zen Combat abilities improve with level; consult the class pages for the complete progression.',
    'O.C.C. Related selections must include at least two Physical skills and three W.P.s.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '61-66' },
})

export const glitterBoy = defineOcc({
  id: 'glitter-boy',
  name: 'Glitter Boy O.C.C.',
  description:
    'The hereditary or newly trained pilot of the legendary laser-resistant Glitter Boy power armor and its Boom Gun.',
  languages: { nativeBase: 95, nativeBonus: 0, otherBonus: 20 },
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
  abilities: [
    'Minimum P.P. 10. A pilot descended from generations of Glitter Boy pilots receives the listed hereditary combat, Horror Factor, S.D.C., and armor-attack bonuses.',
    'Starts with a USA-G10 Glitter Boy suit; its main body has 770 M.D.C. and lasers inflict half damage.',
    'Choose two additional spoken languages at +20%.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '67-73' },
})

export const headhunter = defineOcc({
  id: 'headhunter',
  name: 'Headhunter Techno-Warrior O.C.C.',
  description:
    'A heavily armed partial-conversion techno-warrior, tracker, and mercenary augmented with cybernetics and bionics.',
  languages: { nativeBase: 94, nativeBonus: 0, otherBonus: 20 },
  combatBonuses: { initiative: 1, roll: 3, perception: 2, coma: 10 },
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
  abilities: [
    'Minimum P.E. 12 and P.P. 12. Add 3D6 S.D.C. and 1D4 to P.S. and P.E.; record rolled bonuses manually.',
    'Choose either three other languages at +20%, or one language at +20% and two Lore skills at +10%.',
    'Initiative improves again at levels 4, 9, and 13; Horror Factor saves improve at levels 2, 4, 6, 9, 12, and 15.',
    'Starts with cybernetic implants and either a bionic limb package or the listed partial-conversion package. Partial conversion halves I.S.P., leaves 10% P.P.E., and grants +2 vs possession and +1 vs magic.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '74-77' },
})

export const juicer = defineOcc({
  id: 'juicer',
  name: 'Juicer O.C.C.',
  description:
    'A chemically augmented super-warrior with extraordinary speed, reflexes, endurance, healing, and a drastically shortened lifespan.',
  languages: { nativeBase: 92, nativeBonus: 0, otherBonus: 10 },
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
    'Choose two additional spoken languages at +10%.',
    'Juicer augmentation supplies the class physical/combat bonuses, automatic dodge, enhanced healing and endurance described on pages 78-79; rolled bonuses must be recorded manually.',
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
  abilities: [
    'Select one MOS; its skills and required choices are applied automatically.',
    'Hand to Hand: Basic may be upgraded to Expert for one Related selection, or Martial Arts/Assassin for two.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '81-83' },
})

export const robotPilot = defineOcc({
  id: 'robot-pilot',
  name: 'Robot Pilot O.C.C.',
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
          'Robot Combat: Elite adds one more power armor type at levels 3, 6, 9, and 12. Starts with an NG-Samson plus the selected open-market suit.',
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
  abilities: [
    'Minimum P.S. 10, P.P. 12, and P.E. 12.',
    'Select either the Power Armor Pilot MOS or Robot Pilot MOS; its skills and machine selections are applied automatically.',
    'Typically starts with a Gyro-Compass and Clock Calendar implant.',
  ],
  source: { book: 'Rifts Ultimate Edition', pages: '83-85' },
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

export function secondaryEligible(id) {
  return Boolean(id)
}

export const skillEffects = {
  'physical-0': {
    situational: [
      'No Hand to Hand Combat: one hand-to-hand attack at levels 1, 3, and 9, and +1 to dodge. Enter the resulting attacks in Base attacks per melee.',
    ],
  },
  'physical-6': {
    attributes: { ps: 1, pp: 1, pe: 1 },
    sdcDice: '1D6',
    combat: { roll: 2 },
    skillBonuses: { climbing: 15, prowl: 5 },
    situational: [
      'Automatic kick attack (1D8 S.D.C.).',
      'No fear of heights.',
      'Acrobatics supplies basic Climb 40% and Prowl 30%; when those skills are separately trained, use the listed bonuses instead.',
    ],
  },
  'physical-7': {
    sdcDice: '2D4',
    situational: [
      '+1 to disarm, +1 to pull punch, and +2 damage with kicks.',
      'Sense of Balance starts at 30% and improves +5% per level.',
    ],
  },
  'physical-8': {
    attributes: { ps: 1 },
    speedDice: '1D6',
    sdcDice: '1D8',
    combat: { parry: 1, dodge: 1, roll: 1 },
  },
  'physical-9': { attributes: { ps: 2 }, sdc: 10 },
  'physical-10': {
    attributes: { ps: 2 },
    sdcDice: '3D6',
    attacks: 1,
    combat: { parry: 2, dodge: 2, roll: 1 },
    situational: [
      'Knockout on a natural 20 with a punch; the victim is unconscious for 1D6 melee rounds.',
    ],
  },
  fencing: {
    situational: [
      '+1 to strike and parry with a sword or dagger, and +1D6 damage with a sword. Requires W.P. Sword.',
    ],
  },
  'forced-march': {
    attributes: { pe: 2 },
    speedDice: '1D4',
    sdcDice: '2D6',
    situational: [
      'Physical Endurance for forced marching and travel is five times normal; maximum group-march speed is about 60% of Speed, never less than 8.',
    ],
  },
  gymnastics: {
    attributes: { ps: 2, pp: 1, pe: 2 },
    sdcDice: '2D6',
    combat: { roll: 2 },
    skillBonuses: { climbing: 5, prowl: 5 },
    situational: [
      'Automatic kick attack (2D4 S.D.C.).',
      'Gymnastics supplies basic Prowl 30% and Climb 25%; when those skills are separately trained, use the listed bonuses instead.',
    ],
  },
  juggling: { combat: { initiative: 1 } },
  'kick-boxing': {
    attributes: { ps: 1, pe: 1 },
    sdcDice: '1D10',
    situational: [
      'Adds Roundhouse Kick (3D6), Axe Kick (2D8), Knee Strike (1D8), and Leap Kick (3D8; costs two attacks). Damage type varies with strength type.',
    ],
  },
  outdoorsmanship: {
    attributes: { pe: 1 },
    sdcDice: '2D6',
    skillBonuses: {
      dowsing: 5,
      fasting: 5,
      'identify-plants-fruit': 5,
      'wilderness-survival': 5,
    },
  },
  'physical-labor': { attributes: { ps: 2, pe: 1 }, sdcDice: '2D8' },
  running: {
    attributes: { pe: 1 },
    speedDice: '4D4',
    sdcDice: '1D6',
    situational: [
      'At half speed, run one-half mile per P.E. point without undue fatigue; at maximum speed, run one-third that distance.',
    ],
  },
  scuba: {
    situational: [
      'Underwater buoyancy allows 30% more carrying and lifting at the normal fatigue rate.',
    ],
  },
  wrestling: {
    attributes: { ps: 2, pe: 1 },
    sdcDice: '4D6',
    combat: { roll: 1 },
    situational: [
      'Adds body block/tackle, pin/incapacitate on a natural 18-20, and crush/squeeze attacks.',
    ],
  },
  'crime-scene': { perception: 1 },
  'weapons-engineer': {
    situational: [
      '+1 to strike when using heavy weapons or vehicular weapon systems.',
    ],
  },
  'weapon-systems': {
    situational: [
      '+1 to strike with weapon systems built into military vehicles, power armor, and robot vehicles; not handheld weapons.',
    ],
  },
  'pilot-flight-system-combat': {
    situational: [
      'While flying: +2 to dodge and +1 attack/action at skill levels 1, 3, 5, 8, and 11.',
    ],
  },
  'wardrobe-grooming': {
    situational: [
      'When dressed to impress: +1 P.B. and +2% to Disguise, Impersonation, Performance, Undercover Ops, and Seduction.',
    ],
  },
}

export const skillSynergies = {
  'optic-systems': { 'tv-video': 5 },
  performance: { 'undercover-ops': 5, impersonation: 5 },
  'public-speaking': { performance: 5 },
  brewing: { 'holistic-medicine': 5 },
  'detect-concealment': { camouflage: 5 },
  disguise: { 'undercover-ops': 5, impersonation: 5 },
  'escape-artist': { 'pick-locks': 5 },
  impersonation: { 'undercover-ops': 10 },
  'mechanical-engineer': { locksmith: 5, surveillance: 5 },
  'vehicle-armorer': { 'basic-mechanics': 20, 'automotive-mechanics': 10 },
  cardsharp: { palming: 4 },
  'computer-hacking': { cryptography: 5, surveillance: 5, locksmith: 5 },
  'find-contraband': { 'id-undercover-agent': 10 },
  'gambling-standard': { 'mathematics-basic': 5 },
  'imitate-voices-sounds': { impersonation: 5 },
  palming: { cardsharp: 5, concealment: 5, 'pick-pockets': 5 },
  'safe-cracking': { 'pick-locks': 5, demolitions: 5 },
  streetwise: { 'id-undercover-agent': 10 },
  anthropology: {
    'history-pre-rifts': 5,
    'lore-d-bee': 5,
    'lore-demons-monsters': 5,
    'lore-faeries-magic-creatures': 5,
    'lore-juicers': 5,
    'lore-magic': 5,
    'lore-psychics-psionics': 5,
  },
  zoology: {
    'herding-cattle': 5,
    'track-trap-animals': 5,
    'veterinary-science': 10,
  },
  mythology: { 'lore-magic': 5, 'lore-demons-monsters': 5 },
  research: {
    'law-general': 5,
    impersonation: 5,
    'history-pre-rifts': 5,
    'history-post-apocalypse': 5,
  },
}

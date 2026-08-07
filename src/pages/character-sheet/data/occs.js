import { skillCategories } from './skills.js'

const categoryIds = Object.fromEntries(skillCategories)
const all = category => categoryIds[category] || []

export function defineOcc(occ) {
  return {
    description: '',
    defaults: {},
    languages: { nativeBase:88, nativeBonus:0, otherBonus:0 },
    mdc: null,
    combatBonuses: {},
    automaticSkills: [],
    choices: [],
    abilities: [],
    relatedAtLevel: () => 0,
    secondaryAtLevel: () => 0,
    relatedSkillInfo: () => ({ eligible:false, bonus:0, category:'' }),
    ...occ,
  }
}

export const combatCyborg = defineOcc({
  id: 'combat-cyborg',
  name: 'Combat Cyborg O.C.C.',
  description: 'A full-conversion cyborg built as a Mega-Damage combatant with Robot Strength, heavy armor, integrated systems, and military training.',
  defaults: { ps: 24, pp: 18, spd: 132, strengthType: 'robot', isp: 0 },
  languages: { nativeBase:88, nativeBonus:8, otherBonus:20 },
  mdc: { mainBody: 180, armor: 230, total: 410 },
  automaticSkills: [
    ['general-repair-maintenance',15],['land-navigation',15],['pilot-military-tanks-apcs',5],['radio-basic',10],['sensory-equipment',10],['weapon-systems',5],['climbing',5],['wp-energy-rifle',0],['physical-2',0],
  ],
  choices: [
    { id:'basicTrade', label:'Basic technical skill', count:1, bonus:10, options:['basic-electronics','basic-mechanics'], description:'Choose Basic Electronics or Basic Mechanics as an automatic O.C.C. skill at +10%.' },
    { id:'pilot', label:'Pilot skill', count:1, bonus:10, options:all('Pilot').filter(id=>!['robot-combat-basic','robot-combat-elite','pilot-robots-power-armor'].includes(id)), description:'Choose one Pilot skill at +10%; Robot and Power Armor skills are excluded.' },
    { id:'ancientWp', label:'Ancient W.P.', count:1, bonus:0, options:all('Weapon Proficiencies').filter(id=>!['wp-energy-pistol','wp-energy-rifle','wp-handguns','wp-rifles','wp-shotgun','wp-submachine-gun','wp-heavy-military-weapons','wp-military-flamethrowers','wp-harpoon-spear-gun','wp-heavy-m-d-weapons'].includes(id)), description:'Choose one ancient Weapon Proficiency.' },
    { id:'modernWp', label:'Modern W.P.', count:2, bonus:0, options:all('Weapon Proficiencies').filter(id=>['wp-handguns','wp-rifles','wp-shotgun','wp-submachine-gun','wp-heavy-military-weapons','wp-military-flamethrowers','wp-harpoon-spear-gun','wp-energy-pistol','wp-heavy-m-d-weapons'].includes(id)), description:'Choose two modern Weapon Proficiencies; Heavy M.D. Weapons may be selected.' },
  ],
  relatedAtLevel(level) { return 5 + [3,7,10,13].filter(value=>level>=value).length },
  secondaryAtLevel(level) { return 4 + [4,8,12].filter(value=>level>=value).length },
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
  description: 'A flamboyant M.O.M.-augmented warrior with superhuman endurance, reflexes, senses, healing, minor psionics, and progressive mental instability.',
  defaults: { ps:19, pp:17, pe:10, spd:10, strengthType:'augmented', isp:0 },
  languages: { nativeBase:95, nativeBonus:0, otherBonus:15 },
  combatBonuses: { initiative:2, roll:4, attacks:1, perception:3, coma:15 },
  automaticSkills: [
    ['climbing',20],['dance',15],['detect-ambush',10],['detect-concealment',15],['electronic-countermeasures',10],['escape-artist',10],['gymnastics',20],['land-navigation',10],['prowl',20],['radio-basic',10],['streetwise',10],['tailing',15],['swimming',20],['wp-energy-rifle',0],
  ],
  choices: [
    { id:'handToHand', label:'Hand to Hand', count:1, bonus:0, options:['physical-3','physical-4'], description:'Choose Martial Arts, or Assassin for an evil alignment. Commando may instead be purchased with two O.C.C. Related Skill selections.' },
    { id:'ancientWp', label:'Ancient W.P.', count:2, bonus:0, options:all('Weapon Proficiencies').filter(id=>!['wp-handguns','wp-rifles','wp-shotgun','wp-submachine-gun','wp-heavy-military-weapons','wp-military-flamethrowers','wp-harpoon-spear-gun','wp-energy-pistol','wp-energy-rifle','wp-heavy-m-d-weapons'].includes(id)), description:'Choose two ancient Weapon Proficiencies.' },
    { id:'modernWp', label:'Modern W.P.', count:2, bonus:0, options:['wp-handguns','wp-rifles','wp-shotgun','wp-submachine-gun','wp-heavy-military-weapons','wp-military-flamethrowers','wp-harpoon-spear-gun','wp-energy-pistol','wp-heavy-m-d-weapons'], description:'Choose two modern Weapon Proficiencies.' },
  ],
  relatedAtLevel(level) { return 7 + 2 * [3,6,9,12].filter(value=>level>=value).length },
  secondaryAtLevel(level) { return 6 + [2,4,8,12].filter(value=>level>=value).length },
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

export const occs = [combatCyborg, crazy]
export const occsById = Object.fromEntries(occs.map(occ=>[occ.id,occ]))

export function combatCyborgRelated(id) {
  const rules = [
    ['Communication',10],['Domestic',0],['Military',10],['Physical',0],['Pilot Related',0],['Technical',5],['Weapon Proficiencies',0],
  ]
  for (const [category,bonus] of rules) if (all(category).includes(id)) return { eligible:true, bonus, category }
  if (id==='basic-electronics') return { eligible:true, bonus:5, category:'Electrical' }
  if (['intelligence','tracking-people'].includes(id)) return { eligible:true, bonus:0, category:'Espionage' }
  if (id==='horsemanship-general') return { eligible:true, bonus:0, category:'Horsemanship' }
  if (['basic-mechanics','automotive-mechanics'].includes(id)) return { eligible:true, bonus:5, category:'Mechanical' }
  if (id==='first-aid') return { eligible:true, bonus:5, category:'Medical' }
  if (all('Pilot').includes(id) && !['robot-combat-basic','robot-combat-elite','pilot-robots-power-armor'].includes(id)) return { eligible:true, bonus:5, category:'Pilot' }
  if (['gambling-standard','find-contraband'].includes(id)) return { eligible:true, bonus:0, category:'Rogue' }
  if (['mathematics-basic','mathematics-advanced'].includes(id)) return { eligible:true, bonus:0, category:'Science' }
  return { eligible:false, bonus:0, category:'' }
}

export function crazyRelated(id) {
  const categoryRules = [
    ['Communication',5],['Domestic',0],['Espionage',10],['Military',5],['Physical',10],['Pilot',5],['Pilot Related',0],['Rogue',5],['Technical',0],['Weapon Proficiencies',0],['Wilderness',0],
  ]
  for (const [category,bonus] of categoryRules) if (all(category).includes(id)) return { eligible:true, bonus, category }
  if (['horsemanship-general','horsemanship-exotic'].includes(id)) return { eligible:true, bonus:5, category:'Horsemanship' }
  if (['automotive-mechanics','locksmith'].includes(id)) return { eligible:true, bonus:0, category:'Mechanical' }
  if (['first-aid','paramedic','holistic-medicine'].includes(id)) return { eligible:true, bonus:10, category:'Medical' }
  if (['mathematics-basic','mathematics-advanced','astronomy-navigation'].includes(id)) return { eligible:true, bonus:0, category:'Science' }
  return { eligible:false, bonus:0, category:'' }
}

combatCyborg.relatedSkillInfo = combatCyborgRelated
crazy.relatedSkillInfo = crazyRelated

export function secondaryEligible(id) {
  return Boolean(id)
}

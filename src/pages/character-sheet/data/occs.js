import { skillCategories } from './skills.js'

const categoryIds = Object.fromEntries(skillCategories)
const all = category => categoryIds[category] || []

export const combatCyborg = {
  id: 'combat-cyborg',
  name: 'Combat Cyborg O.C.C.',
  description: 'A full-conversion cyborg built as a Mega-Damage combatant with Robot Strength, heavy armor, integrated systems, and military training.',
  defaults: { ps: 24, pp: 18, spd: 132, strengthType: 'robot', isp: 0 },
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
}

export const occs = [combatCyborg]
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

export function secondaryEligible(id) {
  const allowed = new Set([
    ...all('Domestic'), ...all('Technical'),
    ...all('Communication').filter(value=>!['cryptography','laser-communications','surveillance','tv-video'].includes(value)),
    'basic-electronics','computer-repair','horsemanship-general','horsemanship-exotic','automotive-mechanics','basic-mechanics','animal-husbandry','first-aid','camouflage','recognize-weapon-quality',
    'physical-1','physical-7','physical-8','physical-9','climbing','running','swimming',
    'pilot-automobile','pilot-bicycling','pilot-boat-motor-race-hydrofoil','pilot-boat-paddle','pilot-boat-sail','pilot-hover-craft','pilot-hovercycles','pilot-motorcycles-snowmobiles','gambling-standard','astronomy-navigation','mathematics-basic','mathematics-advanced',
    'wp-archery','wp-axe','wp-blunt','wp-chain','wp-forked','wp-grappling-hook','wp-knife','wp-pole-arm','wp-quick-draw','wp-shield','wp-spear','wp-staff','wp-sword','wp-targeting','wp-whip','wp-handguns','wp-rifles','wp-energy-pistol','wp-energy-rifle',
    ...all('Wilderness').filter(value=>!['boat-building','spelunking'].includes(value)),
  ])
  return allowed.has(id)
}

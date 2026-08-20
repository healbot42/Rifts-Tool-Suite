import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

/*
 * Generates the runtime catalog from the reviewed, source-backed artifact.
 * Pass `--output` to write a review copy without replacing runtime data.
 */
const root = resolve(import.meta.dirname, '..')
const sourcePath = resolve(
  root,
  'src/data/items/rifts-ultimate-edition.reviewed.json',
)
const catalogPath = resolve(root, 'src/data/items/rifts-ultimate-edition.json')
const outputArgument = process.argv.indexOf('--output')
if (outputArgument >= 0 && !process.argv[outputArgument + 1])
  throw new Error('--output requires a repository-relative path')
const outputPath =
  outputArgument >= 0
    ? resolve(root, process.argv[outputArgument + 1])
    : catalogPath
const relativeOutput = relative(root, outputPath)
if (
  !relativeOutput ||
  relativeOutput.startsWith('..') ||
  resolve(root, relativeOutput) !== outputPath
)
  throw new Error('--output must resolve to a file inside the repository')
const catalog = JSON.parse(readFileSync(sourcePath, 'utf8'))
const assets = new Set(
  readdirSync(resolve(root, 'public/assets/items/rifts-ultimate-edition'))
    .filter((name) => name.endsWith('.webp'))
    .map((name) => name.slice(0, -5)),
)

const WORD_REPAIRS = new Map([
  ['avail abil ity', 'availability'],
  ['avail able', 'available'],
  ['availabil ity', 'availability'],
  ['biologic al', 'biological'],
  ['bil ity', 'bility'],
  ['bla ck', 'black'],
  ['com puter', 'computer'],
  ['communica tion', 'communication'],
  ['cred its', 'credits'],
  ['dam age', 'damage'],
  ['des igned', 'designed'],
  ['destroy ing', 'destroying'],
  ['digit al', 'digital'],
  ['effec tive', 'effective'],
  ['envi ronmental', 'environmental'],
  ['equip ment', 'equipment'],
  ['general ly', 'generally'],
  ['heal ing', 'healing'],
  ['hypoderm ic', 'hypodermic'],
  ['incuba tion', 'incubation'],
  ['insola tion', 'insolation'],
  ['intensifi er', 'intensifier'],
  ['increa se', 'increase'],
  ['la ser', 'laser'],
  ['maxi mum', 'maximum'],
  ['mega-dam age', 'mega-damage'],
  ['oppo nents', 'opponents'],
  ['port able', 'portable'],
  ['put er', 'puter'],
  ['par tially', 'partially'],
  ['pay load', 'payload'],
  ['recharg able', 'rechargeable'],
  ['reloa d', 'reload'],
  ['record ing', 'recording'],
  ['recrea tion', 'recreation'],
  ['sla shing', 'slashing'],
  ['stabb ing', 'stabbing'],
  ['tem porarily', 'temporarily'],
  ['telescop ic', 'telescopic'],
  ['therm al', 'thermal'],
  ['tint ed', 'tinted'],
  ['vis ible', 'visible'],
  ['vib ro', 'vibro'],
  ['weig ht', 'weight'],
  ['labil ity', 'lability'],
  ['loca tion', 'location'],
  ['mobil ity', 'mobility'],
  ['radia tion', 'radiation'],
  ['slipp ed', 'slipped'],
  ['survey ing', 'surveying'],
])

/**
 * Repairs only OCR artifact families verified in the RUE source extraction.
 * Deliberately avoids fuzzy or general word joining because that can alter
 * rules.
 *
 * @param {string} value Source-derived catalog text.
 * @returns {string} Text with conservative, deterministic repairs applied.
 */
export function cleanRueOcr(value) {
  let result = value
    .normalize('NFKC')
    .replace(/\u00ad\s*/g, '')
    .replace(/([A-Za-z])-[\r\n]+([a-z])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
  for (const [broken, repaired] of WORD_REPAIRS)
    result = result.replaceAll(new RegExp(broken, 'gi'), repaired)
  return result
    .replace(/\b[IiLl]\s*D\s*(4|6|8|10|12|20)\b/g, '1D$1')
    .replace(/\b([1-9])0(4|6|8|10|12|20)(?=\b|x)/g, '$1D$2')
    .replace(/\b([1-9])\s+D\s*(4|6|8|10|12|20)\b/g, '$1D$2')
    .replace(/\b(\d)\s*,\s*(\d{3})\b/g, '$1,$2')
    .replace(/\b(\d)\s+(?=\d{2,3}\b)/g, '$1')
    .replace(/\b([+-])\s*[Ii](?=\b)/g, '$1 1')
    .replace(/S\.D\.C\.[lI]Hit/gi, 'S.D.C./Hit')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
}

// These ID-keyed overrides repair audited excerpt-boundary or table-association
// errors that generic OCR cleanup cannot resolve safely.
const SOURCE_CORRECTIONS = {
  'rue-c-12-heavy-assault-laser-rifle': {
    description:
      'A sturdy former Coalition standard infantry rifle with S.D.C. and two M.D.C. settings, single-shot and three-shot burst modes, passive nightvision scope, and laser targeting.',
    statistics: [
      { label: 'Damage', value: '2D6 or 4D6 M.D.; 6D6 S.D.C.' },
      { label: 'Range', value: '2,000 feet (610 m)' },
      {
        label: 'Rate of Fire',
        value: 'Each blast or burst counts as one melee attack',
      },
      {
        label: 'Payload',
        value:
          '20 M.D. blasts standard, 30 long E-Clip, plus 30 with E-Clip canister; six S.D.C. shots equal one M.D. blast',
      },
      { label: 'Bonuses', value: '+1 to strike on an aimed shot' },
      { label: 'Weight / Capacity', value: '7 lbs (3.2 kg)' },
      { label: 'Price', value: '20,000 credits' },
    ],
  },
  'rue-cv-212-variable-light-frequency-laser-rifle': {
    description:
      'An anti-Glitter Boy rifle whose computer analyzes laser-resistant armor and adjusts its light frequency after one melee round at half damage. M.D.C. damage has an 80% chance to disengage the analyzer, requiring 1D4 melee rounds of manual adjustment. It includes single-shot and three-shot burst modes, passive nightvision, and laser targeting.',
    statistics: [
      {
        label: 'Damage',
        value:
          'Single shot 2D6 M.D.; burst 6D6 M.D.; S.D.C. setting 6D6 S.D.C.',
      },
      { label: 'Range', value: '2,000 feet (610 m)' },
      { label: 'Rate of Fire', value: 'Each blast counts as one melee attack' },
      {
        label: 'Payload',
        value:
          '20 M.D. blasts standard, 30 long E-Clip, or E-Clip canister; six S.D.C. shots equal one M.D. blast',
      },
      { label: 'Bonuses', value: '+1 to strike on an aimed shot' },
      { label: 'Weight / Capacity', value: '8 lbs (3.6 kg)' },
      { label: 'Price', value: '42,000 credits' },
    ],
  },
  'rue-highwayman-motorcycle': {
    description:
      'A fast, rugged motorcycle common in cities and flatlands, supplied with either a laser or heavy machine-gun.',
    statistics: [
      { label: 'Speed', value: '180 mph (288 km/h); 400-mile (640 km) range' },
      { label: 'Durability / Protection', value: 'Main body 75 M.D.C.' },
      { label: 'Crew', value: 'One rider' },
      {
        label: 'Weight / Capacity',
        value: '6 feet (1.8 m) long; 240 lbs (108 kg)',
      },
      {
        label: 'Price',
        value:
          '24,000 credits combustion or 29,000 electric; add 6,500 for machine-gun or 12,000 for laser',
      },
    ],
  },
  'rue-infrared-distancing-binoculars': {
    description:
      'High-powered binoculars with infrared adjustment, cross-hair indicators, and digital estimates of distance and travel speed. They are popular for field work, exploration, recreation, and military use.',
    statistics: [
      { label: 'Range', value: '2 miles (3.2 km)' },
      { label: 'Price', value: '1,200 credits; widely available' },
    ],
  },
  'rue-small-communicator': {
    description:
      'A cigarette-pack- or cell-phone-sized communicator with a clip and holster for armor, clothing, pockets, or belt pouches.',
    statistics: [
      { label: 'Range', value: '5 miles (8 km)' },
      {
        label: 'Durability / Protection',
        value: '10 S.D.C.; optional 1 M.D.C. model',
      },
      { label: 'Weight / Capacity', value: '5 ounces (142 g)' },
      {
        label: 'Price',
        value:
          '1,500 credits; 3,500 credits for 1 M.D.C.; excellent availability',
      },
    ],
  },
  'rue-medium-communicator': {
    description:
      'A communicator about the size of a 20th-century walkie-talkie.',
    statistics: [
      { label: 'Range', value: '10 miles (16 km)' },
      {
        label: 'Durability / Protection',
        value: '30 S.D.C.; optional 4 M.D.C. model',
      },
      { label: 'Weight / Capacity', value: '12-16 ounces (340-454 g)' },
      {
        label: 'Price',
        value:
          '3,000 credits; 6,000 credits for 4 M.D.C.; excellent availability',
      },
    ],
  },
  'rue-portable-bio-scan-and-bio-lab': {
    description:
      'A 20-pound (9 kg) portable biological scanner and laboratory. It records basic body functions, performs voice-stress evaluation, identifies 380 human toxins in liquids, and measures radiation.',
    statistics: [
      { label: 'Weight / Capacity', value: '20 lbs (9 kg)' },
      {
        label: 'Powers / Effects',
        value:
          'Lie-detector reading 25% plus 5% per operator level; analyzes 380 toxins; includes dosimeter',
      },
      { label: 'Price', value: '5,000 credits; poor availability' },
    ],
  },
  'rue-portable-laboratory': {
    description:
      'A 58-pound (26 kg) field laboratory containing a microscope, specimen supplies, incubation, refrigeration and isolation chambers, burners, instruments, chemicals, centrifuge, dosimeter, microcomputer, digital camera, and toxic analyzer.',
    statistics: [
      { label: 'Weight / Capacity', value: '58 lbs (26 kg)' },
      { label: 'Price', value: '12,000 credits; poor availability' },
    ],
  },
  'rue-portable-language-translator': {
    description:
      'A handheld translator programmed with nine American languages and three additional languages, with twelve more available by disc. It recognizes up to three voices and two languages or dialects, translates through headphones, speaker, or cybernetic headjack, and records conversations on three-hour audio discs.',
    statistics: [
      {
        label: 'Accuracy',
        value:
          '98.7% with one speaker after 3 seconds; 78% with three speakers after 6 seconds',
      },
      {
        label: 'Weight / Capacity',
        value: 'About 0.5 lb (0.23 kg); records 3 hours per disc',
      },
      {
        label: 'Price',
        value: '9,600 credits; audio discs about 20 credits each',
      },
    ],
  },
  'rue-portable-scan-dihilator': {
    description:
      'A comprehensive portable scanning unit combining five-mile radar/sonar, radiation, radar, heat, infrared, ultraviolet, microwave, and energy sensors, a wide-band scrambled radio, and a detachable communicator.',
    statistics: [
      {
        label: 'Range',
        value:
          'Radar/sonar 5 miles (8 km); radio 40 miles (64 km); communicator 3 miles (4.8 km)',
      },
      {
        label: 'Accuracy',
        value:
          '65% identification and tracking for a trained Sensory Equipment operator',
      },
      { label: 'Price', value: '4,200-5,000 credits; fair availability' },
    ],
  },
  'rue-telescopic-scope': {
    description:
      'A 10x telescopic scope functioning like binoculars or a camera lens.',
    statistics: [
      { label: 'Range', value: '2,000-6,000 feet (610-1,828 m)' },
      { label: 'Price', value: '1,000 credits' },
    ],
  },
  'rue-mini-digital-video-camera': {
    description:
      'A studio-quality digital camera about the size of a paperback novel or cell phone. It records sound and video to one- or three-inch discs and includes wide- and narrow-angle lenses, low-light operation, filters, a 488 mm telescopic lens, carrying case, and tripod. Long-range radio enables telemetry.',
    statistics: [
      {
        label: 'Price',
        value:
          'About 4,200 credits; traditional video camera costs half; good availability',
      },
    ],
  },
  'rue-pdd-pocket-digital-disc-audio-player-recorder': {
    description:
      'A pocket digital-disc audio player and recorder about the size of a transistor radio. It plays or records one- and three-inch discs with typical two- or three-hour capacity.',
    statistics: [
      { label: 'Duration', value: 'Typically 2-3 hours per disc' },
      {
        label: 'Price',
        value:
          'Player 1,200-2,400 credits; blank disc 10-20; prerecorded disc 20-80',
      },
    ],
  },
  'rue-pdd-v-pocket-digital-disc-audio-video-player': {
    description:
      'A slightly larger pocket digital-disc system that records and plays audio and also plays video discs on a four-inch color screen. It can serve as a handheld monitor or connect to a larger display.',
    statistics: [{ label: 'Price', value: '6,000-12,000 credits' }],
  },
  'rue-multi-optics-helmet': {
    description:
      'A protective helmet incorporating a targeting sight, infrared optics, telescopic monocular, and thermal-imager. The thermal system sees through darkness, shadows, and smoke and grants +1 to strike when its optics and targeting sight are engaged.',
    statistics: [
      {
        label: 'Range',
        value:
          'Targeting, infrared, and thermal: 1,600 feet (488 m); telescopic: 2 miles (3.2 km)',
      },
      {
        label: 'Bonuses',
        value: '+1 to strike with thermal optics and targeting engaged',
      },
      { label: 'Price', value: '2,800-3,400 credits; good availability' },
    ],
  },
  'rue-microwave-fence': {
    description:
      'Paired seven-foot (2.1 m) sensor posts project an invisible microwave curtain and signal the control unit when an intruder crosses it.',
    statistics: [
      {
        label: 'Range',
        value:
          '500 feet (152 m) between posts; up to 14 miles (22.4 km) of coverage',
      },
      { label: 'Price', value: '20,000 credits; poor availability' },
    ],
  },
  'rue-mini-radar': {
    description:
      'A portable radar and monitor that a trained Sensory Equipment operator can use to identify and locate readings and estimate their speed and direction. It tracks up to 72 images and identifies more than 500 targets, but cannot track ground-level targets or those below 200 feet (61 m).',
    statistics: [
      { label: 'Range', value: '5 miles (8 km)' },
      {
        label: 'Weight / Capacity',
        value: '18 lbs (8.1 kg); tracks 72 images',
      },
      { label: 'Price', value: '2,500 credits; fair availability' },
    ],
  },
  'rue-large-military-radar': {
    description:
      'A desk-sized semi-portable military radar. A trained Sensory Equipment operator can identify and locate readings, estimate speed and direction, track up to 300 targets, and identify more than 1,000 target types. It cannot track ground-level targets or those below 100 feet (30.5 m).',
    statistics: [
      {
        label: 'Range',
        value: '100 miles (160 km); double across wide-open flat land',
      },
      {
        label: 'Weight / Capacity',
        value: '300 lbs (135 kg); tracks 300 targets',
      },
      { label: 'Price', value: '16,000 credits' },
    ],
  },
  'rue-passive-nightvision-scope': {
    description:
      'A starlight scope that amplifies ambient light to provide vision in darkness without emitting light. It does not function in absolute darkness.',
    statistics: [
      { label: 'Range', value: '2,000 feet (610 m)' },
      { label: 'Price', value: '6,000 credits' },
    ],
  },
  'rue-thermal-imager-scope': {
    description:
      'A thermal-imaging gun or camera scope that converts heat into visible color bands, providing normal 20/20 vision through darkness, shadows, and smoke. It can be combined with a telescopic scope.',
    statistics: [
      { label: 'Range', value: '2,000 feet (610 m)' },
      {
        label: 'Price',
        value: '12,000 credits, plus telescopic feature if added',
      },
    ],
  },
  'rue-thermal-imager-goggles': {
    description:
      'Battery-powered, electrically cooled thermal-imaging goggles that convert heat into visible images and allow vision through darkness, shadows, and smoke.',
    statistics: [
      { label: 'Range', value: '1,600 feet (488 m)' },
      { label: 'Duration', value: '16 hours typical operation' },
      { label: 'Price', value: 'About 2,000 credits; poor availability' },
    ],
  },
  'rue-old-style-radio-communicator': {
    description:
      'An enhanced walkie-talkie formerly issued to military personnel and field operatives and also used recreationally by the public.',
    statistics: [
      { label: 'Range', value: '3 miles (4.8 km)' },
      { label: 'Durability / Protection', value: '30 S.D.C.' },
      { label: 'Weight / Capacity', value: '6-10 ounces (170-284 g)' },
      { label: 'Price', value: '150 credits per unit; excellent availability' },
    ],
  },
  'rue-motion-detector': {
    description:
      'A portable sensor array and monitor that detects movement through minute changes in the air and pinpoints the source.',
    statistics: [
      { label: 'Range', value: '60 feet (18.3 m)' },
      { label: 'Weight / Capacity', value: '15 lbs (6.8 kg)' },
      { label: 'Price', value: '400 credits; fair availability' },
    ],
  },
  'rue-field-radio': {
    description:
      'An inexpensive backpack radio with wide-band long-range transmitter and receiver, frequency equalizer, field-strength detector, and scrambler.',
    statistics: [
      {
        label: 'Range',
        value:
          '60 miles (96 km) amid city interference; 150 miles (240 km) in wilderness',
      },
      { label: 'Weight / Capacity', value: '16 lbs (7.2 kg)' },
      { label: 'Price', value: '600 credits; good availability' },
    ],
  },
  'rue-long-range-military-field-radio': {
    description:
      'A military backpack radio with wide-band long-range transmitter and receiver, frequency equalizer, field-strength detector, and scrambler.',
    statistics: [
      {
        label: 'Range',
        value:
          '300 miles (480 km) amid city interference; 500 miles (800 km) in wilderness',
      },
      { label: 'Durability / Protection', value: '5 or 15 M.D.C.' },
      { label: 'Weight / Capacity', value: '25 lbs (11.25 kg)' },
      {
        label: 'Price',
        value: '6,000 credits; 15 M.D.C. version costs 10,000 credits extra',
      },
    ],
  },
  'rue-portable-field-computer': {
    description:
      'A pistol-grip hand computer with scanner and laser distancer, clock, calendar, mathematics and word-processing programs, two universal cyberjack plugs, and two 10-foot (3 m) cords.',
    statistics: [
      { label: 'Price', value: '2,500 credits' },
      {
        label: 'Features',
        value:
          'Range and measurement scanner; basic computing; sends and receives signals through cyberjack connections',
      },
    ],
  },
  'rue-irmss-internal-robot-medical-surgeon-system': {
    description:
      'A medical device that injects twelve microscopic surgical robots to locate and repair internal injuries. The robots have a 75% surgical skill, last about one hour, and are naturally flushed from the body after shutting down. Each unit holds 48 robots for four uses.',
    statistics: [
      { label: 'Duration', value: 'About one hour per robot' },
      { label: 'Payload', value: '48 robots; four uses' },
      {
        label: 'Powers / Effects',
        value:
          'Repairs clots, torn or ruptured veins, internal bleeding, and minor organ damage at 75% surgical skill',
      },
      { label: 'Price', value: '42,000 credits; good availability' },
    ],
  },
  'rue-irvt-internal-robot-visual-transmitters-seekers': {
    description:
      'A disposable pinhead-sized robot injected into a vein and tracked by a homing device. It transmits video of obstructions and damage in veins, arteries, and other internal passages, then harmlessly disintegrates after about 72 hours if not retrieved.',
    statistics: [
      { label: 'Duration', value: 'Disintegrates after about 72 hours' },
      {
        label: 'Price',
        value: '80,000 credits per disposable unit; good availability',
      },
    ],
  },
  'rue-rau-robot-antiseptic-units-cleaners': {
    description:
      'A pair of three-inch (76 mm) medical robots that crawl over wounds, destroying infection, removing pus and dead flesh, cleaning the wound, and applying antiseptic protein to speed healing.',
    statistics: [
      { label: 'Price', value: '50,000 credits per pair; good availability' },
    ],
  },
  'rue-rmk-robot-medical-kit-knitter': {
    description:
      'A kit of six button-sized robots that automatically clean, disinfect, medicate, debride, and suture skin wounds, then return to their carrier to refill. They have a 90% paramedic suturing skill but cannot treat internal injuries, broken bones, or severe wounds.',
    statistics: [
      {
        label: 'Powers / Effects',
        value:
          'Treats cuts, bruises, bullet wounds, and stab wounds at 90% paramedic suturing skill',
      },
      { label: 'Price', value: '24,000 credits; excellent availability' },
    ],
  },
  'rue-rsu-robot-sedative-units-sleepers': {
    description:
      'Four pinhead-sized robots enter the brain and stimulate relaxation and drowsiness while maintaining slow breathing, a steady pulse, and normal blood pressure. They return to their housing afterward.',
    statistics: [
      {
        label: 'Price',
        value: '100,000 credits per set of four; good availability',
      },
    ],
  },
  'rue-micro-scale': {
    description:
      'A hand-sized digital pocket scale that hooks to a belt or fits in a large pocket, bag, or backpack.',
    statistics: [
      { label: 'Weight / Capacity', value: 'Weighs up to 200 lbs (90 kg)' },
      { label: 'Price', value: '120 credits; widely available' },
    ],
  },
  'rue-palm-bio-unit': {
    description:
      "A palm-sized biological analyzer that reads body temperature, blood pressure, respiration, and dehydration when the patient's finger is inserted into its scanner.",
    statistics: [{ label: 'Price', value: '150 credits; widely available' }],
  },
  'rue-pocket-night-viewer': {
    description: 'A compact, easily concealed monocular night sight.',
    statistics: [
      { label: 'Range', value: '800 feet (244 m)' },
      { label: 'Price', value: '800-1,000 credits; fair availability' },
    ],
  },
  'rue-portable-radar-detector': {
    description:
      'A portable detector that indicates the presence and use of radar nearby.',
    statistics: [
      { label: 'Range', value: '1 mile (1.6 km)' },
      { label: 'Price', value: '200 credits; fair availability' },
    ],
  },
  'rue-protein-healing-salve': {
    description:
      'A high-protein chemical salve applied to burns, cuts, and rashes to double the normal healing rate.',
    statistics: [
      { label: 'Powers / Effects', value: 'Doubles normal healing' },
      { label: 'Weight / Capacity', value: '8-ounce (0.23 liter) tube' },
      { label: 'Price', value: '100 credits; widely available' },
    ],
  },
  'rue-conventional-binoculars': {
    description:
      'Conventional lens binoculars with one-mile (1.6 km) range and magnification through a series of lenses.',
    statistics: [
      { label: 'Range', value: '1 mile (1.6 km)' },
      { label: 'Price', value: '400-700 credits; fair availability' },
    ],
  },
  'rue-infrared-optic-system': {
    description:
      "An active infrared optical system with a 1,200-foot (366 m) range. Its narrow projected beam illuminates only a small area and is visible to other infrared optics, potentially revealing the operator's position.",
    statistics: [
      { label: 'Range', value: '1,200 feet (366 m)' },
      {
        label: 'Price',
        value: 'About 1,000 credits; fair to good availability',
      },
    ],
  },
  'rue-heat-sensor': {
    description:
      'A portable directional sensor that measures heat emanations and can pinpoint a specific heat source. Its range is 250 feet (76.2 m), with a 25-foot (7.6 m) detection field.',
    statistics: [
      {
        label: 'Range',
        value: '250 feet (76.2 m); 25-foot (7.6 m) detection field',
      },
      { label: 'Weight / Capacity', value: '8 lbs (3.6 kg)' },
      { label: 'Price', value: '1,200 credits' },
    ],
  },
  'rue-light-filters': {
    description:
      'Simple transparent lens covers designed to filter sunlight and reduce glare.',
    statistics: [{ label: 'Price', value: '25 credits each' }],
  },
  'rue-passive-night-sight': {
    description:
      'A passive image-intensifier that amplifies ambient light without emitting light of its own. It has a 1,600-foot (488 m) range.',
    statistics: [
      { label: 'Range', value: '1,600 feet (488 m)' },
      {
        label: 'Price',
        value: '1,400 credits for a gun scope; 1,800 credits for goggles',
      },
    ],
  },
  'rue-optics-band': {
    description:
      'A close-work headband optical system for research, micro-repairs, and scientific study. It combines infrared and ultraviolet optics, 400x magnification, night sight, and adjustable color filters.',
    statistics: [
      {
        label: 'Range',
        value:
          'Infrared, ultraviolet, and night sight: 200 feet (61 m); magnification: 7 feet (2.1 m)',
      },
      { label: 'Price', value: '800-1,200 credits; fair to good availability' },
    ],
  },
  'rue-polarized-goggles': {
    description:
      'Light-sensitive goggles that automatically lighten or darken with ambient light to protect the eyes from glare and bright light.',
    statistics: [
      {
        label: 'Durability / Protection',
        value: 'High-impact: 1 M.D.C.; ordinary: 15 S.D.C.',
      },
      {
        label: 'Price',
        value: '1,200 credits high-impact; 75-100 credits ordinary',
      },
    ],
  },
  'rue-sunglasses-or-tinted-visor': {
    description:
      'Sunglasses or a tinted visor similar to polarized goggles, providing 8 S.D.C.',
    statistics: [
      { label: 'Durability / Protection', value: '8 S.D.C.' },
      {
        label: 'Price',
        value: '15-300 credits depending on style and quality',
      },
    ],
  },
  'rue-ultraviolet-system': {
    description:
      'An optical system that enables its wearer to see ultraviolet light, usually integrated into a larger optics package.',
    statistics: [
      { label: 'Range', value: '400 feet (122 m)' },
      { label: 'Price', value: '500 credits' },
    ],
  },
  'rue-cross-hair-sight': {
    description:
      'A targeting cross-hair sight for improved aim. It adds +1 to strike on aimed shots, but the bonus does not apply while laser targeting is engaged.',
    statistics: [
      { label: 'Bonuses', value: '+1 to strike on aimed shots' },
      { label: 'Price', value: '500 credits' },
    ],
  },
  'rue-infrared-scope': {
    description:
      "An inexpensive active infrared scope with a 2,000-foot (610 m) range. Its narrow beam limits the view to about seven feet (2.1 m) and is visible to infrared vision, revealing the user's position.",
    statistics: [
      { label: 'Range', value: '2,000 feet (610 m)' },
      { label: 'Price', value: '1,000 credits' },
    ],
  },
  'rue-laser-targeting-sight': {
    description:
      'A laser targeting system that adds +3 to strike on an aimed shot while functioning. It may be combined with a telescopic sight or thermal-imager.',
    statistics: [
      { label: 'Range', value: '4,000 feet (1,219 m)' },
      { label: 'Bonuses', value: '+3 to strike on an aimed shot' },
      { label: 'Price', value: '2,000 credits' },
    ],
  },
  'rue-dosimeter': {
    description:
      'A one-pound (0.45 kg) handheld sensor that detects and measures radiation levels at up to 20 feet (6.1 m).',
    statistics: [
      { label: 'Range', value: '20 feet (6.1 m)' },
      { label: 'Weight / Capacity', value: '1 lb (0.45 kg)' },
      { label: 'Price', value: '200 credits; wide availability' },
    ],
  },
  'rue-stethoscope': {
    description: 'A conventional medical stethoscope.',
    statistics: [{ label: 'Price', value: '80-150 credits' }],
  },
  'rue-surgical-gloves': {
    description: 'Disposable surgical gloves sold in boxes of 100.',
    statistics: [{ label: 'Price', value: '12-20 credits per box of 100' }],
  },
  'rue-thermometer': {
    description:
      'A traditional oral thermometer or a battery-operated digital ear thermometer about the size of a small cell phone.',
    statistics: [
      { label: 'Price', value: '3 credits oral; 10-15 credits digital' },
    ],
  },
  'rue-suture-gun': {
    description:
      'A staple-like gun that rapidly closes wounds with dissolvable sutures, causing little pain, discomfort, or scarring.',
    statistics: [
      {
        label: 'Price',
        value: '100 credits per gun; 10 credits per 5 feet (1.5 m) of suture',
      },
    ],
  },
  'rue-suture-tape': {
    description:
      'Special antiseptic tape used to hold cuts closed instead of sutures.',
    statistics: [
      {
        label: 'Price',
        value: '20 credits per 30-foot (9 m) roll; excellent availability',
      },
    ],
  },
  'rue-video-communicator': {
    description:
      'A wristband- or paperback-sized radio and television communicator with a small video screen. It sends and receives over cellular or radio waves, automatically selecting the clearest frequency, and supports inexpensive hardline accessories.',
    statistics: [
      { label: 'Range', value: '10 miles (16 km); double in open areas' },
      { label: 'Price', value: '10,000 credits' },
    ],
  },
  'rue-acoustic-noise-generator': {
    description:
      'A surveillance countermeasure that muffles conversations and distorts bugging systems by 35%.',
    statistics: [
      { label: 'Powers / Effects', value: 'Distorts bugging systems by 35%' },
      { label: 'Price', value: '900 credits' },
    ],
  },
  'rue-keyhole-or-tube-microphone': {
    description:
      'A microphone with a long hollow flexible or stiff tube for placement in cracks, walls, and other keyhole-sized spaces.',
    statistics: [
      {
        label: 'Range',
        value:
          'Picks up sound at 34 feet (10.3 m); transmits 1,000 feet (305 m)',
      },
      { label: 'Price', value: '150 credits; fair availability' },
    ],
  },
  'rue-video-wall-mount-camera': {
    description:
      'A palm-sized remote video camera with a suction mount, programmable or continuous transmission, a lens rotating through about 90 degrees, and audio reception to 20 feet (6.1 m).',
    statistics: [
      {
        label: 'Duration',
        value: '72 hours continuous video; audio lasts twice as long',
      },
      {
        label: 'Price',
        value:
          '200 credits, 300 on the Black Market; handheld monitor 150 credits',
      },
    ],
  },
  'rue-contact-microphone': {
    description:
      'A tiny microphone that translates vibrations through a wall, window, or other sounding board into sound.',
    statistics: [
      {
        label: 'Range',
        value:
          'Picks up sound at 10 yards/meters; transmits 1,000 feet (300 m)',
      },
      { label: 'Price', value: '170 credits; fair availability' },
    ],
  },
  'rue-wireless-microphone': {
    page: 265,
    description:
      'A compact wireless microphone about the size and thickness of a box of matches.',
    statistics: [
      {
        label: 'Range',
        value: 'Picks up sound at 14 feet (4.3 m); broadcasts 300 feet (91 m)',
      },
      { label: 'Price', value: '250 credits; poor availability' },
    ],
  },
  'rue-tracer-bug': {
    description:
      "A checker-sized magnetic or adhesive tracking bug that can be attached to a vehicle or hidden in a person's belongings.",
    statistics: [
      { label: 'Range', value: '8 miles (12.8 km)' },
      { label: 'Duration', value: '72 hours continuous transmission' },
      { label: 'Price', value: '140 credits; fair availability' },
    ],
  },
  'rue-pocket-scrambler': {
    description:
      'A pocket device that scrambles outgoing radio signals to prevent enemy interception and interpretation.',
    statistics: [{ label: 'Price', value: '300 credits; good availability' }],
  },
  'rue-ultraviolet-signaler': {
    description:
      'Two adhesive sensor/transmitter strips create an invisible ultraviolet beam across an area. Breaking the beam silently signals a monitor and may trigger a video unit.',
    statistics: [{ label: 'Price', value: '900 credits; fair availability' }],
  },
  'rue-communications-helmet': {
    description:
      'A common protective helmet with an automatically polarizing visor, built-in radio receiver and transmitter, miniature headphones, and a slide-out microphone for two-way communication. It has a 5- or 10-mile (8 or 16 km) range, and the helmet has 30 or 50 M.D.C. depending on the model.',
    statistics: [
      { label: 'Range', value: '5 or 10 miles (8 or 16 km)' },
      { label: 'Durability / Protection', value: 'Helmet: 30 or 50 M.D.C.' },
      { label: 'Price', value: '5,500 or 10,000 credits respectively' },
    ],
  },
  'rue-portable-computer': {
    description:
      'A fully functioning folding computer about the size of an opened paperback book. It runs about 24 hours on a rechargeable battery or plugs into an outlet, includes a thermal-paper printer, and can connect to video and cybernetic systems. Storage, display, and input methods vary widely. It weighs from a few ounces to one pound (0.45 kg).',
    statistics: [
      { label: 'Duration', value: 'About 24 hours per rechargeable battery' },
      { label: 'Weight / Capacity', value: 'A few ounces to 1 lb (0.45 kg)' },
      {
        label: 'Price',
        value:
          '100 credits to tens of thousands, depending on performance and condition',
      },
      {
        label: 'Features',
        value:
          'Thermal printer; video/cybernetic connection; removable storage; variable display and input systems',
      },
    ],
  },
  'rue-bio-comp-monitor': {
    description:
      "A portable computer and sensor system clipped to a patient's ears or two fingers. It measures and records blood pressure, temperature, heartbeat, respiration, hydration, and chemical responses detectable through the skin. Results can be stored or transmitted, and the unit highlights dangerous or irregular vital signs.",
    statistics: [
      { label: 'Price', value: '2,500 credits; good availability' },
      {
        label: 'Features',
        value:
          'Measures, records, stores, and transmits vital signs and warns of irregular readings',
      },
    ],
  },
  'rue-compu-drug-dispenser': {
    description:
      "A medical tool combining a computer, hypodermic gun, and chemical storage and dispensing unit. It holds 48 measured drug shots and injects the drug and amount selected by the operator into the patient's arm.",
    statistics: [
      { label: 'Payload', value: '48 measured drug shots' },
      {
        label: 'Price',
        value:
          '3,000 credits plus drugs; average dose 1D4x100 credits; good availability',
      },
    ],
  },
  'rue-standard-first-aid-kit': {
    description:
      'A standard kit containing gauze bandages, 48 assorted Band-Aids, twelve tongue depressors, a pen flashlight, medical tape, twelve disposable medicated wipes, six butterfly clamps, disinfectant, plastic gloves, scissors, forceps, six razor blades, a lighter, tweezers, a thermometer, 100 aspirin tablets, and 24 allergy/cold decongestant tablets.',
    statistics: [
      { label: 'Price', value: '100 credits; excellent availability' },
    ],
  },
  'rue-hypodermic-gun': {
    description:
      'A quick, painless method of giving injections. Most models include a self-cleaning mechanism that instantly cleans and sterilizes the needle after every use.',
    statistics: [
      {
        label: 'Price',
        value: '200 credits, drugs not included; excellent availability',
      },
    ],
  },
  'rue-hypodermic-syringe': {
    description:
      'A conventional hypodermic syringe available as a reusable syringe or in packages of 24 disposable syringes.',
    statistics: [
      {
        label: 'Price',
        value:
          '10 credits reusable or 10 credits per 24 disposable; good availability',
      },
    ],
  },
  'rue-c-18-laser-pistol': {
    description:
      'In 101 P.A., the C-18 was the standard Coalition Army sidearm, later replaced by the C-20 and C-30. It weighs 4 lbs (1.8 kg), inflicts 2D4 M.D. per laser blast, has an 800-foot (244 m) range, and carries 10 shots. Each blast counts as one melee attack. Black Market cost is 12,000 credits, with fair availability.',
    statistics: [
      { label: 'Damage', value: '2D4 M.D.' },
      { label: 'Range', value: '800 feet (244 m)' },
      {
        label: 'Rate of Fire',
        value: 'Each blast counts as one melee attack.',
      },
      { label: 'Payload', value: '10 shots' },
      { label: 'Weight / Capacity', value: '4 lbs (1.8 kg)' },
      { label: 'Price', value: '12,000 credits; fair availability' },
    ],
  },
  'rue-vibro-claws': {
    description:
      'Three hooked Vibro-Blades mounted to a forearm gauntlet or protective plate. They inflict 2D6 M.D., provide +1 to parry, and cost 11,000 credits.',
    statistics: [
      { label: 'Damage', value: '2D6 M.D.' },
      { label: 'Bonuses', value: '+1 to parry' },
      { label: 'Price', value: '11,000 credits' },
    ],
  },
  'rue-neural-mace': {
    description:
      'A handheld CS stun weapon that temporarily short-circuits the nervous system. A failed save of 16 or higher imposes -8 to strike, parry, and dodge and halves Speed and attacks per melee for 2D4 melee rounds; repeated hits can render a victim unconscious. Physical damage is 2D6 S.D.C. plus P.S. as a club or 1D6 S.D.C. plus P.S. as a jab. It can parry M.D. attacks, carries 100 rechargeable charges, and costs 8,000 credits.',
    statistics: [
      {
        label: 'Damage',
        value:
          'Stun; 2D6 S.D.C. plus P.S. as a club or 1D6 S.D.C. plus P.S. as a jab',
      },
      {
        label: 'Duration',
        value: '2D4 melee rounds; increased by 2D4 for each failed save',
      },
      { label: 'Payload', value: '100 rechargeable charges' },
      {
        label: 'Powers / Effects',
        value:
          'Save 16 or higher; failure gives -8 to strike, parry, and dodge and halves Speed and attacks per melee.',
      },
      { label: 'Price', value: '8,000 credits' },
    ],
  },
  'rue-c-10-light-assault-laser-rifle': {
    description:
      'An early, accurate C-12 predecessor with a fragile computer-enhanced targeting system. It weighs 5 lbs (2.3 kg), inflicts 2D6 M.D., has a 2,000-foot (610 m) range, and carries 20 standard or 30 long E-Clip blasts. Its working targeting system gives +3 to strike on an aimed shot. It costs 16,000 credits; an E-Clip canister cannot be used.',
    statistics: [
      { label: 'Damage', value: '2D6 M.D.' },
      { label: 'Range', value: '2,000 feet (610 m)' },
      {
        label: 'Rate of Fire',
        value: 'Each blast counts as one melee attack.',
      },
      { label: 'Payload', value: '20 standard or 30 long E-Clip blasts' },
      {
        label: 'Bonuses',
        value: '+3 to strike on an aimed shot while the targeting system works',
      },
      {
        label: 'Penalties / Limitations',
        value:
          'Targeting failure: 01-23% after strenuous combat or 01-40% after a hard fall; no E-Clip canister.',
      },
      { label: 'Weight / Capacity', value: '5 lbs (2.3 kg)' },
      { label: 'Price', value: '16,000 credits' },
    ],
  },
  'rue-c-14-fire-breather-assault-laser-and-grenade-launcher': {
    description:
      'A durable over-and-under infantry weapon combining a laser with a pump-action grenade launcher and passive nightvision scope. It weighs 10 lbs (4.5 kg). The laser inflicts 3D6 M.D. at 2,000 feet (610 m); grenades inflict 2D6 M.D. in a 12-foot (3.6 m) area at 1,200 feet (365 m). It carries 20 laser blasts and 12 grenades. Reloading the launcher takes one full melee (15 seconds).',
    statistics: [
      {
        label: 'Damage',
        value: 'Laser: 3D6 M.D.; grenade: 2D6 M.D. in a 12-foot (3.6 m) area',
      },
      {
        label: 'Range',
        value: 'Laser: 2,000 feet (610 m); grenade: 1,200 feet (365 m)',
      },
      {
        label: 'Rate of Fire',
        value: 'Each laser blast or grenade uses one melee attack.',
      },
      { label: 'Payload', value: '20 laser blasts; 12 grenades' },
      { label: 'Weight / Capacity', value: '10 lbs (4.5 kg)' },
      {
        label: 'Price',
        value: '30,000 credits; grenades 550 each or 4,500 per dozen',
      },
    ],
  },
  'rue-c-27-heavy-plasma-cannon': {
    description:
      'A dependable heavy infantry support weapon with telescopic and laser-distancing scope. It weighs 12 lbs (5.4 kg), inflicts 6D6 M.D. per shot at 1,600 feet (488 m), carries 10 blasts in an E-Clip canister, and gives +1 to strike on an aimed shot.',
    statistics: [
      { label: 'Damage', value: '6D6 M.D.' },
      { label: 'Range', value: '1,600 feet (488 m)' },
      {
        label: 'Rate of Fire',
        value: 'Each blast counts as one melee attack.',
      },
      { label: 'Payload', value: '10 blasts per E-Clip canister' },
      { label: 'Bonuses', value: '+1 to strike on an aimed shot' },
      { label: 'Weight / Capacity', value: '12 lbs (5.4 kg)' },
      {
        label: 'Price',
        value: '32,000 credits; canister 10,000 new or 2,000-2,500 to recharge',
      },
    ],
  },
  'rue-cr-1-rocket-launcher': {
    description:
      'A reusable single-shot mini-missile launcher with x20 telescopic, infrared, passive-nightvision, and laser-targeting optics. The launcher weighs 14 lbs (6.3 kg). A two-person team can load and fire three missiles per 15-second melee; one operator fires one. Range is one mile (1.6 km).',
    statistics: [
      {
        label: 'Damage',
        value:
          'By mini-missile; typically 1D4x10 M.D. armor piercing or 1D6x10 M.D. plasma',
      },
      { label: 'Range', value: '1 mile (1.6 km)' },
      {
        label: 'Rate of Fire',
        value: 'One per melee solo; three per melee with a two-person team',
      },
      {
        label: 'Payload',
        value: 'One mini-missile; side pack 6, backpack 12, carrying case 24',
      },
      {
        label: 'Weight / Capacity',
        value: 'Launcher 14 lbs (6.3 kg); each missile about 1 lb (0.45 kg)',
      },
      {
        label: 'Price',
        value: '18,000 credits; missiles 1,000-2,200 credits each',
      },
    ],
  },
  'rue-vibro-knife': {
    description:
      'A Vibro-Knife that inflicts 1D6 M.D. and costs 7,000 credits.',
    statistics: [
      { label: 'Damage', value: '1D6 M.D.' },
      { label: 'Price', value: '7,000 credits' },
    ],
  },
  'rue-vibro-bayonet': {
    description:
      'A rifle-mounted Vibro-Bayonet that inflicts 1D6+1 M.D. and costs 7,500 credits.',
    statistics: [
      { label: 'Damage', value: '1D6+1 M.D.' },
      { label: 'Price', value: '7,500 credits' },
    ],
  },
  'rue-vibro-saber': {
    description:
      'A short-sword Vibro-Saber that inflicts 2D4 M.D. and costs 9,000 credits.',
    statistics: [
      { label: 'Damage', value: '2D4 M.D.' },
      { label: 'Price', value: '9,000 credits' },
    ],
  },
  'rue-vibro-sword': {
    description:
      'A large one-handed Vibro-Sword that inflicts 2D6 M.D. and costs 11,000 credits.',
    statistics: [
      { label: 'Damage', value: '2D6 M.D.' },
      { label: 'Price', value: '11,000 credits' },
    ],
  },
  'rue-vibro-large-two-handed-sword': {
    description:
      'A giant-sized Vibro-Sword for oversized power armor and robot vehicles. It inflicts 3D6 M.D. and costs 18,000 credits.',
    statistics: [
      { label: 'Damage', value: '3D6 M.D.' },
      { label: 'Price', value: '18,000 credits' },
    ],
  },
  'rue-cs-vibro-blade-vambraces': {
    description:
      'Dog Boy forearm vambraces may mount assorted large and small Vibro-Blades. Forearm and hand-guard blades cannot increase damage together because only one set can be used at a time.',
    statistics: [
      {
        label: 'Features',
        value:
          'Supports assorted forearm and hand-guard Vibro-Blades; only one set can be used at a time.',
      },
    ],
  },
  'rue-short-blade-hand-guard': {
    description:
      'Two short serrated Vibro-Blades for slashing, stabbing, sawing, and cutting light M.D.C. materials. They inflict 2D4 M.D. and cost 9,000 credits.',
    statistics: [
      { label: 'Damage', value: '2D4 M.D.' },
      { label: 'Price', value: '9,000 credits' },
    ],
  },
  'rue-forearm-long-blades': {
    description:
      'A pair of partially retractable long Vibro-Blades with a maximum length of 10 inches (0.29 m). They inflict 2D6 M.D. and cost 11,000 credits.',
    statistics: [
      { label: 'Damage', value: '2D6 M.D.' },
      {
        label: 'Weight / Capacity',
        value: 'Maximum blade length 10 inches (0.29 m)',
      },
      { label: 'Price', value: '11,000 credits' },
    ],
  },
  'rue-retractable-forearm-blades': {
    description:
      'A pair of partially retractable hooked forearm Vibro-Blades, 20-24 inches (0.58-0.6 m) long. They inflict 2D6 M.D., give +1 to parry and +2 to disarm, and add +5% to Climbing. Cost is 14,500 credits.',
    statistics: [
      { label: 'Damage', value: '2D6 M.D.' },
      {
        label: 'Bonuses',
        value: '+1 to parry, +2 to disarm, and +5% to Climbing',
      },
      { label: 'Price', value: '14,500 credits' },
    ],
  },
  'rue-combat-spikes-and-studs': {
    description:
      'Dog Pack combat spikes inflict S.D.C./Hit Point damage. Weighted spiked gloves add 1D6+1 S.D.C. to punches, knee pads add 1D6 S.D.C. to knee kicks, and other spikes inflict 1D4 S.D.C. Hand and arm spikes give +1 to parry normal S.D.C. attacks. Cost varies from 50 to 200 credits.',
    statistics: [
      {
        label: 'Damage',
        value:
          'Gloves: +1D6+1 S.D.C.; knee pads: +1D6 S.D.C.; other spikes: 1D4 S.D.C.',
      },
      {
        label: 'Bonuses',
        value:
          '+1 to parry normal S.D.C. attacks with spiked armbands or gloves',
      },
      { label: 'Price', value: '50-200 credits' },
    ],
  },
  'rue-coalition-samas-power-armor': {
    description:
      'The PA-06A Strategic Armor Military Assault Suit is a one-pilot environmental flying power armor with Robotic P.S. 30. Its main body has 250 M.D.C.; it runs at 60 mph (96 km), flies at 300 mph (480 km), cruises at 150 mph (240 km), and reaches 500 feet (152 m). Its standard C-40R rail gun inflicts 1D4x10 M.D. per 40-round burst at 4,000 feet (1,219 m) and carries 50 bursts.',
    statistics: [
      {
        label: 'Damage',
        value: 'C-40R burst: 1D4x10 M.D.; single round: 1D4 M.D.',
      },
      { label: 'Range', value: 'C-40R: 4,000 feet (1,219 m)' },
      {
        label: 'Rate of Fire',
        value: 'Each 40-round burst counts as one melee attack.',
      },
      { label: 'Payload', value: '2,000-round drum; 50 bursts' },
      {
        label: 'Durability / Protection',
        value:
          'Main body 250 M.D.C.; head 70; wings 30 each; main rear jets 60 each',
      },
      {
        label: 'Speed',
        value:
          'Run 60 mph (96 km); fly 300 mph (480 km), cruise 150 mph (240 km)',
      },
      { label: 'Altitude', value: '500 feet (152 m)' },
      { label: 'Crew', value: 'One' },
      {
        label: 'Weight / Capacity',
        value: '340 lbs (153 kg) without rail gun; Robotic P.S. 30',
      },
      { label: 'Price', value: '1.6-2 million credits; rare' },
    ],
  },
}

const MEDICAL_IDS = new Set([
  'rue-band-aids',
  'rue-bandage-roll',
  'rue-bio-comp-monitor',
  'rue-compu-drug-dispenser',
  'rue-hypodermic-gun',
  'rue-hypodermic-syringe',
  'rue-irmss-internal-robot-medical-surgeon-system',
  'rue-palm-bio-unit',
  'rue-protein-healing-salve',
  'rue-rau-robot-antiseptic-units-cleaners',
  'rue-rmk-robot-medical-kit-knitter',
  'rue-rsu-robot-sedative-units-sleepers',
  'rue-standard-first-aid-kit',
  'rue-stethoscope',
  'rue-surgical-gloves',
  'rue-suture-gun',
  'rue-suture-tape',
  'rue-thermometer',
  'rue-wilks-laser-scalpel',
])
const COMMUNICATION_IDS = new Set([
  'rue-communications-helmet',
  'rue-field-radio',
  'rue-long-range-military-field-radio',
  'rue-medium-communicator',
  'rue-old-style-radio-communicator',
  'rue-small-communicator',
  'rue-video-communicator',
  'rue-ultraviolet-signaler',
])
const COMPUTER_MEDIA_IDS = new Set([
  'rue-mini-digital-video-camera',
  'rue-pdd-pocket-digital-disc-audio-player-recorder',
  'rue-pdd-v-pocket-digital-disc-audio-video-player',
  'rue-portable-computer',
  'rue-portable-field-computer',
  'rue-portable-language-translator',
])
const OPTICS_IDS = new Set([
  'rue-conventional-binoculars',
  'rue-cross-hair-sight',
  'rue-infrared-distancing-binoculars',
  'rue-infrared-optic-system',
  'rue-infrared-scope',
  'rue-laser-targeting-sight',
  'rue-light-filters',
  'rue-multi-optics-helmet',
  'rue-optics-band',
  'rue-passive-night-sight',
  'rue-passive-nightvision-scope',
  'rue-pocket-night-viewer',
  'rue-polarized-goggles',
  'rue-sunglasses-or-tinted-visor',
  'rue-telescopic-scope',
  'rue-thermal-imager-goggles',
  'rue-thermal-imager-scope',
  'rue-ultraviolet-system',
  'rue-video-wall-mount-camera',
  'rue-cheap-sunglasses',
  'rue-cheap-goggles',
  'rue-light-adjusting-sunglasses',
  'rue-magnifying-glass',
])
const SENSOR_IDS = new Set([
  'rue-acoustic-noise-generator',
  'rue-dosimeter',
  'rue-heat-sensor',
  'rue-irvt-internal-robot-visual-transmitters-seekers',
  'rue-large-military-radar',
  'rue-microwave-fence',
  'rue-mini-radar',
  'rue-motion-detector',
  'rue-portable-radar-detector',
  'rue-portable-scan-dihilator',
  'rue-pocket-signal-mirror',
  'rue-keyhole-or-tube-microphone',
  'rue-contact-microphone',
  'rue-wireless-microphone',
  'rue-tracer-bug',
  'rue-pocket-scrambler',
])
const SCIENCE_IDS = new Set([
  'rue-micro-scale',
  'rue-portable-bio-scan-and-bio-lab',
  'rue-portable-laboratory',
])
const ARMOR_IDS = new Set([
  'rue-cs-dead-boy-body-armor',
  'rue-cs-dog-pack-light-riot-armor',
  'rue-gladiator-full-environmental-body-armor',
  'rue-plastic-man-full-environmental-body-armor',
  'rue-huntsman-partial-body-armor',
  'rue-bushman-trooper-environmental-body-armor',
  'rue-urban-warrior-environmental-body-armor',
])
const SOURCE_WEAPON_IDS = new Set([
  'rue-c-18-laser-pistol',
  'rue-c-10-light-assault-laser-rifle',
  'rue-c-12-heavy-assault-laser-rifle',
  'rue-c-14-fire-breather-assault-laser-and-grenade-launcher',
  'rue-c-27-heavy-plasma-cannon',
  'rue-cv-212-variable-light-frequency-laser-rifle',
  'rue-cr-1-rocket-launcher',
  'rue-vibro-knife',
  'rue-vibro-bayonet',
  'rue-vibro-saber',
  'rue-vibro-sword',
  'rue-vibro-large-two-handed-sword',
  'rue-vibro-claws',
  'rue-cs-vibro-blade-vambraces',
  'rue-short-blade-hand-guard',
  'rue-forearm-long-blades',
  'rue-retractable-forearm-blades',
  'rue-combat-spikes-and-studs',
  'rue-neural-mace',
  'rue-wilks-320-laser-pistol',
  'rue-wilks-447-laser-rifle',
  'rue-wilks-portable-laser-torch',
  'rue-wilks-laser-wand',
  'rue-wilks-laser-scalpel',
  'rue-ng-57-heavy-duty-ion-blaster',
  'rue-ng-super-laser-pistol-and-grenade-launcher',
  'rue-ng-33-laser-pistol',
  'rue-ng-p7-particle-beam-rifle',
  'rue-ng-l5-laser-rifle',
  'rue-ng-juicer-assault-rifle-ja-11',
  'rue-ng-juicer-variable-laser-rifle-ja-12',
  'rue-ng-101-rail-gun',
  'rue-ng-202-rail-gun',
])

/**
 * Maps a source-backed RUE record into the Armory's functional taxonomy.
 * Explicit ID sets take precedence where names alone cannot distinguish use.
 *
 * @param {{ id: string, name: string }} item Catalog record to classify.
 * @returns {[string, string]} Top-level category and display subgroup.
 */
export function classifyRueItem(item) {
  const { id, name } = item
  if (MEDICAL_IDS.has(id)) return ['Medical', 'Treatment & Medical Systems']
  if (COMMUNICATION_IDS.has(id))
    return ['Communications', 'Radios & Communicators']
  if (COMPUTER_MEDIA_IDS.has(id))
    return ['Computers & Media', 'Computers, Recorders & Translators']
  if (OPTICS_IDS.has(id))
    return ['Optics & Surveillance', 'Viewing, Imaging & Targeting']
  if (SENSOR_IDS.has(id))
    return [
      'Sensors & Detection',
      /microphone|camera|tracer|scrambler/i.test(name)
        ? 'Surveillance & Countermeasures'
        : 'Sensors, Radar & Detection',
    ]
  if (SCIENCE_IDS.has(id))
    return ['Scientific & Laboratory', 'Analysis & Field Laboratories']
  if (ARMOR_IDS.has(id))
    return [
      'Armor',
      /partial|riot/i.test(name)
        ? 'Light & Partial Body Armor'
        : 'Environmental Body Armor',
    ]
  if (/power-armor$/.test(id)) return ['Power Armor', 'Powered Combat Armor']
  if (/robot|skelebot|spider-skull-walker/.test(id))
    return [
      'Robots',
      /skelebot/.test(id)
        ? 'Autonomous Combat Robots'
        : 'Piloted Combat Robots',
    ]
  if (
    /sky-cycle|hovercycle|motorcycle|mountaineer-atv|bicycle|jet-pack/.test(id)
  )
    return [
      'Vehicles',
      /jet-pack/.test(id)
        ? 'Personal Mobility'
        : /bicycle|motorcycle|hovercycle/.test(id)
          ? 'Cycles & Motorcycles'
          : 'Ground & Air Vehicles',
    ]
  if (
    /^rue-(?:short-range|medium-range|long-range|mini-missile)/.test(id) ||
    /(?:fusion-block|grenade)-family/.test(id)
  ) {
    if (/^rue-short-range/.test(id))
      return ['Ammunition & Explosives', 'Short-Range Missiles']
    if (/^rue-medium-range/.test(id))
      return ['Ammunition & Explosives', 'Medium-Range Missiles']
    if (/^rue-long-range/.test(id))
      return ['Ammunition & Explosives', 'Long-Range Missiles & Torpedoes']
    if (/^rue-mini-missile/.test(id))
      return ['Ammunition & Explosives', 'Mini-Missiles']
    if (/grenade/.test(id)) return ['Ammunition & Explosives', 'Grenades']
    return ['Ammunition & Explosives', 'Demolitions & Fusion Blocks']
  }
  if (SOURCE_WEAPON_IDS.has(id) || /knife|machete/.test(id)) {
    if (/vibro|forearm.*blade|short-blade-hand|combat-spikes/.test(id))
      return ['Melee Weapons', 'Vibro-Blades & Integrated Blades']
    if (/neural-mace/.test(id)) return ['Melee Weapons', 'Impact & Neural']
    if (/knife|machete/.test(id))
      return ['Melee Weapons', 'Conventional Blades']
    if (/torch|wand/.test(id)) return ['Utility & Field Gear', 'Powered Tools']
    if (/grenade-launcher/.test(id))
      return ['Ranged Weapons', 'Hybrid / Multi-System']
    if (/laser/.test(id)) return ['Ranged Weapons', 'Laser']
    if (/ion/.test(id)) return ['Ranged Weapons', 'Ion']
    if (/plasma/.test(id)) return ['Ranged Weapons', 'Plasma']
    if (/particle-beam/.test(id)) return ['Ranged Weapons', 'Particle Beam']
    if (/rail-gun/.test(id)) return ['Ranged Weapons', 'Projectile & Rail Gun']
    if (/rocket-launcher/.test(id))
      return ['Ranged Weapons', 'Missile, Rocket & Grenade Launchers']
    if (/juicer-assault-rifle/.test(id))
      return ['Ranged Weapons', 'Hybrid / Multi-System']
    throw new Error(`Unclassified weapon family: ${id}`)
  }
  if (/wooden-stakes/.test(id))
    return ['Melee Weapons', 'Piercing & Anti-Vampire']
  if (/hammer|mallet/.test(id)) return ['Utility & Field Gear', 'Hand Tools']
  if (/bandoleer|ammunition-belt/.test(id))
    return ['Utility & Field Gear', 'Load-Bearing Gear']
  if (/backpack|duffle-bag|knapsack|utility-belt/.test(id))
    return ['Utility & Field Gear', 'Packs & Load-Bearing Gear']
  if (/bedroll|blanket|sleeping-bag|canteen|air-filter|gas-mask/.test(id))
    return ['Utility & Field Gear', 'Survival & Environmental Gear']
  if (/flashlight|lighter|matches|lighter-fluid/.test(id))
    return ['Utility & Field Gear', 'Lighting & Firemaking']
  if (/compass|grappling-hook|rope|fishing-line|iron-spikes/.test(id))
    return ['Utility & Field Gear', 'Navigation, Climbing & Field Gear']
  return ['Utility & Field Gear', 'Personal & General Supplies']
}

/*
 * This catalog is publication data, not an OCR product. Each record carries
 * its audited printed page and exact source locator in the canonical JSON.
 * Never reintroduce token/fuzzy matching here: similar model numbers and
 * repeated table vocabulary make silent cross-item attribution too likely.
 */
if (!Array.isArray(catalog.items) || catalog.items.length !== 203)
  throw new Error('Expected exactly 203 source-backed RUE records')

const ids = new Set()
for (const item of catalog.items) {
  if (ids.has(item.id)) throw new Error(`Duplicate ID: ${item.id}`)
  ids.add(item.id)
  if (
    !Number.isInteger(item.page) ||
    !((item.page >= 240 && item.page <= 274) || item.page === 71)
  )
    throw new Error(`Invalid printed page for ${item.id}: ${item.page}`)
  if (
    !item.sourceLocator ||
    !['heading', 'table-row', 'rules-block'].includes(
      item.sourceLocator.kind,
    ) ||
    !item.sourceLocator.anchor
  )
    throw new Error(`Missing exact source locator for ${item.id}`)
  if (!item.description || item.description.length < 20)
    throw new Error(`Missing source-faithful description for ${item.id}`)
  if (!Array.isArray(item.statistics) || !item.statistics.length)
    throw new Error(`Missing normalized statistics for ${item.id}`)
  if (item.statistics.some(({ label }) => label === 'Source Details'))
    throw new Error(`Unnormalized Source Details fallback for ${item.id}`)

  const correction = SOURCE_CORRECTIONS[item.id]
  if (correction) Object.assign(item, correction)
  ;[item.category, item.subcategory] = classifyRueItem(item)
  item.name = cleanRueOcr(item.name)
  item.description = cleanRueOcr(item.description)
  item.statistics = item.statistics.map((statistic) => ({
    ...statistic,
    label: cleanRueOcr(statistic.label),
    value: cleanRueOcr(statistic.value),
    ...(statistic.details ? { details: cleanRueOcr(statistic.details) } : {}),
  }))
  if (item.description.length > 1500)
    throw new Error(
      `Overlong description for ${item.id}: ${item.description.length}`,
    )

  const assetId = item.id.replace(/^rue-/, '')
  item.image = assets.has(assetId)
    ? `/assets/items/rifts-ultimate-edition/${assetId}.webp`
    : null
  if (item.image && !existsSync(resolve(root, `public${item.image}`)))
    throw new Error(`Missing artwork for ${item.id}`)
}

const serializedCatalog = `${JSON.stringify(catalog, null, 2)}\n`
JSON.parse(serializedCatalog)
const temporaryPath = resolve(
  dirname(outputPath),
  `.${outputPath.slice(dirname(outputPath).length + 1)}.${process.pid}.tmp`,
)
try {
  writeFileSync(temporaryPath, serializedCatalog, { flag: 'wx' })
  renameSync(temporaryPath, outputPath)
} finally {
  if (existsSync(temporaryPath)) rmSync(temporaryPath)
}
console.log(
  `Validated ${catalog.items.length} explicit RUE source mappings (${catalog.items.filter(({ image }) => image).length} with catalog artwork; ${assets.size - catalog.items.filter(({ image }) => image).length} unused assets left untouched).`,
)

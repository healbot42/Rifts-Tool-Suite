import { armoryDefaultsForStartingItem } from './equipmentCatalog.js'

const source = (pages) => ({ book: 'Rifts Ultimate Edition', pages })
const entry = (id, kind, name, details = {}) => ({
  id,
  kind,
  name,
  quantity: 1,
  ...details,
})

const choose = (prompt, options = []) => ({ choice: { prompt, options } })
const kit = (prefix, items) =>
  items.map(([id, name, details]) =>
    entry(`${prefix}-${id}`, 'items', name, details),
  )

export const startingEquipmentPackages = {
  'combat-cyborg': {
    source: source('47-48'),
    entries: [
      entry('bionic-body', 'items', 'Full-conversion combat bionic body'),
      entry('mi-b2', 'armor', 'MI-B2 Medium Infantry Armor', { maxMdc: 230 }),
      entry('mechanical-eyes', 'items', 'Mechanical eyes', {
        notes:
          'Polarized filters, Clock Calendar, and two sensory systems of choice.',
      }),
      entry('bionic-weapons-tools', 'weapons', '', {
        quantity: 4,
        ...choose('Choose four bionic weapons or tools'),
      }),
      entry('bionic-features', 'items', '', {
        quantity: 4,
        ...choose('Choose four bionic features or accessories'),
      }),
      entry('upgrade-fund', 'items', 'Bionics upgrade fund', {
        notes: '3D6x1,000 + 15,000 credits',
      }),
      entry('cash', 'items', 'Starting credits', {
        notes: '1D4x1,000 credits plus 4D4x100 credits in Black Market goods',
      }),
    ],
  },
  crazy: {
    source: source('56-57'),
    entries: [
      entry('body-armor', 'armor', '', {
        ...choose('Choose light or medium body armor', [
          'Light M.D.C. body armor',
          'Medium M.D.C. body armor',
        ]),
      }),
      entry('ancient-weapons', 'weapons', '', {
        quantity: 2,
        ...choose('Choose two ancient weapons'),
      }),
      entry('vibro-knife', 'weapons', 'Vibro-Knife'),
      entry('energy-handgun', 'weapons', '', {
        ...choose('Choose an energy handgun'),
      }),
      entry('energy-rifle', 'weapons', '', {
        ...choose('Choose an energy rifle'),
      }),
      entry('weapon-clips', 'items', 'Spare E-Clips for each energy weapon', {
        quantity: 4,
      }),
      entry('covert-clothing', 'items', 'Covert clothing'),
      entry('dress-clothing', 'items', 'Dress clothing'),
      entry('survival-gear', 'items', 'Survival gear'),
      entry('personal-equipment', 'items', 'Personal equipment'),
      entry('cash', 'items', 'Starting credits', {
        notes:
          '2D6x100 credits plus one Black Market item worth 1D6x1,000 credits',
      }),
    ],
  },
  'cyber-knight': {
    source: source('66-67'),
    entries: [
      entry(
        'personalized-heavy-armor',
        'armor',
        'Personalized heavy M.D.C. body armor',
        {
          notes:
            '1D4x10+55 M.D.C.; usually knight-styled, and only about 15% are environmental suits.',
        },
      ),
      entry('light-armor', 'armor', 'Light M.D.C. body armor', {
        notes: '30-40 M.D.C.',
      }),
      entry('ancient-weapon', 'weapons', '', {
        ...choose('Choose an ancient weapon'),
      }),
      entry('modern-handgun', 'weapons', '', {
        ...choose('Choose a modern handgun'),
      }),
      entry('modern-rifle', 'weapons', '', {
        ...choose('Choose a modern rifle'),
      }),
      entry('handgun-clips', 'items', 'Spare handgun clips/E-Clips', {
        quantity: 3,
      }),
      entry('rifle-clips', 'items', 'Spare rifle clips/E-Clips', {
        quantity: 3,
      }),
      ...kit('adventuring', [
        ['gas-mask', 'Gas mask'],
        ['goggles', 'Goggles'],
        ['hatchet', 'Hatchet'],
        ['knives', 'Knives'],
        ['stakes', 'Wooden stakes'],
        ['cross', 'Cross'],
        ['first-aid-kit', 'First-aid kit'],
        ['tent', 'Tent'],
        ['backpack', 'Backpack'],
        ['sacks', 'Sacks'],
        ['canteens', 'Canteens'],
        ['rations', 'Rations', { quantity: '2 weeks' }],
        ['geiger-counter', 'Geiger counter'],
        ['personal-items', 'Personal items'],
      ]),
      entry('transport', 'vehicles', '', {
        ...choose('Choose transportation', [
          'Horse',
          'Robot or bionic horse',
          'Hovercycle',
          'Modified motorcycle',
        ]),
        notes:
          'Common choices include horse, robot/bionic horse, hovercycle or modified motorcycle.',
      }),
      entry('cash', 'items', 'Starting credits', {
        notes:
          '2D6x100 credits plus a Black Market item worth 2D6x1,000 credits',
      }),
    ],
  },
  'glitter-boy': {
    source: source('70'),
    entries: [
      entry('usa-g10', 'vehicles', 'USA-G10 Glitter Boy Power Armor', {
        maxMdc: 770,
        notes: 'Laser-resistant main body; includes Boom Gun.',
      }),
      entry('body-armor', 'armor', 'Environmental body armor'),
      entry('energy-rifle', 'weapons', '', {
        ...choose('Choose an energy rifle'),
      }),
      entry('energy-sidearm', 'weapons', '', {
        ...choose('Choose an energy sidearm'),
      }),
      entry('energy-clips', 'items', 'Spare E-Clips for each energy weapon', {
        quantity: 4,
      }),
      entry('other-weapon', 'weapons', '', {
        ...choose('Choose a non-energy weapon'),
      }),
      entry('grenades', 'weapons', 'Hand grenades', { quantity: 2 }),
      entry('smoke-grenades', 'weapons', 'Smoke grenades', { quantity: 2 }),
      ...kit('field', [
        ['flares', 'Signal flares', { quantity: 6 }],
        ['survival-knife', 'Survival knife'],
        ['utility-belt', 'Utility belt'],
        ['gas-mask', 'Gas mask'],
        ['radio', 'Radio'],
        ['fatigues', 'Fatigues'],
        ['boots', 'Boots'],
        ['canteen', 'Canteen'],
        ['robot-medical-kit', 'Robot medical kit'],
        ['irmss', 'IRMSS'],
        ['personal-items', 'Personal items'],
      ]),
      entry('cash', 'items', 'Starting credits', {
        notes: '4D6x100 credits plus 1D4x1,000 credits in Black Market items',
      }),
    ],
  },
  headhunter: {
    source: source('76-77'),
    entries: [
      entry('energy-rifle', 'weapons', '', {
        ...choose('Choose an energy rifle'),
      }),
      entry('sidearm', 'weapons', '', { ...choose('Choose a sidearm') }),
      entry('rifle-reloads', 'items', 'Rifle E-Clips/ammunition', {
        quantity: 6,
      }),
      entry('sidearm-reloads', 'items', 'Sidearm E-Clips/ammunition', {
        quantity: 6,
      }),
      entry('other-weapons', 'weapons', '', {
        quantity: 3,
        ...choose('Choose three additional weapons'),
        notes: 'Each has three reloads.',
      }),
      entry('small-knives', 'weapons', 'Small knives', { quantity: '1D4' }),
      entry('survival-knife', 'weapons', 'Survival knife'),
      entry('vibro-knife', 'weapons', 'Vibro-Knife'),
      entry('grenades', 'weapons', 'Grenades', { quantity: '1D6' }),
      entry('light-armor', 'armor', 'Light armor for covert operations'),
      entry('heavy-armor', 'armor', 'Heavy combat armor'),
      ...kit('field', [
        ['gas-mask', 'Gas mask'],
        ['goggles', 'Goggles'],
        ['hatchet', 'Hatchet'],
        ['backpack', 'Backpack'],
        ['sacks', 'Sacks'],
        ['tent', 'Tent'],
        ['rmk', 'Robot medical kit'],
        ['irmss', 'IRMSS'],
        ['containers', 'Equipment containers'],
        ['canteens', 'Canteens', { quantity: 2 }],
        ['rations', 'Rations', { quantity: '1D4 weeks' }],
        ['clothing', 'Clothing'],
        ['personal-items', 'Personal items'],
      ]),
      entry('implants', 'items', '', {
        ...choose('Choose cybernetic/bionic starting package'),
        notes:
          'Choose 1D4+1 implants plus one bionic limb and two limb weapons/components, or the partial-borg package on page 77.',
      }),
      entry('cash', 'items', 'Starting credits', {
        notes: '1D6x100 credits plus 1D6x1,000 credits in Black Market goods',
      }),
    ],
  },
  juicer: {
    source: source('80-81'),
    entries: [
      entry('flex-plate', 'armor', 'Juicer lightweight flex-plate armor'),
      entry('ja11', 'weapons', 'JA-11 Juicer Assassin energy rifle'),
      entry('energy-pistol', 'weapons', '', {
        ...choose('Choose an energy pistol'),
      }),
      entry('energy-clips', 'items', 'Spare E-Clips for each energy weapon', {
        quantity: '2D4',
      }),
      entry('non-energy', 'weapons', '', {
        ...choose('Choose a non-energy weapon'),
      }),
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
      }),
      entry('vibro-knife', 'weapons', 'Vibro-Knife', { notes: '1D6 M.D.' }),
      ...kit('juicer-system', [
        ['bio-comp', 'Bio-comp'],
        ['bio-data-implants', 'Bio-data implants'],
        ['drug-harness', 'Drug harness'],
        ['drug-supply', 'Drug supply'],
      ]),
      ...kit('field', [
        ['optic-helmet', 'Optic helmet'],
        ['portable-irmss', 'Portable IRMSS'],
        ['camouflage-fatigues', 'Camouflage fatigues'],
        ['grey-fatigues', 'Grey fatigues'],
        ['boots', 'Boots'],
        ['gloves', 'Gloves'],
        ['backpack', 'Backpack'],
        ['utility-belt', 'Utility belt'],
        ['sunglasses', 'Sunglasses'],
        ['canteen', 'Canteen'],
        ['compass', 'Compass'],
        ['personal-items', 'Personal items'],
      ]),
      entry('cash', 'items', 'Starting credits', {
        notes: '4D6x100 credits plus 4D6x100 credits in Black Market items',
      }),
    ],
  },
  'merc-soldier': {
    source: source('83'),
    entries: [
      entry('body-armor', 'armor', '', {
        ...choose('Choose medium or heavy body armor', [
          'Medium M.D.C. body armor',
          'Heavy M.D.C. body armor',
        ]),
      }),
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
      }),
      entry('wp-clips', 'items', 'Spare E-Clips for each applicable weapon', {
        quantity: '1D4+3',
      }),
      entry('smoke-grenades', 'weapons', 'Smoke grenades', { quantity: 2 }),
      entry('flares', 'items', 'Signal flares', { quantity: 3 }),
      entry('vibro-knife', 'weapons', 'Vibro-Knife', { notes: '1D6 M.D.' }),
      entry('survival-knife', 'weapons', 'Survival knife'),
      ...kit('field', [
        ['uniforms', 'Uniforms'],
        ['utility-belt', 'Utility belt'],
        ['canteens', 'Canteens', { quantity: 2 }],
        ['flashlight', 'Flashlight'],
        ['lighter', 'Lighter'],
        ['gas-mask', 'Gas mask'],
        ['radio', 'Radio'],
        ['personal-items', 'Personal items'],
      ]),
      entry('cash', 'items', 'Starting credits', {
        notes: '2D6x100 credits plus 1D4x1,000 credits in Black Market items',
      }),
    ],
  },
  'robot-pilot': {
    source: source('85'),
    entries: [
      entry('light-armor', 'armor', 'Light M.D.C. body armor'),
      entry('heavy-armor', 'armor', 'Heavy M.D.C. body armor'),
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
      }),
      entry('sidearm', 'weapons', '', {
        ...choose('Choose a sidearm', ['Handgun', 'Energy pistol']),
      }),
      entry('clips', 'items', 'Spare E-Clips for each applicable weapon', {
        quantity: '1D4+2',
      }),
      entry('vibro-weapon', 'weapons', '', {
        ...choose('Choose a Vibro-weapon', ['Vibro-Knife', 'Vibro-Sword']),
      }),
      entry('grenades', 'weapons', 'Explosive grenades', { quantity: 2 }),
      entry('smoke-grenades', 'weapons', 'Smoke grenades', { quantity: 2 }),
      ...kit('field', [
        ['flares', 'Signal flares', { quantity: 4 }],
        ['survival-knife', 'Survival knife'],
        ['first-aid-kit', 'First-aid kit'],
        ['pocket-computer', 'Pocket computer'],
        ['flashlight', 'Flashlight'],
        ['lighter', 'Lighter'],
        ['utility-belt', 'Utility belt'],
        ['gas-mask', 'Gas mask'],
        ['radio', 'Radio'],
        ['uniforms', 'Uniforms'],
        ['boots', 'Boots'],
        ['canteen', 'Canteen'],
        ['personal-items', 'Personal items'],
      ]),
      entry('gyro-compass', 'items', 'Gyro-Compass implant'),
      entry('clock-calendar', 'items', 'Clock Calendar implant'),
      entry('cash', 'items', 'Starting credits', {
        notes: '1D6x100 credits plus 1D6x1,000 credits in Black Market items',
      }),
    ],
  },
  'body-fixer': {
    source: source('87-88'),
    entries: [
      entry('light-armor', 'armor', 'Light M.D.C. body armor'),
      ...kit('medical', [
        ['surgical-gowns', 'Surgical gowns', { quantity: 2 }],
        ['disposable-gloves', 'Disposable surgical gloves', { quantity: 12 }],
        ['reusable-gloves', 'Reusable surgical gloves'],
        ['surgical-kit', 'Surgical kit'],
        ['medical-kit', 'Medical kit'],
        ['irmss', 'IRMSS/Internal Robot Micro-Surgeon System'],
        ['rmk', 'RMK/Robot Medical Kit'],
        ['computer', 'Hand-held computer'],
        ['blood-pressure', 'Computerized blood-pressure machine'],
        ['thermometer', 'Thermometer'],
        ['vials', 'Unbreakable vials', { quantity: 6 }],
        ['drug-dispenser', 'Portable compu-drug dispenser'],
        ['laboratory', 'Portable laboratory'],
        ['backpack', 'Backpack'],
        ['medical-bag', 'Medical bag or satchel'],
      ]),
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
        notes: 'Includes two E-Clips for each applicable weapon.',
      }),
      entry('vibro-knife', 'weapons', 'Vibro-Knife', { notes: '1D6 M.D.' }),
      entry('scalpels', 'weapons', 'Scalpels', {
        quantity: 2,
        notes: '1D4 S.D.C. each.',
      }),
      entry('laser-scalpel', 'weapons', "Wilk's Laser Scalpel"),
      ...kit('travel', [
        ['flashlight', 'Flashlight'],
        ['pen-flashlight', 'Pen flashlight'],
        ['hat', 'Brimmed hat'],
        ['poncho', 'Hooded cape or poncho'],
        ['canteen', 'Canteen'],
        ['sunglasses', 'Sunglasses'],
        ['air-filter', 'Air filter'],
        ['notepad', 'Pocket notepad'],
        ['pens', 'Pens', { quantity: 2 }],
        ['personal-items', 'Personal items'],
      ]),
      entry('transport', 'vehicles', '', {
        ...choose(
          'Choose a commercial vehicle matching a Pilot skill, or a horse if able to ride',
        ),
      }),
      entry('cash', 'items', 'Starting credits', {
        notes:
          'City/Burbs doctor: 5D6x1,000 credits. Wandering Body Fixer: 1D6x1,000 credits plus 3D6x1,000 in Black Market saleable items.',
      }),
    ],
  },
  'city-rat': {
    source: source('89'),
    entries: [
      ...kit('clothing', [
        ['working-clothes', 'Sets of working clothes', { quantity: 2 }],
        ['fashion-clothes', 'Fashionable wardrobe'],
      ]),
      entry('light-armor', 'armor', '', {
        ...choose('Choose a common light M.D.C. body armor'),
      }),
      entry('sdc-knife', 'weapons', 'S.D.C. knife', { notes: '1D6 S.D.C.' }),
      entry('handgun', 'weapons', 'S.D.C. handgun', {
        notes: '3D6 or 4D6 S.D.C.',
      }),
      entry('energy-pistol', 'weapons', 'M.D. energy pistol', {
        notes: 'Typically 2D6 or 3D6 M.D.',
      }),
      entry('energy-clips', 'items', 'Energy pistol E-Clips', { quantity: 2 }),
      ...kit('street', [
        ['flashlight', 'Flashlight'],
        ['rope', '900 pound test nylon cord/rope'],
        ['grappling-hook', 'Grappling hook'],
        ['rmk', 'RMK/Robot Medical Kit (Stitcher)'],
        ['pdd', 'PDD/Pocket Digital Disc player and recorder'],
        ['personal-items', 'Personal items'],
      ]),
      entry('vehicle', 'vehicles', '', {
        ...choose('Choose bicycle and motorcycle, or a junker hovercycle'),
        notes: 'Junker hovercycle has half M.D.C. and 30% lower maximum speed.',
      }),
      entry('implants', 'items', '', {
        ...choose('Optionally choose up to 1D4+2 basic cybernetic implants'),
        notes: 'Restricted to common Commercial and Black Market cybernetics.',
      }),
      entry('cash', 'items', 'Starting credits', {
        notes:
          '6D6x100 credits plus one Black Market item worth 3D4x1,000 credits.',
      }),
    ],
  },
  'cyber-doc': {
    source: source('91'),
    entries: [
      entry('body-armor', 'armor', '', {
        ...choose('Choose light or medium flexible M.D.C. body armor'),
      }),
      ...kit('medical', [
        ['surgical-gowns', 'Surgical gowns', { quantity: 2 }],
        ['disposable-gloves', 'Disposable surgical gloves', { quantity: 12 }],
        ['reusable-gloves', 'Reusable surgical gloves'],
        ['surgical-kit', 'Surgical kit'],
        ['medical-kit', 'Medical kit'],
        ['irmss', 'IRMSS/Robot Micro-Surgeon kit'],
        ['drug-dispenser', 'Portable compu-drug dispenser'],
        ['pocket-computer', 'Pocket computer'],
        ['laboratory', 'Portable laboratory'],
        ['backpack', 'Backpack'],
        ['satchel', 'Large satchel'],
      ]),
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
        notes: 'Includes two E-Clips for each applicable weapon.',
      }),
      entry('vibro-knife', 'weapons', 'Vibro-Knife', { notes: '1D6 M.D.' }),
      entry('scalpels', 'weapons', 'Scalpels', {
        quantity: 6,
        notes: '1D4 S.D.C. each.',
      }),
      entry('notepad', 'items', 'Pocket notepad'),
      entry('pens', 'items', 'Pens', { quantity: 2 }),
      entry('personal-items', 'items', 'Personal items'),
      entry('cash', 'items', 'Starting credits', {
        notes:
          'City doctor: 4D6x1,000 credits. Wandering Cyber-Doc: 6D6x100 credits plus 2D6x1,000 in Black Market saleable cybernetic and bionic parts.',
      }),
    ],
  },
  operator: {
    source: source('93'),
    entries: [
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
      }),
      entry('large-wrench', 'weapons', 'Large wrench', {
        notes: 'W.P. Blunt; 2D6 S.D.C.',
      }),
      entry('hammer', 'weapons', 'Hammer', { notes: 'W.P. Blunt; 2D6 S.D.C.' }),
      entry('body-armor', 'armor', '', {
        ...choose('Choose light or medium M.D.C. body armor'),
        notes: 'Has 10% more M.D.C. from an Operator buddy.',
      }),
      ...kit('tools', [
        ['portable-tool-kit', 'Portable tool kit'],
        ['large-tool-kit', 'Large tool kit'],
        ['soldering-iron', 'Soldering iron'],
        ['laser-torch', 'Laser welding torch'],
        ['duct-tape', 'Roll of duct tape'],
        ['electrical-tape', 'Rolls of electrical tape', { quantity: 2 }],
        ['pen-flashlight', 'Pen flashlight'],
        ['flashlight', 'Large flashlight'],
        ['flares', 'Flares', { quantity: 12 }],
        ['rope', 'Super-lightweight rope', { quantity: '200 feet' }],
        ['knives', 'Knives', { quantity: 2 }],
        ['notebook', 'Notebook'],
        ['disc-recorder', 'Portable disc recorder'],
        ['translator', 'Portable language translator'],
        ['protective-goggles', 'Protective goggles'],
        ['work-gloves', 'Work gloves'],
        ['doctor-gloves', "Pairs of thin doctor's gloves", { quantity: '1D4' }],
        ['backpack', 'Backpack'],
        ['satchel', 'Satchel'],
        ['sack', 'Large sack'],
        ['canteen', 'Canteen'],
        ['work-clothes', 'Work clothes and overalls'],
        ['utility-belt', 'Utility belt'],
        ['air-filter', 'Air filter'],
        ['pens', 'Pens', { quantity: 2 }],
        ['personal-items', 'Personal items'],
      ]),
      entry('vehicles', 'vehicles', '', {
        quantity: 2,
        ...choose('Choose two commercial vehicles matching Pilot skills'),
      }),
      entry('cash', 'items', 'Starting credits', {
        notes:
          'City Operator: 4D4x1,000 credits. Wandering Operator: 5D6x100 credits plus 3D4x1,000 in Black Market saleable items.',
      }),
    ],
  },
  'rogue-scholar': {
    source: source('95'),
    entries: [
      entry('light-armor', 'armor', 'Light M.D.C. body armor'),
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
      }),
      ...kit('scholar', [
        ['travel-clothes', 'Traveling clothes'],
        ['dress-clothes', 'Dress clothes'],
        [
          'disc-recorder',
          'Portable compact disc recorder/player and headphones',
        ],
        ['video-player', 'Video disc player'],
        ['digital-camera', 'Digital camera'],
        ['translator', 'Portable language translator'],
        ['notebooks', 'Pocket notebooks', { quantity: 2 }],
        ['paper', 'Sketch pad or blank paper'],
        ['pencils', 'Pencils and markers', { quantity: 12 }],
        ['dip-pen', 'Dip pen and ink'],
        ['magnifying-glass', 'Magnifying glass'],
        ['binoculars', 'Normal binoculars'],
        ['hat', 'Hat'],
        ['survival-knife', 'Survival knife'],
        ['bedroll', 'Bedroll'],
        ['knapsack', 'Knapsack'],
        ['backpack', 'Backpack'],
        ['artifact-case', 'Artifact carrying case'],
        ['book-sack', 'Extra pack or sack for books'],
        ['radio', 'Long-range radio'],
        ['personal-items', 'Personal items'],
      ]),
      entry('vehicle', 'vehicles', '', {
        ...choose(
          'Choose a non-military commercial vehicle matching a Pilot skill',
        ),
      }),
      entry('cash', 'items', 'Starting credits', {
        notes:
          '2D6x100 credits plus 3D6x1,000 in Black Market saleable artifacts.',
      }),
    ],
  },
  'rogue-scientist': {
    source: source('96-97'),
    entries: [
      entry('light-armor', 'armor', 'Light M.D.C. body armor'),
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
        notes: 'Includes two E-Clips for each applicable weapon.',
      }),
      entry('scalpel-or-knife', 'weapons', '', {
        ...choose('Choose a laser scalpel or Vibro-Knife'),
      }),
      ...kit('field', [
        ['pdd', 'P.D.D. pocket audio digital disc recorder/player'],
        ['blank-discs', 'Blank audio discs', { quantity: 12 }],
        ['notepad', 'Notepad'],
        ['markers', 'Markers'],
        ['mechanical-pencil', 'Mechanical pencil'],
        ['computer', 'Portable hand-held computer with micro-printer'],
        ['distance-finder', 'Pocket laser distance finder'],
        ['tape-measure', 'Conventional tape measure'],
        ['camera', 'Digital camera'],
        ['video-discs', 'Blank video discs', { quantity: 12 }],
        ['multi-optics', 'Multi-optics band'],
        ['pen-flashlight', 'Pen flashlight'],
        ['flashlight', 'Large flashlight'],
        ['backpack', 'Backpack'],
        ['knapsack', 'Knapsack'],
        ['utility-belt', 'Utility belt'],
        ['ammo-belt', 'Ammo belt'],
        ['canteen', 'Canteen'],
        ['sunglasses', 'Sunglasses'],
        ['goggles', 'Goggles'],
        ['radio', 'Walkie-talkie radio'],
        ['air-filter', 'Air filter'],
        ['gas-mask', 'Gas mask'],
        ['rope', 'Lightweight rope', { quantity: '100 feet' }],
        ['tool-kit', 'Tool kit'],
      ]),
      entry('hand-pick', 'weapons', 'Hand pick', { notes: '1D4 S.D.C.' }),
      entry('survival-knife', 'weapons', 'Survival knife', {
        notes: '1D6 S.D.C.',
      }),
      ...kit('specimen', [
        ['cases', 'Specimen cases', { quantity: 6, notes: 'If applicable.' }],
        [
          'dishes',
          'Specimen dishes',
          { quantity: 12, notes: 'If applicable.' },
        ],
        ['test-tubes', 'Test tubes', { quantity: 6, notes: 'If applicable.' }],
        ['jars', 'Specimen jars', { quantity: '1D4', notes: 'If applicable.' }],
        [
          'slides',
          'Microscope slides',
          { quantity: 24, notes: 'If applicable.' },
        ],
        ['microscope', 'Portable microscope', { notes: 'If applicable.' }],
        ['scalpel', 'Scalpel', { notes: 'If applicable.' }],
        ['pins', 'Pins', { notes: 'If applicable.' }],
        ['tweezers', 'Tweezers', { notes: 'If applicable.' }],
      ]),
      entry('cash', 'items', 'Starting credits', {
        notes:
          '1D6x1,000 credits plus 3D6x1,000 in Black Market saleable artifacts.',
      }),
    ],
  },
  vagabond: {
    source: source('98'),
    entries: [
      entry('body-armor', 'armor', '', {
        ...choose('Choose battered light or medium M.D.C. body armor'),
      }),
      ...kit('personal', [
        ['clothes', 'Clothes being worn'],
        ['extra-clothes', 'Extra set of clothes'],
        ['baseball-cap', 'Baseball cap'],
        ['jacket', 'Jacket or coat'],
        ['flashlight', 'Flashlight'],
        ['backpack', 'Backpack'],
        ['sleeping-bag', 'Sleeping bag'],
        ['duffle', 'Small duffle bag'],
        ['wallet', 'Wallet with I.D.'],
        ['bandages', 'Bandages', { quantity: 2 }],
        ['aspirin', 'Pack of aspirin'],
        ['comb', 'Comb'],
        ['toothbrush', 'Toothbrush and toothpaste'],
        ['soap', 'Bar of soap'],
        ['candy', 'Pieces of candy'],
        ['plastic-bag', 'Sturdy plastic bag'],
        ['canteen', 'Canteen'],
        ['sunglasses', 'Sunglasses'],
      ]),
      entry('knife', 'weapons', 'Knife'),
      entry('gun', 'weapons', '', {
        ...choose('Choose a gun'),
        notes: 'Includes one extra clip of ammunition.',
      }),
      entry('transport', 'vehicles', '', {
        ...choose('Choose an old rusty car, motorcycle, or basic horse'),
      }),
      entry('cash', 'items', 'Starting credits and goods', {
        notes: '2D6x100 credits plus 2D6x100 in Black Market saleable goods.',
      }),
    ],
  },
  'wilderness-scout': {
    source: source('100'),
    entries: [
      entry('light-armor', 'armor', 'Light M.D.C. body armor'),
      entry('wp-weapons', 'weapons', '', {
        ...choose('Choose one weapon for each W.P.'),
        notes: 'Includes 1D4 E-Clips for each applicable weapon.',
      }),
      entry('survival-knife', 'weapons', 'Survival knife', {
        notes: '1D6 S.D.C.',
      }),
      entry('hand-axe', 'weapons', 'Hand axe', { notes: '1D6 S.D.C.' }),
      entry('vibro-weapon', 'weapons', '', {
        ...choose('Choose a Vibro-Knife or Saber'),
      }),
      ...kit('field', [
        ['clothing', 'Wilderness clothing'],
        ['boots', 'Extra pair of boots'],
        ['hat', 'Hat or helmet'],
        ['sunglasses', 'Sunglasses or tinted visor'],
        ['air-filter', 'Air filter'],
        ['first-aid', 'First-aid kit'],
        ['knapsack', 'Knapsack'],
        ['backpack', 'Backpack'],
        ['utility-belt', 'Utility/ammo belt'],
        ['sacks', 'Sacks', { quantity: 2 }],
        ['cord', 'Short pieces of cord'],
        ['rope', 'Lightweight rope', { quantity: '100 feet' }],
        ['iron-spikes', 'Iron spikes', { quantity: 6 }],
        ['wooden-spikes', 'Wooden spikes', { quantity: 6 }],
        ['cross', 'Eight-inch wooden cross'],
        ['hammer', 'Hammer'],
        ['mallet', 'Mallet'],
        ['utility-knife', 'Utility knife'],
        ['skinning-knife', 'Animal skinning knife'],
        ['fishing-gear', 'Fishing line and hooks'],
        ['snares', 'Animal snares'],
        ['canteens', 'Canteens', { quantity: 2 }],
        ['flares', 'Flares', { quantity: 6 }],
        ['binoculars', 'Infrared binoculars with digital distance readout'],
        ['nightvision', 'Passive nightvision goggles'],
        ['telescopic-sight', 'Telescopic gun sight'],
      ]),
      entry('vehicle', 'vehicles', '', {
        ...choose('Choose a reliable shabby vehicle matching a Pilot skill'),
        notes: 'Missing 1D4x10% of its original M.D.C.',
      }),
      entry('cash', 'items', 'Starting credits and goods', {
        notes:
          '3D6x100 credits plus 3D4x1,000 in Black Market items, animal pelts, or furs.',
      }),
    ],
  },
}

export const specializationEquipmentPackages = {
  'robot-pilot:power-armor-pilot': {
    source: source('84'),
    entries: [
      entry('ng-samson', 'vehicles', 'NG-Samson power armor'),
      entry(
        'second-power-armor',
        'vehicles',
        '',
        choose('Choose a second open-market power armor'),
      ),
    ],
  },
  'robot-pilot:robot-pilot': {
    source: source('84'),
    entries: [
      entry('giant-robot', 'vehicles', '', {
        ...choose('Choose an open-market giant robot'),
      }),
      entry(
        'conventional-transport',
        'vehicles',
        'Conventional non-combat vehicle',
      ),
    ],
  },
}

export function reconcileStartingEquipment(
  equipment,
  packageData,
  origin,
  { weaponProficiencies = [] } = {},
) {
  if (!packageData) return equipment
  const entries = packageData.entries.flatMap((item) => {
    if (item.choice?.prompt === 'Choose one weapon for each W.P.') {
      const proficiencies = weaponProficiencies.length
        ? weaponProficiencies
        : [{ id: 'unassigned', name: 'unassigned W.P.' }]
      return proficiencies.map((proficiency) => ({
        ...item,
        id: `${item.id}-${proficiency.id}`,
        choice: {
          ...item.choice,
          prompt: `Choose a weapon for ${proficiency.name}`,
          rulePrompt: item.choice.prompt,
          weaponProficiency: proficiency.id,
        },
      }))
    }
    const count =
      item.choice && Number.isInteger(item.quantity) ? item.quantity : 1
    if (count <= 1) return [item]
    return Array.from({ length: count }, (_, index) => ({
      ...item,
      id: `${item.id}-${index + 1}`,
      quantity: 1,
      choice: {
        ...item.choice,
        prompt: `${item.choice.prompt} ${index + 1}`,
        rulePrompt: item.choice.prompt,
      },
    }))
  })
  const managedPrefix = `starting:${origin}:`
  const expectedIds = new Set(
    entries.map((item) => `${managedPrefix}${item.id}`),
  )
  const next = Object.fromEntries(
    Object.entries(equipment).map(([kind, items]) => [
      kind,
      items.filter(
        (item) =>
          !item.id?.startsWith(managedPrefix) || expectedIds.has(item.id),
      ),
    ]),
  )
  for (const item of entries) {
    const managedId = `${managedPrefix}${item.id}`
    const existing = Object.values(next)
      .flat()
      .find((candidate) => candidate.id === managedId)
    if (existing) {
      existing.choice = item.choice
      existing.source = packageData.source
      if (
        item.choice &&
        (/\bof choice\b|\bor\b/i.test(existing.name) ||
          /one weapon for each w\.p\./i.test(existing.name))
      )
        existing.name = ''
      const defaults = armoryDefaultsForStartingItem(existing)
      if (defaults && !existing.catalogSelectionId)
        for (const [key, value] of Object.entries(defaults))
          if (existing[key] == null || existing[key] === '')
            existing[key] = value
      continue
    }
    const defaults = armoryDefaultsForStartingItem(item)
    next[item.kind].push({
      ...(defaults || {}),
      ...item,
      id: managedId,
      source: packageData.source,
      startingOrigin: origin,
    })
  }
  return next
}

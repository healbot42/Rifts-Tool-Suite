const source = (pages) => ({ book: 'Rifts Ultimate Edition', pages })
const entry = (id, kind, name, details = {}) => ({
  id,
  kind,
  name,
  quantity: 1,
  ...details,
})

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
      entry('bionic-weapons-tools', 'weapons', 'Bionic weapons or tools', {
        quantity: 4,
      }),
      entry('bionic-features', 'items', 'Bionic features and accessories', {
        quantity: 4,
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
      entry('body-armor', 'armor', 'Light or medium M.D.C. body armor'),
      entry('ancient-weapons', 'weapons', 'Ancient weapons of choice', {
        quantity: 2,
      }),
      entry('vibro-knife', 'weapons', 'Vibro-Knife'),
      entry('energy-handgun', 'weapons', 'Energy handgun of choice'),
      entry('energy-rifle', 'weapons', 'Energy rifle of choice'),
      entry('weapon-clips', 'items', 'Spare E-Clips for each energy weapon', {
        quantity: 4,
      }),
      entry('clothing', 'items', 'Covert and dress clothing'),
      entry('survival-gear', 'items', 'Survival gear and personal equipment'),
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
      entry('ancient-weapon', 'weapons', 'Ancient weapon of choice'),
      entry('modern-handgun', 'weapons', 'Modern handgun of choice'),
      entry('modern-rifle', 'weapons', 'Modern rifle of choice'),
      entry(
        'weapon-clips',
        'items',
        'Spare ammo clips/E-Clips for handgun and rifle',
        { quantity: 3 },
      ),
      entry(
        'adventuring-kit',
        'items',
        'Gas mask, goggles, hatchet, knives, stakes, cross, first-aid kit, tent, packs, canteens, two weeks of rations, Geiger counter and personal items',
      ),
      entry('transport', 'vehicles', 'Transportation of choice', {
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
      entry('energy-rifle', 'weapons', 'Energy rifle of choice'),
      entry('energy-sidearm', 'weapons', 'Energy sidearm of choice'),
      entry('energy-clips', 'items', 'Spare E-Clips for each energy weapon', {
        quantity: 4,
      }),
      entry('other-weapon', 'weapons', 'Non-energy weapon of choice'),
      entry('grenades', 'weapons', 'Hand grenades', { quantity: 2 }),
      entry('smoke-grenades', 'weapons', 'Smoke grenades', { quantity: 2 }),
      entry(
        'field-gear',
        'items',
        'Six signal flares, survival knife, utility belt, gas mask, radio, fatigues, boots, canteen, robot medical kit, IRMSS and personal items',
      ),
      entry('cash', 'items', 'Starting credits', {
        notes: '4D6x100 credits plus 1D4x1,000 credits in Black Market items',
      }),
    ],
  },
  headhunter: {
    source: source('76-77'),
    entries: [
      entry('energy-rifle', 'weapons', 'Energy rifle of choice'),
      entry('sidearm', 'weapons', 'Sidearm of choice'),
      entry(
        'primary-reloads',
        'items',
        'E-Clips/ammunition for rifle and sidearm',
        { quantity: 6 },
      ),
      entry('other-weapons', 'weapons', 'Additional weapons of choice', {
        quantity: 3,
        notes: 'Each has three reloads.',
      }),
      entry('small-knives', 'weapons', 'Small knives', { quantity: '1D4' }),
      entry('survival-knife', 'weapons', 'Survival knife'),
      entry('vibro-knife', 'weapons', 'Vibro-Knife'),
      entry('grenades', 'weapons', 'Grenades', { quantity: '1D6' }),
      entry('light-armor', 'armor', 'Light armor for covert operations'),
      entry('heavy-armor', 'armor', 'Heavy combat armor'),
      entry(
        'field-gear',
        'items',
        'Gas mask, goggles, hatchet, packs, tent, RMK, IRMSS, containers, two canteens, 1D4 weeks of rations, clothing and personal items',
      ),
      entry('implants', 'items', 'Cybernetic/bionic starting package', {
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
      entry('energy-pistol', 'weapons', 'Energy pistol of choice'),
      entry('energy-clips', 'items', 'Spare E-Clips for each energy weapon', {
        quantity: '2D4',
      }),
      entry('non-energy', 'weapons', 'Non-energy weapon of choice'),
      entry('wp-weapons', 'weapons', 'One weapon for each W.P.'),
      entry('vibro-knife', 'weapons', 'Vibro-Knife', { notes: '1D6 M.D.' }),
      entry(
        'juicer-system',
        'items',
        'Bio-comp, bio-data implants, drug harness and drug supply',
      ),
      entry(
        'field-gear',
        'items',
        'Optic helmet, portable IRMSS, camouflage and grey fatigues, boots, gloves, backpack, utility belt, sunglasses, canteen, compass and personal items',
      ),
      entry('cash', 'items', 'Starting credits', {
        notes: '4D6x100 credits plus 4D6x100 credits in Black Market items',
      }),
    ],
  },
  'merc-soldier': {
    source: source('83'),
    entries: [
      entry(
        'body-armor',
        'armor',
        'Medium or heavy M.D.C. body armor of choice',
      ),
      entry('wp-weapons', 'weapons', 'One weapon for each W.P.'),
      entry('wp-clips', 'items', 'Spare E-Clips for each applicable weapon', {
        quantity: '1D4+3',
      }),
      entry('smoke-grenades', 'weapons', 'Smoke grenades', { quantity: 2 }),
      entry('flares', 'items', 'Signal flares', { quantity: 3 }),
      entry('vibro-knife', 'weapons', 'Vibro-Knife', { notes: '1D6 M.D.' }),
      entry('survival-knife', 'weapons', 'Survival knife'),
      entry(
        'field-gear',
        'items',
        'Uniforms, utility belt, two canteens, flashlight, lighter, gas mask, radio and personal items',
      ),
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
      entry('wp-weapons', 'weapons', 'One weapon for each W.P.'),
      entry('sidearm', 'weapons', 'Handgun or energy pistol of choice'),
      entry('clips', 'items', 'Spare E-Clips for each applicable weapon', {
        quantity: '1D4+2',
      }),
      entry('vibro-weapon', 'weapons', 'Vibro-Knife or Vibro-Sword'),
      entry('grenades', 'weapons', 'Explosive grenades', { quantity: 2 }),
      entry('smoke-grenades', 'weapons', 'Smoke grenades', { quantity: 2 }),
      entry(
        'field-gear',
        'items',
        'Four flares, survival knife, first-aid kit, pocket computer, flashlight, lighter, utility belt, gas mask, radio, uniforms, boots, canteen and personal items',
      ),
      entry('implants', 'items', 'Gyro-Compass and Clock Calendar implants'),
      entry('cash', 'items', 'Starting credits', {
        notes: '1D6x100 credits plus 1D6x1,000 credits in Black Market items',
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
        'Second open-market power armor of choice',
      ),
    ],
  },
  'robot-pilot:robot-pilot': {
    source: source('84'),
    entries: [
      entry('giant-robot', 'vehicles', 'Open-market giant robot of choice'),
      entry(
        'conventional-transport',
        'vehicles',
        'Conventional non-combat vehicle',
      ),
    ],
  },
}

export const startingAssetRequirements = {
  'glitter-boy': [
    {
      id: 'glitter-boy-armor',
      label: 'Starting power armor',
      type: 'power-armor',
      fixedCatalogId: 'usa-g10-glitter-boy',
    },
  ],
  'robot-pilot:power-armor-pilot': [
    {
      id: 'ng-samson',
      label: 'Required NG-Samson power armor',
      type: 'power-armor',
      fixedCatalogId: 'ng-x9-samson',
    },
    {
      id: 'second-power-armor',
      label: 'Second open-market power armor',
      type: 'power-armor',
    },
  ],
  'robot-pilot:robot-pilot': [
    {
      id: 'starting-giant-robot',
      label: 'Starting open-market giant robot',
      type: 'giant-robot',
    },
  ],
}

export function reconcileStartingEquipment(equipment, packageData, origin) {
  if (!packageData) return equipment
  const next = Object.fromEntries(
    Object.entries(equipment).map(([kind, items]) => [kind, [...items]]),
  )
  for (const item of packageData.entries) {
    const managedId = `starting:${origin}:${item.id}`
    if (
      Object.values(next)
        .flat()
        .some((existing) => existing.id === managedId)
    )
      continue
    next[item.kind].push({
      ...item,
      id: managedId,
      source: packageData.source,
      startingOrigin: origin,
    })
  }
  return next
}

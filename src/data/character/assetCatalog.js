const rue = (pages) => ({ book: 'Rifts Ultimate Edition', pages })

export const assetCatalog = [
  {
    id: 'usa-g10-glitter-boy',
    name: 'USA-G10 Glitter Boy',
    type: 'power-armor',
    source: rue('71-73'),
    mainMdc: 770,
    speed: '60 mph running; 15 mph underwater',
    crew: 'One pilot',
    strength: 'Robot P.S. 30',
    locations: {
      head: 290,
      hands: 100,
      arms: 270,
      legs: 450,
      boomGun: 175,
      pilotCompartment: 150,
    },
    weapons: [
      {
        id: 'boom-gun',
        name: 'RG-14 Boom Gun',
        damage: '3D6x10 M.D.',
        range: '11,000 feet',
        payload: 1000,
      },
    ],
    notes: [
      'Laser attacks inflict half damage.',
      'Main-body depletion shuts the armor down.',
    ],
  },
  {
    id: 'ft-005-flying-titan',
    name: 'FT-005 Flying Titan',
    type: 'power-armor',
    source: rue('271-272'),
    mainMdc: 180,
    speed: '50 mph running; 400 mph maximum flight',
    crew: 'One pilot',
    strength: 'Augmented P.S. 24',
    locations: {
      head: 70,
      shoulderWings: 30,
      rearJetPacks: 50,
      maneuveringJets: 25,
    },
    weapons: [
      {
        id: 'wing-lasers',
        name: 'Wing Lasers',
        damage: '2D6 M.D.',
        range: '4,000 feet',
        payload: 'Unlimited',
      },
      {
        id: 'wing-missiles',
        name: 'Wing Missiles',
        damage: 'Varies',
        range: '1-5 miles',
        payload: '12 mini-missiles or 6 short-range missiles',
      },
    ],
    notes: [
      'Open-market Titan Industries suit; destroying a wing prevents flight.',
    ],
  },
  {
    id: 'ng-x9-samson',
    name: 'NG-X9 Samson',
    type: 'power-armor',
    source: rue('270-271'),
    mainMdc: 240,
    speed:
      '150 mph running; jet-assisted leaps up to 100 feet high or 200 feet across',
    crew: 'One pilot',
    strength: 'Robot P.S. 30',
    locations: {
      head: 70,
      rearBoosterJets: 50,
      ammoDrum: 30,
      railGun: 50,
      forearmLaunchers: 50,
    },
    weapons: [
      {
        id: 'ng-202-rail-gun',
        name: 'NG-202 Super Rail Gun',
        damage: '1D6x10 M.D. per burst',
        range: '4,000 feet',
        payload: 100,
      },
      {
        id: 'forearm-rockets',
        name: 'Forearm Mini-Missile Launchers',
        damage: 'Varies',
        range: 'About one mile',
        payload: 4,
      },
      {
        id: 'knuckle-blades',
        name: 'Knuckle Blades',
        damage: '+1D6 M.D. to punches',
        range: 'Melee',
        payload: 'Unlimited',
      },
    ],
    notes: ['Main-body depletion shuts the armor down.'],
  },
  {
    id: 'tr-001-combat-titan',
    name: 'TR-001 Titan Combat Robot',
    type: 'giant-robot',
    source: rue('272-274'),
    mainMdc: 370,
    speed: '60 mph running',
    crew: 'One pilot and two passengers',
    strength: 'Robot P.S. 36',
    locations: {
      head: 90,
      arms: 170,
      legs: 250,
      hands: 50,
      pilotCompartment: 100,
      railGun: 75,
      shoulderLaunchers: 150,
    },
    weapons: [
      {
        id: 'rail-gun',
        name: 'T-001 Rail Gun',
        damage: '1D4x10 M.D. per burst',
        range: '4,000 feet',
        payload: '250 bursts',
      },
      {
        id: 'shoulder-missiles',
        name: 'Shoulder Missile Launchers',
        damage: 'Varies',
        range: '40-80 miles',
        payload: 10,
      },
      {
        id: 'leg-missiles',
        name: 'Leg Mini-Missile Launchers',
        damage: 'Varies',
        range: '1 mile',
        payload: 12,
      },
      {
        id: 'chest-laser',
        name: 'Chest Laser Turret',
        damage: '4D6 M.D.',
        range: '2,000 feet',
        payload: 'Unlimited',
      },
    ],
    notes: ['Main-body depletion shuts the robot down.'],
  },
]

export const assetCatalogById = Object.fromEntries(
  assetCatalog.map((asset) => [asset.id, asset]),
)
export const assetsByType = (type) =>
  assetCatalog.filter((asset) => !type || asset.type === type)

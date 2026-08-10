const source = 'Rifts Ultimate Edition'

function tool(id, name, description, statistics) {
  return {
    id,
    name,
    category: 'Tools',
    subcategory: "Wilk's Cutting and Surgical Tools",
    description,
    source,
    page: 269,
    statistics: statistics.map(([label, value]) => ({ label, value })),
  }
}

export const tools = [
  tool(
    'wilks-portable-laser-torch',
    "Wilk's Portable Laser Torch",
    'A portable cutting and welding tool connected to a belt-, pack-, or case-mounted power pack that uses two standard E-Clips.',
    [
      ['Weight', '1 lb (0.45 kg)'],
      ['Mega-Damage', '1D4, 1D6, 2D4, 3D6, or 4D6 M.D.'],
      ['S.D.C. Damage', '1D6, 3D6, 6D6, or 1D6x10 S.D.C.'],
      ['Rate of Use', 'Each cut or weld counts as one melee attack.'],
      ['Effective Range', '10 feet (3 m)'],
      [
        'Payload',
        '100 shots or about two hours of continuous use per pair of E-Clips',
      ],
      ['Black Market Cost', '7,000 credits'],
    ],
  ),
  tool(
    'wilks-laser-wand',
    "Wilk's Laser Wand",
    'A six-inch pen-sized tool for detailed close-range laser work on electronics.',
    [
      ['Weight', '2 ounces (56.7 g)'],
      ['Mega-Damage', '1 M.D. point'],
      ['S.D.C. Damage', '1D4, 1D6, 2D6, or 3D6 S.D.C.'],
      ['Rate of Use', 'Each cut or weld counts as one melee attack.'],
      ['Effective Range', '10 feet (3 m); designed for work at 1–3 feet'],
      ['Payload', '50 shots'],
      [
        'Black Market Cost',
        '2,000 credits; Mini-Energy Clip costs 200 credits',
      ],
    ],
  ),
  tool(
    'wilks-laser-scalpel',
    "Wilk's Laser Scalpel",
    'A short-range precision laser tool designed for delicate surgery rather than combat.',
    [
      ['S.D.C. Damage', 'Settings from less than 1 point through 1D6 S.D.C.'],
      ['Effective Range', '6 inches (15.2 cm)'],
      ['Black Market Cost', '2,500 credits'],
    ],
  ),
]

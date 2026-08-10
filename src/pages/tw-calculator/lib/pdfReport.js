import {
  RIFTS_GEMS,
  RIFTS_ULTIMATE_SPELLS,
} from '../../../data/magic/spells.js'
import {
  CONSTRUCTION_BONUS_BY_ID,
  CONSTRUCTION_MODIFIER_BY_ID,
} from '../../../data/magic/constructionModifiers.js'

const spellByName = new Map(
  RIFTS_ULTIMATE_SPELLS.map((spell) => [spell.name.toLowerCase(), spell]),
)
const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const number = (value) => formatter.format(Number(value) || 0)
export const PDF_COLORS = Object.freeze({
  background: [7, 11, 24],
  surface: [16, 26, 51],
  raised: [23, 38, 74],
  border: [52, 77, 122],
  text: [237, 243, 255],
  muted: [184, 199, 224],
  accent: [242, 140, 40],
  accentBright: [255, 173, 66],
  blue: [77, 163, 255],
})
export const PRINT_PDF_COLORS = Object.freeze({
  background: [255, 255, 255],
  surface: [255, 255, 255],
  raised: [255, 255, 255],
  border: [150, 150, 150],
  text: [0, 0, 0],
  muted: [55, 55, 55],
  accent: [0, 0, 0],
  accentBright: [0, 0, 0],
  blue: [0, 0, 0],
})
const modeNames = {
  standard: 'Standard',
  'ley-only': 'Ley line only (x1.5 construction P.P.E.; no activation cost)',
  'ley-hybrid': 'Works on or off a ley line (x2 construction P.P.E.)',
}

function safeText(value) {
  return String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF]/g, '-')
    .replace(/\u00D7/g, 'x')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?')
}

const selectedMode = (spell, catalogSpell) =>
  catalogSpell?.ppeModes?.find((mode) => mode.id === spell.ppeModeId) ||
  catalogSpell?.ppeModes?.[0]
const filename = (value) =>
  String(value || 'tw-device')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'tw-device'

export function buildDevicePdf(report, JsPdf, descriptionStore, options = {}) {
  const printerFriendly = Boolean(options.printerFriendly)
  const colors = printerFriendly ? PRINT_PDF_COLORS : PDF_COLORS
  const doc = new JsPdf({ unit: 'pt', format: 'letter', compress: true })
  const page = {
    width: 612,
    height: 792,
    left: 48,
    right: 48,
    top: 48,
    bottom: 50,
  }
  const contentWidth = page.width - page.left - page.right
  let y = page.top
  const paintPage = () => {
    doc.setFillColor(...colors.background)
    doc.rect(0, 0, page.width, page.height, 'F')
  }
  const addPage = () => {
    doc.addPage()
    paintPage()
    y = page.top
  }
  const ensure = (height) => {
    if (y + height > page.height - page.bottom) addPage()
  }
  const line = (yPos, color = colors.border) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(0.7)
    doc.line(page.left, yPos, page.width - page.right, yPos)
  }
  const heading = (text, level = 1) => {
    const size = level === 1 ? 17 : 12
    const topSpace = level === 1 ? 8 : 5
    ensure(size + 18 + topSpace)
    y += topSpace
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.setTextColor(...colors.accentBright)
    doc.text(safeText(text), page.left, y)
    y += size + 4
    line(y, level === 1 ? colors.accent : colors.border)
    y += 12
  }
  const paragraph = (text, options = {}) => {
    const size = options.size || 9.5
    const indent = options.indent || 0
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...(options.bold ? colors.text : colors.muted))
    const lineHeight = size + 3
    const lines = doc.splitTextToSize(
      safeText(text || 'Not provided.'),
      contentWidth - indent,
    )
    let offset = 0
    while (offset < lines.length) {
      let availableLines = Math.floor(
        (page.height - page.bottom - y) / lineHeight,
      )
      if (availableLines < 1) {
        addPage()
        availableLines = Math.floor(
          (page.height - page.bottom - y) / lineHeight,
        )
      }
      const chunk = lines.slice(offset, offset + availableLines)
      doc.text(chunk, page.left + indent, y)
      y += chunk.length * lineHeight
      offset += chunk.length
      if (offset < lines.length) addPage()
    }
    y += options.after ?? 6
  }
  const row = (label, value) => {
    ensure(16)
    doc.setFontSize(9.5)
    doc.setTextColor(...colors.text)
    doc.setFont('helvetica', 'bold')
    doc.text(safeText(label), page.left, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...colors.muted)
    const lines = doc.splitTextToSize(safeText(value), contentWidth - 180)
    doc.text(lines, page.left + 180, y)
    y += Math.max(14, lines.length * 12)
  }
  const note = (text) => paragraph(text, { size: 8, after: 7 })

  paintPage()
  if (!printerFriendly) {
    doc.setFillColor(...colors.raised)
    doc.rect(0, 0, page.width, 114, 'F')
    doc.setFillColor(...colors.accent)
    doc.rect(0, 110, page.width, 4, 'F')
  }
  doc.setTextColor(...colors.accentBright)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('RIFTS TECHNO-WIZARD DEVICE', page.left, 42)
  doc.setTextColor(...colors.text)
  doc.setFontSize(23)
  doc.text(
    doc.splitTextToSize(safeText(report.state.deviceName), contentWidth),
    page.left,
    70,
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...colors.muted)
  doc.text('Construction report and spell reference', page.left, 100)
  if (printerFriendly) line(112, colors.text)
  y = printerFriendly ? 132 : 140

  heading('Device summary')
  row('Form', report.state.form || 'Not specified')
  row('Device level', number(report.state.deviceLevel))
  row(
    'Device type',
    report.state.singleUse ? 'Single-use device' : 'Permanent device',
  )
  row(
    'Total construction P.P.E.',
    `${number(report.summary.ppeConstruction)} P.P.E.`,
  )
  row(
    'Total activation cost',
    report.summary.allFunctionsRequireLeyLine
      ? 'Ley line required to function'
      : `${number(report.summary.activationPpe)} P.P.E.${report.summary.hasLeyLineOnlyFunctions ? '; ley-line-only functions require a ley line' : ''}`,
  )
  row('Construction time', `${number(report.summary.constructionHours)} hours`)
  row('Required gems cost', `${number(report.summary.gemsCredits)} credits`)
  row('Basic form cost', `${number(report.state.formCost)} credits`)
  row(
    'Cost before gems',
    `${number(report.summary.constructionCreditsBeforeGems)} credits`,
  )
  row(
    'Total construction cost (includes gems)',
    `${number(report.summary.constructionCredits)} credits`,
  )
  row(
    'Construction skill-roll modifier',
    `${report.summary.skillRollModifier >= 0 ? '+' : ''}${number(report.summary.skillRollModifier)}%`,
  )

  heading('Calculation audit')
  row(
    'Base function construction P.P.E.',
    number(report.calculations.basePpeConstruction),
  )
  row(
    'Stored P.P.E.',
    `${number(report.state.storagePpe)} at ${number(report.state.storagePercentPerPoint)}% each`,
  )
  row(
    'Storage construction modifier',
    `+${number(report.calculations.storageModifier)} P.P.E.`,
  )
  const selectedModifiers = (report.state.constructionModifiers || [])
    .map((selection) => {
      const modifier = CONSTRUCTION_MODIFIER_BY_ID.get(selection.id)
      const quantity = modifier?.repeatable
        ? Math.max(1, Number(selection.quantity) || 1)
        : 1
      return modifier
        ? `${modifier.label}: -${number(modifier.percent * quantity)}%${quantity > 1 ? ` (${quantity} x ${modifier.percent}%)` : ''}`
        : null
    })
    .filter(Boolean)
  row(
    'Construction skill penalties',
    selectedModifiers.length ? selectedModifiers.join('; ') : 'None selected',
  )
  row(
    'Book penalties subtotal',
    `-${number(report.calculations.selectedConstructionModifierPercent)}%`,
  )
  const selectedBonuses = (report.state.constructionBonuses || [])
    .map((selection) => {
      const bonus = CONSTRUCTION_BONUS_BY_ID.get(selection.id)
      const quantity = bonus?.repeatable
        ? Math.max(1, Number(selection.quantity) || 1)
        : 1
      return bonus
        ? `${bonus.label}: +${number(bonus.percent * quantity)}%${quantity > 1 ? ` (${quantity} x ${bonus.percent}%)` : ''}`
        : null
    })
    .filter(Boolean)
  row(
    'Construction skill bonuses',
    selectedBonuses.length ? selectedBonuses.join('; ') : 'None selected',
  )
  row(
    'Book bonuses subtotal',
    `+${number(report.calculations.selectedConstructionBonusPercent)}%`,
  )
  row(
    'Other custom skill modifier',
    `${report.state.constructionModifierPercent >= 0 ? '+' : ''}${number(report.state.constructionModifierPercent)}%`,
  )
  row(
    'Net construction skill modifier',
    `${report.calculations.totalSkillRollModifier >= 0 ? '+' : ''}${number(report.calculations.totalSkillRollModifier)}%`,
  )
  note(
    'The listed percentages modify the Techno-Wizardry Construction skill roll, not P.P.E. or credit cost. Options with a separate construction-time rule also apply the time adjustment shown below.',
  )
  row(
    'Final construction P.P.E.',
    number(report.calculations.modifiedPpeConstruction),
  )
  row(
    'Credit calculation',
    `${number(report.calculations.modifiedPpeConstruction)} x 10 x level ${number(report.state.deviceLevel)} + ${number(report.summary.gemsCredits)} gems + ${number(report.state.formCost)} form`,
  )
  row(
    'Technology construction',
    report.state.existingTechnology
      ? `Existing technology${report.state.creatorHasMechanicalSkill ? '; Mechanical skill halves base time' : ''}`
      : 'Built as a new device',
  )
  row(
    'Book construction-time adjustment',
    report.calculations.constructionTimeAdjustment === 'None'
      ? 'None'
      : `${report.calculations.constructionTimeAdjustment} (x${number(report.calculations.constructionTimeMultiplier)})`,
  )
  row(
    'Assistant reduction',
    `${number(report.state.assistantTimeReduction)}% (maximum applied: 35%)`,
  )
  note(
    'Intermediate calculations retain full precision. Final summary values are rounded up to the next whole number.',
  )

  heading('Functions and spell chains')
  report.state.chains.forEach((chain, chainIndex) => {
    const result = report.chains[chainIndex]
    heading(
      `${chainIndex + 1}. ${chain.name || `Function ${chainIndex + 1}`}`,
      2,
    )
    const spellPpe = chain.spells.reduce(
      (sum, spell) => sum + (Number(spell.ppe) || 0),
      0,
    )
    row('Power mode', modeNames[chain.mode] || chain.mode)
    row('Primary gem size', `${number(chain.primaryGemCarats)} carats`)
    row('Selected spell P.P.E. total', `${number(spellPpe)} P.P.E.`)
    row('Construction P.P.E.', `${number(result.ppeConstruction)} P.P.E.`)
    row(
      'Activation cost',
      chain.mode === 'ley-only'
        ? 'Ley line required to function'
        : `${number(result.activation)} P.P.E.`,
    )
    row(
      'Gem cost for function',
      `${number(result.gemCost)} credits${report.state.singleUse ? ' (25% single-use rule applied)' : ''}`,
    )
    chain.spells.forEach((spell, spellIndex) => {
      const catalog = spellByName.get(String(spell.name).toLowerCase())
      const gem = RIFTS_GEMS[catalog?.gemId]
      const carats = spellIndex === 0 ? Number(chain.primaryGemCarats) || 0 : 1
      const mode = selectedMode(spell, catalog)
      const modeDetail = mode
        ? `; mode: ${mode.label}${mode.inputLabel ? `; ${mode.inputLabel}: ${spell.ppeModeInput ?? mode.inputDefault}` : ''}${mode.note ? `; ${mode.note}` : ''}`
        : ''
      paragraph(
        `${spellIndex === 0 ? 'Primary' : 'Secondary'} - ${spell.name || 'Unnamed spell'}: ${number(spell.ppe)} P.P.E.${spell.ppeText ? ` (book: ${spell.ppeText})` : ''}${modeDetail}`,
        { bold: true, indent: 10, after: 3 },
      )
      paragraph(
        gem
          ? `Gem: ${gem.name}; ${number(carats)} carat${carats === 1 ? '' : 's'} at ${number(gem.pricePerCarat)} credits per carat = ${number(carats * gem.pricePerCarat)} credits.`
          : 'Gem: no catalog match is available for this spell.',
        { indent: 10, size: 8.5, after: 5 },
      )
    })
  })

  heading('Gem requirements')
  report.state.chains.forEach((chain, chainIndex) =>
    chain.spells.forEach((spell, spellIndex) => {
      const catalog = spellByName.get(String(spell.name).toLowerCase())
      const gem = RIFTS_GEMS[catalog?.gemId]
      const carats = spellIndex === 0 ? Number(chain.primaryGemCarats) || 0 : 1
      if (gem)
        paragraph(
          `${gem.name} - ${spellIndex === 0 ? 'primary focus gem' : 'secondary spell gem'} for ${spell.name} in ${chain.name || `Function ${chainIndex + 1}`}. ${number(carats)} carat${carats === 1 ? '' : 's'} required at ${number(gem.pricePerCarat)} credits per carat; raw value ${number(carats * gem.pricePerCarat)} credits.`,
          { after: 5 },
        )
    }),
  )
  if (report.state.singleUse)
    note(
      'For a single-use device, the construction calculation charges 25% of the raw required gem value.',
    )
  heading('Device notes')
  paragraph(report.state.notes || 'No device notes were entered.')

  const descriptionByName = new Map(
    Object.values(descriptionStore?.spells || {}).map((entry) => [
      String(entry.name).toLowerCase(),
      entry,
    ]),
  )
  const usedNames = [
    ...new Set(
      report.state.chains
        .flatMap((chain) => chain.spells.map((spell) => spell.name))
        .filter(Boolean),
    ),
  ]
  heading('Used spell descriptions')
  usedNames.forEach((name) => {
    const catalog = spellByName.get(String(name).toLowerCase())
    const entry = descriptionByName.get(String(name).toLowerCase())
    heading(`${name}${catalog?.level ? ` (Level ${catalog.level})` : ''}`, 2)
    if (entry?.source) {
      const pages = Array.isArray(entry.source.pages)
        ? [...new Set(entry.source.pages)].join('-')
        : entry.source.pages
      note(
        `Source: ${entry.source.book || 'Rifts Book of Magic'}${pages ? `, page ${pages}` : ''}.`,
      )
    }
    paragraph(
      entry?.description ||
        'A full description is not available in the local spell-description store.',
    )
  })

  const generated = new Date(report.generatedAt).toLocaleString()
  const pages = doc.getNumberOfPages()
  for (let index = 1; index <= pages; index += 1) {
    doc.setPage(index)
    line(page.height - 34)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...colors.muted)
    doc.text(safeText(`Generated ${generated}`), page.left, page.height - 20)
    doc.text(
      `Page ${index} of ${pages}`,
      page.width - page.right,
      page.height - 20,
      {
        align: 'right',
      },
    )
  }
  return doc
}

export async function downloadDevicePdf(report, options = {}) {
  const [{ jsPDF }, descriptions] = await Promise.all([
    import('jspdf'),
    import('../../../data/magic/spell-descriptions.json'),
  ])
  const suffix = options.printerFriendly
    ? '-printer-friendly-report.pdf'
    : '-report.pdf'
  buildDevicePdf(report, jsPDF, descriptions.default, options).save(
    `${filename(report.state.deviceName)}${suffix}`,
  )
}

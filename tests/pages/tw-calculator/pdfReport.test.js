import { describe, expect, it } from 'vitest'
import { jsPDF } from 'jspdf'
import {
  buildDevicePdf,
  PDF_COLORS,
  PRINT_PDF_COLORS,
} from '../../../src/pages/tw-calculator/lib/pdfReport.js'

const report = {
  generatedAt: '2026-08-02T12:00:00.000Z',
  state: {
    deviceName: 'Test Field Projector',
    form: 'Projector',
    deviceLevel: 2,
    singleUse: false,
    formCost: 500,
    storagePpe: 0,
    storagePercentPerPoint: 1,
    constructionModifiers: [],
    constructionBonuses: [],
    constructionModifierPercent: 0,
    existingTechnology: false,
    creatorHasMechanicalSkill: false,
    assistantTimeReduction: 0,
    notes: 'Test notes',
    chains: [
      {
        name: 'Protection',
        primaryGemCarats: 2,
        mode: 'standard',
        spells: [
          {
            name: 'Armor of Ithan',
            ppe: 10,
            ppeText: '10',
            ppeModeId: '',
            ppeModeInput: null,
          },
        ],
      },
    ],
  },
  summary: {
    ppeConstruction: 100,
    activationPpe: 5,
    allFunctionsRequireLeyLine: false,
    hasLeyLineOnlyFunctions: false,
    constructionHours: 20,
    gemsCredits: 1000,
    constructionCreditsBeforeGems: 2000,
    constructionCredits: 3000,
    skillRollModifier: 0,
  },
  calculations: {
    basePpeConstruction: 100,
    storageModifier: 0,
    selectedConstructionModifierPercent: 0,
    selectedConstructionBonusPercent: 0,
    totalSkillRollModifier: 0,
    modifiedPpeConstruction: 100,
    constructionTimeAdjustment: 'None',
    constructionTimeMultiplier: 1,
  },
  chains: [{ ppeConstruction: 100, activation: 5, gemCost: 1000 }],
}

const descriptions = {
  spells: {
    armor: {
      name: 'Armor of Ithan',
      source: { book: 'Rifts Book of Magic', pages: [92] },
      description: 'Long themed report content. '.repeat(500),
    },
  },
}

const rgbCommand = (color) =>
  `${color.map((channel) => Number((channel / 255).toFixed(2))).join(' ')} rg`

describe('themed device PDF', () => {
  it('uses the site palette and paints every continuation page dark', () => {
    const doc = buildDevicePdf(report, jsPDF, descriptions)
    const backgroundCommand = rgbCommand(PDF_COLORS.background)
    const accentCommand = rgbCommand(PDF_COLORS.accent)

    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
    for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
      expect(doc.internal.pages[page]).toContain(backgroundCommand)
    }
    expect(doc.internal.pages[1]).toContain(accentCommand)
  })

  it('produces a valid PDF document', () => {
    const doc = buildDevicePdf(report, jsPDF, { spells: {} })
    const bytes = new Uint8Array(doc.output('arraybuffer'))
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(bytes.byteLength).toBeGreaterThan(1000)
  })

  it('produces a black-and-white printer-friendly report without the dark page fill', () => {
    const doc = buildDevicePdf(report, jsPDF, descriptions, {
      printerFriendly: true,
    })
    const whiteBackground = `${PRINT_PDF_COLORS.background[0] / 255}. g`
    const darkBackground = rgbCommand(PDF_COLORS.background)
    const orangeAccent = rgbCommand(PDF_COLORS.accent)

    for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
      expect(doc.internal.pages[page]).toContain(whiteBackground)
      expect(doc.internal.pages[page]).not.toContain(darkBackground)
      expect(doc.internal.pages[page]).not.toContain(orangeAccent)
    }
  })
})

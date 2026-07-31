export interface RadioCountryProfile {
  defaultLicense: string
  licenses: string[]
  allowedBands: Record<string, string[]>
}

export interface RadioBandRule {
  band: string
  minKhz: number
  maxKhz: number
  modes: string[]
}

export const ALL_RADIO_BANDS = [
  '2200m', '630m', '160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm', '33cm', '23cm',
]

export const RADIO_BAND_RULES: RadioBandRule[] = [
  { band: '2200m', minKhz: 135, maxKhz: 137, modes: ['CW', 'DIG'] },
  { band: '630m', minKhz: 472, maxKhz: 479, modes: ['CW', 'DIG'] },
  { band: '160m', minKhz: 1800, maxKhz: 2000, modes: ['CW', 'LSB', 'USB', 'DIG'] },
  { band: '80m', minKhz: 3500, maxKhz: 4000, modes: ['CW', 'LSB', 'USB', 'DIG'] },
  { band: '60m', minKhz: 5332, maxKhz: 5405, modes: ['USB', 'CW', 'DIG'] },
  { band: '40m', minKhz: 7000, maxKhz: 7300, modes: ['CW', 'LSB', 'USB', 'DIG'] },
  { band: '30m', minKhz: 10100, maxKhz: 10150, modes: ['CW', 'DIG'] },
  { band: '20m', minKhz: 14000, maxKhz: 14350, modes: ['CW', 'USB', 'DIG', 'FT8'] },
  { band: '17m', minKhz: 18068, maxKhz: 18168, modes: ['CW', 'USB', 'DIG', 'FT8'] },
  { band: '15m', minKhz: 21000, maxKhz: 21450, modes: ['CW', 'USB', 'DIG', 'FT8'] },
  { band: '12m', minKhz: 24890, maxKhz: 24990, modes: ['CW', 'USB', 'DIG', 'FT8'] },
  { band: '10m', minKhz: 28000, maxKhz: 29700, modes: ['CW', 'USB', 'FM', 'DIG', 'FT8'] },
  { band: '6m', minKhz: 50000, maxKhz: 54000, modes: ['CW', 'USB', 'FM', 'DIG', 'FT8'] },
  { band: '2m', minKhz: 144000, maxKhz: 148000, modes: ['FM', 'USB', 'DIG', 'FT8', 'AX.25'] },
  { band: '1.25m', minKhz: 219000, maxKhz: 225000, modes: ['FM', 'USB', 'DIG', 'AX.25'] },
  { band: '70cm', minKhz: 420000, maxKhz: 450000, modes: ['FM', 'USB', 'DIG', 'AX.25'] },
  { band: '33cm', minKhz: 902000, maxKhz: 928000, modes: ['FM', 'USB', 'DIG', 'AX.25'] },
  { band: '23cm', minKhz: 1240000, maxKhz: 1300000, modes: ['FM', 'USB', 'DIG', 'AX.25'] },
]

export const RADIO_BANDS = RADIO_BAND_RULES.map(rule => rule.band)

export const BAND_FREQS: Record<string, number> = Object.fromEntries(
  RADIO_BAND_RULES.map(rule => [rule.band, Math.round((rule.minKhz + rule.maxKhz) / 2)]),
)

export const RADIO_COUNTRY_PROFILES: Record<string, RadioCountryProfile> = {
  'United States': {
    defaultLicense: 'General',
    licenses: ['Technician', 'General', 'Extra'],
    allowedBands: {
      Technician: ['10m', '6m', '2m', '1.25m', '70cm'],
      General: ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm'],
      Extra: ALL_RADIO_BANDS,
    },
  },
  Canada: {
    defaultLicense: 'Basic',
    licenses: ['Basic', 'Advanced'],
    allowedBands: {
      Basic: ['80m', '40m', '20m', '15m', '10m', '6m', '2m', '1.25m', '70cm'],
      Advanced: ALL_RADIO_BANDS,
    },
  },
  'United Kingdom': {
    defaultLicense: 'Foundation',
    licenses: ['Foundation', 'Intermediate', 'Full'],
    allowedBands: {
      Foundation: ['80m', '40m', '15m', '10m', '6m', '2m', '70cm'],
      Intermediate: ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm'],
      Full: ALL_RADIO_BANDS,
    },
  },
  Australia: {
    defaultLicense: 'Foundation',
    licenses: ['Foundation', 'Standard', 'Advanced'],
    allowedBands: {
      Foundation: ['80m', '40m', '15m', '10m', '6m', '2m', '70cm'],
      Standard: ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm'],
      Advanced: ALL_RADIO_BANDS,
    },
  },
  Japan: {
    defaultLicense: '3rd Class',
    licenses: ['4th Class', '3rd Class', '2nd Class', '1st Class'],
    allowedBands: {
      '4th Class': ['10m', '6m', '2m', '70cm'],
      '3rd Class': ['20m', '15m', '10m', '6m', '2m', '70cm'],
      '2nd Class': ['80m', '40m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm'],
      '1st Class': ALL_RADIO_BANDS,
    },
  },
}

export function getRadioCountryProfile(country: string): RadioCountryProfile {
  return RADIO_COUNTRY_PROFILES[country] ?? RADIO_COUNTRY_PROFILES['United States']
}

export function getAllowedBands(country: string, license: string): string[] {
  const profile = getRadioCountryProfile(country)
  return profile.allowedBands[license] ?? profile.allowedBands[profile.defaultLicense] ?? ALL_RADIO_BANDS
}

export function getBandRule(band: string): RadioBandRule | undefined {
  return RADIO_BAND_RULES.find(rule => rule.band === band)
}

export function getBandForFrequency(freqKhz: number): string | undefined {
  return RADIO_BAND_RULES.find(rule => freqKhz >= rule.minKhz && freqKhz <= rule.maxKhz)?.band
}

export function getAllowedModes(country: string, license: string, band: string): string[] {
  const allowedBands = getAllowedBands(country, license)
  if (!allowedBands.includes(band)) return []
  return getBandRule(band)?.modes ?? []
}

export function isFrequencyAllowed(country: string, license: string, freqKhz: number): boolean {
  const band = getBandForFrequency(freqKhz)
  if (!band) return false
  return getAllowedBands(country, license).includes(band)
}

export function getFrequencyBounds(): { minKhz: number; maxKhz: number } {
  return {
    minKhz: RADIO_BAND_RULES[0]?.minKhz ?? 0,
    maxKhz: RADIO_BAND_RULES[RADIO_BAND_RULES.length - 1]?.maxKhz ?? 0,
  }
}

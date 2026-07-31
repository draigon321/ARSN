import radioRestrictionsData from './radioRestrictionsData.json'

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

type RadioRestrictionsData = {
  ALL_RADIO_BANDS: string[]
  RADIO_BAND_RULES: RadioBandRule[]
  RADIO_COUNTRY_PROFILES: Record<string, RadioCountryProfile>
}

const { ALL_RADIO_BANDS, RADIO_BAND_RULES, RADIO_COUNTRY_PROFILES: RADIO_COUNTRY_PROFILES_SOURCE } = radioRestrictionsData as RadioRestrictionsData

export const ALL_RADIO_BANDS_DATA = ALL_RADIO_BANDS
export const RADIO_BAND_RULES_DATA = RADIO_BAND_RULES
export const RADIO_COUNTRY_PROFILES_DATA = RADIO_COUNTRY_PROFILES_SOURCE
export const RADIO_COUNTRY_PROFILES = RADIO_COUNTRY_PROFILES_DATA

export const RADIO_BANDS = RADIO_BAND_RULES_DATA.map(rule => rule.band)

export const BAND_FREQS: Record<string, number> = Object.fromEntries(
  RADIO_BAND_RULES_DATA.map(rule => [rule.band, Math.round((rule.minKhz + rule.maxKhz) / 2)]),
)

export function getRadioCountryProfile(country: string): RadioCountryProfile {
  return RADIO_COUNTRY_PROFILES_DATA[country] ?? RADIO_COUNTRY_PROFILES_DATA['United States']
}

export function getAllowedBands(country: string, license: string): string[] {
  const profile = getRadioCountryProfile(country)
  return profile.allowedBands[license] ?? profile.allowedBands[profile.defaultLicense] ?? ALL_RADIO_BANDS_DATA
}

export function getBandRule(band: string): RadioBandRule | undefined {
  return RADIO_BAND_RULES_DATA.find(rule => rule.band === band)
}

export function getBandForFrequency(freqKhz: number): string | undefined {
  return RADIO_BAND_RULES_DATA.find(rule => freqKhz >= rule.minKhz && freqKhz <= rule.maxKhz)?.band
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
    minKhz: RADIO_BAND_RULES_DATA[0]?.minKhz ?? 0,
    maxKhz: RADIO_BAND_RULES_DATA[RADIO_BAND_RULES_DATA.length - 1]?.maxKhz ?? 0,
  }
}

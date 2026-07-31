export interface RadioCountryProfile {
  defaultLicense: string
  licenses: string[]
  allowedBands: Record<string, string[]>
}

export const ALL_RADIO_BANDS = [
  '2200m', '630m', '160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '1.25m', '70cm', '33cm', '23cm',
]

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

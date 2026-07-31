import signalSourcesData from './radioSignalSources.json'

export interface SignalSource {
  freqKhz: number
  mode: string
  strength: number
}

export const DEFAULT_SIGNAL_SOURCES = signalSourcesData as SignalSource[]

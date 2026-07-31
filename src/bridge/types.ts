export interface BridgeAnalogPayload {
  domain: "audio-baseband"
  encoding: "f32-normalized"
  sampleRateHz: number
  samplePeriodUs: number
  channels: 1
  samples: number[]
  peak: number
  rms: number
}

export interface BridgeTxMessage {
  id?: string
  callsign: string
  mode: string
  freqKhz: number
  vfo: "A" | "B"
  txStartedAt?: number
  txDurationMs: number
  rfGain: number
  micGain: number
  noiseFloor: number
  analog: BridgeAnalogPayload
  note?: string
}

export interface BridgeRxFrame {
  frameIndex: number
  tickMs: number
  offsetMs: number
  capturedAt: number
  strength: number
  noiseFloor: number
  fade: number
  jitter: number
}

export interface BridgeRxEvent {
  seq: number
  id: string
  source: "sim" | "echo"
  callsign: string
  mode: string
  freqKhz: number
  vfo: "A" | "B"
  startedAt: number
  generatedAt: number
  durationMs: number
  frameIntervalMs: number
  frames: BridgeRxFrame[]
}

export interface BridgePullResponse {
  cursor: number
  events: BridgeRxEvent[]
}

export interface BridgeStatusSnapshot {
  now: number
  txDepth: number
  rxDepth: number
  lastSeq: number
}

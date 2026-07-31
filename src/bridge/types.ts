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
  note?: string
}

export interface BridgeRxFrame {
  tickMs: number
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
  durationMs: number
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

import { createServer } from "node:http"
import { randomUUID } from "node:crypto"
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

const PORT = Number(process.env.ARSN_BRIDGE_PORT || 8787)
const ROOT = process.cwd()
const QUEUE_ROOT = path.join(ROOT, "queue")
const TX_DIR = path.join(QUEUE_ROOT, "tx", "msgs")
const RX_DIR = path.join(QUEUE_ROOT, "rx", "msgs")
const ARCHIVE_TX_DIR = path.join(QUEUE_ROOT, "archive", "tx")
const ARCHIVE_RX_DIR = path.join(QUEUE_ROOT, "archive", "rx")

const RX_BUFFER_LIMIT = 1000
const FRAME_TICK_MS = 20

let seqCounter = 0
/** @type {Array<any>} */
let rxEvents = []

async function ensureDirs() {
  await mkdir(TX_DIR, { recursive: true })
  await mkdir(RX_DIR, { recursive: true })
  await mkdir(ARCHIVE_TX_DIR, { recursive: true })
  await mkdir(ARCHIVE_RX_DIR, { recursive: true })
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  })
  res.end(JSON.stringify(payload))
}

async function writeAtomic(filePath, data) {
  const tmpPath = `${filePath}.tmp`
  await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8")
  await rename(tmpPath, filePath)
}

async function archiveMessage(baseDir, payload) {
  const stamp = new Date(payload.startedAt || Date.now()).toISOString().slice(0, 10)
  const dir = path.join(baseDir, stamp)
  await mkdir(dir, { recursive: true })
  await writeAtomic(path.join(dir, `${payload.id}.json`), payload)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function makeAnalog({ durationMs, micGain, mode }) {
  const sampleRateHz = 2000
  const sampleCount = Math.max(1, Math.round(durationMs * sampleRateHz / 1000))
  const amplitude = clamp(micGain / 100, 0.02, 0.98)
  const toneHz = mode === "FM" ? 220 : mode === "AM" ? 180 : mode === "CW" || mode === "CWR" ? 700 : 310
  let energy = 0
  let peak = 0
  const samples = Array.from({ length: sampleCount }, (_, index) => {
    const seconds = index / sampleRateHz
    const attack = Math.min(1, index / (sampleRateHz * 0.015))
    const release = Math.min(1, (sampleCount - index) / (sampleRateHz * 0.025))
    const signal = Math.sin(2 * Math.PI * toneHz * seconds)
      + 0.42 * Math.sin(2 * Math.PI * toneHz * 2.13 * seconds)
      + 0.2 * Math.sin(2 * Math.PI * toneHz * 3.71 * seconds)
    const sample = Number(clamp(amplitude * attack * release * signal / 1.62, -1, 1).toFixed(5))
    energy += sample * sample
    peak = Math.max(peak, Math.abs(sample))
    return sample
  })
  return {
    domain: "audio-baseband",
    encoding: "f32-normalized",
    sampleRateHz,
    samplePeriodUs: 1_000_000 / sampleRateHz,
    channels: 1,
    samples,
    peak: Number(peak.toFixed(5)),
    rms: Number(Math.sqrt(energy / samples.length).toFixed(5)),
  }
}

function normalizeAnalog(rawAnalog, fallback) {
  if (!rawAnalog || !Array.isArray(rawAnalog.samples) || rawAnalog.samples.length === 0) {
    return makeAnalog(fallback)
  }
  const sampleRateHz = clamp(Math.round(Number(rawAnalog.sampleRateHz || 2000)), 100, 48000)
  const maximumSamples = Math.ceil(fallback.durationMs * sampleRateHz / 1000)
  const samples = rawAnalog.samples
    .slice(0, maximumSamples)
    .map(sample => Number(clamp(Number(sample) || 0, -1, 1).toFixed(5)))
  const energy = samples.reduce((sum, sample) => sum + sample * sample, 0)
  const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0)
  return {
    domain: "audio-baseband",
    encoding: "f32-normalized",
    sampleRateHz,
    samplePeriodUs: 1_000_000 / sampleRateHz,
    channels: 1,
    samples,
    peak: Number(peak.toFixed(5)),
    rms: Number(Math.sqrt(energy / samples.length).toFixed(5)),
  }
}

function makeFrames({ startedAt, durationMs, micGain, rfGain, noiseFloor, analog }) {
  const frameCount = Math.max(1, Math.ceil(durationMs / FRAME_TICK_MS))
  const baseStrength = clamp((micGain / 100) * 8.5 + (rfGain / 100) * 0.8, 0.5, 9.8)

  return Array.from({ length: frameCount }, (_, i) => {
    const t = i * FRAME_TICK_MS
    const sampleStart = Math.floor(t * analog.sampleRateHz / 1000)
    const sampleEnd = Math.max(sampleStart + 1, Math.floor((t + FRAME_TICK_MS) * analog.sampleRateHz / 1000))
    const frameSamples = analog.samples.slice(sampleStart, sampleEnd)
    const frameRms = frameSamples.length > 0
      ? Math.sqrt(frameSamples.reduce((sum, sample) => sum + sample * sample, 0) / frameSamples.length)
      : 0
    const modulation = analog.rms > 0 ? clamp(frameRms / analog.rms, 0.25, 1.5) : 0.25
    const fade = Math.sin(i * 0.3) * 0.35
    const jitter = (Math.random() - 0.5) * 0.18
    const envelope = Math.min(1, t / 180) * Math.min(1, (durationMs - t) / 160)
    const strength = clamp(baseStrength * (0.35 + envelope * 0.45 + modulation * 0.35) + fade + jitter, 0, 9.9)

    return {
      frameIndex: i,
      tickMs: t,
      offsetMs: t,
      capturedAt: startedAt + t,
      strength: Number(strength.toFixed(2)),
      noiseFloor: Number(clamp(noiseFloor + (Math.random() - 0.5) * 0.25, 0, 12).toFixed(2)),
      fade: Number(fade.toFixed(2)),
      jitter: Number(jitter.toFixed(2)),
    }
  })
}

async function processTx(rawTx) {
  const now = Date.now()
  const id = rawTx.id || randomUUID()
  const txMessage = {
    id,
    callsign: rawTx.callsign || "UNKNOWN",
    mode: rawTx.mode || "USB",
    freqKhz: Number(rawTx.freqKhz || 0),
    vfo: rawTx.vfo === "B" ? "B" : "A",
    txStartedAt: Number(rawTx.txStartedAt || now),
    txDurationMs: clamp(Number(rawTx.txDurationMs || 800), 100, 10000),
    rfGain: clamp(Number(rawTx.rfGain || 50), 0, 100),
    micGain: clamp(Number(rawTx.micGain || 50), 0, 100),
    noiseFloor: clamp(Number(rawTx.noiseFloor || 4), 0, 12),
    note: rawTx.note || "",
  }
  txMessage.analog = normalizeAnalog(rawTx.analog, {
    durationMs: txMessage.txDurationMs,
    micGain: txMessage.micGain,
    mode: txMessage.mode,
  })

  await writeAtomic(path.join(TX_DIR, `${id}.json`), txMessage)
  await archiveMessage(ARCHIVE_TX_DIR, {
    ...txMessage,
    startedAt: txMessage.txStartedAt,
  })

  const rxEvent = {
    seq: ++seqCounter,
    id,
    source: "echo",
    callsign: txMessage.callsign,
    mode: txMessage.mode,
    freqKhz: txMessage.freqKhz,
    vfo: txMessage.vfo,
    startedAt: txMessage.txStartedAt,
    generatedAt: now,
    durationMs: txMessage.txDurationMs,
    frameIntervalMs: FRAME_TICK_MS,
    frames: makeFrames({
      startedAt: txMessage.txStartedAt,
      durationMs: txMessage.txDurationMs,
      micGain: txMessage.micGain,
      rfGain: txMessage.rfGain,
      noiseFloor: txMessage.noiseFloor,
      analog: txMessage.analog,
    }),
  }

  rxEvents.push(rxEvent)
  if (rxEvents.length > RX_BUFFER_LIMIT) {
    rxEvents = rxEvents.slice(-RX_BUFFER_LIMIT)
  }

  await writeAtomic(path.join(RX_DIR, `${rxEvent.seq}-${id}.json`), rxEvent)
  await archiveMessage(ARCHIVE_RX_DIR, rxEvent)

  return { id, seq: rxEvent.seq }
}

async function countDirEntries(dir) {
  const entries = await readdir(dir)
  return entries.filter(name => !name.endsWith(".tmp")).length
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString("utf8")
  return JSON.parse(text)
}

async function debugInject() {
  const synthetic = {
    callsign: "SIM-NODE",
    mode: "FM",
    freqKhz: 146520,
    vfo: "A",
    txDurationMs: 1200,
    rfGain: 72,
    micGain: 64,
    noiseFloor: 3.8,
    note: "autonomous-debug-inject",
  }
  return processTx(synthetic)
}

async function handleRequest(req, res) {
  if (req.method === "OPTIONS") {
    return json(res, 204, {})
  }

  if (req.url?.startsWith("/api/bridge/status") && req.method === "GET") {
    const [txDepth, rxDepth] = await Promise.all([countDirEntries(TX_DIR), countDirEntries(RX_DIR)])
    return json(res, 200, {
      now: Date.now(),
      txDepth,
      rxDepth,
      lastSeq: seqCounter,
    })
  }

  if (req.url?.startsWith("/api/bridge/rx") && req.method === "GET") {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const after = Number(url.searchParams.get("after") || 0)
    const events = rxEvents.filter(event => event.seq > after)
    const cursor = events.length > 0 ? events[events.length - 1].seq : after
    return json(res, 200, { cursor, events })
  }

  if (req.url?.startsWith("/api/bridge/tx") && req.method === "POST") {
    const body = await readBody(req)
    const result = await processTx(body)
    return json(res, 200, result)
  }

  if (req.url?.startsWith("/api/bridge/debug/inject") && req.method === "POST") {
    const result = await debugInject()
    return json(res, 200, { seq: result.seq })
  }

  return json(res, 404, { error: "Not found" })
}

await ensureDirs()

const server = createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    json(res, 500, { error: error.message || "Bridge failure" })
  })
})

server.listen(PORT, () => {
  console.log(`[bridge] running on http://localhost:${PORT}`)
  console.log(`[bridge] queue root ${QUEUE_ROOT}`)
})

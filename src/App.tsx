import { useState, useRef, useEffect, useMemo } from 'react'
import { BAND_FREQS, getAllowedBands, getAllowedModes, getBandForFrequency, getFrequencyBounds, getRadioCountryProfile, RADIO_BANDS, RADIO_COUNTRY_PROFILES, isFrequencyAllowed } from './radioRestrictions'
import { CHANNEL_MESSAGES, MAIL_MESSAGES, WIKI_ARTICLES } from './appSeedData'
import { MESH_CHANNELS_INIT, MESH_MESSAGES, MESH_NODES } from './meshSeedData'
import { DEFAULT_SIGNAL_SOURCES } from './radioSignalSources'

// ─── Types ──────────────────────────────────────────────────────────────────

type NavSection = 'radio' | 'channels' | 'mail' | 'lora' | 'wiki' | 'tools'

interface Message {
  id: number
  callsign: string
  text: string
  time: string
  type?: 'system' | 'alert' | 'normal'
}

interface Channel {
  id: string
  name: string
  freq?: string
  mode?: string
  unread?: number
}

interface MailMessage {
  id: number
  from: string
  to: string
  subject: string
  body: string
  time: string
  read: boolean
  forwarded?: boolean
}

interface WikiArticle {
  id: number
  title: string
  category: string
  summary: string
  tags: string[]
  content: string
}

function readStoredState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function useStoredState<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(() => readStoredState(key, fallback))

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // Ignore storage failures and keep the in-memory state working.
    }
  }, [key, state])

  return [state, setState] as const
}

// ─── Data ───────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  { id: 'general', name: 'general', freq: '14.300 MHz', mode: 'USB', unread: 0 },
  { id: 'emergency', name: 'emergency', freq: '146.520 MHz', mode: 'FM', unread: 3 },
  { id: 'wx-reports', name: 'wx-reports', freq: '7.240 MHz', mode: 'LSB', unread: 1 },
  { id: 'dx-cluster', name: 'dx-cluster', freq: '14.225 MHz', mode: 'SSB', unread: 0 },
  { id: 'net-control', name: 'net-control', freq: '3.995 MHz', mode: 'LSB', unread: 0 },
  { id: 'packet-node', name: 'packet-node', freq: '144.390 MHz', mode: 'AX.25', unread: 7 },
  { id: 'ares-ops', name: 'ares-ops', freq: '147.195 MHz', mode: 'FM', unread: 0 },
]


const Q_CODES = [
  { code: 'QRN', meaning: 'Static interference is troubling me' },
  { code: 'QRM', meaning: 'I am being interfered with' },
  { code: 'QRO', meaning: 'Increase power' },
  { code: 'QRP', meaning: 'Decrease power / low power ops' },
  { code: 'QRQ', meaning: 'Send faster' },
  { code: 'QRS', meaning: 'Send more slowly' },
  { code: 'QRT', meaning: 'Stop transmitting / shut down' },
  { code: 'QRZ', meaning: 'Who is calling me?' },
  { code: 'QSB', meaning: 'Your signals are fading' },
  { code: 'QSL', meaning: 'I acknowledge receipt / confirm' },
  { code: 'QSO', meaning: 'I can communicate with station X' },
  { code: 'QSY', meaning: 'Change frequency to X' },
  { code: 'QTH', meaning: 'My location is X' },
  { code: 'QRV', meaning: 'I am ready to operate' },
  { code: 'QNI', meaning: 'Check in to net' },
  { code: 'QTC', meaning: 'I have messages for you' },
]

const PHONETIC = [
  ['A', 'Alpha'], ['B', 'Bravo'], ['C', 'Charlie'], ['D', 'Delta'],
  ['E', 'Echo'], ['F', 'Foxtrot'], ['G', 'Golf'], ['H', 'Hotel'],
  ['I', 'India'], ['J', 'Juliet'], ['K', 'Kilo'], ['L', 'Lima'],
  ['M', 'Mike'], ['N', 'November'], ['O', 'Oscar'], ['P', 'Papa'],
  ['Q', 'Quebec'], ['R', 'Romeo'], ['S', 'Sierra'], ['T', 'Tango'],
  ['U', 'Uniform'], ['V', 'Victor'], ['W', 'Whiskey'], ['X', 'X-ray'],
  ['Y', 'Yankee'], ['Z', 'Zulu'],
]

const BAND_PLAN = [
  { band: '160m', range: '1.800–2.000 MHz', modes: 'CW, Phone, Digital', power: '1500W', notes: 'Nighttime DX, local day' },
  { band: '80m', range: '3.500–4.000 MHz', modes: 'CW, Phone, Digital', power: '1500W', notes: 'Regional, NVIS excellent' },
  { band: '60m', range: '5.332–5.405 MHz', modes: 'USB, CW, Digital', power: '100W ERP', notes: '5 channels, SHARES' },
  { band: '40m', range: '7.000–7.300 MHz', modes: 'CW, Phone, Digital', power: '1500W', notes: 'Day DX, night regional' },
  { band: '30m', range: '10.100–10.150 MHz', modes: 'CW, Digital only', power: '200W', notes: 'No phone, WARC' },
  { band: '20m', range: '14.000–14.350 MHz', modes: 'CW, Phone, Digital', power: '1500W', notes: 'Primary DX band' },
  { band: '17m', range: '18.068–18.168 MHz', modes: 'CW, Phone, Digital', power: '1500W', notes: 'WARC, good DX' },
  { band: '15m', range: '21.000–21.450 MHz', modes: 'CW, Phone, Digital', power: '1500W', notes: 'Solar-dependent DX' },
  { band: '10m', range: '28.000–29.700 MHz', modes: 'CW, Phone, Digital', power: '1500W', notes: 'Sporadic E, solar peak' },
  { band: '6m', range: '50.0–54.0 MHz', modes: 'CW, Phone, Digital', power: '1500W', notes: 'Magic band, Es' },
  { band: '2m', range: '144.0–148.0 MHz', modes: 'FM, SSB, Digital', power: '1500W', notes: 'Primary VHF, weak signal' },
  { band: '70cm', range: '420.0–450.0 MHz', modes: 'FM, SSB, Digital', power: '1500W', notes: 'Repeaters, satellites' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function SignalBars({ strength }: { strength: number }) {
  const levels = [1, 2, 3, 4, 5]
  return (
    <div className="signal-bar">
      {levels.map(l => (
        <span key={l} className={l <= strength ? 'active' : ''} style={{ height: `${l * 3 + 4}px` }} />
      ))}
    </div>
  )
}

const RADIO_CONNECTIONS = [
  'SDR (RTL-SDR)', 'SDR (HackRF)', 'SDR (ADALM-PLUTO)',
  'Icom USB Control (CI-V)', 'Icom RS-BA1',
  'Kenwood TS-590S', 'Kenwood TS-2000',
  'Yaesu CAT (FT-991A)', 'Yaesu SCU-17',
  'Elecraft K3/KX3', 'FlexRadio 6600',
  'Hamlib / rigctld', 'RigPi (MFJ)', 'Direct (No CAT)',
]

interface RadioConnectionSettings {
  endpoint: string
  baud: string
  address: string
  pttMode: 'CAT' | 'VOX' | 'RTS' | 'DTR'
  timeoutMs: string
}

function getConnectionSettingsDefaults(connection: string): RadioConnectionSettings {
  if (connection.includes('Hamlib')) {
    return { endpoint: '127.0.0.1:4532', baud: 'n/a', address: 'n/a', pttMode: 'CAT', timeoutMs: '1200' }
  }
  if (connection.includes('FlexRadio') || connection.includes('RS-BA1') || connection.includes('RigPi')) {
    return { endpoint: '192.168.1.100', baud: 'n/a', address: 'auto', pttMode: 'CAT', timeoutMs: '1500' }
  }
  if (connection.includes('SDR')) {
    return { endpoint: 'usb:auto', baud: 'n/a', address: 'n/a', pttMode: 'VOX', timeoutMs: '1000' }
  }
  return { endpoint: 'COM3', baud: '19200', address: '94', pttMode: 'CAT', timeoutMs: '1000' }
}

function signalLabelFromSMeter(level: number) {
  return `S${Math.max(0, Math.min(9, Math.round(level)))}`
}

function signalBarsFromSMeter(level: number) {
  return Math.max(0, Math.min(5, Math.round(level / 2)))
}

function TopBar({
  section,
  callsign,
  onCallsignChange,
  country,
  onCountryChange,
  license,
  onLicenseChange,
  emergencyOverride,
  onEmergencyOverrideChange,
  signalLevel,
  netStatus,
}: {
  section: NavSection
  callsign: string
  onCallsignChange: (v: string) => void
  country: string
  onCountryChange: (v: string) => void
  license: string
  onLicenseChange: (v: string) => void
  emergencyOverride: boolean
  onEmergencyOverrideChange: (v: boolean) => void
  signalLevel: number
  netStatus: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(callsign)
  const [conn, setConn] = useStoredState('arsn.radio.connection', 'Icom USB Control (CI-V)')
  const [connPickerOpen, setConnPickerOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [editingConn, setEditingConn] = useState(conn)
  const [connectionSettings, setConnectionSettings] = useStoredState<Record<string, RadioConnectionSettings>>('arsn.radio.connectionSettings', {})
  const [settingsDraft, setSettingsDraft] = useState<RadioConnectionSettings>(() => connectionSettings[conn] ?? getConnectionSettingsDefaults(conn))
  const connPickerRef = useRef<HTMLDivElement>(null)
  const [connected, setConnected] = useState(false)
  const countryProfile = getRadioCountryProfile(country)

  useEffect(() => {
    if (!countryProfile.licenses.includes(license)) {
      onLicenseChange(countryProfile.defaultLicense)
    }
  }, [country, countryProfile, license, onLicenseChange])

  useEffect(() => {
    const onDocumentPointer = (event: MouseEvent) => {
      if (!connPickerRef.current) return
      if (!connPickerRef.current.contains(event.target as Node)) {
        setConnPickerOpen(false)
      }
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConnPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocumentPointer)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onDocumentPointer)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  const openConnectionSettings = (targetConnection: string) => {
    const defaults = getConnectionSettingsDefaults(targetConnection)
    setEditingConn(targetConnection)
    setSettingsDraft(connectionSettings[targetConnection] ?? defaults)
    setSettingsModalOpen(true)
    setConnPickerOpen(false)
  }

  const saveConnectionSettings = () => {
    setConnectionSettings(prev => ({ ...prev, [editingConn]: settingsDraft }))
    setSettingsModalOpen(false)
  }

  const commit = () => {
    const v = draft.trim().toUpperCase()
    if (v) onCallsignChange(v)
    setEditing(false)
  }
  const labels: Record<NavSection, string> = {
    radio: 'Transceiver',
    channels: 'Bulletin Board',
    mail: 'Store & Forward Mail',
    lora: 'LoRa Packet Network',
    wiki: 'ARSN Wiki Library',
    tools: 'HAM Tools',
  }
  const now = new Date()
  const utc = now.toUTCString().split(' ').slice(4, 5)[0]
  const signalBars = signalBarsFromSMeter(signalLevel)
  const signalLabel = signalLabelFromSMeter(signalLevel)
  const linkOk = connected && netStatus
  return (
    <div style={{ background: '#0d150d', borderBottom: '1px solid #1f3320' }}
      className="flex items-center justify-between px-4 py-2 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-display text-xs tracking-widest" style={{ color: '#4ade80' }}>
          {labels[section]}
        </span>
        {section === 'radio' && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? '#4ade80' : '#374151', boxShadow: connected ? '0 0 4px #4ade80' : 'none', flexShrink: 0 }} />
            <div className="relative" ref={connPickerRef}>
              <button
                onClick={() => setConnPickerOpen(v => !v)}
                className="font-mono text-xs px-2 py-0.5 rounded flex items-center gap-2"
                style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#4a7a4a', fontSize: 10, outline: 'none', cursor: 'pointer', minWidth: 215, justifyContent: 'space-between' }}
                title="Select connection">
                <span className="truncate">{conn}</span>
                <span style={{ color: '#2d6a2d', fontSize: 11 }}>{connPickerOpen ? '▲' : '▼'}</span>
              </button>
              {connPickerOpen && (
                <div
                  className="absolute z-50 mt-1 rounded"
                  style={{ background: '#0a1208', border: '1px solid #2d4d2d', minWidth: 320, maxHeight: 420, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.65)' }}>
                  {RADIO_CONNECTIONS.map(option => (
                    <div key={option} className="flex items-center" style={{ borderBottom: '1px solid #0f1a0f' }}>
                      <button
                        onClick={() => { setConn(option); setConnected(false); setConnPickerOpen(false) }}
                        className="flex-1 text-left font-mono text-xs px-3 py-2"
                        style={{ color: conn === option ? '#d1fae5' : '#4a7a4a', background: conn === option ? '#1f2937' : 'transparent', cursor: 'pointer' }}>
                        {option}
                      </button>
                      <button
                        onClick={() => openConnectionSettings(option)}
                        className="font-display text-xs px-2 py-1 rounded mr-2"
                        title={`Edit ${option} settings`}
                        style={{ background: '#0f1a0f', border: '1px solid #1f3320', color: '#4ade80', fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer' }}>
                        ✎
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setConnected(p => !p)}
              className="font-display text-xs px-2 py-0.5 rounded transition-all"
              style={{
                background: connected ? '#4ade8015' : '#0a1208',
                border: `1px solid ${connected ? '#4ade80' : '#1a2e1a'}`,
                color: connected ? '#4ade80' : '#2d6a2d',
                fontSize: 9, letterSpacing: '0.08em',
              }}>
              {connected ? 'DISCONNECT' : 'CONNECT'}
            </button>
            <select
              value={country}
              onChange={e => onCountryChange(e.target.value)}
              className="font-mono text-xs px-2 py-0.5 rounded"
              title="Country"
              style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#4a7a4a', fontSize: 10, outline: 'none', cursor: 'pointer', maxWidth: 132 }}
            >
              {Object.keys(RADIO_COUNTRY_PROFILES).map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select
              value={license}
              onChange={e => onLicenseChange(e.target.value)}
              className="font-mono text-xs px-2 py-0.5 rounded"
              title="License"
              style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#4a7a4a', fontSize: 10, outline: 'none', cursor: 'pointer', maxWidth: 120 }}
            >
              {countryProfile.licenses.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <label
              className="flex items-center gap-1 font-display text-xs px-2 py-0.5 rounded"
              title="Emergency override"
              style={{ background: emergencyOverride ? '#fbbf2414' : '#0a1208', border: `1px solid ${emergencyOverride ? '#fbbf24' : '#1a2e1a'}`, color: emergencyOverride ? '#fbbf24' : '#2d6a2d', fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={emergencyOverride}
                onChange={e => onEmergencyOverrideChange(e.target.checked)}
                style={{ accentColor: '#fbbf24' }}
              />
              BYPASS
            </label>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="status-dot status-online" />
          {editing ? (
            <input
              autoFocus
              className="font-mono text-xs px-1 rounded"
              style={{ background: '#0d150d', border: '1px solid #4ade80', color: '#4ade80', width: 80, outline: 'none' }}
              value={draft}
              onChange={e => setDraft(e.target.value.toUpperCase())}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
              maxLength={8}
            />
          ) : (
            <button
              onClick={() => { setDraft(callsign); setEditing(true) }}
              className="font-mono text-xs"
              title="Click to edit callsign"
              style={{ color: '#6ee7b7', background: 'transparent', border: 'none', cursor: 'text', padding: 0, borderBottom: '1px dotted #2d6a2d' }}>
              {callsign}
            </button>
          )}
        </div>
        <div className="font-mono text-xs" style={{ color: '#4ade80' }}>
          {utc} UTC
        </div>
        <div className="flex items-center gap-1.5">
          <SignalBars strength={signalBars} />
          <span className="font-mono text-xs" style={{ color: '#6ee7b7' }}>{signalLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ background: linkOk ? '#4ade80' : '#1f3320', boxShadow: linkOk ? '0 0 4px #4ade80' : 'none' }} />
          <span className="font-mono text-xs" style={{ color: linkOk ? '#4ade80' : '#2d6a2d' }}>{linkOk ? 'NET OK' : 'NET WAIT'}</span>
        </div>
      </div>

      {settingsModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSettingsModalOpen(false)}>
          <div
            style={{ background: '#0a0d0a', border: '1px solid #2d4d2d', borderRadius: 8, padding: 20, width: 430, boxShadow: '0 8px 40px rgba(0,0,0,0.9)' }}
            onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display text-xs" style={{ color: '#4ade80', fontSize: 11, letterSpacing: '0.12em' }}>CONNECTION SETTINGS</div>
                <div className="font-mono text-xs mt-1" style={{ color: '#2d6a2d', fontSize: 10 }}>{editingConn}</div>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#2d6a2d', fontSize: 16, cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>ENDPOINT / PORT</label>
                <input
                  className="w-full px-3 py-2 rounded font-mono text-xs"
                  value={settingsDraft.endpoint}
                  onChange={event => setSettingsDraft(prev => ({ ...prev, endpoint: event.target.value }))}
                  placeholder="COM3 or host:port"
                />
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>BAUD</label>
                  <input
                    className="w-full px-3 py-2 rounded font-mono text-xs"
                    value={settingsDraft.baud}
                    onChange={event => setSettingsDraft(prev => ({ ...prev, baud: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>ADDRESS</label>
                  <input
                    className="w-full px-3 py-2 rounded font-mono text-xs"
                    value={settingsDraft.address}
                    onChange={event => setSettingsDraft(prev => ({ ...prev, address: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>PTT MODE</label>
                  <select
                    className="w-full px-3 py-2 rounded font-mono text-xs"
                    value={settingsDraft.pttMode}
                    onChange={event => setSettingsDraft(prev => ({ ...prev, pttMode: event.target.value as RadioConnectionSettings['pttMode'] }))}>
                    {['CAT', 'VOX', 'RTS', 'DTR'].map(mode => <option key={mode}>{mode}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>TIMEOUT (ms)</label>
                  <input
                    className="w-full px-3 py-2 rounded font-mono text-xs"
                    value={settingsDraft.timeoutMs}
                    onChange={event => setSettingsDraft(prev => ({ ...prev, timeoutMs: event.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={saveConnectionSettings}
                className="flex-1 font-display text-xs py-2 rounded"
                style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 10, letterSpacing: '0.1em' }}>
                SAVE
              </button>
              <button
                onClick={() => {
                  setSettingsDraft(getConnectionSettingsDefaults(editingConn))
                }}
                className="font-display text-xs py-2 px-3 rounded"
                style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#2d6a2d', fontSize: 10, letterSpacing: '0.08em' }}>
                RESET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Channels Section ────────────────────────────────────────────────────────

// ─── BBS Data ────────────────────────────────────────────────────────────────

interface BBSGroup { id: string; name: string; collapsed?: boolean }
interface BBSChannel { id: string; groupId: string; name: string; freq: string; mode: string; description: string; unread?: number }

const INIT_GROUPS: BBSGroup[] = [
  { id: 'ops', name: 'OPERATIONS' },
  { id: 'info', name: 'INFORMATION' },
  { id: 'digital', name: 'DIGITAL NETS' },
]
const INIT_CHANNELS: BBSChannel[] = [
  { id: 'general',     groupId: 'ops',     name: 'general',      freq: '14.300 MHz', mode: 'USB',   description: 'General check-ins and traffic', unread: 0 },
  { id: 'emergency',   groupId: 'ops',     name: 'emergency',    freq: '146.520 MHz',mode: 'FM',    description: 'Emergency and priority traffic', unread: 3 },
  { id: 'net-control', groupId: 'ops',     name: 'net-control',  freq: '3.995 MHz',  mode: 'LSB',   description: 'Daily net control operations', unread: 0 },
  { id: 'ares-ops',    groupId: 'ops',     name: 'ares-ops',     freq: '147.195 MHz',mode: 'FM',    description: 'ARES Section operations', unread: 0 },
  { id: 'wx-reports',  groupId: 'info',    name: 'wx-reports',   freq: '7.240 MHz',  mode: 'LSB',   description: 'Weather observations and SKYWARN', unread: 1 },
  { id: 'dx-cluster',  groupId: 'info',    name: 'dx-cluster',   freq: '14.225 MHz', mode: 'SSB',   description: 'DX spots and propagation', unread: 0 },
  { id: 'packet-node', groupId: 'digital', name: 'packet-node',  freq: '144.390 MHz',mode: 'AX.25', description: 'Packet radio node status', unread: 7 },
]

interface ConnectedClient { callsign: string; grid: string; lastSeen: string; msgCount: number; status: 'online' | 'idle' | 'offline' }
const INIT_CLIENTS: ConnectedClient[] = [
  { callsign: 'W7ARK',   grid: 'DM79', lastSeen: '09:15', msgCount: 12, status: 'online' },
  { callsign: 'WB4TXX',  grid: 'EM85', lastSeen: '09:08', msgCount: 5,  status: 'online' },
  { callsign: 'KG4ZPQ',  grid: 'EM73', lastSeen: '08:55', msgCount: 3,  status: 'idle'   },
  { callsign: 'K5LNT',   grid: 'DM90', lastSeen: '08:30', msgCount: 2,  status: 'idle'   },
  { callsign: 'N0GRD',   grid: 'DM79', lastSeen: '07:40', msgCount: 8,  status: 'offline' },
]

interface SyncEvent { id: number; time: string; callsign: string; action: string; channel?: string }
const INIT_SYNC_LOG: SyncEvent[] = [
  { id: 1, time: '09:15', callsign: 'W7ARK',  action: 'PULL', channel: 'general' },
  { id: 2, time: '09:12', callsign: 'WB4TXX', action: 'PUSH', channel: 'net-control' },
  { id: 3, time: '09:08', callsign: 'KG4ZPQ', action: 'PULL', channel: 'emergency' },
  { id: 4, time: '08:55', callsign: 'W7ARK',  action: 'PUSH', channel: 'wx-reports' },
  { id: 5, time: '08:30', callsign: 'K5LNT',  action: 'CONNECT', },
]

// ─── BBS Section ─────────────────────────────────────────────────────────────

function ChannelsSection() {
  const [mode, setMode] = useStoredState<'host' | 'client'>('arsn.bbs.mode', 'host')

  // Host state
  const [groups, setGroups] = useStoredState<BBSGroup[]>('arsn.bbs.groups', INIT_GROUPS)
  const [channels, setChannels] = useStoredState<BBSChannel[]>('arsn.bbs.channels', INIT_CHANNELS)
  const [clients] = useState<ConnectedClient[]>(INIT_CLIENTS)
  const [syncLog] = useState<SyncEvent[]>(INIT_SYNC_LOG)
  const [collapsedGroupIds, setCollapsedGroupIds] = useStoredState<string[]>('arsn.bbs.collapsedGroups', [])
  const collapsedGroups = new Set(collapsedGroupIds)
  const [activeChannel, setActiveChannel] = useStoredState('arsn.bbs.activeChannel', 'general')
  const [messages, setMessages] = useStoredState<Record<string, Message[]>>('arsn.bbs.messages', CHANNEL_MESSAGES)
  const [input, setInput] = useStoredState('arsn.bbs.input', '')
  const [rightPanel, setRightPanel] = useStoredState<'clients' | 'settings'>('arsn.bbs.rightPanel', 'clients')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Host settings
  const [boardName, setBoardName] = useStoredState('arsn.bbs.boardName', 'ARSN-NODE-01')
  const [nodeCallsign, setNodeCallsign] = useStoredState('arsn.bbs.nodeCallsign', 'KD9LMX-BBS')
  const [nodeMode, setNodeMode] = useStoredState('arsn.bbs.nodeMode', 'USB')

  interface FreqPair { tx: string; rx: string; mode: string; label: string }
  const [freqPairs, setFreqPairs] = useStoredState<FreqPair[]>('arsn.bbs.freqPairs', [
    { tx: '14.300', rx: '14.300', mode: 'USB', label: 'Primary' },
    { tx: '7.250',  rx: '7.250',  mode: 'LSB', label: 'Backup'  },
    { tx: '146.520',rx: '146.520',mode: 'FM',  label: 'VHF'     },
  ])
  const [activeFreqIdx, setActiveFreqIdx] = useStoredState('arsn.bbs.activeFreqIdx', 0)
  const [freqModalOpen, setFreqModalOpen] = useState(false)
  const [editPairs, setEditPairs] = useState<FreqPair[]>(freqPairs)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useStoredState<'connection' | 'node' | 'clients' | 'synclog'>('arsn.bbs.settingsTab', 'connection')
  const [connDevice, setConnDevice] = useStoredState('arsn.bbs.connDevice', 'Icom USB Control (CI-V)')
  const [connPort, setConnPort] = useStoredState('arsn.bbs.connPort', 'COM3')
  const [connBaud, setConnBaud] = useStoredState('arsn.bbs.connBaud', '19200')
  const [connCivAddr, setConnCivAddr] = useStoredState('arsn.bbs.connCivAddr', '94')
  const [beaconInterval, setBeaconInterval] = useStoredState('arsn.bbs.beaconInterval', '300')
  const [syncInterval, setSyncInterval] = useStoredState('arsn.bbs.syncInterval', '60')
  const [maxClients, setMaxClients] = useStoredState('arsn.bbs.maxClients', '10')
  const [requireAuth, setRequireAuth] = useStoredState('arsn.bbs.requireAuth', false)

  // Sidebar resize
  const [sidebarWidth, setSidebarWidth] = useStoredState('arsn.bbs.sidebarWidth', 230)
  const resizingRef = useRef(false)
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = true
    const startX = e.clientX
    const startW = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      const w = Math.min(360, Math.max(160, startW + ev.clientX - startX))
      setSidebarWidth(w)
    }
    const onUp = () => { resizingRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Group editing
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [newChanInGroup, setNewChanInGroup] = useState('')

  const startEditGroup = (g: BBSGroup) => { setEditingGroup(g.id); setEditGroupName(g.name); setNewChanInGroup('') }
  const saveGroupName = (gid: string) => {
    if (editGroupName.trim()) setGroups(prev => prev.map(g => g.id === gid ? { ...g, name: editGroupName.toUpperCase() } : g))
    setEditingGroup(null)
  }
  const deleteGroup = (gid: string) => {
    setGroups(prev => prev.filter(g => g.id !== gid))
    setChannels(prev => prev.filter(c => c.groupId !== gid))
    setEditingGroup(null)
  }
  const deleteChannel = (cid: string) => setChannels(prev => prev.filter(c => c.id !== cid))
  const addChanToGroup = (gid: string) => {
    if (!newChanInGroup.trim()) return
    const id = newChanInGroup.toLowerCase().replace(/\s+/g, '-')
    setChannels(prev => [...prev, { id, groupId: gid, name: id, freq: '', mode: 'USB', description: '', unread: 0 }])
    setNewChanInGroup('')
  }
  const nodeFreq = freqPairs[activeFreqIdx]?.tx || '14.300'
  const [newGroupName, setNewGroupName] = useState('')
  const [newChanName, setNewChanName] = useState('')
  const [newChanGroup, setNewChanGroup] = useStoredState('arsn.bbs.newChanGroup', 'ops')
  const [newChanFreq, setNewChanFreq] = useState('')
  const [newChanMode, setNewChanMode] = useStoredState('arsn.bbs.newChanMode', 'USB')
  const [newChanDesc, setNewChanDesc] = useState('')

  // Client state
  const [clientConnected, setClientConnected] = useState(false)
  const [clientConnecting, setClientConnecting] = useState(false)
  const [dialCallsign, setDialCallsign] = useState('KD9LMX-BBS')
  const [dialFreq, setDialFreq] = useState('14.300')
  const [dialMode, setDialMode] = useState('USB')
  const [dialLog, setDialLog] = useState<string[]>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeChannel, messages])

  const send = () => {
    if (!input.trim()) return
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), { id: Date.now(), callsign: 'KD9LMX', text: input.trim(), time, type: 'normal' }]
    }))
    setInput('')
  }

  const toggleGroup = (gid: string) => {
    setCollapsedGroupIds(prev => prev.includes(gid) ? prev.filter(id => id !== gid) : [...prev, gid])
  }

  const addGroup = () => {
    if (!newGroupName.trim()) return
    const id = newGroupName.toLowerCase().replace(/\s+/g, '-')
    setGroups(prev => [...prev, { id, name: newGroupName.toUpperCase() }])
    setNewGroupName('')
  }

  const addChannel = () => {
    if (!newChanName.trim()) return
    const id = newChanName.toLowerCase().replace(/\s+/g, '-')
    setChannels(prev => [...prev, { id, groupId: newChanGroup, name: id, freq: newChanFreq || '14.300 MHz', mode: newChanMode, description: newChanDesc || 'No description', unread: 0 }])
    setNewChanName(''); setNewChanFreq(''); setNewChanDesc('')
  }

  const dialIn = () => {
    if (clientConnecting || clientConnected) return
    setClientConnecting(true)
    setDialLog([''])
    const steps = [
      `> CONNECTING TO ${dialCallsign} ON ${dialFreq} MHz ${dialMode}...`,
      '> SENDING CONNECT REQUEST...',
      `> ${dialCallsign} DE KD9LMX K`,
      '> AWAITING RESPONSE...',
      `> ${dialCallsign}: ARSN BBS V2.4 / WELCOME KD9LMX`,
      '> PULLING BOARD STRUCTURE...',
      '> RECEIVED: 3 GROUPS / 7 CHANNELS',
      '> SYNCING MESSAGES...',
      '> SYNC COMPLETE — 47 NEW MESSAGES',
      '> CONNECTION ESTABLISHED. 73 DE ' + dialCallsign,
    ]
    steps.forEach((s, i) => setTimeout(() => {
      setDialLog(prev => [...prev, s])
      if (i === steps.length - 1) { setClientConnecting(false); setClientConnected(true) }
    }, (i + 1) * 380))
  }

  const disconnect = () => { setClientConnected(false); setDialLog([]) }

  const ch = channels.find(c => c.id === activeChannel) || channels[0]

  const Btn = ({ label, active, onClick, color = '#4ade80', small }: { label: string; active?: boolean; onClick?: () => void; color?: string; small?: boolean }) => (
    <button onClick={onClick}
      className="font-display rounded transition-all"
      style={{
        padding: small ? '3px 8px' : '5px 10px',
        background: active ? `${color}15` : '#0a1208',
        border: `1px solid ${active ? color : '#1a2e1a'}`,
        color: active ? color : '#2d6a2d',
        fontSize: small ? 8 : 9, letterSpacing: '0.08em',
        boxShadow: active ? `0 0 6px ${color}25` : 'none',
      }}>
      {label}
    </button>
  )

  // ── Sidebar ──
  const Sidebar = () => (
    <div style={{ width: sidebarWidth, minWidth: sidebarWidth, background: '#050905', borderRight: '1px solid #1f3320', position: 'relative' }} className="flex flex-col shrink-0">
      {/* Drag handle */}
      <div
        onMouseDown={startResize}
        style={{ position: 'absolute', top: 0, right: -3, width: 6, height: '100%', cursor: 'col-resize', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="Drag to resize">
        <div style={{ width: 2, height: 40, borderRadius: 1, background: '#1f3320', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#4ade80')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1f3320')} />
      </div>
      {/* Mode toggle */}
      <div className="p-3" style={{ borderBottom: '1px solid #1f3320' }}>
        <div className="flex gap-1 mb-2">
          {(['host', 'client'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 font-display text-xs py-1.5 rounded transition-all"
              style={{
                background: mode === m ? (m === 'host' ? '#4ade8015' : '#22d3ee15') : '#080c08',
                border: `1px solid ${mode === m ? (m === 'host' ? '#4ade80' : '#22d3ee') : '#1f3320'}`,
                color: mode === m ? (m === 'host' ? '#4ade80' : '#22d3ee') : '#2d6a2d',
                fontSize: 9, letterSpacing: '0.1em',
              }}>
              {m === 'host' ? '⬡ HOST' : '◎ CLIENT'}
            </button>
          ))}
        </div>
        <div className="font-mono text-xs truncate" style={{ color: '#2d6a2d', fontSize: 9 }}>
          {mode === 'host' ? `NODE: ${boardName}` : clientConnected ? `CONNECTED: ${dialCallsign}` : 'NOT CONNECTED'}
        </div>
      </div>

      {/* Board name */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between">
        <span className="font-display text-xs" style={{ color: mode === 'host' ? '#4ade80' : '#22d3ee', fontSize: 10, letterSpacing: '0.1em' }}>
          {mode === 'host' ? boardName : (clientConnected ? dialCallsign : 'ARSN BBS')}
        </span>
        {mode === 'host' && (
          <div className="flex gap-1">
            <span className="status-dot status-online" style={{ width: 6, height: 6 }} />
            <span className="font-display" style={{ color: '#4ade80', fontSize: 8 }}>HOST</span>
          </div>
        )}
      </div>

      {/* Groups + channels */}
      <div className="flex-1 overflow-y-auto">
        {groups.map(g => {
          const gChans = channels.filter(c => c.groupId === g.id)
          const collapsed = collapsedGroups.has(g.id)
          const isEditing = editingGroup === g.id
          return (
            <div key={g.id}>
              <div className="flex items-center group/grp" style={{ paddingRight: 6 }}>
                <button
                  onClick={() => toggleGroup(g.id)}
                  className="flex-1 flex items-center gap-1.5 px-3 py-1.5 font-display text-xs"
                  style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em', background: 'transparent', textAlign: 'left' }}>
                  <span style={{ fontSize: 8 }}>{collapsed ? '▶' : '▼'}</span>
                  {g.name}
                  <span className="ml-auto" style={{ color: '#1f3320' }}>{gChans.length}</span>
                </button>
                {mode === 'host' && (
                  <button
                    onClick={() => isEditing ? setEditingGroup(null) : startEditGroup(g)}
                    style={{ background: 'transparent', border: 'none', color: isEditing ? '#4ade80' : '#1f4a1f', fontSize: 10, padding: '2px 4px', lineHeight: 1, cursor: 'pointer', opacity: isEditing ? 1 : undefined }}
                    className="opacity-0 group-hover/grp:opacity-100 transition-opacity"
                    title="Edit group">
                    {isEditing ? '✕' : '✎'}
                  </button>
                )}
              </div>

              {/* Inline group editor */}
              {isEditing && (
                <div style={{ margin: '0 8px 6px', padding: '8px 10px', background: '#080c08', border: '1px solid #1f3320', borderRadius: 5 }}>
                  {/* Rename */}
                  <div className="flex gap-1 mb-2">
                    <input
                      className="flex-1 px-2 py-1 rounded font-mono text-xs"
                      value={editGroupName}
                      onChange={e => setEditGroupName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveGroupName(g.id); if (e.key === 'Escape') setEditingGroup(null) }}
                      autoFocus
                    />
                    <button onClick={() => saveGroupName(g.id)}
                      className="font-display text-xs px-2 py-1 rounded"
                      style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 8 }}>
                      SAVE
                    </button>
                  </div>
                  {/* Channels */}
                  <div className="space-y-0.5 mb-2">
                    {gChans.map(c => (
                      <div key={c.id} className="flex items-center gap-1">
                        <span style={{ color: '#2d6a2d', fontSize: 10, flexShrink: 0 }}>#</span>
                        <input
                          className="flex-1 px-1.5 py-0.5 rounded font-mono"
                          style={{ fontSize: 10, background: '#0a1208', border: '1px solid #1a2e1a', color: '#86efac', minWidth: 0 }}
                          value={c.name}
                          onChange={e => setChannels(prev => prev.map(ch => ch.id === c.id ? { ...ch, name: e.target.value } : ch))}
                        />
                        <button onClick={() => deleteChannel(c.id)}
                          style={{ background: '#1a0808', border: '1px solid #4a1a1a', color: '#ef4444', fontSize: 9, cursor: 'pointer', lineHeight: 1, padding: '2px 5px', borderRadius: 3, flexShrink: 0 }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add channel */}
                  <div className="flex gap-1 mb-2">
                    <input
                      className="flex-1 px-2 py-0.5 rounded font-mono text-xs"
                      placeholder="new-channel"
                      value={newChanInGroup}
                      onChange={e => setNewChanInGroup(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addChanToGroup(g.id)}
                      style={{ fontSize: 10 }}
                    />
                    <button onClick={() => addChanToGroup(g.id)}
                      className="font-display text-xs px-2 py-0.5 rounded"
                      style={{ background: '#0a1208', border: '1px solid #2d4d2d', color: '#4ade80', fontSize: 9 }}>
                      +
                    </button>
                  </div>
                  {/* Delete group */}
                  <button onClick={() => deleteGroup(g.id)}
                    className="w-full font-display text-xs py-1 rounded"
                    style={{ background: '#1a0808', border: '1px solid #4a1a1a', color: '#ef4444', fontSize: 8, letterSpacing: '0.08em' }}>
                    DELETE GROUP
                  </button>
                </div>
              )}

              {!collapsed && gChans.map(c => {
                const totalUnread = c.unread || 0
                return (
                  <button key={c.id}
                    onClick={() => setActiveChannel(c.id)}
                    className="w-full text-left"
                    style={{
                      padding: '5px 12px 5px 20px',
                      background: activeChannel === c.id ? '#111d11' : 'transparent',
                      borderLeft: `2px solid ${activeChannel === c.id ? '#4ade80' : 'transparent'}`,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    <span style={{ color: activeChannel === c.id ? '#4ade80' : '#2d6a2d', fontSize: 11, flexShrink: 0 }}>#</span>
                    <span className="font-mono text-xs truncate" style={{ color: activeChannel === c.id ? '#d1fae5' : '#4a7a4a' }}>{c.name}</span>
                    {totalUnread > 0 && (
                      <span className="ml-auto font-display text-xs px-1.5 py-0.5 rounded-sm shrink-0"
                        style={{ background: '#4ade8020', color: '#4ade80', fontSize: 9 }}>
                        {totalUnread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}

        {/* Add group — host only */}
        {mode === 'host' && (
          <div style={{ padding: '4px 8px 8px' }}>
            <div className="flex gap-1">
              <input
                className="flex-1 px-2 py-1 rounded font-mono text-xs"
                placeholder="New group name"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGroup()}
                style={{ fontSize: 10 }}
              />
              <button onClick={addGroup}
                className="font-display text-xs px-2 py-1 rounded"
                style={{ background: '#0a1208', border: '1px solid #2d4d2d', color: '#4ade80', fontSize: 9, whiteSpace: 'nowrap' }}>
                + GRP
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: global freq pairs */}
      <button
        onClick={() => { setEditPairs(freqPairs.map(p => ({ ...p }))); setFreqModalOpen(true) }}
        style={{ borderTop: '1px solid #1f3320', padding: '10px 12px', width: '100%', textAlign: 'left', background: 'transparent', cursor: 'pointer' }}
        title="Click to edit frequency pairs"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xs" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>BBS FREQUENCIES</span>
          <span className="font-display text-xs" style={{ color: '#1f4a1f', fontSize: 8 }}>✎ EDIT</span>
        </div>
        <div className="space-y-1.5">
          {freqPairs.map((p, i) => (
            <div key={i}
              onClick={e => { e.stopPropagation(); setActiveFreqIdx(i) }}
              style={{
                padding: '4px 6px', borderRadius: 4, cursor: 'pointer',
                background: activeFreqIdx === i ? '#162016' : '#0a1208',
                border: `1px solid ${activeFreqIdx === i ? '#4ade80' : '#1a2e1a'}`,
              }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-display" style={{ color: activeFreqIdx === i ? '#4ade80' : '#2d6a2d', fontSize: 8, letterSpacing: '0.06em' }}>{p.label}</span>
                <span className="font-display" style={{ color: '#1f4a1f', fontSize: 8 }}>{p.mode}</span>
              </div>
              <div className="flex gap-1 items-center font-mono" style={{ fontSize: 9 }}>
                <span style={{ color: '#22d3ee', fontSize: 8 }}>TX</span>
                <span style={{ color: activeFreqIdx === i ? '#d1fae5' : '#4a7a4a' }}>{p.tx}</span>
                <span style={{ color: '#1f3320' }}>·</span>
                <span style={{ color: '#4ade80', fontSize: 8 }}>RX</span>
                <span style={{ color: activeFreqIdx === i ? '#d1fae5' : '#4a7a4a' }}>{p.rx}</span>
                <span style={{ color: '#2d6a2d' }}>MHz</span>
              </div>
            </div>
          ))}
        </div>
      </button>

      {/* Freq pairs modal */}
      {freqModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setFreqModalOpen(false)}>
          <div style={{ background: '#0a0d0a', border: '1px solid #2d4d2d', borderRadius: 8, padding: 24, width: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-display text-sm" style={{ color: '#4ade80', letterSpacing: '0.1em', fontSize: 13 }}>BBS FREQUENCY PAIRS</span>
              <button onClick={() => setFreqModalOpen(false)} className="font-mono text-xs" style={{ color: '#2d6a2d', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div className="font-mono text-xs mb-4" style={{ color: '#2d6a2d' }}>
              Up to 3 TX/RX pairs. Click a pair to make it active. Split operation supported (different TX and RX frequencies).
            </div>
            <div className="space-y-3">
              {editPairs.map((p, i) => (
                <div key={i} style={{ background: '#080c08', border: '1px solid #1f3320', borderRadius: 6, padding: '10px 12px' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-display text-xs" style={{ color: '#4ade80', fontSize: 9, letterSpacing: '0.08em' }}>PAIR {i + 1}</span>
                    <input
                      className="flex-1 px-2 py-0.5 rounded font-display text-xs"
                      style={{ background: '#0f1a0f', border: '1px solid #1f3320', color: '#86efac', fontSize: 9, letterSpacing: '0.06em' }}
                      value={p.label}
                      onChange={e => setEditPairs(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      placeholder="Label"
                    />
                    <select
                      className="px-2 py-0.5 rounded font-mono text-xs"
                      style={{ background: '#0f1a0f', border: '1px solid #1f3320', color: '#86efac', fontSize: 10 }}
                      value={p.mode}
                      onChange={e => setEditPairs(prev => prev.map((x, j) => j === i ? { ...x, mode: e.target.value } : x))}>
                      {['USB', 'LSB', 'FM', 'AM', 'CW', 'AX.25', 'FT8'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="font-display block mb-1" style={{ color: '#22d3ee', fontSize: 8, letterSpacing: '0.08em' }}>TX (MHz)</label>
                      <input className="w-full px-2 py-1.5 rounded font-mono text-sm"
                        style={{ background: '#020602', border: '1px solid #22d3ee30', color: '#22d3ee' }}
                        value={p.tx}
                        onChange={e => setEditPairs(prev => prev.map((x, j) => j === i ? { ...x, tx: e.target.value } : x))}
                        placeholder="14.300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="font-display block mb-1" style={{ color: '#4ade80', fontSize: 8, letterSpacing: '0.08em' }}>RX (MHz)</label>
                      <input className="w-full px-2 py-1.5 rounded font-mono text-sm"
                        style={{ background: '#020602', border: '1px solid #4ade8030', color: '#4ade80' }}
                        value={p.rx}
                        onChange={e => setEditPairs(prev => prev.map((x, j) => j === i ? { ...x, rx: e.target.value } : x))}
                        placeholder="14.300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {editPairs.length < 3 && (
              <button
                onClick={() => setEditPairs(prev => [...prev, { tx: '', rx: '', mode: 'USB', label: `Pair ${prev.length + 1}` }])}
                className="w-full font-display text-xs py-2 rounded mt-3"
                style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#2d6a2d', fontSize: 9, letterSpacing: '0.08em' }}>
                + ADD PAIR
              </button>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setFreqPairs(editPairs); setFreqModalOpen(false) }}
                className="flex-1 font-display text-xs py-2 rounded"
                style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 10, letterSpacing: '0.1em', boxShadow: '0 0 8px #4ade8020' }}>
                SAVE
              </button>
              <button
                onClick={() => setFreqModalOpen(false)}
                className="font-display text-xs py-2 px-4 rounded"
                style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#2d6a2d', fontSize: 10, letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── Host right panel ──
  const HostRightPanel = () => (
    <div style={{ width: 240, background: '#050905', borderLeft: '1px solid #1f3320' }} className="flex flex-col shrink-0">
      <div className="flex shrink-0" style={{ borderBottom: '1px solid #1f3320' }}>
        {(['clients', 'settings'] as const).map(p => (
          <button key={p} onClick={() => setRightPanel(p)}
            className="flex-1 font-display text-xs py-2 transition-all"
            style={{ fontSize: 9, letterSpacing: '0.08em', color: rightPanel === p ? '#4ade80' : '#2d6a2d', borderBottom: `2px solid ${rightPanel === p ? '#4ade80' : 'transparent'}`, background: 'transparent' }}>
            {p === 'clients' ? `CLIENTS (${clients.filter(c => c.status !== 'offline').length})` : 'NODE CONFIG'}
          </button>
        ))}
      </div>

      {rightPanel === 'clients' ? <div className="flex-1" /> : (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Board config */}
          <div>
            <div className="font-display text-xs mb-2" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>BOARD IDENTITY</div>
            <div className="space-y-2">
              {[['Board Name', boardName, setBoardName], ['Node Callsign', nodeCallsign, setNodeCallsign]].map(([label, val, setter]) => (
                <div key={label as string}>
                  <div className="font-display text-xs mb-1" style={{ color: '#1f4a1f', fontSize: 8 }}>{label as string}</div>
                  <input className="w-full px-2 py-1 rounded font-mono text-xs"
                    value={val as string}
                    onChange={e => (setter as (v: string) => void)(e.target.value)} />
                </div>
              ))}
              <div className="font-mono text-xs p-2 rounded" style={{ background: '#080c08', border: '1px solid #1f3320', color: '#2d6a2d' }}>
                Frequencies managed globally — click the frequency panel in the sidebar to edit TX/RX pairs.
              </div>
            </div>
          </div>

          {/* Add group */}
          <div>
            <div className="font-display text-xs mb-2" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>ADD GROUP</div>
            <div className="flex gap-1">
              <input className="flex-1 px-2 py-1 rounded font-mono text-xs" placeholder="Group name"
                value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGroup()} />
              <button onClick={addGroup}
                className="font-display text-xs px-2 py-1 rounded"
                style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 9 }}>+</button>
            </div>
          </div>

          {/* Add channel */}
          <div>
            <div className="font-display text-xs mb-2" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>ADD CHANNEL</div>
            <div className="space-y-1.5">
              <select className="w-full px-2 py-1 rounded font-mono text-xs" value={newChanGroup} onChange={e => setNewChanGroup(e.target.value)}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input className="w-full px-2 py-1 rounded font-mono text-xs" placeholder="Channel name"
                value={newChanName} onChange={e => setNewChanName(e.target.value)} />
              <div className="flex gap-1">
                <input className="flex-1 px-2 py-1 rounded font-mono text-xs" placeholder="Freq MHz"
                  value={newChanFreq} onChange={e => setNewChanFreq(e.target.value)} />
                <select className="px-2 py-1 rounded font-mono text-xs" value={newChanMode} onChange={e => setNewChanMode(e.target.value)}>
                  {['USB', 'LSB', 'FM', 'AM', 'CW', 'AX.25'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <input className="w-full px-2 py-1 rounded font-mono text-xs" placeholder="Description"
                value={newChanDesc} onChange={e => setNewChanDesc(e.target.value)} />
              <button onClick={addChannel}
                className="w-full font-display text-xs py-1.5 rounded"
                style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 9, letterSpacing: '0.08em' }}>
                CREATE CHANNEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── Client dial-in panel ──
  const ClientPanel = () => (
    <div className="flex flex-1 overflow-hidden">
      {!clientConnected && !clientConnecting ? (
        <div className="flex flex-1 items-center justify-center">
          <div style={{ width: 420, background: '#0a0d0a', border: '1px solid #1f3320', borderRadius: 8, padding: 28 }}>
            <div className="font-display text-sm mb-1 glow-green" style={{ color: '#4ade80', letterSpacing: '0.12em' }}>DIAL IN TO NODE</div>
            <div className="font-mono text-xs mb-6" style={{ color: '#2d6a2d' }}>Enter host node callsign and listening frequency to connect and sync board.</div>
            <div className="space-y-3">
              <div>
                <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>HOST NODE CALLSIGN</label>
                <input className="w-full px-3 py-2 rounded font-mono text-sm"
                  value={dialCallsign} onChange={e => setDialCallsign(e.target.value.toUpperCase())}
                  placeholder="e.g. KD9LMX-BBS" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>FREQUENCY (MHz)</label>
                  <input className="w-full px-3 py-2 rounded font-mono text-sm"
                    value={dialFreq} onChange={e => setDialFreq(e.target.value)} placeholder="14.300" />
                </div>
                <div>
                  <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>MODE</label>
                  <select className="px-3 py-2 rounded font-mono text-sm" value={dialMode} onChange={e => setDialMode(e.target.value)}>
                    {['USB', 'LSB', 'FM', 'AM', 'CW', 'AX.25'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={dialIn}
                className="w-full font-display py-2.5 rounded mt-2"
                style={{ background: '#162016', border: '2px solid #4ade80', color: '#4ade80', fontSize: 12, letterSpacing: '0.15em', boxShadow: '0 0 12px #4ade8030' }}>
                ◎ CONNECT
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Connection log / channel view */}
          {clientConnecting ? (
            <div className="flex flex-1 flex-col p-6">
              <div className="font-display text-xs mb-3" style={{ color: '#22d3ee', fontSize: 9, letterSpacing: '0.12em' }}>
                CONNECTING TO {dialCallsign}...
              </div>
              <div className="font-mono text-xs space-y-1" style={{ color: '#4ade80' }}>
                {dialLog.map((line, i) => <div key={i}>{line}</div>)}
                <div className="cursor-blink" style={{ color: '#4ade80' }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Channel header */}
              <div style={{ background: '#0a0d0a', borderBottom: '1px solid #1f3320', padding: '10px 16px' }}
                className="flex items-center gap-3 shrink-0">
                <span style={{ color: '#22d3ee' }}>◎</span>
                <span className="font-mono text-sm" style={{ color: '#86efac' }}>#{ch.name}</span>
                <span style={{ color: '#1f3320', margin: '0 4px' }}>|</span>
                <span className="font-mono text-xs" style={{ color: '#2d6a2d' }}>{ch.freq} · {ch.mode}</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="font-display text-xs px-2 py-0.5 rounded" style={{ background: '#22d3ee15', border: '1px solid #22d3ee40', color: '#22d3ee', fontSize: 9 }}>
                    SYNCED
                  </span>
                  <button onClick={disconnect}
                    className="font-display text-xs px-2 py-0.5 rounded"
                    style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#2d6a2d', fontSize: 9 }}>
                    DISCONNECT
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {(messages[activeChannel] || []).map(msg => (
                  <MessageRow key={msg.id} msg={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ borderTop: '1px solid #1f3320', padding: '12px 16px' }} className="shrink-0">
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2 rounded text-xs font-mono"
                    style={{ background: '#0f1a0f', border: '1px solid #1f3320', color: '#d1fae5' }}
                    placeholder={`Post to #${ch.name} (queued for next sync)...`}
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()} />
                  <button onClick={send}
                    className="px-4 py-2 rounded font-display text-xs"
                    style={{ background: '#22d3ee15', border: '1px solid #22d3ee', color: '#22d3ee', fontSize: 10, letterSpacing: '0.1em' }}>
                    POST
                  </button>
                </div>
                <div className="font-mono text-xs mt-1.5" style={{ color: '#1f4a1f' }}>
                  Messages queued locally — pushed to {dialCallsign} on next sync cycle
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />

      {mode === 'client' ? <ClientPanel /> : (
        <>
          {/* Host message area */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Channel header */}
            <div style={{ background: '#0a0d0a', borderBottom: '1px solid #1f3320', padding: '10px 16px' }}
              className="flex items-center gap-3 shrink-0">
              <span style={{ color: '#2d6a2d' }}>#</span>
              <span className="font-mono text-sm" style={{ color: '#86efac' }}>{ch.name}</span>
              <span style={{ color: '#1f3320', margin: '0 4px' }}>|</span>
              <span className="font-mono text-xs ml-2" style={{ color: '#1f4a1f' }}>— {ch.description}</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="font-display text-xs px-2 py-0.5 rounded"
                  style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: 9, letterSpacing: '0.06em' }}>
                  HOST ACTIVE
                </span>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="font-display text-xs px-2 py-0.5 rounded transition-all"
                  style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#2d6a2d', fontSize: 11, cursor: 'pointer' }}
                  title="BBS Connection Settings">
                  ⚙
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {(messages[activeChannel] || []).map(msg => (
                <MessageRow key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div style={{ borderTop: '1px solid #1f3320', padding: '12px 16px' }} className="shrink-0">
              <div className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded text-xs font-mono"
                  style={{ background: '#0f1a0f', border: '1px solid #1f3320', color: '#d1fae5' }}
                  placeholder={`Broadcast on #${ch.name}...`}
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()} />
                <button onClick={send}
                  className="px-4 py-2 rounded font-display text-xs"
                  style={{ background: '#162016', border: '1px solid #2d4d2d', color: '#4ade80', fontSize: 10, letterSpacing: '0.1em' }}>
                  TX
                </button>
              </div>
            </div>
          </div>

        </>
      )}

      {/* ── BBS Settings Modal ── */}
      {settingsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSettingsOpen(false)}>
          <div style={{ background: '#0a0d0a', border: '1px solid #2d4d2d', borderRadius: 8, width: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.9)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1f3320' }}>
              <div>
                <div className="font-display text-sm" style={{ color: '#4ade80', letterSpacing: '0.12em', fontSize: 13 }}>BBS SETTINGS</div>
                <div className="font-mono text-xs mt-0.5" style={{ color: '#2d6a2d' }}>Connection device and node configuration</div>
              </div>
              <button onClick={() => setSettingsOpen(false)} style={{ color: '#2d6a2d', background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* Tab bar */}
            <div className="flex" style={{ borderBottom: '1px solid #1f3320' }}>
              {([
                ['connection', 'CONNECTION'],
                ['node',       'NODE'],
                ['clients',    `CLIENTS (${clients.filter(c => c.status !== 'offline').length})`],
                ['synclog',    'SYNC LOG'],
              ] as const).map(([id, label]) => (
                <button key={id} onClick={() => setSettingsTab(id)}
                  className="font-display text-xs px-4 py-2.5 transition-all"
                  style={{
                    fontSize: 9, letterSpacing: '0.08em',
                    color: settingsTab === id ? '#4ade80' : '#2d6a2d',
                    borderBottom: `2px solid ${settingsTab === id ? '#4ade80' : 'transparent'}`,
                    background: 'transparent',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-5">
              {/* Connection Device */}
              {settingsTab === 'connection' && <div>
                <div className="font-display text-xs mb-3" style={{ color: '#4ade80', fontSize: 9, letterSpacing: '0.12em', borderBottom: '1px solid #1f3320', paddingBottom: 6 }}>
                  CONNECTION DEVICE
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>DEVICE TYPE</label>
                    <select className="w-full px-3 py-2 rounded font-mono text-xs"
                      value={connDevice} onChange={e => setConnDevice(e.target.value)}>
                      {[
                        'SDR (RTL-SDR)', 'SDR (HackRF)', 'SDR (ADALM-PLUTO)',
                        'Icom USB Control (CI-V)', 'Icom RS-BA1',
                        'Kenwood TS-590S (CAT)', 'Yaesu CAT (FT-991A)',
                        'Elecraft K3 (Serial)', 'FlexRadio 6600',
                        'Hamlib / rigctld', 'Serial (Generic)',
                        'Direct (No CAT)',
                      ].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>PORT / ADDRESS</label>
                    <input className="w-full px-3 py-2 rounded font-mono text-xs"
                      value={connPort} onChange={e => setConnPort(e.target.value)}
                      placeholder="COM3 or /dev/ttyUSB0" />
                  </div>
                  <div>
                    <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>BAUD RATE</label>
                    <select className="w-full px-3 py-2 rounded font-mono text-xs"
                      value={connBaud} onChange={e => setConnBaud(e.target.value)}>
                      {['1200','2400','4800','9600','19200','38400','57600','115200'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  {connDevice.includes('CI-V') && (
                    <div>
                      <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>CI-V ADDRESS (HEX)</label>
                      <input className="w-full px-3 py-2 rounded font-mono text-xs"
                        value={connCivAddr} onChange={e => setConnCivAddr(e.target.value)}
                        placeholder="94" />
                    </div>
                  )}
                </div>
                <div className="mt-3 px-3 py-2 rounded font-mono text-xs" style={{ background: '#080c08', border: '1px solid #1f3320', color: '#2d6a2d' }}>
                  {connDevice.startsWith('SDR') && 'SDR devices use software-defined radio — no CAT control. Receive-only unless paired with a separate TX interface.'}
                  {connDevice.includes('CI-V') && `Icom CI-V: connect via USB cable to [ACC] or [USB] port. Default address 94h. Ensure IC-7x00 baud matches.`}
                  {connDevice.includes('CAT') && 'Yaesu CAT: use SCU-17 USB interface or direct serial. Set radio CAT baud to match above.'}
                  {connDevice.includes('Hamlib') && 'rigctld must be running on localhost:4532. ARSN will connect as a Hamlib network client.'}
                  {connDevice === 'Direct (No CAT)' && 'No automated frequency control. BBS will operate on the configured frequency pairs only.'}
                  {connDevice.includes('Kenwood') && 'Kenwood CAT: connect via ACC2 or USB-B port. Baud rate must match radio menu setting.'}
                  {connDevice.includes('Elecraft') && 'Elecraft KXUSB or ACC port. K3 default baud 38400.'}
                  {connDevice.includes('Serial') && !connDevice.includes('Kenwood') && !connDevice.includes('Elecraft') && 'Generic serial — configure baud and port to match your radio interface.'}
                  {connDevice.includes('FlexRadio') && 'FlexRadio SmartSDR API. Ensure SmartSDR is running and ARSN has network access to the Flex.'}
                  {connDevice.includes('RS-BA1') && 'Icom RS-BA1 remote control. Configure server IP and port in RS-BA1 settings.'}
                </div>
              </div>}

              {/* Node behaviour */}
              {settingsTab === 'node' && <div>
                <div className="font-display text-xs mb-3" style={{ color: '#4ade80', fontSize: 9, letterSpacing: '0.12em', borderBottom: '1px solid #1f3320', paddingBottom: 6 }}>
                  NODE BEHAVIOUR
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  {[
                    ['BEACON INTERVAL (s)', beaconInterval, setBeaconInterval, '300'],
                    ['SYNC INTERVAL (s)',   syncInterval,   setSyncInterval,   '60'],
                    ['MAX CLIENTS',         maxClients,     setMaxClients,     '10'],
                  ].map(([label, val, setter, ph]) => (
                    <div key={label as string}>
                      <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>{label as string}</label>
                      <input className="w-full px-3 py-2 rounded font-mono text-xs"
                        type="number" value={val as string} placeholder={ph as string}
                        onChange={e => (setter as (v: string) => void)(e.target.value)} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => setRequireAuth(p => !p)}
                    className="font-display text-xs px-3 py-1.5 rounded transition-all"
                    style={{
                      background: requireAuth ? '#4ade8015' : '#0a1208',
                      border: `1px solid ${requireAuth ? '#4ade80' : '#1a2e1a'}`,
                      color: requireAuth ? '#4ade80' : '#2d6a2d',
                      fontSize: 9, letterSpacing: '0.08em',
                    }}>
                    {requireAuth ? '✓ REQUIRE AUTH' : 'REQUIRE AUTH'}
                  </button>
                  <span className="font-mono text-xs" style={{ color: '#1f4a1f' }}>
                    {requireAuth ? 'Clients must have valid callsign registered to connect.' : 'Open node — any callsign may dial in.'}
                  </span>
                </div>
              </div>}

              {/* Clients tab */}
              {settingsTab === 'clients' && <div>
                <div className="font-display text-xs mb-3" style={{ color: '#4ade80', fontSize: 9, letterSpacing: '0.12em', borderBottom: '1px solid #1f3320', paddingBottom: 6 }}>
                  CONNECTED CLIENTS ({clients.length})
                </div>
                <div className="space-y-1">
                  {clients.map(cl => (
                    <div key={cl.callsign} className="flex items-center gap-3 px-3 py-2 rounded" style={{ background: '#080c08', border: '1px solid #1a2e1a' }}>
                      <span className={`status-dot ${cl.status === 'online' ? 'status-online' : cl.status === 'idle' ? 'status-idle' : 'status-offline'}`} />
                      <span className="font-mono text-xs" style={{ color: '#4ade80', minWidth: 90 }}>{cl.callsign}</span>
                      <span className="font-mono text-xs flex-1" style={{ color: '#2d6a2d' }}>{cl.grid}</span>
                      <span className="font-mono text-xs" style={{ color: '#1f4a1f', minWidth: 50 }}>{cl.msgCount} msg</span>
                      <span className="font-display text-xs" style={{ color: cl.status === 'online' ? '#4ade80' : cl.status === 'idle' ? '#fbbf24' : '#374151', fontSize: 8, letterSpacing: '0.08em', minWidth: 50, textAlign: 'right' }}>
                        {cl.status.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs" style={{ color: '#1f4a1f' }}>{cl.lastSeen}</span>
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <div className="font-mono text-xs text-center py-8" style={{ color: '#1f4a1f' }}>No clients connected</div>
                  )}
                </div>
              </div>}

              {/* Sync Log tab */}
              {settingsTab === 'synclog' && <div>
                <div className="font-display text-xs mb-3" style={{ color: '#4ade80', fontSize: 9, letterSpacing: '0.12em', borderBottom: '1px solid #1f3320', paddingBottom: 6 }}>
                  SYNC LOG
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {syncLog.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3 px-3 py-1.5 rounded font-mono text-xs" style={{ background: '#080c08' }}>
                      <span style={{ color: '#1f4a1f', whiteSpace: 'nowrap' }}>{ev.time}</span>
                      <span style={{
                        color: ev.action === 'CONNECT' ? '#4ade80' : ev.action === 'PUSH' ? '#22d3ee' : '#fbbf24',
                        minWidth: 60,
                      }}>[{ev.action}]</span>
                      <span style={{ color: '#86efac' }}>{ev.callsign}</span>
                      {ev.channel && <span style={{ color: '#2d6a2d', flex: 1 }}>#{ev.channel}</span>}
                    </div>
                  ))}
                  {syncLog.length === 0 && (
                    <div className="font-mono text-xs text-center py-8" style={{ color: '#1f4a1f' }}>No sync events</div>
                  )}
                </div>
              </div>}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setSettingsOpen(false)}
                className="flex-1 font-display text-xs py-2.5 rounded"
                style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 10, letterSpacing: '0.1em', boxShadow: '0 0 8px #4ade8020' }}>
                SAVE SETTINGS
              </button>
              <button
                onClick={() => setSettingsOpen(false)}
                className="font-display text-xs px-4 py-2.5 rounded"
                style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#2d6a2d', fontSize: 10, letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageRow({ msg }: { msg: Message }) {
  return (
    <div className="msg-row flex gap-3 px-2 py-1.5 rounded">
      <div className="shrink-0 mt-0.5">
        <div className="font-display text-xs px-2 py-0.5 rounded-sm"
          style={{
            background: msg.type === 'alert' ? '#ef444415' : msg.type === 'system' ? '#22d3ee15' : '#16201615',
            color: msg.type === 'alert' ? '#ef4444' : msg.type === 'system' ? '#22d3ee' : '#4ade80',
            fontSize: 10, letterSpacing: '0.05em', minWidth: 72, textAlign: 'center'
          }}>
          {msg.callsign}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-mono text-xs" style={{ color: msg.type === 'alert' ? '#fca5a5' : msg.type === 'system' ? '#67e8f9' : '#bbf7d0' }}>
          {msg.text}
        </span>
      </div>
      <div className="shrink-0 font-mono text-xs self-start" style={{ color: '#2d6a2d' }}>{msg.time}</div>
    </div>
  )
}

// ─── Mail Section ────────────────────────────────────────────────────────────

function MailSection() {
  const [selectedId, setSelectedId] = useStoredState<number | null>('arsn.mail.selectedId', null)
  const [composing, setComposing] = useStoredState('arsn.mail.composing', false)
  const [mails, setMails] = useStoredState<MailMessage[]>('arsn.mail.messages', MAIL_MESSAGES)
  const [draft, setDraft] = useStoredState('arsn.mail.draft', { to: '', subject: '', body: '' })
  const selected = mails.find(m => m.id === selectedId) ?? null

  const send = () => {
    if (!draft.to || !draft.subject) return
    const newMsg: MailMessage = {
      id: Date.now(), from: 'KD9LMX', to: draft.to, subject: draft.subject,
      body: draft.body, time: new Date().toISOString().slice(0, 16).replace('T', ' '), read: true, forwarded: false
    }
    setMails(prev => [newMsg, ...prev])
    setDraft({ to: '', subject: '', body: '' })
    setComposing(false)
    setSelectedId(newMsg.id)
  }

  const reply = () => {
    if (!selected) return
    setDraft({
      to: selected.from,
      subject: selected.subject.startsWith('RE:') ? selected.subject : `RE: ${selected.subject}`,
      body: `\n\n--- Original message ---\n${selected.body}`,
    })
    setComposing(true)
    setSelectedId(selected.id)
  }

  const forward = () => {
    if (!selected) return
    setDraft({
      to: '',
      subject: selected.subject.startsWith('FWD:') ? selected.subject : `FWD: ${selected.subject}`,
      body: `\n\n--- Forwarded message from ${selected.from} ---\n${selected.body}`,
    })
    setComposing(true)
  }

  const removeSelected = () => {
    if (!selected) return
    setMails(prev => prev.filter(m => m.id !== selected.id))
    setSelectedId(null)
    setComposing(false)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Mail list */}
      <div style={{ width: 300, borderRight: '1px solid #1f3320', background: '#080c08' }}
        className="flex flex-col shrink-0">
        <div className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid #1f3320' }}>
          <span className="font-display text-xs tracking-widest" style={{ color: '#4ade80', fontSize: 10 }}>INBOX</span>
          <button
            onClick={() => { setComposing(true); setSelected(null) }}
            className="font-display text-xs px-2 py-1 rounded"
            style={{ background: '#162016', border: '1px solid #2d4d2d', color: '#4ade80', fontSize: 9, letterSpacing: '0.08em' }}>
            + COMPOSE
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mails.map(m => (
            <button
              key={m.id}
              className="w-full text-left px-4 py-3 transition-all"
              style={{
                borderBottom: '1px solid #0d150d',
                background: selected?.id === m.id ? '#111d11' : 'transparent'
              }}
              onClick={() => { setSelectedId(m.id); setComposing(false); setMails(prev => prev.map(x => x.id === m.id ? { ...x, read: true } : x)) }}
            >
              <div className="flex items-center gap-2 mb-1">
                {!m.read && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80', flexShrink: 0 }} />}
                <span className="font-display text-xs" style={{ color: m.read ? '#2d6a2d' : '#4ade80', fontSize: 10 }}>{m.from}</span>
                {m.forwarded && <span className="font-mono text-xs px-1 rounded" style={{ background: '#22d3ee10', color: '#22d3ee', fontSize: 9 }}>FWD</span>}
                <span className="ml-auto font-mono text-xs" style={{ color: '#1f4a1f', fontSize: 10 }}>{m.time.slice(11)}</span>
              </div>
              <div className="font-mono text-xs truncate" style={{ color: m.read ? '#4a7a4a' : '#86efac' }}>{m.subject}</div>
            </button>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #1f3320', padding: '8px 16px' }}>
          <div className="font-mono text-xs" style={{ color: '#2d6a2d' }}>
            Store-and-forward · AX.25/Winlink
          </div>
        </div>
      </div>

      {/* Mail detail / compose */}
      <div className="flex-1 overflow-y-auto">
        {composing ? (
          <div className="p-6 max-w-2xl">
            <div className="font-display text-xs tracking-widest mb-6" style={{ color: '#4ade80', fontSize: 10 }}>NEW MESSAGE</div>
            <div className="space-y-3">
              {(['to', 'subject'] as const).map(field => (
                <div key={field} className="flex items-center gap-3">
                  <label className="font-display text-xs w-16 text-right shrink-0" style={{ color: '#2d6a2d', fontSize: 10, letterSpacing: '0.08em' }}>
                    {field.toUpperCase()}
                  </label>
                  <input
                    className="flex-1 px-3 py-2 rounded text-xs"
                    value={draft[field]}
                    onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={field === 'to' ? 'Callsign or group' : 'Subject'}
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <div className="w-16 shrink-0" />
                <textarea
                  className="flex-1 px-3 py-2 rounded text-xs resize-none"
                  rows={10}
                  value={draft.body}
                  onChange={e => setDraft(p => ({ ...p, body: e.target.value }))}
                  placeholder="Message body..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <div className="w-16 shrink-0" />
                <div className="flex gap-2">
                  <button
                    onClick={send}
                    className="px-4 py-2 rounded font-display text-xs"
                    style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 10, letterSpacing: '0.08em' }}>
                    SEND VIA WINLINK
                  </button>
                  <button
                    onClick={() => setComposing(false)}
                    className="px-4 py-2 rounded font-display text-xs"
                    style={{ background: 'transparent', border: '1px solid #1f3320', color: '#2d6a2d', fontSize: 10, letterSpacing: '0.08em' }}>
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="p-6 max-w-2xl">
            <div className="mb-6" style={{ borderBottom: '1px solid #1f3320', paddingBottom: 16 }}>
              <h2 className="font-display text-sm mb-3" style={{ color: '#d1fae5', letterSpacing: '0.05em' }}>{selected.subject}</h2>
              <div className="grid grid-cols-2 gap-2">
                {[['FROM', selected.from], ['TO', selected.to], ['TIME', selected.time], ['STATUS', selected.forwarded ? 'Forwarded' : 'Direct']].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="font-display text-xs w-12" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>{k}</span>
                    <span className="font-mono text-xs" style={{ color: '#86efac' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#bbf7d0' }}>
              {selected.body}
            </pre>
            <div className="flex gap-2 mt-6">
              {['REPLY', 'FORWARD', 'DELETE'].map(a => (
                <button key={a}
                  onClick={a === 'REPLY' ? reply : a === 'FORWARD' ? forward : removeSelected}
                  className="px-3 py-1.5 rounded font-display text-xs"
                  style={{ background: '#0f1a0f', border: '1px solid #1f3320', color: '#4a7a4a', fontSize: 9, letterSpacing: '0.08em' }}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: '#1f4a1f' }}>
            <div className="text-center">
              <div className="font-display text-4xl mb-3" style={{ letterSpacing: '0.2em' }}>✉</div>
              <div className="font-mono text-xs">Select a message or compose</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LoRa / Meshtastic Section ───────────────────────────────────────────────

const PRESETS = [
  { name: 'LongFast',   sf: 11, bw: 250, cr: '4/5', br: '~1.07 kbps' },
  { name: 'LongSlow',   sf: 12, bw: 125, cr: '4/8', br: '~183 bps'   },
  { name: 'VLongSlow',  sf: 12, bw: 125, cr: '4/8', br: '~183 bps'   },
  { name: 'MediumSlow', sf: 10, bw: 250, cr: '4/5', br: '~2.15 kbps' },
  { name: 'MediumFast', sf: 9,  bw: 250, cr: '4/5', br: '~4.29 kbps' },
  { name: 'ShortSlow',  sf: 8,  bw: 250, cr: '4/5', br: '~8.57 kbps' },
  { name: 'ShortFast',  sf: 7,  bw: 250, cr: '4/5', br: '~17.1 kbps' },
  { name: 'ShortTurbo', sf: 7,  bw: 500, cr: '4/5', br: '~34.2 kbps' },
]
const REGIONS = ['US','EU_433','EU_868','JP','ANZ','KR','TW','RU','IN','NZ_865','TH','LORA_24']

function LoRaSection() {
  const [tab, setTab] = useStoredState<'messages' | 'nodes' | 'channels' | 'config'>('arsn.lora.tab', 'messages')
  const [activeChan, setActiveChan] = useStoredState('arsn.lora.activeChan', 0)
  const [meshChannels, setMeshChannels] = useStoredState<MeshChannel[]>('arsn.lora.meshChannels', MESH_CHANNELS_INIT)
  const [messages, setMessages] = useStoredState<MeshMessage[]>('arsn.lora.messages', MESH_MESSAGES)
  const [msgInput, setMsgInput] = useStoredState('arsn.lora.msgInput', '')
  const [selectedNode, setSelectedNode] = useState<MeshNode | null>(null)
  const [preset, setPreset] = useStoredState('arsn.lora.preset', 'LongFast')
  const [region, setRegion] = useStoredState('arsn.lora.region', 'US')
  const [txPower, setTxPower] = useStoredState('arsn.lora.txPower', '20')
  const [hopLimit, setHopLimit] = useStoredState('arsn.lora.hopLimit', '3')
  const [nodeLong, setNodeLong] = useStoredState('arsn.lora.nodeLong', 'KD9LMX ARSN Node')
  const [nodeShort, setNodeShort] = useStoredState('arsn.lora.nodeShort', 'ARSN')
  const msgEndRef = useRef<HTMLDivElement>(null)

  const sigColor = (rssi: number) => rssi > -90 ? '#4ade80' : rssi > -110 ? '#fbbf24' : '#ef4444'
  const batColor = (b: number) => b > 50 ? '#4ade80' : b > 20 ? '#fbbf24' : '#ef4444'

  const chanMsgs = messages.filter(m => m.channel === activeChan)
  const enabledChans = meshChannels.filter(c => c.role !== 'DISABLED')

  const sendMsg = () => {
    if (!msgInput.trim()) return
    const ch = meshChannels[activeChan]
    setMessages(prev => [...prev, {
      id: prev.length + 1, from: '!a1b2c3d4', fromShort: nodeShort,
      to: '^all', channel: activeChan, type: 'TEXT', text: msgInput.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      ack: true, hops: 0,
    }])
    setMsgInput('')
    void ch
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const typeIcon = (t: MeshMessage['type']) =>
    t === 'TEXT' ? '💬' : t === 'POSITION' ? '📍' : t === 'NODEINFO' ? '📡' : t === 'TELEMETRY' ? '📊' : '🔀'
  const typeLabel = (m: MeshMessage) => {
    if (m.type === 'TEXT') return m.text!
    if (m.type === 'POSITION') { const n = MESH_NODES.find(x => x.id === m.from); return n ? `Position update · ${n.lat.toFixed(4)}, ${n.lng.toFixed(4)} · Alt ${n.alt}m` : 'Position update' }
    if (m.type === 'NODEINFO') { const n = MESH_NODES.find(x => x.id === m.from); return n ? `Node info · ${n.longName} · ${n.id}` : 'Node info broadcast' }
    if (m.type === 'TELEMETRY') { const n = MESH_NODES.find(x => x.id === m.from); return n ? `Telemetry · Bat ${n.battery}% (${n.voltage > 0 ? n.voltage + 'V' : 'ext'}) · SNR ${n.snr > 0 ? '+' : ''}${n.snr}dB` : 'Telemetry update' }
    return 'Routing packet'
  }

  // Node positions for SVG (normalised from lat/lng)
  const nodePositions = MESH_NODES.map(n => ({
    ...n,
    sx: ((n.lng - (-105.2)) / 1.2) * 560 + 20,
    sy: ((38.95 - n.lat) / 0.65) * 300 + 20,
  }))
  const connections = [
    ['!a1b2c3d4','!b2c3d4e5'],['!a1b2c3d4','!c3d4e5f6'],['!b2c3d4e5','!e5f6a7b8'],
    ['!b2c3d4e5','!a7b8c9d0'],['!c3d4e5f6','!d4e5f6a7'],['!d4e5f6a7','!f6a7b8c9'],
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab bar + node status bar */}
      <div style={{ borderBottom: '1px solid #1f3320' }} className="shrink-0">
        <div className="flex items-center px-4 py-2 gap-4" style={{ borderBottom: '1px solid #0f1a0f' }}>
          <div className="status-dot status-online" style={{ width: 6, height: 6 }} />
          <span className="font-mono text-xs" style={{ color: '#4ade80', fontSize: 10 }}>{nodeLong}</span>
          <span className="font-display text-xs" style={{ color: '#2d6a2d', fontSize: 9 }}>!a1b2c3d4</span>
          <span className="font-mono text-xs" style={{ color: '#2d6a2d', fontSize: 10 }}>·</span>
          <span className="font-mono text-xs" style={{ color: '#2d6a2d', fontSize: 10 }}>915.000 MHz · {preset}</span>
          <span className="ml-auto font-mono text-xs" style={{ color: '#2d6a2d', fontSize: 10 }}>
            {MESH_NODES.filter(n => n.isOnline).length}/{MESH_NODES.length} nodes online
          </span>
        </div>
        <div className="flex px-4">
          {(['messages', 'nodes', 'channels', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="tool-tab px-4 py-2.5 font-display text-xs"
              style={{ fontSize: 9, letterSpacing: '0.1em', color: tab === t ? '#4ade80' : '#2d6a2d' }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* MESSAGES tab */}
      {tab === 'messages' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Channel sidebar */}
          <div style={{ width: 160, background: '#050905', borderRight: '1px solid #1f3320' }} className="flex flex-col shrink-0">
            <div className="px-3 py-2 font-display text-xs" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em', borderBottom: '1px solid #1f3320' }}>
              CHANNELS
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {enabledChans.map(c => (
                <button key={c.index} onClick={() => setActiveChan(c.index)}
                  className="w-full text-left px-3 py-2 flex items-center gap-2"
                  style={{
                    background: activeChan === c.index ? '#111d11' : 'transparent',
                    borderLeft: `2px solid ${activeChan === c.index ? '#4ade80' : 'transparent'}`,
                  }}>
                  <span style={{ color: activeChan === c.index ? '#4ade80' : '#2d6a2d', fontSize: 11 }}>#</span>
                  <div>
                    <div className="font-mono text-xs truncate" style={{ color: activeChan === c.index ? '#d1fae5' : '#4a7a4a', fontSize: 10 }}>{c.name || `ch${c.index}`}</div>
                    <div className="font-display" style={{ color: '#1f4a1f', fontSize: 7, letterSpacing: '0.06em' }}>{c.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message area */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {chanMsgs.map(m => {
                const isMe = m.from === '!a1b2c3d4'
                const isText = m.type === 'TEXT'
                if (!isText) return (
                  <div key={m.id} className="flex items-center gap-2 py-0.5">
                    <span style={{ fontSize: 11 }}>{typeIcon(m.type)}</span>
                    <span className="font-display text-xs px-1.5 py-0.5 rounded" style={{ background: '#0a1208', color: '#2d6a2d', fontSize: 8, letterSpacing: '0.06em' }}>{m.fromShort}</span>
                    <span className="font-mono text-xs" style={{ color: '#1f4a1f', fontSize: 10 }}>{typeLabel(m)}</span>
                    <span className="ml-auto font-mono text-xs" style={{ color: '#1a2e1a', fontSize: 9 }}>{m.time}</span>
                  </div>
                )
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="shrink-0 mt-0.5">
                      <div className="font-display text-xs px-1.5 py-0.5 rounded"
                        style={{ background: isMe ? '#162016' : '#0a1208', color: isMe ? '#4ade80' : '#22d3ee', fontSize: 8, letterSpacing: '0.06em' }}>
                        {m.fromShort}
                      </div>
                    </div>
                    <div className={`max-w-sm ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                      <div className="font-mono text-xs px-3 py-1.5 rounded"
                        style={{
                          background: isMe ? '#0f1f0f' : '#0a0d0a',
                          border: `1px solid ${isMe ? '#2d4d2d' : '#1a2e1a'}`,
                          color: isMe ? '#d1fae5' : '#86efac', fontSize: 11, lineHeight: 1.5,
                        }}>
                        {m.text}
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="font-mono" style={{ color: '#1f4a1f', fontSize: 9 }}>{m.time}</span>
                        {m.hops > 0 && <span className="font-mono" style={{ color: '#22d3ee', fontSize: 9 }}>{m.hops}🔀</span>}
                        {isMe && <span style={{ color: m.ack ? '#4ade80' : '#2d6a2d', fontSize: 9 }}>{m.ack ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={msgEndRef} />
            </div>
            <div className="shrink-0 p-3" style={{ borderTop: '1px solid #1f3320' }}>
              <div className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded font-mono text-xs"
                  placeholder={`Message on #${meshChannels[activeChan]?.name || `ch${activeChan}`}…`}
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMsg()} />
                <button onClick={sendMsg}
                  className="font-display text-xs px-4 py-2 rounded"
                  style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 9, letterSpacing: '0.08em' }}>
                  SEND
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NODES tab */}
      {tab === 'nodes' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Node list */}
          <div style={{ width: 280, borderRight: '1px solid #1f3320', background: '#050905' }} className="flex flex-col shrink-0">
            <div className="px-3 py-2 font-display text-xs" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em', borderBottom: '1px solid #1f3320' }}>
              MESH NODES — {MESH_NODES.filter(n => n.isOnline).length} ONLINE
            </div>
            <div className="flex-1 overflow-y-auto">
              {MESH_NODES.map(n => (
                <button key={n.id} onClick={() => setSelectedNode(selectedNode?.id === n.id ? null : n)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3"
                  style={{
                    background: selectedNode?.id === n.id ? '#111d11' : 'transparent',
                    borderLeft: `2px solid ${selectedNode?.id === n.id ? '#4ade80' : 'transparent'}`,
                    borderBottom: '1px solid #0a1208',
                  }}>
                  {/* Status dot */}
                  <span className={`status-dot shrink-0 ${n.isOnline ? (n.battery < 20 ? 'status-idle' : 'status-online') : 'status-offline'}`} style={{ width: 7, height: 7 }} />
                  {/* Short name badge */}
                  <span className="font-display text-xs shrink-0 px-1.5 py-0.5 rounded"
                    style={{ background: n.id === '!a1b2c3d4' ? '#162016' : '#0a1208', color: n.id === '!a1b2c3d4' ? '#4ade80' : '#22d3ee', fontSize: 9, minWidth: 36, textAlign: 'center' }}>
                    {n.shortName}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs truncate" style={{ color: '#86efac', fontSize: 10 }}>{n.longName}</div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="font-mono" style={{ color: '#2d6a2d', fontSize: 9 }}>{n.lastHeard}</span>
                      {n.hops > 0 && <span className="font-mono" style={{ color: '#22d3ee', fontSize: 9 }}>{n.hops}hop</span>}
                      {n.isMqttGateway && <span className="font-display" style={{ color: '#fbbf24', fontSize: 7, letterSpacing: '0.06em' }}>MQTT</span>}
                    </div>
                  </div>
                  {/* Battery */}
                  {n.isOnline && n.voltage > 0 && (
                    <div className="shrink-0 text-right">
                      <div className="font-mono" style={{ color: batColor(n.battery), fontSize: 10 }}>{n.battery}%</div>
                      <div className="font-mono" style={{ color: '#1f4a1f', fontSize: 8 }}>{n.voltage}V</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Node detail / mesh map */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedNode ? (
              <div className="space-y-4 max-w-md">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm px-2 py-1 rounded" style={{ background: '#162016', color: '#4ade80', fontSize: 13, letterSpacing: '0.1em' }}>{selectedNode.shortName}</span>
                  <div>
                    <div className="font-mono text-xs" style={{ color: '#d1fae5' }}>{selectedNode.longName}</div>
                    <div className="font-mono text-xs" style={{ color: '#2d6a2d', fontSize: 10 }}>{selectedNode.id}</div>
                  </div>
                </div>
                {([
                  ['RSSI',        selectedNode.rssi ? `${selectedNode.rssi} dBm` : 'local',  sigColor(selectedNode.rssi)],
                  ['SNR',         selectedNode.snr  ? `${selectedNode.snr > 0 ? '+' : ''}${selectedNode.snr} dB` : 'local', sigColor(selectedNode.rssi)],
                  ['HOPS',        selectedNode.hops === 0 ? 'direct' : `${selectedNode.hops}`,           '#22d3ee'],
                  ['BATTERY',     selectedNode.voltage > 0 ? `${selectedNode.battery}% · ${selectedNode.voltage}V` : 'external power', batColor(selectedNode.battery)],
                  ['POSITION',    `${selectedNode.lat.toFixed(5)}, ${selectedNode.lng.toFixed(5)}`,       '#4ade80'],
                  ['ALTITUDE',    `${selectedNode.alt} m`,                                                '#4ade80'],
                  ['UPTIME',      selectedNode.uptime,                                                    '#4ade80'],
                  ['LAST HEARD',  selectedNode.lastHeard,                                                 '#2d6a2d'],
                ] as [string, string, string][]).map(([label, val, color]) => (
                  <div key={label} className="flex items-center gap-4 py-1.5" style={{ borderBottom: '1px solid #0f1a0f' }}>
                    <span className="font-display text-xs w-24 shrink-0" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>{label}</span>
                    <span className="font-mono text-xs" style={{ color, fontSize: 11 }}>{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Mesh topology SVG */
              <div>
                <div className="font-display text-xs mb-3" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>MESH TOPOLOGY</div>
                <div style={{ background: '#080c08', border: '1px solid #1f3320', borderRadius: 8 }}>
                  <svg viewBox="0 0 600 340" style={{ width: '100%', height: 'auto' }}>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <line key={`h${i}`} x1="0" y1={i * 56} x2="600" y2={i * 56} stroke="#0f1a0f" strokeWidth="0.5" />
                    ))}
                    {Array.from({ length: 11 }).map((_, i) => (
                      <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60} y2="340" stroke="#0f1a0f" strokeWidth="0.5" />
                    ))}
                    {connections.map(([a, b], i) => {
                      const na = nodePositions.find(n => n.id === a)
                      const nb = nodePositions.find(n => n.id === b)
                      if (!na || !nb) return null
                      const quality = na.rssi && nb.rssi ? Math.min(na.rssi, nb.rssi) : -80
                      return <line key={i} x1={na.sx} y1={na.sy} x2={nb.sx} y2={nb.sy}
                        stroke={quality > -95 ? '#1f3320' : '#1a1a10'} strokeWidth={quality > -95 ? 1.5 : 0.8} strokeDasharray={quality < -110 ? '4 4' : undefined} />
                    })}
                    {nodePositions.map(n => {
                      const color = !n.isOnline ? '#374151' : n.battery < 20 ? '#fbbf24' : '#4ade80'
                      return (
                        <g key={n.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedNode(n)}>
                          <circle cx={n.sx} cy={n.sy} r={18} fill={color} fillOpacity="0.04" />
                          <circle cx={n.sx} cy={n.sy} r={n.id === '!a1b2c3d4' ? 10 : 7} fill="#080c08" stroke={color} strokeWidth={n.id === '!a1b2c3d4' ? 2 : 1.5} />
                          <circle cx={n.sx} cy={n.sy} r={3} fill={color} />
                          {n.isMqttGateway && <circle cx={n.sx + 8} cy={n.sy - 8} r={4} fill="#fbbf24" fillOpacity="0.2" stroke="#fbbf24" strokeWidth="1" />}
                          <text x={n.sx} y={n.sy + 20} textAnchor="middle" fill={color} fontSize="8" fontFamily="Orbitron,monospace" letterSpacing="0.05em">{n.shortName}</text>
                          {n.isOnline && n.voltage > 0 && (
                            <text x={n.sx} y={n.sy + 30} textAnchor="middle" fill="#1f4a1f" fontSize="7" fontFamily="JetBrains Mono,monospace">{n.battery}%</text>
                          )}
                        </g>
                      )
                    })}
                  </svg>
                </div>
                <div className="flex gap-4 mt-3">
                  {[['#4ade80','Online'],['#fbbf24','Low battery / MQTT GW'],['#374151','Offline']].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                      <span className="font-mono" style={{ color: '#2d6a2d', fontSize: 9 }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHANNELS tab */}
      {tab === 'channels' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-lg space-y-2">
            <div className="font-display text-xs mb-4" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>
              MESHTASTIC CHANNELS — up to 8 (index 0 = primary)
            </div>
            {meshChannels.map((ch, i) => (
              <div key={i} style={{ background: '#0a0d0a', border: `1px solid ${ch.role === 'PRIMARY' ? '#2d4d2d' : ch.role === 'SECONDARY' ? '#1f3320' : '#0f1a0f'}`, borderRadius: 6, padding: '10px 12px' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-display text-xs shrink-0" style={{ color: '#1f4a1f', fontSize: 9, minWidth: 16 }}>{i}</span>
                  <select className="font-display text-xs px-2 py-0.5 rounded shrink-0"
                    style={{ fontSize: 8, letterSpacing: '0.06em', background: ch.role === 'PRIMARY' ? '#162016' : ch.role === 'SECONDARY' ? '#0a1208' : '#080c08', color: ch.role === 'PRIMARY' ? '#4ade80' : ch.role === 'SECONDARY' ? '#22d3ee' : '#374151', border: `1px solid ${ch.role === 'PRIMARY' ? '#4ade80' : ch.role === 'SECONDARY' ? '#22d3ee30' : '#1f3320'}` }}
                    value={ch.role}
                    onChange={e => setMeshChannels(prev => prev.map((c, j) => j === i ? { ...c, role: e.target.value as MeshChannel['role'] } : c))}>
                    <option value="PRIMARY">PRIMARY</option>
                    <option value="SECONDARY">SECONDARY</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                  {ch.role !== 'DISABLED' && (
                    <input className="flex-1 px-2 py-0.5 rounded font-mono text-xs"
                      style={{ fontSize: 10 }}
                      placeholder="Channel name"
                      value={ch.name}
                      onChange={e => setMeshChannels(prev => prev.map((c, j) => j === i ? { ...c, name: e.target.value } : c))} />
                  )}
                </div>
                {ch.role !== 'DISABLED' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display shrink-0" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.06em', minWidth: 32 }}>PSK</span>
                      <input className="flex-1 px-2 py-1 rounded font-mono text-xs"
                        style={{ fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        placeholder={ch.role === 'PRIMARY' ? 'AQ== (default)' : 'Base64 key'}
                        value={ch.psk}
                        onChange={e => setMeshChannels(prev => prev.map((c, j) => j === i ? { ...c, psk: e.target.value } : c))} />
                    </div>
                    {ch.role === 'SECONDARY' && (
                      <div className="flex gap-3">
                        {[['uplinkEnabled','MQTT Uplink'],['downlinkEnabled','MQTT Downlink']].map(([key, label]) => (
                          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox"
                              checked={ch[key as 'uplinkEnabled' | 'downlinkEnabled']}
                              onChange={e => setMeshChannels(prev => prev.map((c, j) => j === i ? { ...c, [key]: e.target.checked } : c))}
                              style={{ accentColor: '#4ade80' }} />
                            <span className="font-display" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.06em' }}>{label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONFIG tab */}
      {tab === 'config' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-lg space-y-5">
            <div className="font-display text-xs" style={{ color: '#4ade80', fontSize: 9, letterSpacing: '0.12em', borderBottom: '1px solid #1f3320', paddingBottom: 6 }}>NODE IDENTITY</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>LONG NAME</label>
                <input className="w-full px-3 py-2 rounded font-mono text-xs" value={nodeLong} onChange={e => setNodeLong(e.target.value)} />
              </div>
              <div>
                <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>SHORT NAME (4 char)</label>
                <input className="w-full px-3 py-2 rounded font-mono text-xs" maxLength={4} value={nodeShort} onChange={e => setNodeShort(e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="font-display text-xs" style={{ color: '#4ade80', fontSize: 9, letterSpacing: '0.12em', borderBottom: '1px solid #1f3320', paddingBottom: 6 }}>LORA RADIO</div>
            <div>
              <label className="font-display block mb-2" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>MODEM PRESET</label>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {PRESETS.map(p => (
                  <button key={p.name} onClick={() => setPreset(p.name)}
                    className="font-display text-xs py-2 px-2 rounded text-center"
                    style={{
                      background: preset === p.name ? '#162016' : '#080c08',
                      border: `1px solid ${preset === p.name ? '#4ade80' : '#1f3320'}`,
                      color: preset === p.name ? '#4ade80' : '#2d6a2d',
                      fontSize: 8, letterSpacing: '0.04em',
                    }}>
                    <div>{p.name}</div>
                    <div style={{ color: preset === p.name ? '#86efac' : '#1f4a1f', fontSize: 7, marginTop: 2 }}>SF{p.sf} BW{p.bw}</div>
                  </button>
                ))}
              </div>
              {(() => { const p = PRESETS.find(x => x.name === preset)!; return (
                <div className="mt-2 px-3 py-2 rounded font-mono text-xs" style={{ background: '#080c08', border: '1px solid #1f3320', color: '#2d6a2d' }}>
                  SF{p.sf} · BW{p.bw}kHz · CR{p.cr} · {p.br}
                </div>
              )})()}
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>REGION</label>
                <select className="w-full px-2 py-2 rounded font-mono text-xs" value={region} onChange={e => setRegion(e.target.value)}>
                  {REGIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>TX POWER (dBm)</label>
                <input className="w-full px-2 py-2 rounded font-mono text-xs" type="number" min={1} max={30} value={txPower} onChange={e => setTxPower(e.target.value)} />
              </div>
              <div>
                <label className="font-display block mb-1" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.08em' }}>HOP LIMIT</label>
                <input className="w-full px-2 py-2 rounded font-mono text-xs" type="number" min={1} max={7} value={hopLimit} onChange={e => setHopLimit(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="px-4 py-2 rounded font-display text-xs"
                style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 10, letterSpacing: '0.08em', boxShadow: '0 0 8px #4ade8020' }}>
                SAVE TO NODE
              </button>
              <button className="px-4 py-2 rounded font-display text-xs"
                style={{ background: '#0f1a0f', border: '1px solid #1f3320', color: '#2d6a2d', fontSize: 10, letterSpacing: '0.08em' }}>
                RESET DEFAULTS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Wiki Section ────────────────────────────────────────────────────────────

function WikiSection() {
  const [search, setSearch] = useStoredState('arsn.wiki.search', '')
  const [selectedId, setSelectedId] = useStoredState<number | null>('arsn.wiki.selectedId', null)
  const [category, setCategory] = useStoredState('arsn.wiki.category', 'All')

  const categories = ['All', ...Array.from(new Set(WIKI_ARTICLES.map(a => a.category)))]
  const filtered = WIKI_ARTICLES.filter(a => {
    const inSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.tags.some(t => t.includes(search.toLowerCase()))
    const inCat = category === 'All' || a.category === category
    return inSearch && inCat
  })
  const selected = WIKI_ARTICLES.find(a => a.id === selectedId) ?? null

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Article list */}
      <div style={{ width: 340, borderRight: '1px solid #1f3320', background: '#080c08' }}
        className="flex flex-col shrink-0">
        <div className="p-3 shrink-0" style={{ borderBottom: '1px solid #1f3320' }}>
          <input
            className="w-full px-3 py-2 rounded text-xs"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {categories.map(c => (
              <button key={c}
                onClick={() => setCategory(c)}
                className="px-2 py-0.5 rounded font-display text-xs"
                style={{
                  background: category === c ? '#162016' : 'transparent',
                  border: `1px solid ${category === c ? '#4ade80' : '#1f3320'}`,
                  color: category === c ? '#4ade80' : '#2d6a2d',
                  fontSize: 9, letterSpacing: '0.06em'
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(a => (
            <button
              key={a.id}
              className={`wiki-card w-full text-left p-3 m-0 rounded-none transition-all ${selected?.id === a.id ? '' : ''}`}
              style={{
                borderBottom: '1px solid #0d150d',
                background: selected?.id === a.id ? '#111d11' : 'transparent',
                borderLeft: `2px solid ${selected?.id === a.id ? '#4ade80' : 'transparent'}`
              }}
              onClick={() => setSelectedId(a.id)}
            >
              <div className="font-mono text-xs mb-1" style={{ color: selected?.id === a.id ? '#d1fae5' : '#86efac' }}>
                {a.title}
              </div>
              <div className="font-display text-xs mb-2" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.06em' }}>
                {a.category}
              </div>
              <div className="flex flex-wrap gap-1">
                {a.tags.map(t => (
                  <span key={t} className="font-mono text-xs px-1 rounded"
                    style={{ background: '#0f1a0f', color: '#2d6a2d', fontSize: 9 }}>
                    {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Article content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-2xl">
            <div className="font-display text-xs mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.12em' }}>
              {selected.category.toUpperCase()}
            </div>
            <h1 className="font-display text-xl mb-3" style={{ color: '#d1fae5', letterSpacing: '0.04em' }}>
              {selected.title}
            </h1>
            <p className="font-mono text-sm mb-6 leading-relaxed" style={{ color: '#6ee7b7', borderLeft: '2px solid #1f3320', paddingLeft: 16 }}>
              {selected.summary}
            </p>
            <div className="font-mono text-xs leading-relaxed" style={{ color: '#86efac' }}>
              <p>{selected.content}</p>
              <p className="mt-4" style={{ color: '#4a7a4a' }}>
                This article is part of the ARSN offline knowledge base. Content is synchronized via store-and-forward replication. Last updated: 2024-01-10.
              </p>
              <div className="mt-6 p-4 rounded" style={{ background: '#0d150d', border: '1px solid #1f3320' }}>
                <div className="font-display text-xs mb-3" style={{ color: '#4ade80', fontSize: 9, letterSpacing: '0.1em' }}>RELATED TAGS</div>
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map(t => (
                    <span key={t} className="font-mono text-xs px-2 py-1 rounded"
                      style={{ background: '#162016', border: '1px solid #1f3320', color: '#4ade80', fontSize: 10 }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="font-display text-xs mb-2" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.12em' }}>ARSN WIKI — OFFLINE KNOWLEDGE BASE</div>
            <h1 className="font-display text-2xl mb-6" style={{ color: '#4ade80', letterSpacing: '0.06em' }}>
              {filtered.length} Articles
            </h1>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {filtered.map(a => (
                <button key={a.id}
                  className="wiki-card rounded p-4 text-left"
                  style={{ background: '#0a0d0a' }}
                  onClick={() => setSelectedId(a.id)}>
                  <div className="font-display text-xs mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.08em' }}>
                    {a.category.toUpperCase()}
                  </div>
                  <div className="font-mono text-sm mb-2" style={{ color: '#d1fae5' }}>{a.title}</div>
                  <div className="font-mono text-xs" style={{ color: '#4a7a4a', lineHeight: 1.5 }}>{a.summary}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tools Section ───────────────────────────────────────────────────────────

function ToolsSection() {
  const [tab, setTab] = useStoredState<'bandplan' | 'phonetic' | 'qcodes' | 'freqcalc' | 'maidenhead'>('arsn.tools.tab', 'bandplan')
  const [freqInput, setFreqInput] = useStoredState('arsn.tools.freqInput', '14200')
  const [callInput, setCallInput] = useStoredState('arsn.tools.callInput', '')
  const [gridInput, setGridInput] = useStoredState('arsn.tools.gridInput', 'DM79')

  const freqMHz = parseFloat(freqInput) || 0
  const wavelength = freqMHz > 0 ? (300 / freqMHz).toFixed(2) : '—'
  const halfWave = freqMHz > 0 ? (468 / freqMHz).toFixed(1) : '—'
  const quarterWave = freqMHz > 0 ? (234 / freqMHz).toFixed(1) : '—'

  const phoneticOutput = callInput.toUpperCase().split('').map(c => {
    const found = PHONETIC.find(p => p[0] === c)
    return found ? found[1] : c === ' ' ? '·' : c
  }).join(' ')

  const TABS = ['bandplan', 'phonetic', 'qcodes', 'freqcalc', 'maidenhead'] as const

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div style={{ borderBottom: '1px solid #1f3320', padding: '0 16px' }}
        className="flex gap-0 shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button key={t}
            className={`tool-tab px-4 py-3 font-display text-xs whitespace-nowrap ${tab === t ? 'active' : ''}`}
            style={{ fontSize: 10, letterSpacing: '0.08em', color: tab === t ? '#4ade80' : '#2d6a2d' }}
            onClick={() => setTab(t)}>
            {t === 'bandplan' ? 'BAND PLAN' : t === 'phonetic' ? 'PHONETIC' : t === 'qcodes' ? 'Q-CODES' : t === 'freqcalc' ? 'FREQ CALC' : 'MAIDENHEAD'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'bandplan' && (
          <div>
            <div className="font-display text-xs mb-4" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.12em' }}>US AMATEUR BAND ALLOCATIONS</div>
            <div className="overflow-x-auto">
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    {['Band', 'Frequency Range', 'Modes', 'Max Power', 'Notes'].map(h => (
                      <th key={h} className="py-2 px-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BAND_PLAN.map(row => (
                    <tr key={row.band} className="hover:bg-surface-3 transition-colors">
                      <td className="py-2 px-3" style={{ color: '#4ade80', fontWeight: 600 }}>{row.band}</td>
                      <td className="py-2 px-3">{row.range}</td>
                      <td className="py-2 px-3" style={{ color: '#6ee7b7' }}>{row.modes}</td>
                      <td className="py-2 px-3" style={{ color: '#fbbf24' }}>{row.power}</td>
                      <td className="py-2 px-3" style={{ color: '#4a7a4a' }}>{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'phonetic' && (
          <div className="max-w-2xl">
            <div className="font-display text-xs mb-4" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.12em' }}>
              NATO PHONETIC ALPHABET
            </div>
            <div className="mb-6">
              <input
                className="w-full px-3 py-2 rounded text-sm mb-2"
                placeholder="Type callsign or text..."
                value={callInput}
                onChange={e => setCallInput(e.target.value)}
              />
              {callInput && (
                <div className="p-3 rounded font-mono text-sm" style={{ background: '#0a0d0a', border: '1px solid #1f3320', color: '#4ade80' }}>
                  {phoneticOutput}
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PHONETIC.map(([letter, word]) => (
                <div key={letter} className="flex gap-2 items-baseline px-3 py-2 rounded"
                  style={{ background: '#0a0d0a', border: '1px solid #0f1a0f' }}>
                  <span className="font-display text-base" style={{ color: '#4ade80', minWidth: 16 }}>{letter}</span>
                  <span className="font-mono text-xs" style={{ color: '#4a7a4a' }}>{word}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'qcodes' && (
          <div className="max-w-2xl">
            <div className="font-display text-xs mb-4" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.12em' }}>
              COMMON Q-CODES
            </div>
            <div className="space-y-1">
              {Q_CODES.map(q => (
                <div key={q.code} className="flex gap-4 items-center px-3 py-2.5 rounded"
                  style={{ background: '#0a0d0a', borderBottom: '1px solid #0d150d' }}>
                  <span className="font-display text-sm" style={{ color: '#4ade80', minWidth: 48, letterSpacing: '0.05em' }}>
                    {q.code}
                  </span>
                  <span className="font-mono text-xs" style={{ color: '#86efac' }}>{q.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'freqcalc' && (
          <div className="max-w-md">
            <div className="font-display text-xs mb-6" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.12em' }}>
              ANTENNA LENGTH CALCULATOR
            </div>
            <div className="flex items-center gap-3 mb-6">
              <input
                className="flex-1 px-3 py-2 rounded text-sm"
                value={freqInput}
                onChange={e => setFreqInput(e.target.value)}
                placeholder="Frequency in kHz"
              />
              <span className="font-mono text-xs" style={{ color: '#2d6a2d' }}>kHz</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Frequency', value: `${(freqMHz / 1000).toFixed(4)} MHz`, accent: false },
                { label: 'Wavelength (λ)', value: `${wavelength} m`, accent: true },
                { label: 'Half-wave dipole (ft)', value: `${halfWave} ft`, accent: true },
                { label: 'Quarter-wave vertical (ft)', value: `${quarterWave} ft`, accent: false },
                { label: '5/8 wave vertical (ft)', value: freqMHz > 0 ? `${(585 / (freqMHz / 1000)).toFixed(1)} ft` : '—', accent: false },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center px-4 py-3 rounded"
                  style={{ background: '#0a0d0a', border: '1px solid #0f1a0f' }}>
                  <span className="font-display text-xs" style={{ color: '#2d6a2d', fontSize: 10, letterSpacing: '0.06em' }}>
                    {row.label.toUpperCase()}
                  </span>
                  <span className="font-mono text-sm" style={{ color: row.accent ? '#4ade80' : '#86efac' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'maidenhead' && (
          <div className="max-w-md">
            <div className="font-display text-xs mb-6" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.12em' }}>
              MAIDENHEAD GRID LOCATOR
            </div>
            <div className="flex items-center gap-3 mb-4">
              <input
                className="flex-1 px-3 py-2 rounded text-sm uppercase"
                value={gridInput}
                onChange={e => setGridInput(e.target.value.toUpperCase())}
                placeholder="e.g. DM79"
                maxLength={6}
              />
            </div>
            {gridInput.length >= 4 && (
              <div className="space-y-3">
                <div className="p-4 rounded" style={{ background: '#0a0d0a', border: '1px solid #1f3320' }}>
                  <div className="font-display text-xs mb-3" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>DECODED</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-xs" style={{ color: '#4a7a4a' }}>Grid Square</span>
                      <span className="font-display text-sm" style={{ color: '#4ade80' }}>{gridInput}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs" style={{ color: '#4a7a4a' }}>Field</span>
                      <span className="font-mono text-xs" style={{ color: '#86efac' }}>{gridInput.slice(0, 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs" style={{ color: '#4a7a4a' }}>Square</span>
                      <span className="font-mono text-xs" style={{ color: '#86efac' }}>{gridInput.slice(2, 4)}</span>
                    </div>
                    {gridInput.length >= 6 && (
                      <div className="flex justify-between">
                        <span className="font-mono text-xs" style={{ color: '#4a7a4a' }}>Subsquare</span>
                        <span className="font-mono text-xs" style={{ color: '#86efac' }}>{gridInput.slice(4, 6)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded" style={{ background: '#0a0d0a', border: '1px solid #1f3320' }}>
                  <div className="font-mono text-xs" style={{ color: '#4a7a4a', lineHeight: 1.8 }}>
                    Grid {gridInput} covers approximately 1° latitude × 2° longitude at the subsquare level. Used for contesting, satellite, and EME distance calculations.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Morse Encoder/Decoder ───────────────────────────────────────────────────

const MORSE_MAP: Record<string, string> = {
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..', J:'.---',
  K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-',
  U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..',
  '0':'-----', '1':'.----', '2':'..---', '3':'...--', '4':'....-', '5':'.....',
  '6':'-....', '7':'--...', '8':'---..', '9':'----.',
  '.':'.-.-.-', ',':'--..--', '?':'..--..', "'":'.----.', '!':'-.-.--',
  '/':'-..-.', '(':'-.--.', ')':'-.--.-', '&':'.-...', ':':'---...',
  ';':'-.-.-.', '=':'-...-', '+':'.-.-.', '-':'-....-', '_':'..--.-',
  '"':'.-..-.', '$':'...-..-', '@':'.--.-.', ' ': '/',
}
const REVERSE_MORSE = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]))

function encodeToMorse(text: string): string {
  return text.toUpperCase().split('').map(c => MORSE_MAP[c] ?? '?').join(' ')
}
function decodeFromMorse(morse: string): string {
  return morse.trim().split('   ').map(word =>
    word.split(' ').map(code => code === '/' ? ' ' : (REVERSE_MORSE[code] ?? '?')).join('')
  ).join(' ')
}

interface MorseMessage { id: number; from: string; text: string; morse: string; time: string }
const INITIAL_MORSE_MSGS: MorseMessage[] = [
  { id: 1, from: 'W7ARK', text: 'CQ CQ DE W7ARK', morse: '-.-. --.- / -.-. --.- / -.. . / .-- --... .- .-. -.-', time: '09:12' },
  { id: 2, from: 'KG5WXY', text: 'QSL 73', morse: '--.- ... .-.. / --... ...--', time: '09:08' },
  { id: 3, from: 'N0GRD', text: 'QTH GRID DM79', morse: '--.- - .... / --. .-. .. -.. / -.. -- --... ----.', time: '08:55' },
]

function MorsePopup({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('')
  const [morseOut, setMorseOut] = useState('')
  const [morseIn, setMorseIn] = useState('')
  const [textOut, setTextOut] = useState('')
  const [tab, setTab] = useState<'encode' | 'decode' | 'inbox'>('encode')
  const [messages, setMessages] = useState<MorseMessage[]>(INITIAL_MORSE_MSGS)
  const [playingId, setPlayingId] = useState<number | null>(null)

  const handleEncode = (val: string) => {
    setInput(val)
    setMorseOut(val ? encodeToMorse(val) : '')
  }
  const handleDecode = (val: string) => {
    setMorseIn(val)
    setTextOut(val ? decodeFromMorse(val) : '')
  }
  const handleSend = () => {
    if (!input.trim()) return
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
    setMessages(prev => [{ id: Date.now(), from: 'KD9LMX', text: input, morse: morseOut, time }, ...prev])
    setInput('')
    setMorseOut('')
    setTab('inbox')
  }

  // Simple audio morse playback using Web Audio API
  const playMorse = (morse: string, id: number) => {
    setPlayingId(id)
    const ctx = new AudioContext()
    const wpm = 15
    const dit = 60 / (wpm * 50) // seconds per dit at given WPM
    let t = ctx.currentTime + 0.1
    for (const ch of morse.split('')) {
      if (ch === '.') {
        const osc = ctx.createOscillator(); const g = ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.frequency.value = 700; osc.type = 'sine'
        g.gain.setValueAtTime(0.3, t); g.gain.setValueAtTime(0, t + dit)
        osc.start(t); osc.stop(t + dit)
        t += dit * 2
      } else if (ch === '-') {
        const osc = ctx.createOscillator(); const g = ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.frequency.value = 700; osc.type = 'sine'
        g.gain.setValueAtTime(0.3, t); g.gain.setValueAtTime(0, t + dit * 3)
        osc.start(t); osc.stop(t + dit * 3)
        t += dit * 4
      } else if (ch === ' ') {
        t += dit * 2
      } else if (ch === '/') {
        t += dit * 4
      }
    }
    setTimeout(() => setPlayingId(null), (t - ctx.currentTime) * 1000 + 200)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 72, right: 20, width: 480, zIndex: 100,
      background: '#080c08', border: '1px solid #2d4d2d',
      borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px #1f3320',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: '#0a0d0a', borderBottom: '1px solid #1f3320' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>⚡</span>
          <span className="font-display text-xs tracking-widest" style={{ color: '#4ade80', fontSize: 11, letterSpacing: '0.12em' }}>
            MORSE ENCODER / DECODER
          </span>
        </div>
        <button onClick={onClose}
          className="font-mono text-xs px-2 py-0.5 rounded"
          style={{ color: '#2d6a2d', border: '1px solid #1f3320', background: 'transparent', fontSize: 12 }}>
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid #1f3320' }}>
        {(['encode', 'decode', 'inbox'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 font-display text-xs transition-all"
            style={{
              fontSize: 9, letterSpacing: '0.1em',
              color: tab === t ? '#4ade80' : '#2d6a2d',
              background: tab === t ? '#111d11' : 'transparent',
              borderBottom: `2px solid ${tab === t ? '#4ade80' : 'transparent'}`,
            }}>
            {t === 'encode' ? 'ENCODE' : t === 'decode' ? 'DECODE' : `INBOX (${messages.length})`}
          </button>
        ))}
      </div>

      <div className="p-4" style={{ maxHeight: 380, overflowY: 'auto' }}>
        {tab === 'encode' && (
          <div className="space-y-3">
            <div>
              <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>
                TEXT INPUT
              </label>
              <input
                className="w-full px-3 py-2 rounded text-xs"
                placeholder="Type text to encode..."
                value={input}
                onChange={e => handleEncode(e.target.value)}
              />
            </div>
            <div>
              <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>
                MORSE OUTPUT
              </label>
              <div className="w-full px-3 py-2 rounded font-mono text-xs leading-relaxed min-h-16"
                style={{ background: '#020602', border: '1px solid #1f3320', color: '#4ade80', wordBreak: 'break-all' }}>
                {morseOut || <span style={{ color: '#1f4a1f' }}>· · · · ·</span>}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => morseOut && playMorse(morseOut, -1)}
                className="font-display text-xs px-3 py-1.5 rounded flex items-center gap-1.5"
                style={{ background: '#0f1a0f', border: '1px solid #2d4d2d', color: '#4ade80', fontSize: 9, letterSpacing: '0.08em' }}>
                ▶ PLAY CW
              </button>
              <button onClick={handleSend}
                className="font-display text-xs px-3 py-1.5 rounded"
                style={{ background: '#162016', border: '1px solid #4ade80', color: '#4ade80', fontSize: 9, letterSpacing: '0.08em' }}>
                SEND TO INBOX
              </button>
              <button onClick={() => { navigator.clipboard?.writeText(morseOut) }}
                className="font-display text-xs px-3 py-1.5 rounded"
                style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#2d6a2d', fontSize: 9, letterSpacing: '0.08em' }}>
                COPY
              </button>
            </div>
          </div>
        )}

        {tab === 'decode' && (
          <div className="space-y-3">
            <div>
              <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>
                MORSE INPUT (use space between chars, 3 spaces between words)
              </label>
              <textarea
                className="w-full px-3 py-2 rounded text-xs resize-none"
                rows={4}
                placeholder=".- -... -.-."
                value={morseIn}
                onChange={e => handleDecode(e.target.value)}
              />
            </div>
            <div>
              <label className="font-display text-xs block mb-1" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>
                DECODED TEXT
              </label>
              <div className="w-full px-3 py-2 rounded font-mono text-sm min-h-10"
                style={{ background: '#020602', border: '1px solid #1f3320', color: '#4ade80', letterSpacing: '0.06em' }}>
                {textOut || <span style={{ color: '#1f4a1f' }}>decoded text appears here</span>}
              </div>
            </div>
            <button onClick={() => morseIn && playMorse(morseIn, -2)}
              className="font-display text-xs px-3 py-1.5 rounded flex items-center gap-1.5"
              style={{ background: '#0f1a0f', border: '1px solid #2d4d2d', color: '#4ade80', fontSize: 9, letterSpacing: '0.08em' }}>
              ▶ PLAY CW
            </button>
          </div>
        )}

        {tab === 'inbox' && (
          <div className="space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className="rounded p-3"
                style={{ background: '#0a0d0a', border: '1px solid #1f3320' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xs px-2 py-0.5 rounded"
                    style={{ background: '#162016', color: '#4ade80', fontSize: 9, letterSpacing: '0.08em' }}>
                    {msg.from}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playMorse(msg.morse, msg.id)}
                      className="font-display text-xs px-2 py-0.5 rounded"
                      style={{
                        background: playingId === msg.id ? '#4ade8020' : '#0f1a0f',
                        border: `1px solid ${playingId === msg.id ? '#4ade80' : '#1f3320'}`,
                        color: playingId === msg.id ? '#4ade80' : '#2d6a2d',
                        fontSize: 9,
                      }}>
                      {playingId === msg.id ? '◼ PLAYING' : '▶ CW'}
                    </button>
                    <span className="font-mono text-xs" style={{ color: '#2d6a2d', fontSize: 9 }}>{msg.time}</span>
                  </div>
                </div>
                <div className="font-mono text-sm mb-1" style={{ color: '#d1fae5' }}>{msg.text}</div>
                <div className="font-mono text-xs leading-relaxed" style={{ color: '#2d6a2d', wordBreak: 'break-all', fontSize: 10 }}>
                  {msg.morse}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Radio (Primary Transceiver) Section ─────────────────────────────────────

const MODES = ['LSB', 'USB', 'CW', 'CWR', 'AM', 'FM', 'DIG', 'FT8']
interface SavedFrequency {
  id: number
  label: string
  freqKhz: number
  mode: string
}

interface RadioTelemetry {
  txMode: boolean
  sMeter: number
  power: number
  mainFreqKhz: number
  mode: string
  subFreqKhz: number
  subMode: string
  activeVfo: 'A' | 'B'
  tuningStep: number
  frequencyAllowed: boolean
  meshOnlineCount: number
  meshTotalCount: number
}

function SMeter({ level, modeLabel }: { level: number; modeLabel: string }) {
  // level 0–9 (S units) + 10, 20, 40, 60 over S9
  const segments = [1,2,3,4,5,6,7,8,9,'10','20','40','60']
  const filled = Math.min(Math.round(level), segments.length)
  return (
    <div style={{ background: '#040804', border: '1px solid #1a2e1a', borderRadius: 4, padding: '6px 8px' }}>
      <div className="font-display text-xs mb-1.5" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>
        S-METER {modeLabel}
      </div>
      <div className="flex items-end gap-px mb-1">
        {segments.map((s, i) => {
          const isOver = i >= 9
          const active = i < filled
          return (
            <div key={i} style={{
              width: isOver ? 10 : 7,
              height: isOver ? 18 : 14,
              background: active
                ? isOver ? '#ef4444' : '#4ade80'
                : isOver ? '#2a0a0a' : '#0a1a0a',
              boxShadow: active ? isOver ? '0 0 4px #ef4444' : '0 0 4px #4ade80' : 'none',
              borderRadius: 1,
              flexShrink: 0,
            }} />
          )
        })}
      </div>
      <div className="flex justify-between font-mono" style={{ fontSize: 8, color: '#2d6a2d' }}>
        <span>S1</span><span>3</span><span>5</span><span>7</span><span>9</span>
        <span style={{ color: '#6b2222' }}>+20</span><span style={{ color: '#6b2222' }}>+60</span>
      </div>
    </div>
  )
}

function PowerMeter({ level }: { level: number }) {
  const pct = Math.min(level, 100)
  return (
    <div style={{ background: '#040804', border: '1px solid #1a2e1a', borderRadius: 4, padding: '6px 8px' }}>
      <div className="font-display text-xs mb-1.5" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>
        RF PWR
      </div>
      <div style={{ background: '#0a1a0a', borderRadius: 2, height: 10, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: pct > 80 ? '#ef4444' : pct > 60 ? '#fbbf24' : '#4ade80',
          boxShadow: `0 0 6px ${pct > 80 ? '#ef4444' : pct > 60 ? '#fbbf24' : '#4ade80'}`,
          transition: 'width 0.1s',
          borderRadius: 2,
        }} />
      </div>
      <div className="flex justify-between font-mono" style={{ fontSize: 8, color: '#2d6a2d' }}>
        <span>0</span><span>25W</span><span>50W</span><span>75W</span><span>100W</span>
      </div>
    </div>
  )
}

function SpectrumScope({ centerKhz, txMode, spanKhz, hold, markerOn, fixedTuning, signals, noiseFloor, rxVfo }: { centerKhz: number; txMode: boolean; spanKhz: number; hold: boolean; markerOn: boolean; fixedTuning: boolean; signals: Array<{ offsetKhz: number; strength: number }>; noiseFloor: number; rxVfo: 'A' | 'B' }) {
  const bars = 120
  const [spectrum, setSpectrum] = useState<number[]>(() =>
    Array.from({ length: bars }, () => 0)
  )
  const [waterfall, setWaterfall] = useState<number[][]>(() =>
    Array.from({ length: 32 }, () => Array.from({ length: bars }, () => 0))
  )

  const buildSpectrumRow = (phase: number) => {
    const scopeMinKhz = centerKhz - spanKhz / 2
    const binKhz = spanKhz / bars
    return Array.from({ length: bars }, (_, index) => {
      const khz = scopeMinKhz + index * binKhz
      const periodicNoise = Math.sin((index + phase) * 0.41) * 0.9 + Math.cos((index + phase) * 0.17) * 0.6
      let value = noiseFloor + periodicNoise

      for (const signal of signals) {
        const center = centerKhz + signal.offsetKhz
        const distance = Math.abs(khz - center)
        const widthKhz = Math.max(0.45, spanKhz / 75)
        const contribution = signal.strength * 10 * Math.exp(-Math.pow(distance / widthKhz, 2))
        value += contribution
      }

      if (txMode && Math.abs(khz - centerKhz) < Math.max(0.7, spanKhz / 130)) {
        value = Math.max(value, 85)
      }

      return Math.max(0, Math.min(100, value))
    })
  }

  useEffect(() => {
    if (hold) return
    let phase = 0
    const id = setInterval(() => {
      phase += 1
      const row = buildSpectrumRow(phase)
      setSpectrum(row)
      setWaterfall(prev => {
        return [row, ...prev.slice(0, 31)]
      })
    }, 120)
    return () => clearInterval(id)
  }, [centerKhz, hold, noiseFloor, signals, spanKhz, txMode])

  const scopeH = 80
  const waterfallH = 96

  const levelToColor = (v: number): string => {
    if (v < 15) return '#020802'
    if (v < 30) return '#041208'
    if (v < 45) return '#072010'
    if (v < 60) return '#0a3018'
    if (v < 75) return '#1a5530'
    if (v < 88) return '#2d7a50'
    return '#4ade80'
  }

  const bw = 600 / bars

  return (
    <div style={{ background: '#020602', border: '1px solid #1a2e1a', borderRadius: 4, overflow: 'hidden' }}>
      {/* Scope header */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #0f1f0f' }}>
        <span className="font-display text-xs" style={{ color: '#22d3ee', fontSize: 9, letterSpacing: '0.1em' }}>SPECTRUM SCOPE RX VFO-{rxVfo}</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs" style={{ color: '#2d6a2d', fontSize: 9 }}>SPAN: {spanKhz}kHz</span>
          {fixedTuning && <span className="font-display text-xs px-1.5 py-0.5 rounded" style={{ background: '#4ade8015', color: '#4ade80', fontSize: 8, letterSpacing: '0.08em' }}>FIXED</span>}
          {markerOn && <span className="font-display text-xs px-1.5 py-0.5 rounded" style={{ background: '#22d3ee15', color: '#22d3ee', fontSize: 8, letterSpacing: '0.08em' }}>MARK</span>}
          <span className="font-mono text-xs" style={{ color: '#2d6a2d', fontSize: 9 }}>REF: -20dB</span>
          {txMode && <span className="font-display text-xs px-1.5 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444', fontSize: 9, letterSpacing: '0.08em' }}>TX</span>}
        </div>
      </div>

      {/* Spectrum plot */}
      <svg width="100%" viewBox={`0 0 600 ${scopeH}`} style={{ display: 'block', height: scopeH / 2 }} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1="0" y1={scopeH * f} x2="600" y2={scopeH * f}
            stroke="#0a1a0a" strokeWidth="1" />
        ))}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={600 * f} y1="0" x2={600 * f} y2={scopeH}
            stroke="#0a1a0a" strokeWidth="1" />
        ))}
        {/* Center marker */}
        <line x1="300" y1="0" x2="300" y2={scopeH} stroke="#4ade8040" strokeWidth="1" strokeDasharray="3 3" />
        {/* Spectrum bars */}
        {spectrum.map((v, i) => {
          const h = (v / 100) * scopeH
          const x = i * bw
          const color = txMode && Math.abs(i - bars/2) < 4 ? '#ef4444' : '#4ade80'
          return (
            <rect key={i} x={x} y={scopeH - h} width={bw - 0.5} height={h}
              fill={color} fillOpacity={0.7 + v * 0.003} />
          )
        })}
        {/* Fill under */}
        <defs>
          <linearGradient id="scopeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>

      {/* Waterfall */}
      <svg width="100%" viewBox={`0 0 600 ${waterfallH}`} style={{ display: 'block', height: waterfallH / 2 }} preserveAspectRatio="none">
        {waterfall.map((row, ri) =>
          row.map((v, ci) => (
            <rect key={`${ri}-${ci}`}
              x={ci * bw} y={ri * (waterfallH / 32)}
              width={bw} height={waterfallH / 32 + 0.5}
              fill={levelToColor(v)} />
          ))
        )}
        {/* Center marker on waterfall */}
        <line x1="300" y1="0" x2="300" y2={waterfallH} stroke="#4ade8060" strokeWidth="1" strokeDasharray="2 4" />
      </svg>

      {/* Freq axis */}
      <div className="flex justify-between px-2 py-1" style={{ borderTop: '1px solid #0a1a0a' }}>
        {[-25, -12.5, 0, 12.5, 25].map(offset => (
          <span key={offset} className="font-mono text-xs" style={{ color: '#1f4a1f', fontSize: 8 }}>
            {offset === 0 ? `${(centerKhz / 1000).toFixed(3)}` : `${offset > 0 ? '+' : ''}${offset}k`}
          </span>
        ))}
      </div>
    </div>
  )
}

function VFOKnob({ onChange }: { onChange: (delta: number) => void }) {
  const [dragging, setDragging] = useState(false)
  const [angle, setAngle] = useState(0)
  const lastY = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    lastY.current = e.clientY
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent) => {
      const dy = lastY.current - e.clientY
      lastY.current = e.clientY
      setAngle(a => a + dy * 3)
      onChange(dy > 0 ? Math.ceil(dy) : Math.floor(dy))
    }
    const up = () => setDragging(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dragging, onChange])

  const tickCount = 24
  return (
    <div
      className="relative select-none"
      style={{ width: 100, height: 100, cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
    >
      <svg viewBox="0 0 100 100" width="100" height="100">
        {/* Outer ring */}
        <circle cx="50" cy="50" r="48" fill="#0a1a0a" stroke="#1f3320" strokeWidth="1.5" />
        {/* Tick marks on ring */}
        {Array.from({ length: tickCount }).map((_, i) => {
          const a = (i / tickCount) * 360 * (Math.PI / 180)
          const inner = 38, outer = 44
          return (
            <line key={i}
              x1={50 + Math.sin(a) * inner} y1={50 - Math.cos(a) * inner}
              x2={50 + Math.sin(a) * outer} y2={50 - Math.cos(a) * outer}
              stroke={i % 6 === 0 ? '#2d6a2d' : '#1a2e1a'} strokeWidth={i % 6 === 0 ? 1.5 : 0.8}
            />
          )
        })}
        {/* Knob body */}
        <circle cx="50" cy="50" r="34" fill="#0d180d" stroke="#2d4d2d" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="28" fill="#111d11" stroke="#1f3320" strokeWidth="1" />
        {/* Inner shine */}
        <circle cx="50" cy="50" r="26" fill="url(#knobGrad)" />
        <defs>
          <radialGradient id="knobGrad" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#1a3a1a" />
            <stop offset="100%" stopColor="#080c08" />
          </radialGradient>
        </defs>
        {/* Indicator dot */}
        <circle
          cx={50 + Math.sin(angle * Math.PI / 180) * 20}
          cy={50 - Math.cos(angle * Math.PI / 180) * 20}
          r="3" fill="#4ade80"
          style={{ filter: 'drop-shadow(0 0 3px #4ade80)' }}
        />
        {/* Center dot */}
        <circle cx="50" cy="50" r="4" fill="#0a1a0a" stroke="#2d4d2d" strokeWidth="1" />
      </svg>
    </div>
  )
}

function RadioSection({ country, license, emergencyOverride, onTelemetryChange }: { country: string; license: string; emergencyOverride: boolean; onTelemetryChange: (telemetry: RadioTelemetry) => void }) {
  const [freqKhz, setFreqKhz] = useStoredState('arsn.radio.freqKhz', 14200)
  const [subFreqKhz, setSubFreqKhz] = useStoredState('arsn.radio.subFreqKhz', 7074)
  const [mode, setMode] = useStoredState('arsn.radio.mode', 'USB')
  const [subMode, setSubMode] = useStoredState('arsn.radio.subMode', 'FT8')
  const [band, setBand] = useStoredState('arsn.radio.band', '20m')
  const [txMode, setTxMode] = useState(false)
  const [sMeter, setSMeter] = useState(7)
  const [power, setPower] = useState(0)
  const [agc, setAgc] = useStoredState('arsn.radio.agc', 'MID')
  const [att, setAtt] = useStoredState('arsn.radio.att', 'OFF')
  const [nb, setNb] = useStoredState('arsn.radio.nb', false)
  const [nr, setNr] = useStoredState('arsn.radio.nr', false)
  const [split, setSplit] = useStoredState('arsn.radio.split', false)
  const [vfoA, setVfoA] = useStoredState('arsn.radio.vfoA', true)
  const [rfGain, setRfGain] = useStoredState('arsn.radio.rfGain', 80)
  const [afGain, setAfGain] = useStoredState('arsn.radio.afGain', 60)
  const [micGain, setMicGain] = useStoredState('arsn.radio.micGain', 50)
  const [squelch, setSquelch] = useStoredState('arsn.radio.squelch', 20)
  const [tunerOn, setTunerOn] = useStoredState('arsn.radio.tunerOn', false)
  const [morseOpen, setMorseOpen] = useState(false)
  const [morseCount] = useState(3)
  const [savedFrequencies, setSavedFrequencies] = useStoredState<SavedFrequency[]>('arsn.radio.savedFrequencies', [
    { id: 1, label: '20m DX', freqKhz: 14200, mode: 'USB' },
    { id: 2, label: '40m NVIS', freqKhz: 7250, mode: 'LSB' },
    { id: 3, label: '2m FM', freqKhz: 146520, mode: 'FM' },
  ])
  const [spectrumSpanKhz, setSpectrumSpanKhz] = useStoredState('arsn.radio.spectrumSpanKhz', 50)
  const [spectrumHold, setSpectrumHold] = useStoredState('arsn.radio.spectrumHold', false)
  const [spectrumMarker, setSpectrumMarker] = useStoredState('arsn.radio.spectrumMarker', true)
  const [fixedTuning, setFixedTuning] = useStoredState('arsn.radio.fixedTuning', false)
  const [tuningStep, setTuningStep] = useStoredState('arsn.radio.tuningStep', 100)
  const [lockTuning, setLockTuning] = useStoredState('arsn.radio.lockTuning', false)
  const [scanActive, setScanActive] = useStoredState('arsn.radio.scanActive', false)
  const [scanDirection, setScanDirection] = useStoredState<'up' | 'down'>('arsn.radio.scanDirection', 'up')
  const [voxEnabled, setVoxEnabled] = useStoredState('arsn.radio.voxEnabled', false)
  const [voxLatchedTx, setVoxLatchedTx] = useState(false)
  const signalSources = DEFAULT_SIGNAL_SOURCES
  const [lastControlAction, setLastControlAction] = useState('READY')
  const frequencyBounds = getFrequencyBounds()
  const meshOnlineCount = MESH_NODES.filter(node => node.isOnline).length
  const activeFreqKhz = vfoA ? freqKhz : subFreqKhz
  const activeMode = vfoA ? mode : subMode
  const effectiveTxMode = txMode || voxLatchedTx
  const activeVfo: 'A' | 'B' = vfoA ? 'A' : 'B'
  const rxVfo: 'A' | 'B' = activeVfo
  const txVfo: 'A' | 'B' = split ? (vfoA ? 'B' : 'A') : activeVfo
  const rxFreqKhz = activeFreqKhz
  const rxMode = activeMode
  const txModeName = txVfo === 'A' ? mode : subMode

  const [signalTarget, setSignalTarget] = useState(0)
  const [noiseFloor, setNoiseFloor] = useState(7)

  const clampFrequency = (value: number) => {
    return Math.max(frequencyBounds.minKhz, Math.min(frequencyBounds.maxKhz, value))
  }

  const setActiveFrequency = (updater: (current: number) => number) => {
    if (lockTuning) return
    if (vfoA) {
      setFreqKhz(prev => clampFrequency(updater(prev)))
      return
    }
    setSubFreqKhz(prev => clampFrequency(updater(prev)))
  }

  const setActiveMode = (nextMode: string) => {
    if (vfoA) {
      setMode(nextMode)
      return
    }
    setSubMode(nextMode)
  }

  const activateControl = (label: string, action?: () => void) => {
    action?.()
    setLastControlAction(`${label} @ ${new Date().toLocaleTimeString('en-US', { hour12: false })}`)
  }

  const visibleSignals = useMemo(() => {
    const modeWidthKhz = rxMode === 'FM' ? 9 : rxMode === 'AM' ? 6 : rxMode === 'FT8' ? 1.2 : rxMode === 'CW' || rxMode === 'CWR' ? 0.45 : 2.7
    return signalSources
      .map(source => {
        const distanceKhz = Math.abs(source.freqKhz - rxFreqKhz)
        const width = modeWidthKhz * (source.mode === rxMode ? 1 : 0.8)
        const proximity = Math.exp(-Math.pow(distanceKhz / Math.max(0.4, width), 2))
        const modeMatchBoost = source.mode === rxMode ? 1 : 0.72
        const weighted = source.strength * proximity * modeMatchBoost
        return {
          offsetKhz: source.freqKhz - rxFreqKhz,
          weightedStrength: weighted,
          rawStrength: source.strength,
        }
      })
      .filter(signal => Math.abs(signal.offsetKhz) <= spectrumSpanKhz / 2 && signal.weightedStrength > 0.12)
  }, [rxFreqKhz, rxMode, signalSources, spectrumSpanKhz])

  // Deterministic signal model from tuned frequency + control state.
  useEffect(() => {
    const modePenalty = rxMode === 'DIG' || rxMode === 'FT8' ? 0.6 : 0
    const attLoss = att === 'OFF' ? 0 : att === '10dB' ? 1.3 : 2.4
    const agcBias = agc === 'FAST' ? 0.15 : agc === 'MID' ? 0 : -0.15
    const strongest = visibleSignals.reduce((max, signal) => Math.max(max, signal.weightedStrength), 0)
    const target = Math.max(0.2, Math.min(9.8,
      strongest +
      rfGain / 21 -
      squelch / 30 -
      attLoss -
      modePenalty +
      agcBias +
      (nb ? 0.22 : 0) +
      (nr ? 0.32 : 0)
    ))

    setSignalTarget(target)
    setNoiseFloor(Math.max(2, 9 - rfGain / 13 + squelch / 35 + (att !== 'OFF' ? 0.8 : 0) + (nb ? -0.2 : 0) + (nr ? -0.3 : 0)))
  }, [agc, att, nb, nr, rfGain, rxMode, squelch, visibleSignals])

  // Animate meters based on deterministic targets.
  useEffect(() => {
    const id = setInterval(() => {
      if (effectiveTxMode) {
        const targetPower = Math.min(100, Math.max(6, micGain + (txModeName === 'FM' ? 8 : 0) + (tunerOn ? 4 : 0)))
        const targetTxSMeter = Math.max(1, Math.min(9.8, targetPower / 12))
        setPower(prev => prev + (targetPower - prev) * 0.4)
        setSMeter(prev => prev + (targetTxSMeter - prev) * 0.35)
      } else {
        setPower(prev => prev * 0.3)
        setSMeter(prev => prev + (signalTarget - prev) * 0.28)
      }
    }, 150)
    return () => clearInterval(id)
  }, [effectiveTxMode, micGain, signalTarget, tunerOn, txModeName])

  useEffect(() => {
    if (!voxEnabled) {
      setVoxLatchedTx(false)
      return
    }
    const shouldLatch = micGain >= 70 && afGain >= 35 && !scanActive
    setVoxLatchedTx(shouldLatch)
  }, [afGain, micGain, scanActive, voxEnabled])

  useEffect(() => {
    if (!scanActive || lockTuning || effectiveTxMode) return
    const id = setInterval(() => {
      const dir = scanDirection === 'up' ? 1 : -1
      const step = Math.max(1, tuningStep)
      setActiveFrequency(prev => {
        const next = prev + dir * step
        if (next > frequencyBounds.maxKhz) return frequencyBounds.minKhz
        if (next < frequencyBounds.minKhz) return frequencyBounds.maxKhz
        return next
      })
    }, 220)
    return () => clearInterval(id)
  }, [effectiveTxMode, frequencyBounds.maxKhz, frequencyBounds.minKhz, lockTuning, scanActive, scanDirection, tuningStep])

  const handleVfoTurn = (delta: number) => {
    if (fixedTuning || lockTuning) return
    setActiveFrequency(prev => prev + delta * tuningStep)
  }

  const tuneToFrequency = (khz: number, nextMode?: string) => {
    const clampedKhz = clampFrequency(khz)
    setActiveFrequency(() => clampedKhz)
    const matchedBand = getBandForFrequency(clampedKhz)
    if (matchedBand) {
      setBand(matchedBand)
      const allowedModes = getAllowedModes(country, license, matchedBand)
      if (nextMode && allowedModes.includes(nextMode)) {
        setActiveMode(nextMode)
      } else if (!allowedModes.includes(activeMode) && allowedModes[0]) {
        setActiveMode(allowedModes[0])
      }
    }
  }

  const selectBand = (b: string) => {
    setBand(b)
    if (!lockTuning) setActiveFrequency(() => BAND_FREQS[b])
    const allowedModes = getAllowedModes(country, license, b)
    const nextMode = allowedModes.includes(activeMode) ? activeMode : allowedModes[0]
    if (nextMode) setActiveMode(nextMode)
  }

  useEffect(() => {
    const matchedBand = getBandForFrequency(activeFreqKhz)
    if (matchedBand && matchedBand !== band) {
      setBand(matchedBand)
    }
  }, [activeFreqKhz, band])

  useEffect(() => {
    const allowedModes = getAllowedModes(country, license, band)
    if (allowedModes.length > 0 && !allowedModes.includes(activeMode)) {
      setActiveMode(allowedModes[0])
    }
  }, [activeMode, band, country, license, vfoA])

  const saveCurrentFrequency = (customLabel?: string) => {
    const nextLabel = customLabel?.trim() || `${band} ${activeMode}`
    setSavedFrequencies(prev => {
      const existing = prev.find(entry => entry.freqKhz === activeFreqKhz && entry.mode === activeMode)
      if (existing) {
        return prev.map(entry => entry.id === existing.id ? { ...entry, label: nextLabel } : entry)
      }
      return [{ id: Date.now(), label: nextLabel, freqKhz: activeFreqKhz, mode: activeMode }, ...prev].slice(0, 8)
    })
  }

  const recallFrequency = (entry: SavedFrequency) => {
    setActiveFrequency(() => entry.freqKhz)
    setActiveMode(entry.mode)
    setBand(getBandForFrequency(entry.freqKhz) || band)
  }

  const removeSavedFrequency = (id: number) => {
    setSavedFrequencies(prev => prev.filter(entry => entry.id !== id))
  }

  const allowedBands = getAllowedBands(country, license)
  const allowedModes = getAllowedModes(country, license, band)
  const frequencyAllowed = emergencyOverride || isFrequencyAllowed(country, license, activeFreqKhz)
  const functionKeys = [12.5, 25, 50, 100]

  const cycleSpan = () => {
    setSpectrumSpanKhz(prev => {
      const next = functionKeys[(functionKeys.indexOf(prev) + 1) % functionKeys.length]
      return next
    })
  }

  const recallPreset = (freq: number, presetMode: string) => {
    tuneToFrequency(freq, presetMode)
  }

  useEffect(() => {
    onTelemetryChange({
      txMode: effectiveTxMode,
      sMeter,
      power,
      mainFreqKhz: freqKhz,
      mode,
      subFreqKhz,
      subMode,
      activeVfo: vfoA ? 'A' : 'B',
      tuningStep,
      frequencyAllowed,
      meshOnlineCount,
      meshTotalCount: MESH_NODES.length,
    })
  }, [effectiveTxMode, freqKhz, frequencyAllowed, meshOnlineCount, mode, onTelemetryChange, power, sMeter, subFreqKhz, subMode, tuningStep, vfoA])

  const fmtFreq = (khz: number) => {
    const mhz = (khz / 1000).toFixed(3)
    const [whole, dec] = mhz.split('.')
    return { whole: whole.padStart(2, ' '), dec }
  }

  const main = fmtFreq(freqKhz)
  const sub = fmtFreq(subFreqKhz)

  const CtrlButton = ({ label, active, onClick, color = '#4ade80' }: {
    label: string; active?: boolean; onClick?: () => void; color?: string
  }) => (
    <button
      type="button"
      onPointerDown={event => {
        event.preventDefault()
        activateControl(label, onClick)
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activateControl(label, onClick)
        }
      }}
      className="font-display text-xs px-2 py-1.5 rounded transition-all"
      style={{
        background: active ? `${color}18` : '#0a1a0a',
        border: `1px solid ${active ? color : '#1a2e1a'}`,
        color: active ? color : '#2d6a2d',
        fontSize: 9, letterSpacing: '0.08em',
        boxShadow: active ? `0 0 6px ${color}30` : 'none',
        minWidth: 44,
      }}
    >
      {label}
    </button>
  )

  const FnButton = ({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) => (
    <button
      type="button"
      onPointerDown={event => {
        event.preventDefault()
        activateControl(label, onClick)
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activateControl(label, onClick)
        }
      }}
      className="font-display text-xs py-2 rounded-sm flex-1 transition-all"
      style={{
        background: active ? '#162016' : '#0a1208',
        border: `1px solid ${active ? '#4ade80' : '#1a2e1a'}`,
        color: active ? '#4ade80' : '#1f4a1f',
        fontSize: 9, letterSpacing: '0.06em',
        boxShadow: active ? '0 0 6px #4ade8020' : 'none',
      }}>
      {label}
    </button>
  )

  const Slider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.06em' }}>{label}</span>
      <input type="range" min="0" max="100" value={value} onChange={e => onChange(+e.target.value)}
        style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 70, width: 20, accentColor: '#4ade80', cursor: 'pointer' }} />
      <span className="font-mono" style={{ color: '#4a7a4a', fontSize: 9 }}>{value}</span>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#050905' }}>
      {/* Main display area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── TOP ROW: VFO + Meters ── */}
        <div className="flex gap-3">

          {/* Main Tuning Knob + Sliders + PTT */}
          <div style={{ background: '#040804', border: '1px solid #1a2e1a', borderRadius: 6, padding: '12px 16px' }}
            className="flex flex-col items-center gap-3 shrink-0">
            <div className="font-display text-xs" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>MAIN TUNING</div>
            <VFOKnob onChange={handleVfoTurn} />
            <div className="flex gap-1">
              {[1, 10, 100, 1000].map(step => (
                <button key={step}
                  onClick={() => setTuningStep(step)}
                  className="font-display text-xs px-2 py-0.5 rounded"
                  style={{
                    background: tuningStep === step ? '#162016' : '#0a1208',
                    border: `1px solid ${tuningStep === step ? '#4ade80' : '#1a2e1a'}`,
                    color: tuningStep === step ? '#4ade80' : '#2d6a2d',
                    boxShadow: tuningStep === step ? '0 0 6px #4ade8020' : 'none',
                    fontSize: 8,
                  }}>
                  {step < 1000 ? `${step}Hz` : '1kHz'}
                </button>
              ))}
            </div>

            {/* Sliders */}
            <div style={{ borderTop: '1px solid #1a2e1a', paddingTop: 10, width: '100%' }}
              className="flex justify-center gap-4 items-end">
              <Slider label="RF" value={rfGain} onChange={setRfGain} />
              <Slider label="AF" value={afGain} onChange={setAfGain} />
              <Slider label="MIC" value={micGain} onChange={setMicGain} />
              <Slider label="SQL" value={squelch} onChange={setSquelch} />
            </div>

            {/* PTT + Power */}
            <div style={{ borderTop: '1px solid #1a2e1a', paddingTop: 10, width: '100%' }}
              className="flex flex-col gap-2">
              <button
                onMouseDown={() => setTxMode(true)}
                onMouseUp={() => setTxMode(false)}
                onMouseLeave={() => setTxMode(false)}
                className="font-display rounded flex flex-col items-center justify-center gap-1 transition-all w-full py-3"
                style={{
                  background: effectiveTxMode ? '#ef444420' : '#0a1208',
                  border: `2px solid ${effectiveTxMode ? '#ef4444' : '#1a2e1a'}`,
                  color: effectiveTxMode ? '#ef4444' : '#2d6a2d',
                  boxShadow: effectiveTxMode ? '0 0 20px #ef444450, inset 0 0 10px #ef444410' : 'none',
                  letterSpacing: '0.1em', fontSize: 14, fontWeight: 700,
                  userSelect: 'none',
                }}>
                <span style={{ fontSize: 20 }}>📻</span>
                <span style={{ fontSize: 10 }}>{effectiveTxMode ? 'TX' : 'PTT'}</span>
              </button>
              <button className="font-display text-xs py-2 rounded w-full"
                style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#2d6a2d', fontSize: 9, letterSpacing: '0.08em' }}>
                POWER
              </button>
            </div>
          </div>

          {/* Band selector — vertical list */}
          <div style={{ background: '#040804', border: '1px solid #1a2e1a', borderRadius: 6, padding: '8px 6px' }}
            className="flex flex-col shrink-0">
            <div className="font-display text-xs mb-2 text-center" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>BAND</div>
            <div className="flex flex-col gap-1">
              {RADIO_BANDS.map(b => (
                <button key={b}
                  onClick={() => { if (emergencyOverride || allowedBands.includes(b)) selectBand(b) }}
                  disabled={!emergencyOverride && !allowedBands.includes(b)}
                  className="font-display text-xs px-2 py-1 rounded transition-all"
                  style={{
                    background: !emergencyOverride && !allowedBands.includes(b) ? '#081008' : band === b ? '#162016' : '#0a1208',
                    border: `1px solid ${band === b && (emergencyOverride || allowedBands.includes(b)) ? '#4ade80' : !emergencyOverride && !allowedBands.includes(b) ? '#1b1f1b' : '#1a2e1a'}`,
                    color: !emergencyOverride && !allowedBands.includes(b) ? '#374151' : band === b ? '#4ade80' : '#2d6a2d',
                    fontSize: 9, letterSpacing: '0.04em', textAlign: 'center',
                    boxShadow: band === b && (emergencyOverride || allowedBands.includes(b)) ? '0 0 6px #4ade8030' : 'none',
                    opacity: !emergencyOverride && !allowedBands.includes(b) ? 0.45 : 1,
                    cursor: !emergencyOverride && !allowedBands.includes(b) ? 'not-allowed' : 'pointer',
                  }}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* VFO Display */}
          <div style={{ background: '#020602', border: '1px solid #1a2e1a', borderRadius: 6, padding: '12px 16px', minWidth: 0, flex: '1 1 0' }}>
            {/* VFO A (Main) */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display text-xs px-1.5 py-0.5 rounded"
                    style={{ background: vfoA ? '#4ade8020' : '#0a1a0a', color: vfoA ? '#4ade80' : '#2d6a2d', fontSize: 9, border: `1px solid ${vfoA ? '#4ade80' : '#1a2e1a'}` }}>
                    VFO-A
                  </span>
                  <span className="font-display text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#ef444420', color: '#ef4444', fontSize: 9, border: '1px solid #ef444440', display: effectiveTxMode ? 'inline' : 'none' }}>
                    TX
                  </span>
                  <span className="font-display text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#22d3ee15', color: '#22d3ee', fontSize: 9, border: '1px solid #22d3ee30' }}>
                    {mode}
                  </span>
                  {split && <span className="font-display text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#fbbf2415', color: '#fbbf24', fontSize: 9, border: '1px solid #fbbf2440' }}>
                    SPLIT
                  </span>}
                </div>
                {/* Main frequency — big */}
                <div className="flex items-baseline gap-1">
                  <span className="font-display glow-green"
                    style={{ color: '#4ade80', fontSize: 52, letterSpacing: '-0.01em', lineHeight: 1, fontWeight: 700 }}>
                    {main.whole}
                  </span>
                  <span className="font-display glow-green"
                    style={{ color: '#4ade80', fontSize: 52, lineHeight: 1, fontWeight: 700 }}>
                    .
                  </span>
                  <span className="font-display"
                    style={{ color: '#22c55e', fontSize: 36, lineHeight: 1, fontWeight: 500 }}>
                    {main.dec}
                  </span>
                  <span className="font-display ml-1"
                    style={{ color: '#2d6a2d', fontSize: 16, lineHeight: 1 }}>
                    MHz
                  </span>
                </div>
              </div>

              {/* Center VFO controls */}
              <div className="flex flex-col items-center gap-2 pt-5">
                <button
                  type="button"
                  onPointerDown={event => {
                    event.preventDefault()
                    activateControl('VFO A/B', () => setVfoA(p => !p))
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      activateControl('VFO A/B', () => setVfoA(p => !p))
                    }
                  }}
                  className="font-display text-xs px-4 py-2 rounded transition-all"
                  style={{
                    background: '#0a1208',
                    border: '1px solid #1a2e1a',
                    color: '#2d6a2d',
                    letterSpacing: '0.08em',
                    minWidth: 92,
                  }}
                >
                  VFO A/B
                </button>
                <button
                  type="button"
                  onPointerDown={event => {
                    event.preventDefault()
                    activateControl(vfoA ? 'A→B' : 'B→A', () => {
                      if (vfoA) {
                        setSubFreqKhz(freqKhz)
                        setSubMode(mode)
                        return
                      }
                      setFreqKhz(subFreqKhz)
                      setMode(subMode)
                    })
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      activateControl(vfoA ? 'A→B' : 'B→A', () => {
                        if (vfoA) {
                          setSubFreqKhz(freqKhz)
                          setSubMode(mode)
                          return
                        }
                        setFreqKhz(subFreqKhz)
                        setMode(subMode)
                      })
                    }
                  }}
                  className="font-display text-xs px-4 py-2 rounded transition-all"
                  style={{
                    background: '#0a1208',
                    border: '1px solid #1a2e1a',
                    color: '#2d6a2d',
                    letterSpacing: '0.08em',
                    minWidth: 92,
                  }}
                >
                  {vfoA ? 'A→B' : 'B→A'}
                </button>
              </div>

              {/* Sub VFO */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <span className="font-display text-xs px-1.5 py-0.5 rounded"
                    style={{ background: !vfoA ? '#4ade8020' : '#0a1a0a', color: !vfoA ? '#4ade80' : '#2d6a2d', fontSize: 9, border: `1px solid ${!vfoA ? '#4ade80' : '#1a2e1a'}` }}>
                    VFO-B
                  </span>
                  <span className="font-display text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#0a1a0a', color: !vfoA ? '#22d3ee' : '#2d6a2d', fontSize: 9, border: '1px solid #1a2e1a' }}>
                    {subMode}
                  </span>
                </div>
                <div className="flex items-baseline gap-0.5 justify-end">
                  <span className="font-display" style={{ color: '#1f6a1f', fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em' }}>
                    {sub.whole}.{sub.dec}
                  </span>
                  <span className="font-display ml-1" style={{ color: '#1a3a1a', fontSize: 12 }}>MHz</span>
                </div>
              </div>
            </div>

            {/* Mode buttons */}
            <div className="flex flex-col gap-1">
              {[MODES.slice(0, 4), MODES.slice(4)].map((row, ri) => (
              <div key={ri} className="flex gap-1">
              {row.map(m => (
                <button key={m}
                  onClick={() => { if (emergencyOverride || allowedModes.includes(m)) setActiveMode(m) }}
                  disabled={!emergencyOverride && !allowedModes.includes(m)}
                  className="font-display text-xs px-2.5 py-1 rounded transition-all"
                  style={{
                    background: !emergencyOverride && !allowedModes.includes(m) ? '#081008' : activeMode === m ? '#162016' : '#0a1208',
                    border: `1px solid ${activeMode === m && (emergencyOverride || allowedModes.includes(m)) ? '#4ade80' : !emergencyOverride && !allowedModes.includes(m) ? '#1b1f1b' : '#1a2e1a'}`,
                    color: !emergencyOverride && !allowedModes.includes(m) ? '#374151' : activeMode === m ? '#4ade80' : '#2d6a2d',
                    fontSize: 10, letterSpacing: '0.06em',
                    boxShadow: activeMode === m && (emergencyOverride || allowedModes.includes(m)) ? '0 0 8px #4ade8030' : 'none',
                    opacity: !emergencyOverride && !allowedModes.includes(m) ? 0.45 : 1,
                    cursor: !emergencyOverride && !allowedModes.includes(m) ? 'not-allowed' : 'pointer',
                  }}>
                  {m}
                </button>
              ))}
              </div>
              ))}
            </div>

            {/* Signal Controls */}
            <div style={{ borderTop: '1px solid #1a2e1a', paddingTop: 10, marginTop: 4 }}>
              <div className="font-display text-xs mb-2" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>SIGNAL CONTROLS</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <CtrlButton label="NB" active={nb} onClick={() => setNb(p => !p)} />
                <CtrlButton label="NR" active={nr} onClick={() => setNr(p => !p)} />
                <CtrlButton label={`AGC:${agc}`} active onClick={() => setAgc(a => a === 'FAST' ? 'MID' : a === 'MID' ? 'SLOW' : 'FAST')} />
                <CtrlButton label={`ATT:${att}`} active={att !== 'OFF'} onClick={() => setAtt(a => a === 'OFF' ? '10dB' : a === '10dB' ? '20dB' : 'OFF')} color="#fbbf24" />
                <CtrlButton label="SPLIT" active={split} onClick={() => setSplit(p => !p)} color="#22d3ee" />
                <CtrlButton label="TUNER" active={tunerOn} onClick={() => setTunerOn(p => !p)} color="#fbbf24" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <CtrlButton label="LOCK" active={lockTuning} onClick={() => setLockTuning(p => !p)} color="#fbbf24" />
                <CtrlButton label="MEMO" onClick={() => {
                  const label = window.prompt('Label for memo frequency', `${band} ${activeMode}`)
                  if (label === null) return
                  saveCurrentFrequency(label)
                }} color="#22d3ee" />
                <CtrlButton label={scanDirection === 'up' ? 'SCAN↑' : 'SCAN↓'} active={scanActive} onClick={() => {
                  if (!scanActive) {
                    setScanDirection('up')
                    setScanActive(true)
                    return
                  }
                  if (scanDirection === 'up') {
                    setScanDirection('down')
                    return
                  }
                  setScanActive(false)
                }} color="#22d3ee" />
                <CtrlButton label="VOX" active={voxEnabled} onClick={() => setVoxEnabled(p => !p)} color="#fbbf24" />
              </div>
            </div>
            <div className="font-mono text-xs" style={{ color: '#1f4a1f', marginTop: 4 }}>
              Last control: {lastControlAction}
            </div>

            {/* Direct Frequency Entry */}
            <div style={{ borderTop: '1px solid #1a2e1a', paddingTop: 10, marginTop: 4 }}
              className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-xs" style={{ color: '#2d6a2d', fontSize: 9, letterSpacing: '0.1em' }}>DIRECT ENTRY (kHz)</span>
              <input
                type="number"
                className="px-2 py-1 rounded font-mono text-sm"
                style={{ background: '#020602', border: `1px solid ${frequencyAllowed ? '#1f3320' : '#ef4444'}`, color: frequencyAllowed ? '#4ade80' : '#fca5a5', width: 110 }}
                value={activeFreqKhz}
                onChange={e => setActiveFrequency(() => +e.target.value)}
                disabled={lockTuning}
              />
              <div className="flex gap-1 flex-wrap">
                {[[-100, '-100'], [-10, '-10'], [-1, '-1'], [1, '+1'], [10, '+10'], [100, '+100']].map(([delta, label]) => (
                  <button key={label}
                    onClick={() => setActiveFrequency(f => f + +delta)}
                    className="font-display text-xs px-2 py-1 rounded"
                    style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: lockTuning ? '#1f4a1f' : '#2d6a2d', fontSize: 9, opacity: lockTuning ? 0.5 : 1, cursor: lockTuning ? 'not-allowed' : 'pointer' }}
                    disabled={lockTuning}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs ml-auto" style={{ color: '#2d6a2d' }}>
                λ = {activeFreqKhz > 0 ? (300000 / activeFreqKhz).toFixed(2) : '—'} m
              </span>
            </div>
            <div className="font-mono text-xs" style={{ color: frequencyAllowed ? '#2d6a2d' : '#ef4444', marginTop: 4 }}>
              {frequencyAllowed ? `${scanActive ? `Scanning ${scanDirection === 'up' ? 'up' : 'down'} · ` : ''}${lockTuning ? 'Frequency lock active · ' : ''}Allowed on ${band} for ${license} / ${country}` : emergencyOverride ? 'Emergency override active' : `Not allowed for ${license} in ${country}`}
            </div>
          </div>

          {/* Right: meters + signal controls */}
          <div className="flex flex-col gap-2" style={{ minWidth: 200 }}>
            <SMeter level={sMeter} modeLabel={`${effectiveTxMode ? 'TX' : 'RX'} VFO-${effectiveTxMode ? txVfo : rxVfo}`} />
            <PowerMeter level={power} />

            <div style={{ background: '#040804', border: '1px solid #1a2e1a', borderRadius: 4, padding: '6px 8px' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-display text-xs" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>
                  SAVED FREQS
                </div>
                <button
                  onClick={saveCurrentFrequency}
                  className="font-display text-xs px-2 py-0.5 rounded"
                  style={{ background: '#0a1208', border: '1px solid #1a2e1a', color: '#4ade80', fontSize: 8, letterSpacing: '0.06em' }}>
                  SAVE CURRENT
                </button>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {savedFrequencies.map(entry => (
                  <div key={entry.id} className="flex items-center gap-2 rounded px-2 py-1"
                    style={{ background: '#0a1208', border: '1px solid #1a2e1a' }}>
                    <button
                      onClick={() => recallFrequency(entry)}
                      className="flex-1 text-left"
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
                      <div className="font-display" style={{ color: '#4ade80', fontSize: 8, letterSpacing: '0.08em' }}>
                        {entry.label}
                      </div>
                      <div className="font-mono" style={{ color: '#86efac', fontSize: 10 }}>
                        {entry.freqKhz.toLocaleString('en-US')} kHz · {entry.mode}
                      </div>
                    </button>
                    <button
                      onClick={() => removeSavedFrequency(entry.id)}
                      className="font-display text-xs px-1.5 py-0.5 rounded"
                      style={{ background: '#1a0808', border: '1px solid #4a1a1a', color: '#ef4444', fontSize: 8 }}>
                      ×
                    </button>
                  </div>
                ))}
                {savedFrequencies.length === 0 && (
                  <div className="font-mono text-xs" style={{ color: '#2d6a2d' }}>
                    No saved frequencies yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── SPECTRUM SCOPE + WATERFALL ── */}
            <SpectrumScope centerKhz={rxFreqKhz} txMode={txMode || voxLatchedTx} spanKhz={spectrumSpanKhz} hold={spectrumHold} markerOn={spectrumMarker} fixedTuning={fixedTuning || lockTuning} signals={visibleSignals.map(signal => ({ offsetKhz: signal.offsetKhz, strength: Math.min(9.5, signal.rawStrength) }))} noiseFloor={noiseFloor} rxVfo={rxVfo} />

        {/* ── FUNCTION KEY ROW ── */}
        <div style={{ background: '#040804', border: '1px solid #1a2e1a', borderRadius: 6, padding: '8px 12px' }}>
          <div className="font-display text-xs mb-2" style={{ color: '#2d6a2d', fontSize: 8, letterSpacing: '0.1em' }}>FUNCTION</div>
          <div className="flex gap-1.5">
            <FnButton label="SPAN" active onClick={cycleSpan} />
            <FnButton label="ATT" active={att !== 'OFF'} onClick={() => setAtt(a => a === 'OFF' ? '10dB' : a === '10dB' ? '20dB' : 'OFF')} />
            <FnButton label="MARKER" active={spectrumMarker} onClick={() => setSpectrumMarker(p => !p)} />
            <FnButton label="HOLD" active={spectrumHold} onClick={() => setSpectrumHold(p => !p)} />
            <FnButton label={fixedTuning ? 'FIXED' : 'CENT'} active={fixedTuning} onClick={() => setFixedTuning(p => !p)} />
            <FnButton label={vfoA ? 'MAIN' : 'SUB'} active onClick={() => setVfoA(p => !p)} />
            <FnButton label="SET" active onClick={saveCurrentFrequency} />
            <div style={{ width: 1, background: '#1a2e1a', margin: '0 4px' }} />
            <FnButton label="F-1" active onClick={() => recallPreset(14074, 'FT8')} />
            <FnButton label="F-2" active onClick={() => recallPreset(14300, 'USB')} />
            <FnButton label="F-3" active onClick={() => recallPreset(7250, 'LSB')} />
            <FnButton label="F-4" active onClick={() => recallPreset(3985, 'LSB')} />
            <FnButton label="F-5" active onClick={() => recallPreset(146520, 'FM')} />
            <FnButton label="F-6" active onClick={() => recallPreset(446000, 'FM')} />
            <FnButton label="F-7" active onClick={() => recallPreset(28500, 'USB')} />
          </div>
        </div>


      </div>
      {/* Floating Morse button */}
      {morseOpen && <MorsePopup onClose={() => setMorseOpen(false)} />}
      <button
        onClick={() => setMorseOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 60, right: 20, width: 52, height: 52,
          borderRadius: '50%', zIndex: 101,
          background: morseOpen ? '#162016' : '#0a0d0a',
          border: `2px solid ${morseOpen ? '#4ade80' : '#2d4d2d'}`,
          boxShadow: morseOpen ? '0 0 18px #4ade8050' : '0 4px 20px rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 20 }}>⚡</span>
        {morseCount > 0 && !morseOpen && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#4ade80', border: '2px solid #080c08',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Orbitron, monospace', fontSize: 9, color: '#040804', fontWeight: 700,
          }}>
            {morseCount}
          </div>
        )}
      </button>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: NavSection; label: string; icon: string }[] = [
  { id: 'radio', label: 'Radio', icon: '🎙' },
  { id: 'channels', label: 'BBS', icon: '📡' },
  { id: 'mail', label: 'Mail', icon: '✉' },
  { id: 'lora', label: 'LoRa', icon: '⬡' },
  { id: 'wiki', label: 'Wiki', icon: '◈' },
  { id: 'tools', label: 'Tools', icon: '⚙' },
]

export default function App() {
  const [section, setSection] = useStoredState<NavSection>('arsn.nav.section', 'radio')
  const [callsign, setCallsign] = useStoredState('arsn.operator.callsign', 'KD9LMX')
  const [country, setCountry] = useStoredState('arsn.radio.country', 'United States')
  const [license, setLicense] = useStoredState('arsn.radio.license', 'General')
  const [emergencyOverride, setEmergencyOverride] = useStoredState('arsn.radio.emergencyOverride', false)
  const [radioTelemetry, setRadioTelemetry] = useState<RadioTelemetry>({
    txMode: false,
    sMeter: 7,
    power: 0,
    mainFreqKhz: 14200,
    mode: 'USB',
    subFreqKhz: 7074,
    subMode: 'FT8',
    activeVfo: 'A',
    tuningStep: 100,
    frequencyAllowed: true,
    meshOnlineCount: MESH_NODES.filter(node => node.isOnline).length,
    meshTotalCount: MESH_NODES.length,
  })

  const meshHealthy = radioTelemetry.meshOnlineCount > 0
  const signalLabel = signalLabelFromSMeter(radioTelemetry.sMeter)
  const signalBars = signalBarsFromSMeter(radioTelemetry.sMeter)
  const activeTelemetryFreqKhz = radioTelemetry.activeVfo === 'A' ? radioTelemetry.mainFreqKhz : radioTelemetry.subFreqKhz
  const activeTelemetryMode = radioTelemetry.activeVfo === 'A' ? radioTelemetry.mode : radioTelemetry.subMode
  const activeFreqMhz = (activeTelemetryFreqKhz / 1000).toFixed(3)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#080c08', overflow: 'hidden' }}>
      {/* Global top header */}
      <div style={{ background: '#050905', borderBottom: '1px solid #1f3320', padding: '0 16px', height: 44 }}
        className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ background: '#162016', border: '1px solid #2d4d2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10 }}>📡</span>
            </div>
            <span className="font-display text-sm glow-green" style={{ color: '#4ade80', letterSpacing: '0.12em', fontSize: 13 }}>
              ARSN
            </span>
            <span className="font-mono text-xs" style={{ color: '#1f4a1f' }}>·</span>
            <span className="font-mono text-xs" style={{ color: '#2d6a2d' }}>Amateur Radio Survival Network</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: '#0d150d', border: '1px solid #1f3320' }}>
            <div className="status-dot" style={{ background: meshHealthy ? '#4ade80' : '#ef4444', boxShadow: meshHealthy ? '0 0 6px #4ade80' : '0 0 6px #ef4444' }} />
            <span className="font-mono text-xs" style={{ color: meshHealthy ? '#4ade80' : '#ef4444' }}>{meshHealthy ? `MESH ${radioTelemetry.meshOnlineCount}/${radioTelemetry.meshTotalCount}` : 'MESH DOWN'}</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: '#0d150d', border: '1px solid #1f3320' }}>
            <div className="status-dot" style={{ background: radioTelemetry.txMode ? '#1f3320' : '#22d3ee', boxShadow: !radioTelemetry.txMode ? '0 0 6px #22d3ee' : 'none' }} />
            <span className="font-mono text-xs" style={{ color: radioTelemetry.txMode ? '#2d6a2d' : '#22d3ee' }}>RX</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: '#0d150d', border: '1px solid #1f3320' }}>
            <div className="status-dot" style={{ background: radioTelemetry.txMode ? '#ef4444' : '#3a1a1a', boxShadow: radioTelemetry.txMode ? '0 0 8px #ef4444' : 'none' }} />
            <span className="font-mono text-xs" style={{ color: radioTelemetry.txMode ? '#ef4444' : '#6b2222' }}>TX</span>
          </div>
          <span className="font-mono text-xs" style={{ color: '#2d6a2d' }}>v2.4.1</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left nav rail */}
        <div style={{ width: 64, background: '#050905', borderRight: '1px solid #1f3320' }}
          className="flex flex-col items-center py-3 gap-1 shrink-0">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item w-12 h-12 rounded flex flex-col items-center justify-center gap-0.5 ${section === item.id ? 'active' : ''}`}
              style={{
                background: section === item.id ? '#162016' : 'transparent',
                borderLeft: section === item.id ? '2px solid #4ade80' : '2px solid transparent',
                borderRadius: 6,
              }}
              onClick={() => setSection(item.id)}
              title={item.label}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span className="font-display" style={{ fontSize: 7, letterSpacing: '0.06em', color: section === item.id ? '#4ade80' : '#2d6a2d' }}>
                {item.label.toUpperCase()}
              </span>
            </button>
          ))}

          <div className="flex-1" />

          {/* Net status */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <SignalBars strength={signalBars} />
            <span className="font-display" style={{ fontSize: 7, color: '#2d6a2d', letterSpacing: '0.06em' }}>{signalLabel}</span>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar
            section={section}
            callsign={callsign}
            onCallsignChange={setCallsign}
            country={country}
            onCountryChange={setCountry}
            license={license}
            onLicenseChange={setLicense}
            emergencyOverride={emergencyOverride}
            onEmergencyOverrideChange={setEmergencyOverride}
            signalLevel={radioTelemetry.sMeter}
            netStatus={radioTelemetry.frequencyAllowed && meshHealthy}
          />
          <div className="flex flex-1 overflow-hidden" style={{ background: '#080c08' }}>
            {section === 'radio' && <RadioSection country={country} license={license} emergencyOverride={emergencyOverride} onTelemetryChange={setRadioTelemetry} />}
            {section === 'channels' && <ChannelsSection />}
            {section === 'mail' && <MailSection />}
            {section === 'lora' && <LoRaSection />}
            {section === 'wiki' && <WikiSection />}
            {section === 'tools' && <ToolsSection />}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ background: '#050905', borderTop: '1px solid #1f3320', height: 24, padding: '0 16px' }}
        className="flex items-center gap-4 shrink-0">
        <span className="font-mono text-xs" style={{ color: '#2d6a2d', fontSize: 10 }}>
          {callsign} · Grid DM79 · {activeFreqMhz} MHz {activeTelemetryMode} · {Math.round(radioTelemetry.power)}W · VFO-{radioTelemetry.activeVfo} · STEP {radioTelemetry.tuningStep}Hz
        </span>
        <span style={{ color: '#1f3320' }}>|</span>
        <span className="font-mono text-xs" style={{ color: '#1f4a1f', fontSize: 10 }}>
          Zero-internet mesh · LoRa + AX.25 + HF Winlink
        </span>
        <span className="ml-auto font-mono text-xs cursor-blink" style={{ color: '#4ade80', fontSize: 10 }}>
          READY
        </span>
      </div>
    </div>
  )
}

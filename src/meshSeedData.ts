export interface MeshNode {
  id: string
  shortName: string
  longName: string
  rssi: number
  snr: number
  hops: number
  battery: number
  voltage: number
  lat: number
  lng: number
  alt: number
  lastHeard: string
  uptime: string
  isMqttGateway: boolean
  isOnline: boolean
}

export interface MeshMessage {
  id: number
  from: string
  fromShort: string
  to: string
  channel: number
  type: 'TEXT' | 'POSITION' | 'NODEINFO' | 'TELEMETRY' | 'ROUTING'
  text?: string
  time: string
  ack: boolean
  hops: number
}

export interface MeshChannel {
  index: number
  name: string
  role: 'PRIMARY' | 'SECONDARY' | 'DISABLED'
  psk: string
  uplinkEnabled: boolean
  downlinkEnabled: boolean
}

export const MESH_NODES: MeshNode[] = [
  { id: '!a1b2c3d4', shortName: 'ARSN', longName: 'KD9LMX ARSN Node', rssi: 0, snr: 0, hops: 0, battery: 87, voltage: 3.84, lat: 38.75, lng: -104.59, alt: 1609, lastHeard: 'now', uptime: '4d 12h', isMqttGateway: false, isOnline: true },
  { id: '!b2c3d4e5', shortName: 'RLY1', longName: 'ARSN Relay Node 1', rssi: -71, snr: 11.4, hops: 1, battery: 95, voltage: 3.96, lat: 38.80, lng: -104.50, alt: 1820, lastHeard: '1m ago', uptime: '7d 2h', isMqttGateway: true, isOnline: true },
  { id: '!c3d4e5f6', shortName: 'W7AK', longName: 'W7ARK Field Node', rssi: -87, snr: 8.2, hops: 1, battery: 62, voltage: 3.71, lat: 38.68, lng: -104.70, alt: 1550, lastHeard: '3m ago', uptime: '1d 8h', isMqttGateway: false, isOnline: true },
  { id: '!d4e5f6a7', shortName: 'WB4T', longName: 'WB4TXX Mobile', rssi: -103, snr: 3.1, hops: 2, battery: 41, voltage: 3.62, lat: 38.55, lng: -104.45, alt: 1488, lastHeard: '7m ago', uptime: '6h 14m', isMqttGateway: false, isOnline: true },
  { id: '!e5f6a7b8', shortName: 'N0GD', longName: 'N0GRD WX Station', rssi: -94, snr: 5.7, hops: 2, battery: 78, voltage: 3.80, lat: 38.90, lng: -104.30, alt: 1720, lastHeard: '12m ago', uptime: '21d 5h', isMqttGateway: false, isOnline: true },
  { id: '!f6a7b8c9', shortName: 'KG4Z', longName: 'KG4ZPQ Portable', rssi: -118, snr: -2.4, hops: 4, battery: 18, voltage: 3.51, lat: 38.40, lng: -104.85, alt: 1380, lastHeard: '28m ago', uptime: '2h 5m', isMqttGateway: false, isOnline: true },
  { id: '!a7b8c9d0', shortName: 'KE0A', longName: 'KE0ARS Base', rssi: -79, snr: 9.8, hops: 1, battery: 100, voltage: 0, lat: 38.72, lng: -104.20, alt: 1600, lastHeard: '1h ago', uptime: '12d 0h', isMqttGateway: false, isOnline: false },
]

export const MESH_MESSAGES: MeshMessage[] = [
  { id: 1, from: '!c3d4e5f6', fromShort: 'W7AK', to: '^all', channel: 0, type: 'TEXT', text: 'Good morning all. Node up on solar, bands look open to the east.', time: '09:15', ack: true, hops: 1 },
  { id: 2, from: '!b2c3d4e5', fromShort: 'RLY1', to: '^all', channel: 0, type: 'NODEINFO', time: '09:14', ack: true, hops: 0 },
  { id: 3, from: '!d4e5f6a7', fromShort: 'WB4T', to: '^all', channel: 0, type: 'TEXT', text: 'Need supply run to grid DM78. ETA approx 2 hours. Will check in on arrival.', time: '09:12', ack: true, hops: 2 },
  { id: 4, from: '!e5f6a7b8', fromShort: 'N0GD', to: '^all', channel: 0, type: 'TELEMETRY', time: '09:10', ack: true, hops: 2 },
  { id: 5, from: '!b2c3d4e5', fromShort: 'RLY1', to: '^all', channel: 0, type: 'POSITION', time: '09:08', ack: true, hops: 0 },
  { id: 6, from: '!f6a7b8c9', fromShort: 'KG4Z', to: '^all', channel: 0, type: 'TEXT', text: 'Moving to new grid EM85 tomorrow. Will have limited comms for ~3h transit.', time: '09:05', ack: false, hops: 4 },
  { id: 7, from: '!a1b2c3d4', fromShort: 'ARSN', to: '^all', channel: 0, type: 'TEXT', text: 'Relay 1 beacon confirmed. Uptime 7d.', time: '09:00', ack: true, hops: 0 },
  { id: 8, from: '!c3d4e5f6', fromShort: 'W7AK', to: '!a1b2c3d4', channel: 1, type: 'TEXT', text: 'ARSN: check the relay antenna coax. Seeing some intermittent dropouts.', time: '08:55', ack: true, hops: 1 },
  { id: 9, from: '!a1b2c3d4', fromShort: 'ARSN', to: '!c3d4e5f6', channel: 1, type: 'TEXT', text: 'Copy. Will inspect at 1200 local.', time: '08:57', ack: true, hops: 0 },
]

export const MESH_CHANNELS_INIT: MeshChannel[] = [
  { index: 0, name: 'LongFast', role: 'PRIMARY', psk: 'AQ==', uplinkEnabled: false, downlinkEnabled: false },
  { index: 1, name: 'ARSN-OPS', role: 'SECONDARY', psk: 'base64keyABC=', uplinkEnabled: true, downlinkEnabled: true },
  { index: 2, name: 'ARSN-EMRG', role: 'SECONDARY', psk: 'base64keyXYZ=', uplinkEnabled: false, downlinkEnabled: false },
  { index: 3, name: '', role: 'DISABLED', psk: '', uplinkEnabled: false, downlinkEnabled: false },
  { index: 4, name: '', role: 'DISABLED', psk: '', uplinkEnabled: false, downlinkEnabled: false },
  { index: 5, name: '', role: 'DISABLED', psk: '', uplinkEnabled: false, downlinkEnabled: false },
  { index: 6, name: '', role: 'DISABLED', psk: '', uplinkEnabled: false, downlinkEnabled: false },
  { index: 7, name: '', role: 'DISABLED', psk: '', uplinkEnabled: false, downlinkEnabled: false },
]

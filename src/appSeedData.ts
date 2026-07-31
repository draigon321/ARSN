export interface Message {
  id: number
  callsign: string
  text: string
  time: string
  type?: 'system' | 'alert' | 'normal'
}

export interface MailMessage {
  id: number
  from: string
  to: string
  subject: string
  body: string
  time: string
  read: boolean
  forwarded?: boolean
}

export interface WikiArticle {
  id: number
  title: string
  category: string
  summary: string
  tags: string[]
  content: string
}

export const CHANNEL_MESSAGES: Record<string, Message[]> = {
  general: [
    { id: 1, callsign: 'W7ARK', text: 'Good morning all. Solar flux at 142 today, bands look good for DX.', time: '08:14', type: 'normal' },
    { id: 2, callsign: 'KD9LMX', text: 'Copy that. Already worked JA3PFM on 20m SSB.', time: '08:17', type: 'normal' },
    { id: 3, callsign: 'N0GRD', text: '[SYSTEM] Node ARSN-RELAY-01 came online. Mesh connectivity restored.', time: '08:22', type: 'system' },
    { id: 4, callsign: 'WB4TXX', text: 'Morning check-in. W4 area, QTH near Asheville. Portable ops today.', time: '08:30', type: 'normal' },
    { id: 5, callsign: 'K5LNT', text: 'Any traffic for the Rocky Mountain net? Starting 0900 local.', time: '08:44', type: 'normal' },
    { id: 6, callsign: 'W7ARK', text: 'Negative K5LNT, nothing for Rocky Mtn. 73.', time: '08:45', type: 'normal' },
    { id: 7, callsign: 'KG4ZPQ', text: 'Reminder: ARES county drill this Saturday 0800-1200. All hams encouraged to participate.', time: '09:01', type: 'normal' },
    { id: 8, callsign: 'N0GRD', text: '[ALERT] Propagation alert: CME impact expected 72h from now. Prepare HF backup comms.', time: '09:15', type: 'alert' },
  ],
  emergency: [
    { id: 1, callsign: 'KE0ARS', text: '[PRIORITY] Search and rescue operation active. Grid DM79. Requesting all available operators.', time: '07:30', type: 'alert' },
    { id: 2, callsign: 'W0EOC', text: 'EOC activated. ICS Form 213 submitted. Staging at Highway 36 & County Rd 11.', time: '07:33', type: 'normal' },
    { id: 3, callsign: 'KG5WXY', text: 'En route to staging. ETA 20 min. Bringing portable repeater.', time: '07:40', type: 'normal' },
    { id: 4, callsign: 'N0GRD', text: '[SYSTEM] Emergency net activated on 146.520 simplex. All traffic priority.', time: '07:41', type: 'system' },
  ],
  'wx-reports': [
    { id: 1, callsign: 'KD0WX', text: 'WX REPORT: DM78 - Temp 62F, Wind NW 12mph, Pressure 29.92 falling. Possible front 24h.', time: '06:00', type: 'normal' },
    { id: 2, callsign: 'W5WXR', text: 'WX REPORT: EM10 - Temp 74F, Wind S 8mph, Humidity 88%. Dew point 71. Convection likely this PM.', time: '06:15', type: 'normal' },
    { id: 3, callsign: 'KA0CLD', text: 'SKYWARN activation for SW counties. Trained spotters please report.', time: '07:45', type: 'alert' },
  ],
  'dx-cluster': [
    { id: 1, callsign: 'DX-BOT', text: 'SPOT: JT65 14076.0 VK3IO 0802Z 23dB clear signal into W7 land', time: '08:02', type: 'system' },
    { id: 2, callsign: 'DX-BOT', text: 'SPOT: FT8 7074.0 ZL2IFB 0811Z 15dB solid into central US', time: '08:11', type: 'system' },
    { id: 3, callsign: 'W1DX', text: 'ZL2IFB confirmed, 59+ on 40m. Good propagation over Pacific.', time: '08:13', type: 'normal' },
  ],
  'net-control': [
    { id: 1, callsign: 'W0NCS', text: 'Net Control W0NCS. This is the ARSN daily check-in net. QNI?', time: '07:00', type: 'normal' },
    { id: 2, callsign: 'KD9LMX', text: 'KD9LMX checking in. Grid EN61. No traffic.', time: '07:01', type: 'normal' },
    { id: 3, callsign: 'WB4TXX', text: 'WB4TXX checking in. Grid EM85. One item for the net.', time: '07:02', type: 'normal' },
    { id: 4, callsign: 'W0NCS', text: 'WB4TXX go ahead with your traffic.', time: '07:03', type: 'normal' },
    { id: 5, callsign: 'WB4TXX', text: 'RADIOGRAM: NR 47 HXG W4 WB4TXX 5 ASHEVILLE NC 1420 — FAMILY SAFE STAYING WITH UNCLE STOP POWER RESTORED STOP WILL TRAVEL THURSDAY STOP', time: '07:04', type: 'normal' },
  ],
  'packet-node': [
    { id: 1, callsign: 'NODE-01', text: '[AX.25] Beacon: ARSN-1>APRS:!3845.22N/10459.34W#PHG7360/ARSN Relay Node 01', time: '08:00', type: 'system' },
    { id: 2, callsign: 'KG4ZPQ-9', text: '[AX.25] Position report: KG4ZPQ-9>APRS via ARSN-1: mobile heading NE @45mph', time: '08:12', type: 'normal' },
    { id: 3, callsign: 'NODE-01', text: '[AX.25] HEARD: WB4TXX-7 WB4TXX-5 KG4ZPQ-9 W7ARK-1', time: '08:15', type: 'system' },
  ],
  'ares-ops': [
    { id: 1, callsign: 'W0ARES', text: 'ARES Section Manager: Monthly report submitted to ARRL. 47 activations YTD.', time: '08:00', type: 'normal' },
    { id: 2, callsign: 'KE0ARS', text: 'County EC: Training exercise debrief notes uploaded to wiki. Check /wiki/ares-drill-2024.', time: '08:30', type: 'normal' },
  ],
}

export const MAIL_MESSAGES: MailMessage[] = [
  { id: 1, from: 'WB4TXX', to: 'KD9LMX', subject: 'RE: Field Day antenna setup', body: 'I have the G5RV up at 35 feet, fed with 450-ohm ladder line. Working great on 40/20/15. Let me know if you need the dimensions for the supports. 73 de WB4TXX', time: '2024-01-15 09:42', read: false, forwarded: false },
  { id: 2, from: 'W0EOC', to: 'KD9LMX', subject: 'ARES Drill Debrief - Action Items', body: 'Following our Saturday drill, here are the action items:\n\n1. Update repeater backup power (K5LNT)\n2. Test NVIS capability on 80m (all ops)\n3. Review ICS-213 procedures\n4. Verify Winlink nodes for message forwarding\n\nNext drill: Feb 10. Please confirm availability.', time: '2024-01-14 16:20', read: false, forwarded: true },
  { id: 3, from: 'DX-BOT', to: 'KD9LMX', subject: 'DX Alert: VK0EK now QRV', body: 'Heard Island DXpedition VK0EK is now QRV on 20m FT8. Frequency 14.074 MHz. Signal reports from W6 area: -12 to -8 dB. Good luck!', time: '2024-01-14 11:05', read: true, forwarded: false },
  { id: 4, from: 'N0GRD', to: 'KD9LMX', subject: 'Node upgrade completed', body: 'ARSN-RELAY-01 has been upgraded to firmware v2.4.1. New features: improved mesh routing, AX.25 compression, and APRS digipeater mode. No action required on your end.', time: '2024-01-13 08:00', read: true, forwarded: false },
  { id: 5, from: 'KG5WXY', to: 'KD9LMX', subject: 'Antenna question', body: 'Hey, what feedline are you running on your 40m dipole? I"m getting some noise on receive and wondering if coax quality is the issue. Also, have you tried the noise canceling on the IC-7300? Thanks.', time: '2024-01-12 14:33', read: true, forwarded: false },
]

export const WIKI_ARTICLES: WikiArticle[] = [
  {
    id: 1, title: 'NVIS Antenna Theory & Setup', category: 'Antennas',
    summary: 'Near Vertical Incidence Skywave propagation for regional HF communications without relying on distant repeaters.',
    tags: ['HF', 'NVIS', 'emergency', 'antenna'],
    content: 'NVIS uses HF radio waves directed nearly straight up to bounce off the ionosphere and return within 0-600km radius...'
  },
  {
    id: 2, title: 'Winlink Email Over Radio', category: 'Digital Modes',
    summary: 'Store-and-forward email system for amateur radio operators. Works on HF, VHF, and UHF without internet.',
    tags: ['Winlink', 'digital', 'HF', 'email'],
    content: 'Winlink Global Radio Email provides store-and-forward message capability using amateur radio...'
  },
  {
    id: 3, title: 'ICS Forms for Amateur Radio', category: 'Emergency Comms',
    summary: 'Incident Command System forms used during activations. ICS-213, ICS-214, and radiogram formats.',
    tags: ['ARES', 'ICS', 'emergency', 'forms'],
    content: 'The Incident Command System provides standardized forms for emergency communications...'
  },
  {
    id: 4, title: 'LoRa Mesh Networking Basics', category: 'Digital Modes',
    summary: 'Long-range, low-power radio technology for off-grid mesh networks. 915 MHz band, Meshtastic protocol.',
    tags: ['LoRa', 'Meshtastic', 'mesh', 'digital'],
    content: 'LoRa (Long Range) modulation provides exceptional range with minimal power consumption...'
  },
  {
    id: 5, title: 'Go-Kit Build Guide', category: 'Field Operations',
    summary: 'Essential equipment list and packing guide for a portable emergency amateur radio station.',
    tags: ['go-kit', 'portable', 'emergency', 'equipment'],
    content: 'A well-prepared go-kit allows rapid deployment for emergency communications...'
  },
  {
    id: 6, title: 'HF Propagation Fundamentals', category: 'Propagation',
    summary: 'Solar cycles, ionospheric layers, band characteristics, and prediction tools for HF operators.',
    tags: ['HF', 'propagation', 'solar', 'ionosphere'],
    content: 'HF radio propagation depends on ionospheric conditions driven by solar activity...'
  },
  {
    id: 7, title: 'APRS — Tracking & Messaging', category: 'Digital Modes',
    summary: 'Automatic Packet Reporting System for real-time tactical tracking, weather reporting, and short messaging.',
    tags: ['APRS', 'AX.25', 'tracking', 'digital'],
    content: 'APRS provides real-time tactical digital communications using AX.25 packet protocol...'
  },
  {
    id: 8, title: 'Battery & Power Systems', category: 'Field Operations',
    summary: 'LiFePO4, lead-acid, solar charging, and power budgeting for off-grid radio operations.',
    tags: ['power', 'battery', 'solar', 'portable'],
    content: 'Off-grid radio operations require careful power system design and management...'
  },
  {
    id: 9, title: 'FT8 / FT4 Digital Mode Guide', category: 'Digital Modes',
    summary: 'WSJT-X weak signal modes for DX and contesting under poor propagation conditions.',
    tags: ['FT8', 'FT4', 'WSJT-X', 'digital', 'DX'],
    content: 'FT8 is a weak-signal digital mode designed for HF propagation under challenging conditions...'
  },
  {
    id: 10, title: 'Repeater Operation & Etiquette', category: 'VHF/UHF',
    summary: 'Using repeaters correctly, CTCSS tones, linking systems, and linked network operation.',
    tags: ['repeater', 'VHF', 'UHF', 'FM'],
    content: 'Repeaters extend the range of VHF/UHF FM communications by receiving and retransmitting...'
  },
]

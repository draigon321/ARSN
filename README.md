# ARSN

ARSN, the Amateur Radio Survival Network, is a React + Vite prototype for an offline-first amateur radio operations console.

The app is designed around a survival and emergency-communications workflow with:

- A transceiver-style radio control surface
- Discord-style internal channels for bulletin-board traffic
- Store-and-forward mail workflows
- LoRa / Meshtastic network management
- An offline wiki library for field references
- Common HAM radio tools such as band plans, phonetics, Q-codes, frequency helpers, and Maidenhead lookup

## Current Status

This workspace now has working local state persistence for the main user-facing surfaces, so the app resumes where the operator left off after a reload.

Implemented so far:

- Persistent top-level section selection and operator callsign
- Persistent transceiver connection choice, tuning state, and receiver controls
- Persistent saved-frequency quick list in the radio panel
- Persistent country/license radio restrictions with emergency override
- Band, mode, and frequency availability is driven from `src/radioRestrictions.ts`
- Frequency entry and tuning now validate against the same local rule file
- Persistent mail inbox, compose draft, and message actions
- Reply, forward, and delete actions in mail
- Persistent wiki search and selection state
- Persistent HAM tools tab and calculator inputs
- Persistent BBS board, channel, and frequency-pair state
- Persistent LoRa mesh settings and operator identity fields
- Extracted local seed collections for channels, mail, and wiki content into `src/appSeedData.ts`
- Extracted local mesh seed collections into `src/meshSeedData.ts`
- Radio cockpit indicators now reflect live values (RX/TX, S-meter, RF power, mesh health, and status bar frequency/mode/power)
- Active tuning step (1Hz/10Hz/100Hz/1kHz) and active VFO now drive knob tuning and mode/frequency entry behavior

## Run Locally

```bash
npm install
npm run dev
```

The Vite dev server is configured to listen on `0.0.0.0`.

## Build

```bash
npm run build
```

## Project Structure

- `src/App.tsx` - Main application shell and all current feature sections
- `src/appSeedData.ts` - Local seed content for channels, mail, and wiki views
- `src/meshSeedData.ts` - Local seed content for LoRa / Meshtastic views
- `src/index.css` - Global styling and theme tokens
- `src/main.tsx` - React bootstrap entrypoint
- `package.json` - Scripts and dependencies
- `vite.config.ts` - Vite configuration

## Next Steps

Planned work should focus on replacing the remaining mock data with real storage and I/O:

- Radio control bridge for CAT / CI-V / Hamlib / SDR integration
- Durable message store for BBS, mail, and LoRa traffic
- Import/export or sync layer for offline wiki content
- Device and node discovery for actual radio and mesh hardware
- Auth, operator profiles, and node-level configuration persistence

Radio access rules are stored in `src/radioRestrictionsData.json` and read through `src/radioRestrictions.ts` so band policy can be updated without changing the main cockpit component.

## Notes

This is currently a front-end prototype. It does not yet connect to real radio hardware, mesh networks, or external services.

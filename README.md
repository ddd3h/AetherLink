# Ground Station GUI (UI-only)

This is a modern React 18 + Vite + TypeScript UI for a ground station. All IO is mocked; the UI streams dummy telemetry at 1 Hz and supports map, charts, status, settings, and replay.

## Quick Start

- Node 18+
- Install deps: `npm i`
- Run dev server (browser only mock): `npm run dev` and open http://localhost:5173
- Test: `npm test`

## Tauri (Rust Core)

This repo includes a Tauri core under `src-tauri/` that handles serial autodetect, CSV parsing, telemetry streaming, logging, and replay.

### Dev run

```bash
# install deps
npm install
# initialize Tauri if needed (skip if done)
# npm create tauri-app@latest .
# run app with core
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

The UI uses `@tauri-apps/api` to invoke core commands. When running in browser `npm run dev`, the UI falls back to local mocks.

## Tech Stack

React 18, Vite, TypeScript, Tailwind CSS, shadcn-style UI (local components), Zustand (UI state), TanStack Query (future API), ECharts, MapLibre GL, React Router, react-i18next, lucide-react. ESLint + Prettier configured.

## Structure

- `src/pages/` — `Dashboard`, `Settings`, `Replay`, `About`
- `src/components/` — `MapView`, `ChartsPanel`, `StatusCards`, `SerialSelector`, `CsvMapper`, `TopBar`, `SideNav`, and `ui/*` primitives
- `src/lib/` — `api.ts` (mock boundary), `mockStream.ts` (1 Hz generator)
- `src/store.ts` — Zustand store with persist
- `src/i18n.ts`, `src/locales/` — i18n init and translations

## Screenshots

- Dashboard: Map with track + status cards + charts
- Settings: Serial, CSV mapping DnD, display, storage
- Replay: Logs list + timeline + playback

## Notes

- Map style is offline placeholder, center [139.76, 35.68], zoom 9.
- Charts show pressure/temperature/altitude. No animation.
- API boundary is mock; replace with Tauri invoke in `src/lib/api.ts` later.

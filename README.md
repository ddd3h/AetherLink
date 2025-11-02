<h1 align="center">🛰️ AetherLink</h1>
<p align="center">
  <em>Modern Ground Station GUI — built for open, extensible telemetry visualization.</em><br/>
  <strong>Vite + React + TypeScript + Tailwind + shadcn/ui + Tauri</strong>
</p>

<p align="center">
  <a href="https://vitejs.dev" target="_blank"><img src="https://img.shields.io/badge/Vite-646CFF.svg?logo=vite&logoColor=white" alt="Vite"/></a>
  <a href="https://react.dev" target="_blank"><img src="https://img.shields.io/badge/React-149ECA.svg?logo=react&logoColor=white" alt="React"/></a>
  <a href="https://tauri.app" target="_blank"><img src="https://img.shields.io/badge/Tauri-FFC131.svg?logo=tauri&logoColor=white" alt="Tauri"/></a>
  <a href="https://typescriptlang.org" target="_blank"><img src="https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript"/></a>
  <a href="https://tailwindcss.com" target="_blank"><img src="https://img.shields.io/badge/Tailwind_CSS-38BDF8.svg?logo=tailwindcss&logoColor=white" alt="TailwindCSS"/></a>
</p>

---

## 🚀 Overview

**AetherLink** is a next-generation **Ground Station GUI** designed for space telemetry visualization — fast, elegant, and open to all.

Built with modern web technologies and **Tauri** for desktop deployment, it enables real-time telemetry monitoring, map-based visualization, and flexible data mapping.  
Even with mock data, it delivers a complete, interactive dashboard ready for real-world integration.

> ✨ *“From Spaceball to Station — visualize the unseen.”*

---

## 🧩 Features

- 🌍 **Dynamic Map Display (MapLibre GL JS)**  
  Offline-friendly tiles with current position and trajectory overlays.

- 📊 **Real-time Style Graphs (ECharts)**  
  Pressure, temperature, altitude — simulated live updates with beautiful charts.

- ⚙️ **Settings Panel**  
  Serial auto-detection UI, CSV mapping editor, and persistent configurations.

- 🧠 **Reactive Architecture**
  - Zustand → UI state  
  - TanStack Query → async data (mocked for now)  
  - React Router → modular navigation  
  - react-i18next → English & Japanese

- 💾 **Logging & Replay System**
  Mocked UI for recording and replaying telemetry timelines (CSV-based).

- 🌗 **Dark/Light Mode + Responsive + A11y**
  Fully accessible design with shadcn/ui components and Tailwind theming.

---

## 🛠️ Tech Stack

| Category | Technology |
|-----------|-------------|
| Language | **TypeScript** |
| Framework | **React 18 + Vite** |
| Styling | **Tailwind CSS + shadcn/ui** |
| State Management | **Zustand**, **TanStack Query** |
| Charts | **ECharts (echarts-for-react)** |
| Maps | **MapLibre GL JS** |
| Routing | **React Router** |
| i18n | **react-i18next (ja/en)** |
| Desktop | **Tauri (mocked)** |
| Tooling | **ESLint**, **Prettier** |

---

## 🧱 Architecture Overview

```

src/
├─ components/     # UI building blocks (cards, charts, map, panels)
├─ pages/          # Routes (Dashboard, Settings, Replay)
├─ stores/         # Zustand states
├─ hooks/          # Custom hooks
├─ types.ts        # Type definitions for telemetry, mapping, and UI
├─ mocks/          # Dummy data and mock APIs
└─ App.tsx         # Router & Layout

````

---

## 🌐 Internationalization

Supports **English** 🇬🇧 and **Japanese** 🇯🇵 via `react-i18next`.  
Language toggle is available in the UI header.

---

## 🧭 Roadmap

| Phase | Description | Status |
|-------|--------------|--------|
| ✅ UI Prototype | Static mock UI with map, charts, settings | Done |
| 🧩 Mapping System | CSV key-type-unit-display linking | Done |
| 🛰️ Tauri Integration | UART + Log control bridge | Pending |
| 📦 Offline Tiles | BBOX download progress + file I/O | Planned |
| ⏯️ Replay Improvements | Pause / Resume, scrub timeline | Planned |

---

## 👩‍💻 Contributing

Contributions are welcome!  
If you’re passionate about space, telemetry, or beautiful UI — jump in 🚀

1. Fork the repository
2. Run locally:
   ```bash
   pnpm install
   pnpm dev
````

3. Open a PR with clear description and screenshots.

---

## 💖 Sponsors

<p align="center">
  <a href="https://github.com/sponsors/yourname"><img src="https://img.shields.io/badge/Sponsor-AetherLink-pink?logo=heart" alt="Sponsor"/></a>
</p>

<p align="center">
  <img src="https://avatars.githubusercontent.com/u/00000000?v=4" width="60" height="60" style="border-radius:50%; margin: 0 10px;" alt="Sponsor 1"/>
  <img src="https://avatars.githubusercontent.com/u/11111111?v=4" width="60" height="60" style="border-radius:50%; margin: 0 10px;" alt="Sponsor 2"/>
  <img src="https://avatars.githubusercontent.com/u/22222222?v=4" width="60" height="60" style="border-radius:50%; margin: 0 10px;" alt="Sponsor 3"/>
</p>

---

## 👥 Contributors

<p align="center">
  <a href="https://github.com/yourname"><img src="https://avatars.githubusercontent.com/u/yourid?v=4" width="60" height="60" style="border-radius:50%; margin: 0 10px;" alt="you"/></a>
  <a href="https://github.com/otherdev"><img src="https://avatars.githubusercontent.com/u/otherid?v=4" width="60" height="60" style="border-radius:50%; margin: 0 10px;" alt="otherdev"/></a>
</p>

---

## 📜 License

MIT © 2025 [Your Name](https://github.com/yourname)

---

## 🌌 Vision

> “AetherLink bridges the gap between data and discovery — empowering anyone to explore, visualize, and understand signals from beyond.”

Join the journey. Contribute. Extend.
Together, we can make space more accessible 🚀

# AI-Powered Navigation Assistant

> A voice-first, hands-free navigation web application designed for blind and visually impaired users.

The app combines real-time obstacle detection (TensorFlow.js + COCO-SSD), step-by-step Google Maps walking guidance, intelligent voice command classification (Gemini), and natural-sounding speech synthesis (ElevenLabs) into a single accessible experience.

---

## Features

- **Two-phase voice pipeline** — lightweight always-on wake-word listener (Web Speech API) plus an active command channel that routes to Gemini for intent classification.
- **Smart command classifier** — `NAVIGATION`, `SAFETY`, `CONTROL`, or `IRRELEVANT`. Emergency stops bypass classification entirely.
- **Real-time obstacle detection** — COCO-SSD inference at 5 FPS (auto-throttled to 2 FPS on low battery), with directional + distance language ("Vehicle on your right").
- **Priority-aware audio queue** — high-priority alerts interrupt low-priority chatter; identical phrases are deduped; per-object debouncing.
- **Step-by-step navigation** with deviation detection, recalculation back-off, and "you've arrived" handling.
- **Offline fallback** — last route in `localStorage`, favorites in `IndexedDB`, and the five most-critical TTS clips cached for connection drops.
- **Accessible UI** — dark mode first, AAA contrast, 80×80 px buttons, ARIA live regions, Atkinson Hyperlegible font, no flashing animations.
- **Emergency stop** — double-tap-confirm, flushes the audio queue, halts navigation + camera inference.
- **SOS** — opens the device dialer to a configured contact and shares GPS via Web Share API.

---

## Tech Stack

| Layer       | Tech                                                       |
| ----------- | ---------------------------------------------------------- |
| Frontend    | React 18 · Vite · TypeScript · Tailwind CSS · Zustand      |
| Backend     | Node.js · Express · TypeScript · Socket.IO · Helmet · Zod  |
| AI / APIs   | Gemini · ElevenLabs · OpenRouteService · OpenStreetMap (Leaflet + Overpass) · COCO-SSD (TensorFlow.js) |
| Real-time   | WebSocket (Socket.IO) for GPS + obstacle events            |

---

## Project Structure

```
/ai-navigation-assistant
├── /client      # React + Vite frontend
├── /server      # Express + TypeScript API
├── /shared      # Cross-package TS types
├── docker-compose.yml
└── README.md
```

See the original spec for the full module layout under `client/src/{components,hooks,services,utils,store,types,constants}` and `server/src/{routes,services,middleware,socket}`.

---

## Setup

### 1. Install Node.js

Use Node 20 LTS or newer.

### 2. Install dependencies

From the project root:

```bash
npm run install:all
```

Or per workspace:

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Configure environment variables

Copy the example files and fill in your API keys:

```bash
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local
```

#### `server/.env`

```env
PORT=3001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-flash

ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5

# OpenRouteService (free tier at https://openrouteservice.org/) — default
ORS_API_KEY=your_openrouteservice_key
ROUTING_PROVIDER=ors

# Optional — set if you want to fall back to Google Maps for routing
GOOGLE_MAPS_API_KEY=
```

#### `client/.env.local`

```env
# Optional — only needed if you re-enable Google Maps for the visual map.
# Default visual map uses Leaflet + OpenStreetMap (no key required).
VITE_GOOGLE_MAPS_KEY=
VITE_BACKEND_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_SUPPORTED_LANGUAGES=en,si,ta
VITE_WAKE_WORDS=assistant,guide,navigator
VITE_CONFIDENCE_THRESHOLD=0.75
VITE_EMERGENCY_CONTACT=
```

#### Map & routing stack

Everything map-related runs on free, open-source services by default — no Google account required:

| Need                                | Default                                          | Optional alternative |
| ----------------------------------- | ------------------------------------------------ | -------------------- |
| Walking routes                      | OpenRouteService (`foot-walking`)                | Google Directions    |
| Geocoding (place name → lat/lng)    | OpenRouteService Pelias                          | Google Geocoding     |
| "What's around me?" nearby POIs     | OpenStreetMap Overpass API (no key)              | Google Places        |
| Visual map tiles                    | OpenStreetMap via CARTO Dark Matter (Leaflet)    | Google Maps JS       |

- Set `ORS_API_KEY` and you're done — that's the entire keyed stack for navigation.
- Add `GOOGLE_MAPS_API_KEY` only if you want Google as a failover or POI source.
- Add `VITE_GOOGLE_MAPS_KEY` only if you want to switch the visual map back to Google's tiles.

You can confirm the active provider at runtime:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/navigation/provider
```

### 4. Run in development

Open two terminals:

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Visit <http://localhost:5173> in **Chrome** or **Edge** (the Web Speech API support is best there) and grant microphone + camera + location permissions when prompted.

### 5. Production build

```bash
npm run build
```

Or with Docker:

```bash
docker compose up --build
```

---

## Usage

1. Tap **Enable Voice** once on first load (browsers require a user gesture before listening).
2. Say one of the wake words: `"Assistant"`, `"Guide"`, or `"Navigator"`.
3. After the chime, give a command:
   - `"Take me to the central station"` — start navigation
   - `"What's around me?"` — describe nearby places
   - `"Save this location as home"` — store a favorite
   - `"Camera"` — toggle obstacle detection
   - `"Repeat"` — replay the last instruction
   - `"Mute"` / `"Unmute"` — control voice output
   - `"Emergency"` or **double-tap the red button** — emergency stop
   - `"SOS"` — call the configured emergency contact

All voice commands have keyboard/touch equivalents on the **Manual Controls** panel.

---

## Architecture Notes

- **All API keys live on the server.** The client never holds the Gemini, ElevenLabs, or server-side Google Maps keys; it only knows about the public browser Maps key.
- **Rate limiting** — `express-rate-limit` is applied per route group; TTS gets a stricter limiter because ElevenLabs is the most expensive call.
- **Audio queue** — implemented in `client/src/utils/audioQueue.ts`. `HIGH` priority interrupts; identical strings are deduped.
- **Navigation state machine** — lives in `useNavigation.ts`. Compares GPS to the decoded polyline every tick; recalculates with backoff after a 30 m deviation.
- **Battery + visibility** — `App.tsx` lowers detection FPS on low battery and pauses inference when the tab is hidden.
- **Offline** — `offlineCache.ts` saves routes/favorites and a tiny rotating cache of MP3 clips for the highest-priority phrases.

---

## Accessibility

- Dark theme by default, foreground/background contrast 7:1+ (AAA).
- All interactive elements have `aria-label` and minimum 80×80 px touch targets.
- Critical alerts use `aria-live="assertive"`; passive status uses `aria-live="polite"`.
- `prefers-reduced-motion` respected — animations slow to near-zero.
- The map is `aria-hidden`; voice guidance is the canonical surface.

---

## Roadmap

- [ ] MediaPipe Pose for richer person-proximity heuristics
- [ ] Sinhala / Tamil voice catalogs in ElevenLabs
- [ ] Background-tab listening via a Service Worker
- [ ] Offline turn-by-turn using OSM tiles

---

## License

MIT — for accessibility research and educational use.

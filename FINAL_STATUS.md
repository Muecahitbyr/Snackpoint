## SnackPoint 3D Character

Status:
PRODUCTION READY

### Model

Pfad: `public/models/character-animated.glb`
Dateigröße: 4.08 MB (4.275.932 Bytes)
Triangles: 56.576
Bones: 24
Animations: 11 (Idle, Walk, Wave, PointLeft, PointRight, PointUp, PointDown, LookLeft, LookRight, TurnLeft, TurnRight)

### Frontend

Three.js: ✅ installiert
React Three Fiber: ✅ v8.18 (bewusst gepinnt — v9 braucht React 19, Projekt läuft auf React 18.3)
Drei: ✅ v9.122 (passender Peer-Range zu Fiber v8)
GSAP: ✅ bereits vorhanden, wiederverwendet
ScrollTrigger: ✅

### Performance

Main Bundle: 160.02 kB (51.58 kB gzip)
Character Chunk: 1.09 MB / 1.086,61 kB (308.10 kB gzip) — lazy-loaded via `React.lazy`
GLB: 4.08 MB, lädt parallel über `<link rel="preload" as="fetch">`
DPR: [1, 1.5]

### Responsive Tests

1440: ✅
1280: ✅
768: ✅
430: ✅
390: ✅
375: ✅

Getestet: Hero, Reviews, Services, Products, Öffnungszeiten, Route, Footer — Character verdeckt an keiner Stelle Inhalte, Buttons, Links oder Öffnungszeiten.

### Features

Scroll Choreography: ✅ (7 Scenes: Hero → About → Services → Products → Reviews → Hours → Route → Footer)
Head Tracking: ✅ (additiv, geclamped ±25°/±12°, mit Deadzone + Idle-Wander)
Dynamic Pointing: ✅ (automatische PointLeft/Right/Up/Down-Auswahl aus der Parkposition, verifiziert gegen das echte GLB)
Mobile Placement: ✅ (Safe-Placement-Algorithmus: unten → oben → links → rechts, inkl. Sonderregel für Öffnungszeiten ≤390px)
Collision Avoidance: ✅ (prüft Nachbarelemente bis 3 DOM-Ebenen, Least-Overlap-Fallback)
Safe Areas: ✅ (`env(safe-area-inset-*)` in Viewport-Clamp + Mobile-Placement)
Fast Scroll Handling: ✅ (Scroll-Velocity-Erkennung, komprimierte Transitions, throttled Re-Snap gegen Layout-Shifts wie das lazy Google-Maps-iframe)
Reduced Motion: ✅ (statische Idle-Darstellung, keine Choreografie, kein Head-Tracking)
Lazy Loading: ✅ (Character-Chunk per `React.lazy`, GLB per Preload-Link, kein sichtbarer Pop-in)

### Known Issues

None

### Deployment

Build Command: `npm run build`
Output Directory: `dist`

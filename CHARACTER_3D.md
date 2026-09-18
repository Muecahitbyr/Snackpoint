# 3D Character Companion

Scroll-driven 3D character companion, replacing the earlier 2D PNG-sprite
system. Walks between sections, turns to face its travel direction, tracks
targets with its head, points at content, waves — driven by GSAP
ScrollTrigger, rendered with React Three Fiber.

**v2 (choreography pass):** directional walk rotation, head tracking,
automatic point-direction selection, mobile safe-placement with collision
avoidance, scroll-velocity-aware fast transitions, and code-split loading.
See "Choreography v2" below for what changed and why; everything above it
describes the v1 foundation, still accurate.

**v3 (final visual polish):** curved/eased walk motion synced to the Walk
clip's own cycle length, arrive→orient→interact→rest timing, softer
deadzoned head tracking with an idle wander, safe-area-inset-aware clamping,
a fix for a narrow-phone hours-table placement that v2 hadn't fully closed,
and a fix for a subtler positioning bug found while verifying it (see
"Final polish v3" below).

## Source model

`public/models/character-animated.glb` — copied from the separate
`~/VSProjects/character-3d/` project (`output/character-animated.glb`), which
owns the full TripoSR-reconstruction → rigging → animation pipeline. That
project is never modified by this one; treat the GLB here as a build artifact
you refresh by re-copying, not something to hand-edit.

- 1 mesh, 41,968 vertices, 24 bones, 1 skin, 1 material/texture, ~4.08 MB
- Feet at local `Y = 0`, height 1.75 units, width (shoulder-to-shoulder, glTF
  `Z` axis) 1.06 units
- 11 named animation clips: `Idle`, `Walk` (loop, in-place — no root motion),
  `Wave`, `PointLeft/Right/Up/Down`, `LookLeft/Right`, `TurnLeft/Right` (all
  one-shot, hold end pose)
- **Clip names are body-relative, not screen-relative**: facing the camera,
  the character's own left arm reads on-screen as the right side. See
  `character-3d/README.md` → "Namensgebung".

## Packages

`three`, `@react-three/fiber@8` (pinned — v9 requires React 19, this project
is on React 18.3), `@react-three/drei@9` (pinned to the matching peer range).
`gsap` + `ScrollTrigger` were already installed for the previous 2D system.

## Architecture

```
src/components/character/
  characterTypes.ts     Shared types + model constants (height, facing rotation, GLTF path)
  characterScenes.ts     The choreography config — add a scene here, nothing else
  CharacterModel.tsx      Loads the GLB, wires it to a Three.js AnimationMixer
  CharacterController.tsx Movement + clip-selection logic; publishes an imperative API
  CharacterCanvas.tsx     R3F <Canvas>, orthographic pixel-camera, WebGL/error fallback, debug HUD
src/hooks/
  useCharacterScroll.ts   ScrollTrigger setup, breakpoints, DOM→world positioning, resize/reduced-motion
```

`CharacterController` exposes `{ playAnimation, walkTo, snapTo, setScale }`
via a ref (`CharacterControllerAPI`); `useCharacterScroll` is the only thing
that calls into it, from outside the R3F tree. That split is what lets the
DOM-measurement/ScrollTrigger logic stay in a plain hook instead of needing
`useFrame`/R3F context.

### Why an orthographic "pixel camera"

`CharacterCanvas`'s `PixelCamera` sizes the orthographic frustum to exactly
match the viewport in CSS pixels (`left/right/top/bottom = ±width/2, ±height/2`).
That makes **1 world unit == 1 screen px**, so a `getBoundingClientRect()`
result can be turned into a 3D position with a single subtraction
(`worldX = domX - vw/2`, `worldY = vh/2 - domY`) — no perspective distortion,
no unprojection math, and the character never appears fisheye-warped near
viewport edges. Trade-off: no camera-driven depth/parallax; the character
always faces the viewer on a flat plane, like a mascot overlay.

### Facing direction

The rig's baked "forward" is `+X` in glTF space (see `characterTypes.ts` →
`FACE_CAMERA_ROTATION_Y`, derived from the character-3d project's documented
Blender axis convention and confirmed by rendering the actual GLB). Three
named `rotation.y` values in `characterTypes.ts` cover every orientation the
character ever takes: `FACE_CAMERA_ROTATION_Y` (`-π/2`, parked — facing the
viewer), `FACE_RIGHT_ROTATION_Y` (`0`) and `FACE_LEFT_ROTATION_Y` (`π`),
used while walking (see "Movement" below). `TurnLeft/Right` clips are loaded
but not currently wired to any scene — the directional body rotation added
in v2 already covers "the character visibly turns," so those clips are kept
as available assets rather than double-covering the same effect (see
`LookLeft`/`LookRight`, which ARE used, for the head-turn equivalent).

### Movement

`CharacterController.walkTo(x, y, arrivalClip, { fast? })` runs a single
GSAP timeline (v2): turn to face the travel direction (sign of
`targetX - currentX`) → crossfade to `Walk` and tween `group.position.x/y`
(duration scaled from distance, since 1 unit = 1px) → turn back to face the
camera as it arrives → crossfade to `arrivalClip`. Rotation always takes the
shortest angular path (`shortestDelta` in `CharacterController.tsx` wraps to
`[-π, π]` — without it, e.g. left-facing (`π`) to camera-facing (`-π/2`)
would spin the long way around instead of the short quarter-turn). Distances
under `SMALL_MOVE_PX` (48px) skip the walk cycle entirely — just a quick
face-camera + position settle, so a minor re-layout nudge doesn't trigger a
full walk animation for a few pixels of travel. One-shot clips (everything
except `Idle`/`Walk`) auto-return to `Idle` via the `AnimationMixer`'s
`finished` event — no timers, no drift.

**Interruption safety:** every `walkTo`/`snapTo` call starts by killing the
previous transition's timeline (`activeTimelineRef.current?.kill()`) plus any
stray tweens on `position`/`rotation`. A GSAP timeline's `onComplete` only
fires when the timeline actually finishes — killing it prevents a
just-superseded transition's completion handler from firing late and
clobbering a newer one, which is what made rapid scene changes (e.g. fast
scrolling through several sections) safe without building a queue or a
request-token system.

## Scene system

Each entry in `characterScenes.ts` maps a `data-character-target="..."` DOM
element (already present on most sections/cards from the previous 2D system)
to: an optional clip override, and where the character parks relative to
that element (`side: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'auto'`,
optional `align`, pixel offsets, optional per-scene `scale`). The character
always stands **outside** the target's own box — never on top of it — via
the same clamp-to-viewport-edges math the 2D system used, which is why
`side: 'left'` on a full-width section parks near the left edge, while
`side: 'left'` on a narrow text column parks in the gap beside it.

**`action` is optional.** When a scene omits it, `defaultActionForSide` picks
`PointLeft`/`PointRight`/`PointDown`/`PointUp` from the *resolved* side
(`left`→`PointLeft`, `right`→`PointRight`, `top`→`PointDown`,
`bottom`→`PointUp`). This was verified against the actual GLB, not assumed
from the clip name (see "Point direction" under Choreography v2) — set
`action` explicitly only for something other than a point (`Wave`,
`LookLeft`, ...).

Current scenes (desktop): `hero` (Wave intro) → `about-text` (LookLeft) →
`services` (auto→PointLeft) → `products` (auto→PointRight) → `hours`
(auto→PointLeft) → `route` (auto→PointLeft) → `footer` (Wave, small
"goodbye" beat). On mobile, `hours` and `route` use `side: 'auto'` (see
"Mobile placement" below) so their actual side — and therefore clip — can
differ from desktop.

To add a new beat: add one object to the `characterScenes` array. Nothing
else needs to change.

## Hero intro

Runs once on load, independent of ScrollTrigger's `onEnter` (the hero is
already the active section at load, so relying on `onEnter` risks a
redundant double-fire when `ScrollTrigger.refresh()` runs after web fonts
settle). The character starts off-screen right (set as the initial `position`
prop, so nothing flashes at viewport-center before JS runs) already facing
left (its travel direction), and `useCharacterScroll` starts the walk-in
~80ms after mount — just enough for refs to settle, short enough that the
walk is already under way while the hero is still finishing its own entrance,
rather than a visible standalone "pop then walk" beat. It arrives, turns to
face the camera, and crossfades straight into `Wave` with no pause between
the clips (same crossfade-based transition every other scene uses — nothing
hero-specific). Scrolling back up to the hero re-triggers the same arrival
via a dedicated `onEnterBack`-only trigger (guarded so it can't fire before
the initial intro has — no double intro on load), which — since `walkTo`
always starts from wherever the character currently is, not off-screen —
is a normal walk-and-wave, never a second full off-screen intro.

## Mobile placement

Same three-tier breakpoints as the old 2D system (`gsap.matchMedia`):
desktop ≥1101px, tablet 641–1100px, mobile ≤640px. Target on-screen height
per tier reuses the previous `character.css` `clamp()` values. Below desktop,
scenes get `mobile` overrides (position, alignment, per-scene `scale`) rather
than naive scaling of desktop coordinates — several mobile layouts stack
what's a 2-column grid on desktop into one column, so the safe standing spot
moves entirely (see the `about-text` and `footer` scenes, which stand in a
completely different place on mobile than desktop for exactly this reason).

For targets where no single hand-tuned side works reliably (`hours`, `route`
— see Choreography v2 below), `mobile: { side: 'auto' }` hands positioning to
`pickSafePlacement` in `useCharacterScroll.ts` instead.

## Reduced motion

Under `prefers-reduced-motion: reduce`, `useCharacterScroll` skips all
ScrollTrigger/GSAP choreography entirely: the character is parked once, near
the hero, playing only `Idle`, and never moves again. The rest of the site is
completely unaffected.

## Performance

- `dpr={[1, 1.5]}` caps device-pixel-ratio rendering cost on high-DPI mobile.
- No shadows, no postprocessing, two lights (`ambientLight` +
  `directionalLight`).
- The canvas is `pointer-events: none` and never blocks page interaction.
- Position/scale changes go through GSAP tweening `group.position`/`scale`
  directly — no React state, no re-renders during scroll or animation.
- `useGLTF.preload()` at module scope + an `as="fetch"` preload `<link>` in
  `index.html` so the model starts downloading immediately, before the
  character layer even mounts.
- `AnimationMixer` updates happen inside drei's `useAnimations`, which already
  runs its own `useFrame` — nothing extra was added to the render loop.
- Head tracking's `useFrame` (v2) reuses plain numbers (yaw/pitch as floats
  in refs) rather than `Vector3`/`Quaternion` instances — there's nothing to
  reuse-vs-allocate because nothing is ever allocated there per frame.
- DOM measurement (`getBoundingClientRect`, the safe-placement/collision
  checks) only ever runs from `computeWorldPosition`, called at scene-change,
  resize, and orientation-change — never per frame, never per scroll pixel.

See "Bundle" under Choreography v2 for the code-splitting change (v1's
~1.24 MB single bundle became a ~160 KB main bundle + a separately-loaded
character chunk).

## Error handling

`CharacterCanvas` checks `WebGLRenderingContext` availability before mounting
the `<Canvas>` at all, and wraps it in a small class-based error boundary
(GLTF loading throws into Suspense/render, which needs a real error boundary
— there's no hook equivalent). Either failure just renders `null`; the rest
of the site is completely unaffected.

## Debug mode

`?characterDebug=1` (dev builds only, checked via `import.meta.env.DEV`) shows
a small fixed HUD in the bottom-left corner: scene id, the clip about to
play, breakpoint, resolved side, target section, current scroll velocity
(flagged `(fast)` above the fast-scroll threshold), and whether the mobile
safe-placement algorithm had to move off its default (bottom) side. Never
rendered in production.

## Choreography v2

What changed from the v1 foundation above, and why.

### Head tracking

`CharacterController` finds the `head`/`neck` bones by name
(`gltf.scene.getObjectByName('head' | 'neck')` — verified bone names, see
`character-3d/README.md` → RIGGING) and, in its own `useFrame`, additively
rotates `head.rotation.y/x` toward whatever `api.lookAt(x, y)` was last given
— clamped to ±25° yaw / ±12° pitch from the bone's rotation at mount
(`headBindYawRef`/`headBindPitchRef`), smoothed with frame-rate-independent
exponential easing (`1 - exp(-delta * HEAD_TRACK_SMOOTH_SPEED)`).

`useCharacterScroll` calls `lookAt` with the *target's own* world position
(not the character's) at scene-change time — every scene looks at its target
by default; set `lookAtTarget: false` to opt out (used by `hero-intro` and
`footer-outro`, where there's no specific thing to look at).

Tracking is gated off in two cases:
- **While walking** (`isWalkingRef`) — only kicks in once parked, matching
  the requested "läuft hin → Körper richtet sich → Kopf schaut → Point" order.
- **During `Wave`/`Walk`** (`HEAD_TRACK_EXCLUDED`) — per the animation
  descriptions in `character-3d/README.md`, `Wave`'s motion is arm-only. If a
  clip never touches the head bone, `AnimationMixer` leaves it completely
  alone between frames, so a naive `head.rotation.y += offset` every frame
  would compound without bound. Excluding those clips sidesteps the case
  entirely; the bind-pose clamp is a second line of defense for any clip this
  reasoning got wrong (worst case: the head holds at the ±25°/±12° bound
  for that clip's duration and self-corrects the moment a head-animating
  clip plays next — not unbounded drift).

### Point direction (verified, not assumed)

`defaultActionForSide` in `characterTypes.ts` encodes the mapping the scene
system uses whenever a scene doesn't force `action` explicitly:
`left→PointLeft`, `right→PointRight`, `top→PointDown`, `bottom→PointUp`. This
was checked against the actual rendered GLB (screenshot: character parked
left of the `services` cards, `PointLeft` playing) rather than trusted from
the clip name — confirms the body-relative convention in
`character-3d/README.md` holds: standing left of a target (target reads to
the character's screen-right) and playing `PointLeft` (the body's own *left*
arm) does reach *toward* the target, not away from it, because the character
faces the camera and its own left reads as screen-right.

### Mobile safe placement + collision avoidance

`pickSafePlacement` (`useCharacterScroll.ts`) is what `mobile: { side: 'auto' }`
hands positioning to (currently `hours` and `route`). It tries `bottom` →
`top` → `left` → `right` in that order and scores every candidate two ways:

1. **`fitsViewport`** — does the candidate's box stay within the screen
   edges (and below the fixed header)?
2. **`overlapArea`** against `getNearbyRects(el)` — the target's own box is
   never a risk (every candidate already stands `SAFE_GAP` outside it by
   construction), but the *next* thing in the DOM flow can be. `getNearbyRects`
   walks up to 3 ancestor levels collecting every sibling at each level — not
   just the immediate next/previous element, since the real neighbor (e.g. a
   CTA button below an hours table) is often two or three elements further
   along inside a shared wrapper, not a direct sibling of the target.

The first candidate with zero fit-and-clear overlap wins. If nothing is
fully clean (a genuinely tight layout — the `hours` table on a narrow phone
has both a CTA button below it and other content above), it falls back to
whichever *viewport-fitting* candidate has the least overlap area, rather
than blindly defaulting to `bottom`. This is a real, load-bearing fix: an
earlier version of this algorithm rejected colliding candidates but still
returned the first one tried as a fallback regardless of its collision —
verified with a screenshot showing the character standing on the "In Google
Maps öffnen" button before the area-scoring fallback was added.

This is deliberately scoped to *adjacent DOM content*, not a general physics/
collision system — sufficient for "don't land on the button right after the
table," not exhaustive against arbitrary unrelated page elements.

### Scroll velocity / fast-scroll handling

A trigger-less `ScrollTrigger.create({})` instance (`velocityTracker` in
`useCharacterScroll.ts` — GSAP's documented way to read scroll velocity on
demand; there's no bare static `ScrollTrigger.getVelocity()`) is queried at
every scene change. Above `FAST_SCROLL_VELOCITY` (2500px/s), `walkTo` runs
with `{ fast: true }`: prep/settle turns shrink to 0.12s/0.15s and the walk
duration formula compresses (distance/1600, clamped 0.22–0.55s, vs. the
normal distance/520 clamped 0.45–1.7s) — the character still turns, walks,
and settles, just fast enough to keep up with a user flicking through the
whole page in under a second, rather than visibly queueing up several
seconds of catch-up walking behind them. Combined with the interruption
safety described under "Movement," a burst of scene changes during a fast
scroll just keeps retargeting the current (fast) transition to the latest
scene — never stacking.

### Bundle

`CharacterCanvas` is now loaded via `React.lazy` + `Suspense fallback={null}`
in `App.jsx`, instead of a static import:

| | Before | After |
|---|---|---|
| Main bundle | 1.24 MB (357 KB gzip) | 160 KB (52 KB gzip) |
| Character chunk | *(included above)* | 1.08 MB (307 KB gzip), loaded separately |

The GLB itself is unaffected — it already starts downloading immediately via
the `<link rel="preload" as="fetch">` in `index.html`, independent of when
the character's own JS chunk loads, so this doesn't delay the model. What it
buys is the rest of the site's JS (React, GSAP, every section component)
parsing and executing without first waiting on three.js/R3F/drei, so the page
becomes interactive sooner. `fallback={null}` means there's no loading
spinner to flash — the character simply isn't mounted yet for the first
frame or two, same as the old off-screen-start intro already looked like.

## Final polish v3

What changed from Choreography v2, and why.

### 375px hours fix

The v2 fallback (least-overlap-among-viewport-fitting-candidates, side
restricted to top/bottom on narrow phones) still landed the character's foot
lightly touching the hours table's top border — confirmed via a Blender-style
root-cause dig rather than just nudging numbers: the "top" candidate's own
bottom edge is *fixed* at `rect.top - SAFE_GAP` regardless of the
character's size (shrinking only moves its top edge down toward that fixed
point), so if whatever sits directly above the target (here: the "Adresse"
info row, only ~22px above the table) is closer than `SAFE_GAP` allows, no
amount of shrinking can ever clear it — the fallback keeps returning the
least-bad "top" anyway. Fixed by starting `narrowMobile` (≤390px) at a
noticeably smaller base scale (0.3, down from 0.45) so the shrink-retry has
room to actually reach a clean fit instead of bottoming out against the
scale floor. Verified clean (zero overlap, all 7 rows fully readable) at
375/390/430px.

### The "character overlaps a table row" investigation

Chasing the above fix surfaced a real, separate bug: a scene's position is
computed once when its ScrollTrigger fires, but nothing re-validates it
while the user keeps scrolling within that same trigger's active range. For
most targets that's fine (the DOM doesn't move on its own), but the
`Location` section's Google Maps `iframe` (`loading="lazy"`) finishing load
measurably shifted the hours table down *after* the character had already
parked — with nothing to trigger a recheck, since nothing scrolled. Fixed
with two additions in `useCharacterScroll.ts`:

- Each scene's `ScrollTrigger` now also has a throttled `onUpdate` (only
  acts once its own scroll progress has moved ≥22% since the last check) that
  calls a new `resnapScene()` — a quick `snapTo` correction, not a full walk.
  This is scroll-*driven*, not per-frame: it only runs on actual scroll
  events, at most a few times per trigger's active range.
- A one-shot `setTimeout` ~900ms after arrival re-validates the position
  once more, specifically to catch a layout shift that happens with *no*
  further scrolling at all (the async-iframe case) — a single check, not a
  poll loop.

Also fixed in the same pass: `resnapScene()` wasn't updating the debug HUD/
bounding-box overlay, which made an earlier debugging attempt chase a stale
overlay reading instead of the actual (correctly positioned) character —
worth knowing if you use `?characterDebug=1` to investigate something later.

### Natural walk motion

`walkTo` (`CharacterController.tsx`) now drives position through a single
tweened `{t: 0→1}` proxy instead of tweening `x`/`y` directly, so the same
eased progress value can also drive a shallow sine arc
(`arcHeight * sin(t·π)`, capped ~12px) — a gentle rise-and-fall instead of a
flat linear slide, plus `sine.inOut` easing for natural accel/decel (slow
start, steady middle, slow arrival). For normal-speed transitions, the walk
duration is also snapped to the nearest half-cycle of `Walk`'s own ~1s loop
(`WALK_HALF_CYCLE_SECONDS`), so the legs land on a finished step rather than
freezing mid-stride when the position tween ends. Fast (scroll-catch-up)
transitions skip both the arc and the cycle-snap, prioritizing keeping up.

### Scene timing

Arrival no longer crossfades straight from the settle-turn into the
point/look/wave clip: `walkTo` adds a short scaled pause (100–250ms,
`clamp(0.1 + dist/4000, 0.1, 0.25)`) between "settled" and "the gesture
starts," and the `AnimationMixer`'s `finished` handler now holds a clip's end
pose an extra 150ms before crossfading back to `Idle`, so a point genuinely
reads as a deliberate gesture rather than something the character
immediately shrugs off. Net effect: arrive → (brief orient pause) → interact
→ (brief hold) → rest, without adding enough time to feel sluggish.

### Head tracking, softened

Three refinements to the v2 mechanism (same additive/clamped approach,
unchanged): a small deadzone (~2.5°/1.5° yaw/pitch) so a near-dead-ahead
target doesn't produce a barely-perceptible correction that could read as
jitter; smoothing slowed down (`HEAD_TRACK_SMOOTH_SPEED` 6→4.5) for a more
deliberate turn; and tracking now stays neutral for `HEAD_TRACK_ENGAGE_DELAY_S`
(180ms) after the character finishes settling, so the sequence reads as
"body orients first, head follows a beat later" rather than the head
snapping toward the target the instant the feet stop. With no explicit
look target and the clip is `Idle`, the head now does a slow, subtle
autonomous glance (a low-amplitude sine, well under the tracking max) through
the same clamped mechanism, so a fully parked character doesn't read as
frozen — it naturally eases through center and pauses near its peaks rather
than moving continuously.

### Turn clips: evaluated, not used

`TurnLeft`/`TurnRight` were prototyped for the one case a Turn clip could
plausibly improve on the plain rotation tween — a fast mid-walk reversal
(already walking one way, newly asked to walk the other; a fresh departure
from a parked pose is always exactly 90°, since the three facing states are
evenly spaced, so that's the *only* case where a >90° turn is even possible).
Reliably reproducing that exact interrupt timing to verify the Turn-clip
crossfade actually looked better proved impractical to confirm visually, and
crossfading Walk → Turn → Walk within a fraction of a second carried real
risk of looking glitchy. Kept the plain rotation tween, which already reads
smoothly in every tested scene — using the explicit "decide visually, keep
the existing rotation if it already looks better" latitude rather than
shipping an unverified change. Both clips remain loaded and available via
`api.playAnimation()` if a future pass wants to revisit this with a more
controlled reproduction.

### LookRight

Added one new scene, `reviews-watch` (`characterScenes.ts`) — a quiet,
no-pointing beat on the existing `reviews` marquee target, mirroring
`about-watch`'s spirit: character parks to the *right* of the section, so
`LookRight` (own-right = screen-left when facing camera) turns its head
toward content that reads to its screen-left. Not forced onto every section;
this was the one natural fit.

### Safe-area insets

`readSafeAreaInsets()` (`useCharacterScroll.ts`, same probe-element technique
the old 2D system used) resolves `env(safe-area-inset-{left,right,bottom})`
once at setup and again on resize/orientation-change, feeding into both the
viewport-edge clamp and the mobile safe-placement algorithm — so the
character's full bounding box (not just its anchor point — see the existing
"Full-bounding-box clamp" in `computeWorldPosition`) respects an iPhone's
rounded corners and home-indicator area, especially for bottom-anchored
scenes like `footer` on mobile.

### Debug bounding box

`?characterDebug=1` now also draws a dashed outline at the character's exact
computed screen bounding box (same `screenBox` the viewport/collision
clamps use), so a collision or clamp bug is visible directly rather than
inferred from where the model happens to render. Dev-only, same as the rest
of the HUD.

## What was removed

The previous 2D sprite companion: `src/components/character/{Character,
CharacterScene}.tsx`, `characterScenes.ts` (2D version), `character.css`,
`src/hooks/useCharacterAnimation.ts`, `public/character/*.webp` (5 pose
images), the pose preload `<link>` in `index.html`, and the `<Character />`
mount in `App.jsx`. No other part of the site referenced any of it directly.

## Known limitations

- `TurnLeft`/`TurnRight` are loaded and playable via `api.playAnimation()`
  but not wired into any scene — see "Turn clips: evaluated, not used" above
  for why, and what it'd take to revisit.
- The mobile safe-placement algorithm (`pickSafePlacement`) only guards
  against the target's own box and its nearby DOM siblings (up to 3 ancestor
  levels) — not a general collision system against arbitrary unrelated page
  elements. Sufficient for every section tested here; a very different
  layout could need a wider check.

## Next step

**3D character implementation complete.** Choreography, visual polish, and a
final production health check (build, TypeScript, assets, 375–1440px, debug
gating, deployment readiness — see `FINAL_STATUS.md`) are all done. The next
step is **not** further character development unless a concrete bug is
found — it's real-device QA and deployment. If wanted later, more scenes for
`highlight`/`map` are a one-line addition to `characterScenes.ts`, but that's
optional polish, not outstanding work.

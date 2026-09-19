import { useEffect, useRef, type MutableRefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { characterScenes } from '../components/character/characterScenes';
import {
  MODEL_HEIGHT_UNITS,
  defaultActionForSide,
  type AnimationName,
  type CharacterControllerAPI,
  type CharacterScene,
  type Side,
} from '../components/character/characterTypes';

gsap.registerPlugin(ScrollTrigger);

const EDGE_MARGIN = 16;
const TOP_MARGIN = 96; // stays clear of the fixed header
const BOTTOM_MARGIN = 20;
/** Gap left between the character and the target's own box in the mobile
 * safe-placement algorithm — never stand flush against a card/table edge. */
const SAFE_GAP = 20;
/** Above this window scroll speed (px/s), compress transitions so the
 * character catches up instead of visibly lagging several sections behind. */
const FAST_SCROLL_VELOCITY = 2500;

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampPx(min: number, vwPercent: number, max: number, vw: number) {
  return clamp((vw * vwPercent) / 100, min, max);
}

/** Target on-screen height of the figure, mirroring the tuned CSS clamp()
 * values from the previous 2D sprite implementation (character.css). */
function getTargetPixelHeight(breakpoint: Breakpoint, vw: number): number {
  if (breakpoint === 'desktop') return clampPx(140, 16, 260, vw);
  if (breakpoint === 'tablet') return clampPx(150, 19, 220, vw);
  if (vw <= 380) return clampPx(115, 32, 160, vw);
  return clampPx(130, 34, 190, vw);
}

// Model footprint measured from output/character-v2.1-animated.glb: 1.784 tall, 1.06 wide
// (practically unchanged from V1's 1.75/1.06 — new head/durag/fingers didn't widen the figure).
const MODEL_ASPECT = 1.0595 / MODEL_HEIGHT_UNITS;

function getTarget(key: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-character-target="${key}"]`);
}

function resolvePlacement(scene: CharacterScene, breakpoint: Breakpoint, vw: number) {
  if (breakpoint === 'desktop') return scene.desktop;
  let placement = { ...scene.desktop, ...scene.mobile };
  if (vw <= 390 && scene.narrowMobile) placement = { ...placement, ...scene.narrowMobile };
  return placement;
}

function domToWorld(px: number, py: number, vw: number, vh: number) {
  return { x: px - vw / 2, y: vh / 2 - py };
}

interface SafeAreaInsets {
  left: number;
  right: number;
  bottom: number;
}

/** Resolves env(safe-area-inset-*) to real px via a throwaway probe element
 * (the only reliable way to read them from JS) — so the character's edge
 * clamp respects an iPhone's rounded corners / home-indicator area instead
 * of just the raw viewport rect. Called only at setup and on resize/orientation
 * change, never per frame. */
function readSafeAreaInsets(): SafeAreaInsets {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;inset:0;pointer-events:none;visibility:hidden;' +
    'padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    left: parseFloat(cs.paddingLeft) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
  };
  probe.remove();
  return insets;
}

interface PlacementCandidate {
  side: Exclude<Side, 'auto' | 'center'>;
  xCenter: number;
  topY: number;
}

function candidateFor(
  side: Exclude<Side, 'auto' | 'center'>,
  rect: DOMRect,
  pixelWidth: number,
  pixelHeight: number
): PlacementCandidate {
  if (side === 'bottom') return { side, xCenter: rect.left + rect.width / 2, topY: rect.bottom + SAFE_GAP };
  if (side === 'top') return { side, xCenter: rect.left + rect.width / 2, topY: rect.top - SAFE_GAP - pixelHeight };
  if (side === 'left')
    return { side, xCenter: rect.left - SAFE_GAP - pixelWidth / 2, topY: rect.top + rect.height / 2 - pixelHeight / 2 };
  return { side, xCenter: rect.right + SAFE_GAP + pixelWidth / 2, topY: rect.top + rect.height / 2 - pixelHeight / 2 };
}

function fitsViewport(
  c: PlacementCandidate,
  pixelWidth: number,
  pixelHeight: number,
  vw: number,
  vh: number,
  insets: SafeAreaInsets
) {
  const left = c.xCenter - pixelWidth / 2;
  const right = c.xCenter + pixelWidth / 2;
  return (
    left >= EDGE_MARGIN + insets.left &&
    right <= vw - EDGE_MARGIN - insets.right &&
    c.topY >= TOP_MARGIN &&
    c.topY + pixelHeight <= vh - BOTTOM_MARGIN - insets.bottom
  );
}

/** The target's own box is never a collision risk (every candidate already
 * stands outside it by SAFE_GAP) — what "bottom"/"top" candidates actually
 * risk landing on is whatever content sits immediately next to the target in
 * the DOM (e.g. a CTA button right below an hours table). Checking the
 * target's and its parent's adjacent siblings covers that without needing a
 * full generic collision system. */
function getNearbyRects(el: Element): DOMRect[] {
  const rects: DOMRect[] = [];
  // Walk up a few ancestor levels, collecting every sibling at each level —
  // the "next thing in flow" (e.g. a CTA button below a table) is often not
  // a direct sibling of the target itself but of one of its wrapper divs,
  // and can sit a couple of elements further along (not just immediately
  // next), e.g. hours-table -> hours-block -> info-row -> [Bewertung row,
  // THEN the route button two siblings later].
  let node: Element | null = el;
  for (let level = 0; level < 3 && node; level++) {
    const parent: Element | null = node.parentElement;
    if (parent) {
      const children: Element[] = Array.from(parent.children);
      for (const sibling of children) {
        if (sibling !== node) rects.push(sibling.getBoundingClientRect());
      }
    }
    node = parent;
  }
  return rects;
}

/** Total overlap area (px²) between a candidate's box and any nearby rect —
 * 0 means genuinely clear. Used both to reject candidates outright and, when
 * every candidate collides with something in a tight layout, to pick the
 * least-bad one instead of blindly defaulting to the first tried side. */
function overlapArea(c: PlacementCandidate, pixelWidth: number, pixelHeight: number, rects: DOMRect[]) {
  const left = c.xCenter - pixelWidth / 2;
  const right = c.xCenter + pixelWidth / 2;
  const top = c.topY;
  const bottom = c.topY + pixelHeight;
  let total = 0;
  for (const r of rects) {
    const overlapX = Math.max(0, Math.min(right, r.right) - Math.max(left, r.left));
    const overlapY = Math.max(0, Math.min(bottom, r.bottom) - Math.max(top, r.top));
    total += overlapX * overlapY;
  }
  return total;
}

/** Mobile "no fixed coordinates" placement: try standing below the target
 * first (most natural — the character mirrors reading order), then above,
 * then to a side (unless `sideOrder` rules sides out — e.g. an hours table
 * on a narrow phone deliberately excludes left/right, see
 * "1. oberhalb 2. darunter 3. kleiner skalieren" in CHARACTER_3D.md), and
 * use the first candidate that fits inside the viewport AND doesn't land on
 * neighboring content (see getNearbyRects). Standing outside the target's
 * own box on every candidate is what guarantees the target itself
 * specifically is never covered. */
function pickSafePlacement(
  el: Element,
  rect: DOMRect,
  pixelWidth: number,
  pixelHeight: number,
  vw: number,
  vh: number,
  insets: SafeAreaInsets,
  sideOrder: Exclude<Side, 'auto' | 'center'>[]
): { c: PlacementCandidate; clean: boolean } {
  const nearby = getNearbyRects(el);
  let bestFitting: { c: PlacementCandidate; area: number } | null = null;
  let bestAny: { c: PlacementCandidate; area: number } | null = null;
  for (const side of sideOrder) {
    const c = candidateFor(side, rect, pixelWidth, pixelHeight);
    const area = overlapArea(c, pixelWidth, pixelHeight, nearby);
    const fits = fitsViewport(c, pixelWidth, pixelHeight, vw, vh, insets);
    if (area === 0 && fits) return { c, clean: true };
    if (fits && (!bestFitting || area < bestFitting.area)) bestFitting = { c, area };
    if (!bestAny || area < bestAny.area) bestAny = { c, area };
  }
  // Nothing was fully clean (a genuinely tight layout) — use whichever
  // viewport-fitting candidate collides least, falling back further to the
  // least-bad candidate overall only if none fit the viewport at all.
  const fallback = bestFitting ?? bestAny ?? { c: candidateFor(sideOrder[0], rect, pixelWidth, pixelHeight) };
  return { c: fallback.c, clean: false };
}

const AUTO_SCALE_STEPS = [1, 0.85, 0.7, 0.55];

/** For `side: 'auto'` placements: tries the configured scale first, and only
 * shrinks (down to 55% of it) if nothing in `sideOrder` comes back clean at
 * that size — "3. Character kleiner skalieren" is the last resort, not the
 * first move. */
function pickSafePlacementWithShrink(
  el: Element,
  rect: DOMRect,
  basePixelHeight: number,
  vw: number,
  vh: number,
  insets: SafeAreaInsets,
  sideOrder: Exclude<Side, 'auto' | 'center'>[]
): { c: PlacementCandidate; pixelHeight: number; pixelWidth: number } {
  let last: { c: PlacementCandidate; pixelHeight: number; pixelWidth: number } | null = null;
  for (const mult of AUTO_SCALE_STEPS) {
    const pixelHeight = basePixelHeight * mult;
    const pixelWidth = pixelHeight * MODEL_ASPECT;
    const { c, clean } = pickSafePlacement(el, rect, pixelWidth, pixelHeight, vw, vh, insets, sideOrder);
    last = { c, pixelHeight, pixelWidth };
    if (clean) return last;
  }
  return last!;
}

interface WorldPos {
  x: number;
  y: number;
  pixelHeight: number;
  pixelWidth: number;
  side: Exclude<Side, 'auto'>;
  targetCenter: { x: number; y: number };
  /** the character's screen-space bounding box in CSS px, for the debug
   * overlay (?characterDebug=1) — same box the viewport/collision clamps
   * were computed against. */
  screenBox: { left: number; top: number; width: number; height: number };
}

/** Resolves a scene to a world-space (x, y) target, in the same units as
 * screen pixels (see PixelCamera — the orthographic frustum is sized to
 * exactly match the viewport, so 1 world unit == 1 CSS px). */
function computeWorldPosition(
  scene: CharacterScene,
  breakpoint: Breakpoint,
  basePixelHeight: number,
  insets: SafeAreaInsets
): WorldPos | null {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const placement = resolvePlacement(scene, breakpoint, vw);
  let pixelHeight = basePixelHeight * (placement.scale ?? 1);
  let pixelWidth = pixelHeight * MODEL_ASPECT;

  const el = getTarget(scene.section);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const targetCenter = domToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, vw, vh);

  const offsetX = placement.offsetX ?? 0;
  const offsetY = placement.offsetY ?? 0;

  let xCenter: number;
  let topY: number;
  let resolvedSide: Exclude<Side, 'auto'>;

  if (placement.side === 'auto') {
    const sideOrder = placement.sideOrder ?? ['bottom', 'top', 'left', 'right'];
    const picked = pickSafePlacementWithShrink(el, rect, pixelHeight, vw, vh, insets, sideOrder);
    xCenter = picked.c.xCenter + offsetX;
    topY = picked.c.topY + offsetY;
    resolvedSide = picked.c.side;
    pixelHeight = picked.pixelHeight;
    pixelWidth = picked.pixelWidth;
  } else if (placement.side === 'center') {
    xCenter = rect.left + rect.width / 2;
    const align = placement.align ?? 'top';
    if (align === 'bottom') topY = rect.bottom - pixelHeight + offsetY;
    else if (align === 'center') topY = rect.top + rect.height / 2 - pixelHeight / 2 + offsetY;
    else topY = rect.top + offsetY;
    resolvedSide = 'center';
  } else if (placement.side === 'top' || placement.side === 'bottom') {
    const c = candidateFor(placement.side, rect, pixelWidth, pixelHeight);
    xCenter = c.xCenter + offsetX;
    topY = c.topY + offsetY;
    resolvedSide = placement.side;
  } else {
    const align = placement.align ?? 'center';
    const xLeftEdge = placement.side === 'left' ? rect.left - pixelWidth + offsetX : rect.right + offsetX;
    xCenter = xLeftEdge + pixelWidth / 2;
    if (align === 'top') topY = rect.top + offsetY;
    else if (align === 'bottom') topY = rect.bottom - pixelHeight + offsetY;
    else topY = rect.top + rect.height / 2 - pixelHeight / 2 + offsetY;
    resolvedSide = placement.side;
  }

  // Full-bounding-box clamp: accounts for the character's actual scaled
  // footprint (pixelWidth/pixelHeight), not just its anchor point, and
  // respects safe-area insets (iPhone rounded corners / home indicator) —
  // never just the raw viewport rect.
  const minXCenter = EDGE_MARGIN + insets.left + pixelWidth / 2;
  const maxXCenter = Math.max(minXCenter, vw - EDGE_MARGIN - insets.right - pixelWidth / 2);
  xCenter = clamp(xCenter, minXCenter, maxXCenter);

  const minTopY = TOP_MARGIN;
  const maxTopY = Math.max(minTopY, vh - BOTTOM_MARGIN - insets.bottom - pixelHeight);
  topY = clamp(topY, minTopY, maxTopY);

  const feetYPx = topY + pixelHeight;

  return {
    x: xCenter - vw / 2,
    y: vh / 2 - feetYPx,
    pixelHeight,
    pixelWidth,
    side: resolvedSide,
    targetCenter,
    screenBox: { left: xCenter - pixelWidth / 2, top: topY, width: pixelWidth, height: pixelHeight },
  };
}

export interface CharacterScrollDebugInfo {
  sceneId: string;
  breakpoint: Breakpoint;
  animation: AnimationName;
  side: string;
  target: string;
  velocity: number;
  fast: boolean;
  collisionAdjusted: boolean;
  screenBox: { left: number; top: number; width: number; height: number };
}

interface UseCharacterScrollOptions {
  apiRef: MutableRefObject<CharacterControllerAPI | null>;
  ready: boolean;
  onDebugUpdate?: (info: CharacterScrollDebugInfo) => void;
}

export function useCharacterScroll({ apiRef, ready, onDebugUpdate }: UseCharacterScrollOptions) {
  const onDebugUpdateRef = useRef(onDebugUpdate);
  onDebugUpdateRef.current = onDebugUpdate;

  useEffect(() => {
    if (!ready) return;
    const api = apiRef.current;
    if (!api) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      // Static, minimal presence: park near the hero, Idle only, no
      // choreography and no head tracking (nothing ever calls api.lookAt).
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const insets = readSafeAreaInsets();
      const pixelHeight = getTargetPixelHeight(vw <= 640 ? 'mobile' : 'desktop', vw);
      api.setScale(pixelHeight / MODEL_HEIGHT_UNITS);
      api.snapTo(
        vw / 2 - EDGE_MARGIN - insets.right - (pixelHeight * MODEL_ASPECT) / 2,
        vh / 2 - TOP_MARGIN - pixelHeight
      );
      api.playAnimation('Idle');
      return;
    }

    let ctx: gsap.Context | undefined;
    let cancelled = false;

    ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: '(min-width: 1101px)',
          isTablet: '(min-width: 641px) and (max-width: 1100px)',
          isMobile: '(max-width: 640px)',
        },
        (context) => {
          const conditions = context.conditions as { isDesktop: boolean; isTablet: boolean; isMobile: boolean };
          const breakpoint: Breakpoint = conditions.isDesktop ? 'desktop' : conditions.isTablet ? 'tablet' : 'mobile';
          const isCompact = breakpoint !== 'desktop';

          const currentSceneRef = { current: null as CharacterScene | null };
          let introTimer: ReturnType<typeof setTimeout> | null = null;
          let settleTimer: ReturnType<typeof setTimeout> | null = null;
          let heroIntroPlayed = false;
          let insets = readSafeAreaInsets();
          // A trigger-less ScrollTrigger instance is GSAP's documented way to
          // read window scroll velocity on demand (ScrollTrigger has no bare
          // static getVelocity() — it's an instance method).
          const velocityTracker = ScrollTrigger.create({});

          function currentPixelHeight() {
            return getTargetPixelHeight(breakpoint, document.documentElement.clientWidth);
          }

          function goToScene(scene: CharacterScene, opts: { isIntro?: boolean; arrivalOverride?: AnimationName } = {}) {
            const pos = computeWorldPosition(scene, breakpoint, currentPixelHeight(), insets);
            if (!pos) return;
            currentSceneRef.current = scene;

            const action = opts.arrivalOverride ?? scene.action ?? defaultActionForSide(pos.side);
            const velocity = Math.abs(velocityTracker.getVelocity());
            const fast = !opts.isIntro && velocity > FAST_SCROLL_VELOCITY;
            const requestedSide = resolvePlacement(scene, breakpoint, document.documentElement.clientWidth).side;

            apiRef.current?.setScale(pos.pixelHeight / MODEL_HEIGHT_UNITS);
            apiRef.current?.walkTo(pos.x, pos.y, action, { fast });
            if (scene.lookAtTarget === false) apiRef.current?.clearLookAt();
            else apiRef.current?.lookAt(pos.targetCenter.x, pos.targetCenter.y);

            // One follow-up re-validation shortly after arrival: a target's
            // surrounding layout can still shift after the initial
            // measurement independent of scroll (verified cause: the lazy-
            // loaded Google Maps iframe finishing load and nudging the hours
            // table down) — scroll-driven onUpdate alone can't catch that,
            // since nothing scrolled. Single one-shot check, not a loop.
            scheduleSettleCheck(scene, 900);

            onDebugUpdateRef.current?.({
              sceneId: scene.id,
              breakpoint,
              animation: action,
              side: pos.side,
              target: scene.section,
              velocity: Math.round(velocity),
              fast,
              collisionAdjusted: requestedSide === 'auto' && pos.side !== 'bottom',
              screenBox: pos.screenBox,
            });
          }

          // --- Hero intro: plays once on load (walk-in + Wave), independent of
          // ScrollTrigger onEnter (the hero is already the active section at load,
          // so relying on onEnter risks a redundant double-fire on refresh()).
          // Scrolling back UP to the hero later re-enters through the normal
          // onEnterBack path below — goToScene walks from wherever the character
          // currently is, so it's never a second full off-screen intro.
          const heroScene = characterScenes.find((s) => s.id === 'hero-intro');
          const heroEl = heroScene ? getTarget(heroScene.section) : null;
          if (heroScene && heroEl) {
            introTimer = setTimeout(() => {
              if (cancelled) return;
              heroIntroPlayed = true;
              goToScene(heroScene, { isIntro: true });
            }, 80);

            ScrollTrigger.create({
              trigger: heroEl,
              start: heroScene.start ?? 'top 75%',
              end: heroScene.end ?? 'bottom 25%',
              onEnterBack: () => {
                if (!heroIntroPlayed) return; // don't preempt the initial intro
                // The dramatic walk-in + Wave is a one-time introduction (see
                // heroIntroPlayed above) — scrolling back up later just parks
                // the character back at its hero spot without repeating the
                // greeting.
                goToScene(heroScene, { arrivalOverride: 'Idle' });
              },
            });
          }

          // Arms the post-arrival settle re-check (see goToScene above), but
          // defers it instead of firing while a walkTo is still mid-flight:
          // snapTo() kills the active GSAP timeline, which — for a walk long
          // enough that its own arrival delay exceeds `delayMs` (the hero
          // intro's off-screen entrance being the case that surfaced this) —
          // was cutting the arrival clip (Wave) off before it ever started.
          // This re-validation exists to correct for late layout shifts
          // (e.g. the Maps iframe nudging the hours table), not to interrupt
          // an in-progress arrival, so it's safe to just check again shortly.
          function scheduleSettleCheck(scene: CharacterScene, delayMs: number) {
            if (settleTimer) clearTimeout(settleTimer);
            settleTimer = setTimeout(() => {
              if (currentSceneRef.current !== scene) return;
              if (apiRef.current?.isWalking()) {
                scheduleSettleCheck(scene, 300);
                return;
              }
              resnapScene(scene);
            }, delayMs);
          }

          // Quick, non-walk reposition — used to keep the character's spot
          // valid without a full walkTo flourish (resize, and the continued-
          // scroll correction below).
          function resnapScene(scene: CharacterScene) {
            const pos = computeWorldPosition(scene, breakpoint, currentPixelHeight(), insets);
            if (!pos) return;
            apiRef.current?.setScale(pos.pixelHeight / MODEL_HEIGHT_UNITS);
            apiRef.current?.snapTo(pos.x, pos.y);
            if (scene.lookAtTarget !== false) apiRef.current?.lookAt(pos.targetCenter.x, pos.targetCenter.y);
            // Keep the debug HUD/bounding-box overlay honest about the
            // actual current position — without this it would keep showing
            // the position from the scene's original trigger, not this
            // correction (this is what made an earlier investigation of a
            // suspected overlap chase a stale overlay instead of a real bug).
            onDebugUpdateRef.current?.({
              sceneId: scene.id,
              breakpoint,
              animation: scene.action ?? defaultActionForSide(pos.side),
              side: pos.side,
              target: scene.section,
              velocity: Math.round(Math.abs(velocityTracker.getVelocity())),
              fast: false,
              collisionAdjusted: resolvePlacement(scene, breakpoint, document.documentElement.clientWidth).side === 'auto' && pos.side !== 'bottom',
              screenBox: pos.screenBox,
            });
          }

          // --- Every other scene: plain enter/enter-back triggers.
          characterScenes.forEach((scene) => {
            if (scene.id === 'hero-intro') return;
            if (scene.compactSkip && isCompact) return;
            const el = getTarget(scene.section);
            if (!el) return;
            // A scene's target can be tall enough (the hours table, a card
            // grid) that the user keeps scrolling well past the moment it
            // triggered. The character's screen position is only computed at
            // trigger time, so — since the canvas is fixed but the page
            // content underneath isn't — continuing to scroll can carry new
            // content into the character's now-stale spot (verified: an
            // hours-table row scrolling in behind it). onUpdate re-snaps
            // (not a full walk — just a quick position/scale correction)
            // whenever this trigger's own scroll progress has moved by a
            // meaningful amount, which is scroll-driven and throttled, not
            // per-frame.
            let lastProgress = 0;
            ScrollTrigger.create({
              trigger: el,
              start: scene.start ?? 'top 75%',
              end: scene.end ?? 'bottom 25%',
              onEnter: () => {
                lastProgress = 0;
                goToScene(scene);
              },
              onEnterBack: () => {
                lastProgress = 1;
                goToScene(scene);
              },
              onUpdate: (self) => {
                if (currentSceneRef.current !== scene) return;
                if (Math.abs(self.progress - lastProgress) < 0.22) return;
                lastProgress = self.progress;
                resnapScene(scene);
              },
            });
          });

          // --- Resize/orientation correction: reposition + rescale the CURRENT
          // scene without the walk flourish. A tier-crossing resize is already
          // handled by matchMedia itself (reverts and reruns this whole setup).
          let resizeTimer: ReturnType<typeof setTimeout> | null = null;
          function handleResize() {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
              insets = readSafeAreaInsets();
              const scene = currentSceneRef.current;
              if (!scene) return;
              const pos = computeWorldPosition(scene, breakpoint, currentPixelHeight(), insets);
              if (pos) {
                apiRef.current?.setScale(pos.pixelHeight / MODEL_HEIGHT_UNITS);
                apiRef.current?.snapTo(pos.x, pos.y);
                if (scene.lookAtTarget !== false) apiRef.current?.lookAt(pos.targetCenter.x, pos.targetCenter.y);
              }
              ScrollTrigger.refresh();
            }, 150);
          }
          window.addEventListener('resize', handleResize);
          window.addEventListener('orientationchange', handleResize);

          return () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            if (introTimer) clearTimeout(introTimer);
            if (settleTimer) clearTimeout(settleTimer);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            velocityTracker.kill();
          };
        }
      );

      // A refresh() after fonts settle keeps every trigger's measured target
      // accurate against any late web-font layout shift.
      const fontsReady = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
      Promise.resolve(fontsReady).finally(() => {
        if (cancelled) return;
        ScrollTrigger.refresh();
      });
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}

import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  characterScenes,
  POSE_SRC,
  validateCharacterScenes,
  type PoseId,
  type CharacterScene,
  type Side,
} from '../components/character/characterScenes';

gsap.registerPlugin(ScrollTrigger);

if (import.meta.env.DEV) {
  validateCharacterScenes(characterScenes);
}

// Reserved space so a scale/position spring overshoot can never visually
// clip past the true viewport edge — see the "never cut off" note below.
const OVERSHOOT_BUFFER = 26;
const EDGE_MARGIN = 10;
const TOP_MARGIN = 88; // stays clear of the fixed header
const BOTTOM_MARGIN = 14;

function getTarget(key: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-character-target="${key}"]`);
}

/** Resolves env(safe-area-inset-*) to real px via a throwaway probe element — the only reliable way to read them from JS. */
function readSafeAreaInsets() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;inset:0;pointer-events:none;visibility:hidden;' +
    'padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/** Preloads every pose and asks the browser to decode it off the main thread before first use, so the intro never stalls on image work and pose swaps never flash a blank frame. */
function preloadPoses(): Promise<void> {
  const jobs = Object.values(POSE_SRC).map((src) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    if (typeof img.decode === 'function') {
      return img.decode().catch(() => undefined);
    }
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });
  // Never block the entrance forever on a slow network — proceed after a cap.
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 700));
  return Promise.race([Promise.all(jobs).then(() => undefined), timeout]);
}

interface CharacterRefs {
  container: RefObject<HTMLDivElement>;
  figure: RefObject<HTMLDivElement>;
  imgA: RefObject<HTMLImageElement>;
  imgB: RefObject<HTMLImageElement>;
}

export function useCharacterAnimation({ container, figure, imgA, imgB }: CharacterRefs) {
  const activeImgRef = useRef<'A' | 'B'>('A');
  const currentPoseRef = useRef<PoseId | null>('greet');
  const idleTweenRef = useRef<gsap.core.Tween | null>(null);
  const currentSceneRef = useRef<{ scene: CharacterScene; targetKey?: string; pose?: PoseId; flip?: boolean } | null>(null);

  useLayoutEffect(() => {
    const containerEl = container.current;
    const figureEl = figure.current;
    const imgAEl = imgA.current;
    const imgBEl = imgB.current;
    if (!containerEl || !figureEl || !imgAEl || !imgBEl) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let safeArea = readSafeAreaInsets();

    function setPose(pose: PoseId) {
      if (currentPoseRef.current === pose) return;
      currentPoseRef.current = pose;
      const showingA = activeImgRef.current === 'A';
      const nextEl = showingA ? imgBEl : imgAEl;
      const prevEl = showingA ? imgAEl : imgBEl;
      nextEl!.src = POSE_SRC[pose];
      gsap.set(nextEl, { opacity: 0 });
      // Every pose was already decoded up front (preloadPoses), so this paints
      // on the very next frame — the crossfade itself hides any residual cost.
      gsap.to(nextEl, { opacity: 1, duration: 0.28, ease: 'power1.out' });
      gsap.to(prevEl, { opacity: 0, duration: 0.28, ease: 'power1.out' });
      activeImgRef.current = showingA ? 'B' : 'A';
    }

    if (reduceMotion) {
      // Minimal, static presentation: a small fixed corner badge, no scroll-driven motion.
      setPose('greet');
      const w = figureEl.offsetWidth;
      const h = figureEl.offsetHeight;
      gsap.set(containerEl, {
        x: window.innerWidth - w - EDGE_MARGIN - safeArea.right,
        y: window.innerHeight - h - EDGE_MARGIN - safeArea.bottom,
        opacity: 0,
      });
      gsap.to(containerEl, { opacity: 0.95, duration: 1, delay: 0.4 });
      return;
    }

    let ctx: gsap.Context | undefined;
    let cancelled = false;

    preloadPoses().then(() => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        gsap.set(containerEl, { opacity: 0, scale: 0.82, rotation: -6, x: -260, y: 140, force3D: true });

        const mm = gsap.matchMedia();

        mm.add(
          {
            isDesktop: '(min-width: 1101px)',
            isTablet: '(min-width: 641px) and (max-width: 1100px)',
            isMobile: '(max-width: 640px)',
          },
          (context) => {
            const conditions = context.conditions as { isDesktop: boolean; isTablet: boolean; isMobile: boolean };
            const isCompact = conditions.isMobile || conditions.isTablet;

            function computePosition(scene: CharacterScene, targetKey: string | undefined, scale: number) {
              const w = (figureEl!.offsetWidth || 200) * scale;
              const h = (figureEl!.offsetHeight || 280) * scale;
              const vw = document.documentElement.clientWidth;
              const vh = window.innerHeight;

              // Safe, unconditional bounds — every branch below feeds into this
              // same clamp, so "off-screen" simply cannot happen, overshoot
              // included (OVERSHOOT_BUFFER reserves room for the spring's peak).
              const minX = EDGE_MARGIN + safeArea.left + OVERSHOOT_BUFFER;
              const maxXRaw = vw - w - EDGE_MARGIN - safeArea.right - OVERSHOOT_BUFFER;
              const maxX = Math.max(minX, maxXRaw);
              const minY = TOP_MARGIN;
              const maxYRaw = vh - h - BOTTOM_MARGIN - safeArea.bottom - OVERSHOOT_BUFFER;
              const maxY = Math.max(minY, maxYRaw);

              if (scene.center) {
                const el = getTarget(targetKey ?? scene.section);
                const rect = el?.getBoundingClientRect();
                const oy = ((isCompact ? scene.mobileOffsetY ?? scene.offsetY : scene.offsetY) ?? 0);
                let x = rect ? rect.left + rect.width / 2 - w / 2 : vw / 2 - w / 2;
                let y = (rect ? rect.top : vh / 2) + oy;
                x = Math.min(Math.max(x, minX), maxX);
                y = Math.min(Math.max(y, minY), maxY);
                return { x, y };
              }

              const side: Side = (isCompact ? scene.mobileSide ?? scene.side : scene.side);
              const align = (isCompact ? scene.mobileAlign ?? scene.align : scene.align) ?? 'center';
              const ox = (isCompact ? scene.mobileOffsetX ?? scene.offsetX : scene.offsetX) ?? 0;
              const oy = (isCompact ? scene.mobileOffsetY ?? scene.offsetY : scene.offsetY) ?? 0;

              const key = isCompact && scene.anchorTarget ? scene.anchorTarget : targetKey ?? scene.section;
              const el = getTarget(key);
              if (!el) return null;
              const rect = el.getBoundingClientRect();

              let x = side === 'left' ? rect.left - w + ox : rect.right + ox;

              let y: number;
              if (align === 'top') y = rect.top + oy;
              else if (align === 'bottom') y = rect.bottom - h + oy;
              else y = rect.top + rect.height / 2 - h / 2 + oy;

              x = Math.min(Math.max(x, minX), maxX);
              y = Math.min(Math.max(y, minY), maxY);
              return { x, y };
            }

            function startIdle() {
              idleTweenRef.current?.kill();
              idleTweenRef.current = gsap.to(figureEl, {
                y: '+=8',
                rotation: 1.5,
                duration: 2.2,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1,
              });
            }

            function stopIdle() {
              idleTweenRef.current?.kill();
              idleTweenRef.current = null;
              gsap.set(figureEl, { rotation: 0 });
            }

            function arriveAt(
              scene: CharacterScene,
              targetKey?: string,
              poseOverride?: PoseId,
              flipOverride?: boolean,
              opts: { flourish?: boolean } = {}
            ) {
              const flourish = opts.flourish ?? true;
              const scale = scene.scale ?? 1;
              const pos = computePosition(scene, targetKey, scale);
              if (!pos) return;
              currentSceneRef.current = { scene, targetKey, pose: poseOverride, flip: flipOverride };
              stopIdle();
              setPose(poseOverride ?? scene.pose);
              const flip = flipOverride ?? scene.flip ?? false;
              const finalScaleX = flip ? -scale : scale;

              const tl = gsap.timeline();

              if (!flourish) {
                // A resize/orientation correction: reposition cleanly, no personality beats.
                tl.to(containerEl, {
                  x: pos.x,
                  y: pos.y,
                  scaleX: finalScaleX,
                  scaleY: scale,
                  rotation: 0,
                  opacity: 1,
                  duration: 0.35,
                  ease: 'power2.out',
                  overwrite: 'auto',
                });
                if (scene.idle) tl.call(startIdle);
                return;
              }

              // Anticipation: a brief squash (shrinking only — never risks overflow)
              // before committing to the move.
              tl.to(containerEl, { scale: scale * 0.9, rotation: flip ? 4 : -4, duration: 0.14, ease: 'power1.in', overwrite: 'auto' })
                // The move itself: power3.out approaches the target and stops —
                // no overshoot on position, so it can never travel past the
                // already-safe clamped bounds computed above.
                .to(containerEl, {
                  x: pos.x,
                  y: pos.y,
                  opacity: 1,
                  duration: 0.62,
                  ease: 'power3.out',
                }, '<0.02')
                // The "personality" overshoot lives on scale/rotation only — both
                // bounded modestly and already covered by OVERSHOOT_BUFFER above.
                .to(containerEl, {
                  scaleX: finalScaleX,
                  scaleY: scale,
                  rotation: 0,
                  duration: 0.5,
                  ease: 'back.out(1.7)',
                }, '<0.05');

              if (scene.action === 'attention') {
                tl.to(containerEl, { x: `+=${flip ? -7 : 7}`, duration: 0.11, yoyo: true, repeat: 5, ease: 'power1.inOut' }, '+=0.08');
              }

              if (scene.action === 'outro') {
                tl.to(containerEl, { x: '+=150', opacity: 0.4, duration: 1.2, ease: 'power2.inOut' }, '+=0.35');
              }

              if (scene.idle) {
                tl.call(startIdle);
              }
            }

            characterScenes.forEach((scene) => {
              if (scene.compactSkip && isCompact) return;
              const triggerEl = getTarget(scene.section);
              if (!triggerEl) return;

              const useSubtargets = scene.subtargets && scene.subtargets.length && !isCompact;

              if (scene.subtargets && scene.subtargets.length && isCompact) {
                // Phone/tablet: still cycle pose per item for variety, but stay
                // parked beside the whole group (arriveAt resolves position via
                // anchorTarget whenever isCompact is true, ignoring targetKey).
                let lastIdx = -1;
                const count = scene.subtargets.length;
                ScrollTrigger.create({
                  trigger: triggerEl,
                  start: scene.start ?? 'top 70%',
                  end: scene.end ?? 'bottom bottom',
                  onEnter: () => {
                    lastIdx = 0;
                    arriveAt(scene, undefined, scene.pose, false);
                  },
                  onEnterBack: () => {
                    lastIdx = count - 1;
                    const flip = lastIdx % 2 === 1;
                    arriveAt(scene, undefined, flip ? 'point-left' : 'point-right', flip);
                  },
                  onUpdate: (self) => {
                    const idx = Math.min(count - 1, Math.floor(self.progress * count));
                    if (idx !== lastIdx) {
                      lastIdx = idx;
                      const flip = idx % 2 === 1;
                      arriveAt(scene, undefined, flip ? 'point-left' : 'point-right', flip);
                    }
                  },
                });
              } else if (useSubtargets) {
                let lastIdx = -1;
                ScrollTrigger.create({
                  trigger: triggerEl,
                  start: scene.start ?? 'top 70%',
                  end: scene.end ?? 'bottom bottom',
                  onEnter: () => {
                    lastIdx = 0;
                    arriveAt(scene, scene.subtargets![0], scene.pose, false);
                  },
                  onEnterBack: () => {
                    lastIdx = scene.subtargets!.length - 1;
                    arriveAt(scene, scene.subtargets![lastIdx], 'point-left', true);
                  },
                  onUpdate: (self) => {
                    const idx = Math.min(
                      scene.subtargets!.length - 1,
                      Math.floor(self.progress * scene.subtargets!.length)
                    );
                    if (idx !== lastIdx) {
                      lastIdx = idx;
                      const flip = idx % 2 === 1;
                      arriveAt(scene, scene.subtargets![idx], flip ? 'point-left' : 'point-right', flip);
                    }
                  },
                });
              } else {
                ScrollTrigger.create({
                  trigger: triggerEl,
                  start: scene.start ?? 'top 75%',
                  end: scene.end ?? 'bottom 25%',
                  onEnter: () => arriveAt(scene),
                  onEnterBack: () => arriveAt(scene),
                });
              }
            });

            // Corrects the current scene's position on resize/orientation change
            // (a tier-crossing resize is already handled by matchMedia itself,
            // which reverts and reruns this whole setup) — debounced so a drag-
            // resize doesn't recompute on every intermediate frame.
            let resizeTimer: ReturnType<typeof setTimeout> | null = null;
            function handleResize() {
              if (resizeTimer) clearTimeout(resizeTimer);
              resizeTimer = setTimeout(() => {
                safeArea = readSafeAreaInsets();
                const current = currentSceneRef.current;
                if (!current) return;
                arriveAt(current.scene, current.targetKey, current.pose, current.flip, { flourish: false });
              }, 150);
            }
            window.addEventListener('resize', handleResize);
            window.addEventListener('orientationchange', handleResize);

            return () => {
              stopIdle();
              if (resizeTimer) clearTimeout(resizeTimer);
              window.removeEventListener('resize', handleResize);
              window.removeEventListener('orientationchange', handleResize);
            };
          }
        );

        // A refresh() forces an immediate layout pass across every trigger's
        // target element — measured to be the single biggest cause of dropped
        // frames during the entrance under CPU throttling, since it's expensive
        // regardless of when it runs. A short fixed delay just moves the stall
        // into a different part of the same still-active timeline. Waiting for
        // both web fonts to settle (font swaps can shift layout, which is the
        // one real reason this refresh matters) and genuine main-thread idle
        // time pushes it safely past the whole entrance instead.
        const runRefresh = () => ScrollTrigger.refresh();
        const scheduleIdle: (cb: () => void) => number =
          typeof window.requestIdleCallback === 'function'
            ? (cb) => window.requestIdleCallback(cb, { timeout: 1500 })
            : (cb) => window.setTimeout(cb, 900);
        const fontsReady = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
        Promise.resolve(fontsReady).finally(() => {
          if (cancelled) return;
          scheduleIdle(runRefresh);
        });
      }, containerEl);
    });

    return () => {
      cancelled = true;
      idleTweenRef.current?.kill();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

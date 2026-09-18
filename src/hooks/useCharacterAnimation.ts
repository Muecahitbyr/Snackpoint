import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  characterScenes,
  POSE_SRC,
  validateCharacterScenes,
  type PoseId,
  type CharacterScene,
} from '../components/character/characterScenes';

gsap.registerPlugin(ScrollTrigger);

if (import.meta.env.DEV) {
  validateCharacterScenes(characterScenes);
}

function getTarget(key: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-character-target="${key}"]`);
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

  useLayoutEffect(() => {
    const containerEl = container.current;
    const figureEl = figure.current;
    const imgAEl = imgA.current;
    const imgBEl = imgB.current;
    if (!containerEl || !figureEl || !imgAEl || !imgBEl) return;

    // Preload every pose once so switching never flickers a blank frame.
    Object.values(POSE_SRC).forEach((src) => {
      const im = new Image();
      im.src = src;
    });

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setPose(pose: PoseId) {
      if (currentPoseRef.current === pose) return;
      currentPoseRef.current = pose;
      const showingA = activeImgRef.current === 'A';
      const nextEl = showingA ? imgBEl : imgAEl;
      const prevEl = showingA ? imgAEl : imgBEl;
      nextEl!.src = POSE_SRC[pose];
      gsap.set(nextEl, { opacity: 0 });
      gsap.to(nextEl, { opacity: 1, duration: 0.3, ease: 'power1.out' });
      gsap.to(prevEl, { opacity: 0, duration: 0.3, ease: 'power1.out' });
      activeImgRef.current = showingA ? 'B' : 'A';
    }

    if (reduceMotion) {
      // Minimal, static presentation: a small fixed corner badge, no scroll-driven motion.
      // Sizing comes entirely from CSS (character.css breakpoints) — no extra JS scale.
      setPose('greet');
      const w = figureEl.offsetWidth;
      const h = figureEl.offsetHeight;
      gsap.set(containerEl, {
        x: window.innerWidth - w - 16,
        y: window.innerHeight - h - 16,
        opacity: 0,
      });
      gsap.to(containerEl, { opacity: 0.95, duration: 1, delay: 0.4 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(containerEl, { opacity: 0, scale: 0.8, x: -200, y: 120 });

      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: '(min-width: 1101px)',
          isTablet: '(min-width: 641px) and (max-width: 1100px)',
          isMobile: '(max-width: 640px)',
        },
        (context) => {
          const conditions = context.conditions as { isTablet: boolean; isMobile: boolean };
          const tierScale = conditions.isMobile ? 0.55 : conditions.isTablet ? 0.75 : 1;
          const isCompactTier = conditions.isMobile || conditions.isTablet;

          function computePosition(scene: CharacterScene, targetKey?: string, scale = 1) {
            const compact = isCompactTier && scene.compactAnchor;
            // Compact mode only swaps which side it stands on (e.g. "left" -> "below"),
            // not which target it tracks: a stacked mobile grid has cards too close
            // together for per-card "below" positioning to fit without overlap, so it
            // stays parked relative to anchorTarget (the whole grid) just like desktop,
            // only changing pose per active item instead of physically chasing it.
            const effectiveAnchor = compact ? scene.compactAnchor! : scene.anchor;
            const w = (figureEl!.offsetWidth || 200) * scale;
            const h = (figureEl!.offsetHeight || 280) * scale;
            const margin = 8;
            const baseOffsetY = isCompactTier && scene.compactOffsetY !== undefined ? scene.compactOffsetY : scene.offsetY ?? 0;

            if (effectiveAnchor === 'corner') {
              // Doesn't depend on any element rect at all — for targets much taller
              // than the viewport (e.g. a stacked mobile grid), that's the point:
              // nothing to drift out of sync with as the user keeps scrolling. Each
              // scene can still nudge the baseline via (compact)offsetY.
              return {
                x: window.innerWidth - w - margin - 2,
                y: window.innerHeight * 0.66 - h / 2 + baseOffsetY * tierScale,
              };
            }

            const el = getTarget(scene.anchorTarget ?? targetKey ?? scene.section);
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            // offsetWidth/Height are transform-agnostic (unlike getBoundingClientRect,
            // which reflects whatever scale is mid-flight from the previous scene), so
            // multiplying by the target scale here is the only way to get a stable,
            // race-free size for the anchor math.
            const ox = (scene.offsetX ?? 0) * tierScale;
            const oy = baseOffsetY * tierScale + (compact && effectiveAnchor === 'below' ? 30 : 0);
            let x: number;
            let y: number;

            switch (effectiveAnchor) {
              case 'left':
                x = rect.left - w + ox;
                y = rect.top + rect.height / 2 - h / 2 + oy;
                break;
              case 'right':
                x = rect.right + ox;
                y = rect.top + rect.height / 2 - h / 2 + oy;
                break;
              case 'above':
                x = rect.left + rect.width / 2 - w / 2 + ox;
                y = rect.top - h + oy;
                break;
              case 'below':
                x = rect.left + rect.width / 2 - w / 2 + ox;
                y = rect.bottom + oy;
                break;
              default:
                x = rect.left + rect.width / 2 - w / 2 + ox;
                y = rect.top + rect.height / 2 - h / 2 + oy;
            }

            // If the target itself leaves too little side gutter (common on phones
            // and tablets, where hero/section content runs almost full-width), the
            // usual "stand just outside the target's edge" math has nowhere to go
            // and the viewport clamp below would pull the character back on top of
            // the content instead. Detect that up front and hug the screen edge
            // instead, rather than clamping into an overlap.
            const gutterRight = window.innerWidth - rect.right;
            const gutterLeft = rect.left;
            const tightGutter = (conditions.isMobile || conditions.isTablet) && (
              (effectiveAnchor === 'right' && gutterRight < w) ||
              (effectiveAnchor === 'left' && gutterLeft < w)
            );
            if (tightGutter) {
              x = effectiveAnchor === 'left' ? margin + 2 : window.innerWidth - w - margin - 2;
            }
            x = Math.max(margin, Math.min(x, window.innerWidth - w - margin));
            y = Math.max(64, Math.min(y, window.innerHeight - h - margin));
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
            flipOverride?: boolean
          ) {
            // CSS (clamp() in character.css) already shrinks the figure per breakpoint,
            // so only the per-scene relative size is applied here — multiplying by
            // tierScale too would shrink it twice and make it nearly invisible on phones.
            const scale = scene.scale ?? 1;
            const pos = computePosition(scene, targetKey, scale);
            if (!pos) return;
            stopIdle();
            setPose(poseOverride ?? scene.pose);
            const flip = flipOverride ?? scene.flip ?? false;

            const tl = gsap.timeline();
            // anticipation: brief squash before committing to the move
            tl.to(containerEl, { scale: scale * 0.9, duration: 0.16, ease: 'power1.in' })
              .to(
                containerEl,
                {
                  x: pos.x,
                  y: pos.y,
                  opacity: 1,
                  scaleX: flip ? -scale : scale,
                  scaleY: scale,
                  duration: 0.85,
                  ease: 'back.out(1.5)',
                },
                '<0.04'
              );

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
            if (scene.compactSkip && isCompactTier) return;
            const triggerEl = getTarget(scene.section);
            if (!triggerEl) return;

            // On phone/tablet a tall single-column grid has too little room between
            // items for continuous per-card tracking without overlapping neighbours
            // (each recompute is based on the viewport at that instant, and the
            // character then sits still — in fixed viewport coordinates — while the
            // page keeps scrolling underneath it until the next one). Simpler and
            // safer: park it once, beside the whole group, pose fixed.
            const useSubtargets = scene.subtargets && scene.subtargets.length && !(isCompactTier && scene.compactAnchor);

            if (useSubtargets) {
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

          return () => stopIdle();
        }
      );

      ScrollTrigger.refresh();
    }, containerEl);

    return () => {
      idleTweenRef.current?.kill();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

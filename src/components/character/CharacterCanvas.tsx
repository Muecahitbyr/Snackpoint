import { Component, Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3, type OrthographicCamera as ThreeOrthographicCamera } from 'three';
import CharacterController from './CharacterController';
import type { CharacterModelHandle } from './CharacterModel';
import { useCharacterScroll, type CharacterScrollDebugInfo } from '../../hooks/useCharacterScroll';
import { MODEL_HEIGHT_UNITS, type CharacterControllerAPI } from './characterTypes';

/** Keeps the orthographic frustum sized to exactly match the viewport in CSS
 * pixels, so 1 world unit == 1 screen px and DOM rects can be used as 3D
 * targets directly, with zero perspective distortion. */
function PixelCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as ThreeOrthographicCamera;
    cam.left = -size.width / 2;
    cam.right = size.width / 2;
    cam.top = size.height / 2;
    cam.bottom = -size.height / 2;
    cam.near = 0.1;
    cam.far = 2000;
    cam.position.set(0, 0, 100);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

/** If the GLB fails to load or WebGL throws mid-render, hide the character
 * layer instead of taking the rest of the site down with it. */
class CharacterErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn('[character] failed to load, hiding the 3D layer:', error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const debugEnabled =
  import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('characterDebug') === '1';

interface HandScreenPositions {
  left: { x: number; y: number } | null;
  right: { x: number; y: number } | null;
}

/** Dev-only pointing-accuracy audit: projects both hand bones to screen
 * space every frame and reports them up (throttled) so the DOM overlay can
 * draw a hand -> target line, for visually verifying a Point clip actually
 * reaches toward the DOM element it's meant to indicate. No effect in
 * production — this component is never mounted unless debugEnabled. */
function PointingAudit({
  modelHandleRef,
  onUpdate,
}: {
  modelHandleRef: MutableRefObject<CharacterModelHandle | null>;
  onUpdate: (pos: HandScreenPositions) => void;
}) {
  const { camera, size } = useThree();
  const vec = useRef(new Vector3()).current; // reused every frame, never reallocated
  const lastSentRef = useRef(0);

  useFrame(() => {
    const now = performance.now();
    if (now - lastSentRef.current < 100) return; // ~10Hz is plenty for a debug overlay
    lastSentRef.current = now;

    const handle = modelHandleRef.current;
    if (!handle) return;

    function toScreen(bone: { getWorldPosition: (v: Vector3) => Vector3 } | null) {
      if (!bone) return null;
      bone.getWorldPosition(vec);
      vec.project(camera);
      return { x: (vec.x * 0.5 + 0.5) * size.width, y: (1 - (vec.y * 0.5 + 0.5)) * size.height };
    }

    onUpdate({ left: toScreen(handle.handBoneL), right: toScreen(handle.handBoneR) });
  });

  return null;
}

export default function CharacterCanvas() {
  const apiRef = useRef<CharacterControllerAPI | null>(null);
  const modelHandleRef = useRef<CharacterModelHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState<CharacterScrollDebugInfo | null>(null);
  const [handScreenPos, setHandScreenPos] = useState<HandScreenPositions>({ left: null, right: null });
  const [targetCrosshair, setTargetCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [webglOk] = useState(supportsWebGL);

  // Dev-only pointing-accuracy audit: re-measure the current target element's
  // on-screen center whenever the debug info changes (i.e. on scene change),
  // matching the "only at scene-change, not per frame" DOM-measurement rule
  // used everywhere else in this codebase.
  useEffect(() => {
    if (!debugEnabled || !debugInfo) return;
    const el = document.querySelector<HTMLElement>(`[data-character-target="${debugInfo.target}"]`);
    if (!el) {
      setTargetCrosshair(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetCrosshair({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }, [debugInfo]);

  useCharacterScroll({
    apiRef,
    ready,
    onDebugUpdate: debugEnabled ? setDebugInfo : undefined,
  });

  // Starts off-screen to the right so nothing flashes at viewport-center
  // before the hero intro walk-in kicks in.
  const initialPosition = useMemo<[number, number, number]>(() => {
    if (typeof window === 'undefined') return [0, 0, 0];
    return [window.innerWidth / 2 + 400, 0, 0];
  }, []);
  const initialScale = 200 / MODEL_HEIGHT_UNITS;

  if (!webglOk) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <CharacterErrorBoundary>
        <Canvas
          orthographic
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.5]}
          // react-three-fiber sets its own default styling on the actual
          // <canvas> DOM element (not just its wrapper), which does NOT
          // inherit `pointer-events: none` from the wrapper div below —
          // verified via Playwright: without this, the canvas (which spans
          // the full viewport) silently intercepts every click on the page,
          // including the hero CTA. Must be set here, directly on Canvas's
          // own style prop, not just the wrapper.
          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <PixelCamera />
          <ambientLight intensity={1.1} />
          <directionalLight position={[2, 4, 3]} intensity={1.4} />
          <Suspense fallback={null}>
            <CharacterController
              apiRef={apiRef}
              modelHandleRef={modelHandleRef}
              initialPosition={initialPosition}
              initialScale={initialScale}
              onReady={() => setReady(true)}
            />
            {debugEnabled && <PointingAudit modelHandleRef={modelHandleRef} onUpdate={setHandScreenPos} />}
          </Suspense>
        </Canvas>
      </CharacterErrorBoundary>
      {debugEnabled && debugInfo && (
        <div
          style={{
            position: 'fixed',
            bottom: 12,
            left: 12,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            color: '#0f0',
            font: '11px/1.4 monospace',
            padding: '6px 8px',
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        >
          Scene: {debugInfo.sceneId}
          <br />
          Animation: {debugInfo.animation}
          <br />
          Device: {debugInfo.breakpoint}
          <br />
          Side: {debugInfo.side}
          <br />
          Target: {debugInfo.target}
          <br />
          Scroll velocity: {debugInfo.velocity}px/s{debugInfo.fast ? ' (fast)' : ''}
          <br />
          Collision adjusted: {debugInfo.collisionAdjusted ? 'yes' : 'no'}
        </div>
      )}
      {debugEnabled && debugInfo && (
        <div
          style={{
            position: 'fixed',
            left: debugInfo.screenBox.left,
            top: debugInfo.screenBox.top,
            width: debugInfo.screenBox.width,
            height: debugInfo.screenBox.height,
            border: '1px dashed #0f0',
            boxSizing: 'border-box',
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        />
      )}
      {debugEnabled && targetCrosshair && (
        <svg
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9997, pointerEvents: 'none' }}
        >
          {/* target crosshair: the actual DOM element center the character is meant to indicate */}
          <line x1={targetCrosshair.x - 14} y1={targetCrosshair.y} x2={targetCrosshair.x + 14} y2={targetCrosshair.y} stroke="#ff2d55" strokeWidth={2} />
          <line x1={targetCrosshair.x} y1={targetCrosshair.y - 14} x2={targetCrosshair.x} y2={targetCrosshair.y + 14} stroke="#ff2d55" strokeWidth={2} />
          <circle cx={targetCrosshair.x} cy={targetCrosshair.y} r={20} fill="none" stroke="#ff2d55" strokeWidth={1.5} />
          {/* each hand's actual projected screen position, with a line to the target —
              a straight, short, roughly-aligned line means the arm genuinely reaches
              toward the target; a long/misaligned line means it doesn't. */}
          {handScreenPos.left && (
            <>
              <line x1={handScreenPos.left.x} y1={handScreenPos.left.y} x2={targetCrosshair.x} y2={targetCrosshair.y} stroke="#0af" strokeWidth={1.5} strokeDasharray="4 3" />
              <circle cx={handScreenPos.left.x} cy={handScreenPos.left.y} r={6} fill="#0af" />
            </>
          )}
          {handScreenPos.right && (
            <>
              <line x1={handScreenPos.right.x} y1={handScreenPos.right.y} x2={targetCrosshair.x} y2={targetCrosshair.y} stroke="#fb0" strokeWidth={1.5} strokeDasharray="4 3" />
              <circle cx={handScreenPos.right.x} cy={handScreenPos.right.y} r={6} fill="#fb0" />
            </>
          )}
        </svg>
      )}
    </div>
  );
}

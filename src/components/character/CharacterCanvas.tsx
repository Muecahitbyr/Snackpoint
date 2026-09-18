import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { OrthographicCamera as ThreeOrthographicCamera } from 'three';
import CharacterController from './CharacterController';
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

export default function CharacterCanvas() {
  const apiRef = useRef<CharacterControllerAPI | null>(null);
  const [ready, setReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState<CharacterScrollDebugInfo | null>(null);
  const [webglOk] = useState(supportsWebGL);

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
              initialPosition={initialPosition}
              initialScale={initialScale}
              onReady={() => setReady(true)}
            />
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
    </div>
  );
}

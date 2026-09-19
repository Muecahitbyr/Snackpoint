import { useEffect, useRef, type MutableRefObject } from 'react';
import { LoopOnce, LoopRepeat } from 'three';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import CharacterModel, { type CharacterModelHandle } from './CharacterModel';
import {
  FACE_CAMERA_ROTATION_Y,
  FACE_LEFT_ROTATION_Y,
  FACE_RIGHT_ROTATION_Y,
  HEAD_TRACK_MAX_PITCH,
  HEAD_TRACK_MAX_YAW,
  LOOPING_ANIMATIONS,
  type AnimationName,
  type CharacterControllerAPI,
} from './characterTypes';

const CROSSFADE_SECONDS = 0.35;
/** Below this travel distance (world units == px), a full walk cycle would
 * look like unnecessary fidgeting — just settle facing the camera instead. */
const SMALL_MOVE_PX = 48;
/** Walk.glb loops every ~1s (character-3d/README.md) — snapping the walk
 * duration to a half-cycle multiple means the legs finish a stride instead
 * of being cut off mid-step right as the character stops. Only applied to
 * normal-speed transitions; fast (scroll-catch-up) transitions prioritize
 * keeping up over gait-perfect timing. */
const WALK_HALF_CYCLE_SECONDS = 0.5;
/** Clips that don't reliably animate the head/neck bones (Wave's motion is
 * arm-only per character-3d/README.md) — head tracking sits out during them
 * so it can't be left fighting an untouched bone for a full clip length. */
const HEAD_TRACK_EXCLUDED: ReadonlySet<AnimationName> = new Set(['Wave', 'Walk']);
const HEAD_TRACK_SMOOTH_SPEED = 4.5; // lower = softer, more deliberate convergence
const HEAD_TRACK_DEADZONE_YAW = (2.5 * Math.PI) / 180; // ignore near-dead-ahead targets
const HEAD_TRACK_DEADZONE_PITCH = (1.5 * Math.PI) / 180;
/** "Körper zuerst, dann Kopf": head tracking stays neutral for this long
 * after the character finishes settling into a parked pose, so the turn
 * reads as body-first rather than the head snapping toward the target the
 * instant the feet stop. */
const HEAD_TRACK_ENGAGE_DELAY_S = 0.18;
const YAW_SENSITIVITY_PX = 900; // world px of horizontal offset per full max-yaw
const PITCH_SENSITIVITY_PX = 700;
const APPROX_HEAD_HEIGHT_UNITS = 1.55; // near the top of the 1.75-unit-tall model
/** Autonomous idle "glance" amplitude/period when parked with nothing
 * specific to look at — subtle, and naturally pauses near the sine's peaks
 * rather than moving continuously (see IDLE_WANDER note in useFrame). */
const IDLE_WANDER_YAW = (8 * Math.PI) / 180;
const IDLE_WANDER_PERIOD_S = 7;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Shortest signed angular delta from `from` to `to`, wrapped to [-π, π] —
 * without this, a tween from e.g. facing-left (π) to facing-camera (-π/2)
 * would spin the long way around instead of the short way. */
function shortestDelta(from: number, to: number) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

interface CharacterControllerProps {
  apiRef: MutableRefObject<CharacterControllerAPI | null>;
  initialPosition: [number, number, number];
  initialScale: number;
  onReady: () => void;
  /** Dev-only: lets a sibling debug component (pointing-accuracy audit) read
   * bone positions directly. Not used by any production logic. */
  modelHandleRef?: MutableRefObject<CharacterModelHandle | null>;
}

/** Owns movement + clip-selection + head-tracking logic for the character
 * and publishes an imperative API (via apiRef) that useCharacterScroll drives
 * from outside the R3F tree. Rendered inside <Suspense>, so by the time it
 * mounts the GLB is already loaded. */
export default function CharacterController({ apiRef, initialPosition, initialScale, onReady, modelHandleRef }: CharacterControllerProps) {
  const ownModelRef = useRef<CharacterModelHandle>(null);
  const modelRef = modelHandleRef ?? ownModelRef;
  const currentNameRef = useRef<AnimationName | null>(null);
  const isWalkingRef = useRef(false);
  const activeTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const pointHoldTimerRef = useRef<gsap.core.Tween | null>(null);
  const parkedAtRef = useRef(0); // performance.now() ms of the last "settled" moment

  // Head tracking state — all plain refs, no per-frame allocation.
  const lookTargetRef = useRef<{ x: number; y: number } | null>(null);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const headBindYawRef = useRef(0);
  const headBindPitchRef = useRef(0);
  const headBindCapturedRef = useRef(false);
  const clockRef = useRef(0);

  useEffect(() => {
    function playAnimation(name: AnimationName) {
      const handle = modelRef.current;
      const next = handle?.actions?.[name];
      if (!next || currentNameRef.current === name) return;

      const prevName = currentNameRef.current;
      const prev = prevName ? handle!.actions[prevName] : null;
      const isLooping = LOOPING_ANIMATIONS.has(name);

      next.reset();
      next.setLoop(isLooping ? LoopRepeat : LoopOnce, isLooping ? Infinity : 1);
      next.clampWhenFinished = !isLooping;
      next.enabled = true;
      if (prev && prev !== next) prev.fadeOut(CROSSFADE_SECONDS);
      next.fadeIn(CROSSFADE_SECONDS).play();
      currentNameRef.current = name;
    }

    function settleFacingCamera(group: NonNullable<CharacterModelHandle['group']>, duration: number) {
      gsap.to(group.rotation, {
        y: group.rotation.y + shortestDelta(group.rotation.y, FACE_CAMERA_ROTATION_Y),
        duration,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    function walkTo(x: number, y: number, arrival: AnimationName, options: { fast?: boolean } = {}) {
      const group = modelRef.current?.group;
      if (!group) return;

      activeTimelineRef.current?.kill();
      pointHoldTimerRef.current?.kill();
      gsap.killTweensOf(group.position);
      gsap.killTweensOf(group.rotation);

      const fromX = group.position.x;
      const fromY = group.position.y;
      isWalkingRef.current = false;

      const dx = x - fromX;
      const dy = y - fromY;
      const dist = Math.hypot(dx, dy);
      const fast = options.fast ?? false;

      if (dist < SMALL_MOVE_PX) {
        // Too close for a walk cycle to read as anything but fidgeting —
        // just face the camera and settle straight into the arrival clip,
        // with a brief "orient before interact" beat like every other arrival.
        settleFacingCamera(group, 0.25);
        if (dist > 0.5) {
          gsap.to(group.position, { x, y, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
        }
        const tl = gsap.timeline();
        tl.call(() => {
          parkedAtRef.current = performance.now();
          playAnimation(arrival);
        }, [], 0.1);
        activeTimelineRef.current = tl;
        return;
      }

      isWalkingRef.current = true;
      const travelFacing = dx >= 0 ? FACE_RIGHT_ROTATION_Y : FACE_LEFT_ROTATION_Y;

      // TurnLeft/TurnRight were evaluated for mid-walk reversals (walking one
      // way, newly asked to walk the other) but dropped: a departure from a
      // parked pose is always exactly a 90° turn (the three facing states —
      // left/camera/right — are evenly spaced), so the only case where a
      // Turn clip could add anything is a rare fast-interrupt reversal, and
      // crossfading Walk -> Turn -> Walk within a fraction of a second
      // couldn't be visually verified as an improvement over the plain
      // rotation tween, which already reads smoothly in every tested scene
      // (see CHARACTER_3D.md "Turn clips"). Kept simple on purpose.
      const prepDuration = fast ? 0.12 : 0.22;
      const settleDuration = fast ? 0.15 : 0.32;
      let walkDuration = clamp(dist / (fast ? 1600 : 520), fast ? 0.22 : 0.45, fast ? 0.55 : 1.7);
      if (!fast) {
        // Sync translation to whole Walk half-cycles so the legs land on a
        // full step right as the character arrives, instead of freezing
        // mid-stride.
        walkDuration = Math.max(
          WALK_HALF_CYCLE_SECONDS,
          Math.round(walkDuration / WALK_HALF_CYCLE_SECONDS) * WALK_HALF_CYCLE_SECONDS
        );
      }
      const posStart = prepDuration * 0.55;
      const posEnd = posStart + walkDuration;
      const settleStart = Math.max(posStart, posEnd - settleDuration);
      // "Ankommen -> orientieren -> interagieren": a short natural beat
      // between settling and the point/look/wave clip actually starting,
      // scaled a little by how far it walked (100-250ms).
      const arrivalDelay = fast ? 0.05 : clamp(0.1 + dist / 4000, 0.1, 0.25);

      playAnimation('Walk');

      const tl = gsap.timeline();
      const proxy = { t: 0 };
      // A shallow arc + gentle rise/fall (not a bounce) instead of a flat
      // linear slide — reads as an actual stride, not an object gliding
      // between two points. Kept modest on purpose (max ~12px lift).
      const arcHeight = fast ? 0 : Math.min(dist * 0.045, 12);

      // Prep: turn to face the direction of travel before moving.
      tl.to(
        group.rotation,
        { y: () => group.rotation.y + shortestDelta(group.rotation.y, travelFacing), duration: prepDuration, ease: 'power2.out' },
        0
      );

      tl.to(
        proxy,
        {
          t: 1,
          duration: walkDuration,
          ease: fast ? 'power2.inOut' : 'sine.inOut',
          onUpdate: () => {
            const tt = proxy.t;
            group.position.x = fromX + dx * tt;
            group.position.y = fromY + dy * tt + arcHeight * Math.sin(tt * Math.PI);
          },
        },
        posStart
      );

      tl.to(
        group.rotation,
        {
          y: () => group.rotation.y + shortestDelta(group.rotation.y, FACE_CAMERA_ROTATION_Y),
          duration: Math.max(0.15, posEnd - settleStart),
          ease: 'power2.out',
        },
        settleStart
      );

      tl.call(
        () => {
          isWalkingRef.current = false;
          parkedAtRef.current = performance.now();
          playAnimation(arrival);
        },
        [],
        posEnd + arrivalDelay
      );

      activeTimelineRef.current = tl;
    }

    function snapTo(x: number, y: number) {
      const group = modelRef.current?.group;
      if (!group) return;
      activeTimelineRef.current?.kill();
      isWalkingRef.current = false;
      gsap.killTweensOf(group.position);
      gsap.killTweensOf(group.rotation);
      gsap.to(group.position, { x, y, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
      settleFacingCamera(group, 0.35);
    }

    function setScale(scale: number) {
      const group = modelRef.current?.group;
      if (!group) return;
      gsap.killTweensOf(group.scale);
      gsap.to(group.scale, { x: scale, y: scale, z: scale, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    }

    apiRef.current = {
      playAnimation,
      walkTo,
      snapTo,
      setScale,
      lookAt: (x: number, y: number) => {
        lookTargetRef.current = { x, y };
      },
      clearLookAt: () => {
        lookTargetRef.current = null;
      },
      isReady: () => !!modelRef.current?.group,
      isWalking: () => isWalkingRef.current,
    };

    const mixer = modelRef.current?.mixer;
    function onFinished(event: { action: unknown }) {
      const name = currentNameRef.current;
      const handle = modelRef.current;
      if (!name || !handle || LOOPING_ANIMATIONS.has(name)) return;
      if (event.action !== handle.actions[name]) return;
      // Let a Point/Wave/Look/Turn clip's end pose hold a beat before
      // crossfading back to Idle, so it reads as a deliberate gesture
      // rather than something the character immediately shrugs off —
      // without making the site feel sluggish.
      pointHoldTimerRef.current?.kill();
      pointHoldTimerRef.current = gsap.delayedCall(0.15, () => playAnimation('Idle'));
    }
    mixer?.addEventListener('finished', onFinished);

    playAnimation('Idle');
    onReady();

    return () => {
      mixer?.removeEventListener('finished', onFinished);
      activeTimelineRef.current?.kill();
      pointHoldTimerRef.current?.kill();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subtle additive head-turn toward the current look target — only while
  // parked (not mid-walk), not during clips that don't animate the head
  // themselves (see HEAD_TRACK_EXCLUDED), and only once HEAD_TRACK_ENGAGE_DELAY_S
  // has passed since settling ("body first, then head"). Bounded to ±25°/±12°
  // from the bone's bind-time rotation, which also acts as a safety clamp: if
  // a clip ever turns out not to touch the head bone at all, the additive
  // offset can't drift past that bound frame over frame. With no explicit
  // look target and the character idling, a slow autonomous glance (well
  // under the tracking max) keeps a fully-parked character from reading as
  // frozen, without fighting the tracking system — same clamped mechanism,
  // just a different desired angle.
  useFrame((_, delta) => {
    const handle = modelRef.current;
    const head = handle?.headBone;
    const group = handle?.group;
    if (!head || !group) return;

    if (!headBindCapturedRef.current) {
      headBindYawRef.current = head.rotation.y;
      headBindPitchRef.current = head.rotation.x;
      headBindCapturedRef.current = true;
    }

    clockRef.current += delta;

    const clipName = currentNameRef.current;
    const settledLongEnough = performance.now() - parkedAtRef.current >= HEAD_TRACK_ENGAGE_DELAY_S * 1000;
    const canTrack = !isWalkingRef.current && clipName !== null && !HEAD_TRACK_EXCLUDED.has(clipName) && settledLongEnough;
    const target = canTrack ? lookTargetRef.current : null;

    let desiredYaw = 0;
    let desiredPitch = 0;
    if (target) {
      const headWorldX = group.position.x;
      const headWorldY = group.position.y + group.scale.y * APPROX_HEAD_HEIGHT_UNITS;
      desiredYaw = clamp((target.x - headWorldX) / YAW_SENSITIVITY_PX, -1, 1) * HEAD_TRACK_MAX_YAW;
      desiredPitch = clamp((target.y - headWorldY) / PITCH_SENSITIVITY_PX, -1, 1) * HEAD_TRACK_MAX_PITCH;
      // Deadzone: a target that's already close to dead-ahead doesn't need
      // a perceptible correction — avoids micro-adjustments reading as jitter.
      if (Math.abs(desiredYaw) < HEAD_TRACK_DEADZONE_YAW) desiredYaw = 0;
      if (Math.abs(desiredPitch) < HEAD_TRACK_DEADZONE_PITCH) desiredPitch = 0;
    } else if (canTrack && clipName === 'Idle') {
      // Autonomous idle wander — a slow sine that naturally eases through
      // zero and pauses near its peaks, not a constant restless motion.
      desiredYaw = IDLE_WANDER_YAW * Math.sin((clockRef.current / IDLE_WANDER_PERIOD_S) * Math.PI * 2);
    }

    const smooth = 1 - Math.exp(-delta * HEAD_TRACK_SMOOTH_SPEED);
    yawRef.current += (desiredYaw - yawRef.current) * smooth;
    pitchRef.current += (desiredPitch - pitchRef.current) * smooth;

    head.rotation.y = clamp(
      head.rotation.y + yawRef.current,
      headBindYawRef.current - HEAD_TRACK_MAX_YAW,
      headBindYawRef.current + HEAD_TRACK_MAX_YAW
    );
    head.rotation.x = clamp(
      head.rotation.x + pitchRef.current,
      headBindPitchRef.current - HEAD_TRACK_MAX_PITCH,
      headBindPitchRef.current + HEAD_TRACK_MAX_PITCH
    );
  });

  return <CharacterModel ref={modelRef} initialPosition={initialPosition} initialScale={initialScale} />;
}

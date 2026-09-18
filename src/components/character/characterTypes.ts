// Shared types + model constants for the 3D character companion.

export type AnimationName =
  | 'Idle'
  | 'Walk'
  | 'Wave'
  | 'PointLeft'
  | 'PointRight'
  | 'PointUp'
  | 'PointDown'
  | 'LookLeft'
  | 'LookRight'
  | 'TurnLeft'
  | 'TurnRight';

/** Idle and Walk loop; every other clip plays once and holds its end pose
 * (see character-3d/README.md "ANIMATIONEN") until the controller crossfades
 * back to Idle. */
export const LOOPING_ANIMATIONS: ReadonlySet<AnimationName> = new Set(['Idle', 'Walk']);

/** 'top'/'bottom' park the character above/below the target (horizontally
 * centered on it) — used on mobile when there's no side gutter to stand in.
 * 'auto' runs the safe-placement algorithm (useCharacterScroll's
 * `pickSafePlacement`), trying bottom → top → left → right and picking the
 * first that actually fits the viewport without going off-screen. */
export type Side = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'auto';
export type Align = 'top' | 'center' | 'bottom';

export interface CharacterPlacement {
  side: Side;
  align?: Align;
  offsetX?: number;
  offsetY?: number;
  /** multiplier against the base responsive pixel height, for tight spots */
  scale?: number;
  /** for side: 'auto' only — which sides to try, in order. Defaults to
   * ['bottom', 'top', 'left', 'right']. Use e.g. ['top', 'bottom'] to rule
   * out a left/right squeeze entirely on a narrow target. */
  sideOrder?: Exclude<Side, 'auto' | 'center'>[];
}

export interface CharacterScene {
  id: string;
  /** data-character-target value used as the ScrollTrigger trigger element */
  section: string;
  /** animation clip played on arrival; auto-returns to Idle once it finishes
   * if one-shot. Omit to let the system pick Point{Left,Right,Up,Down} from
   * `side` automatically (see `defaultActionForSide`). */
  action?: AnimationName;
  /** the character turns its head toward this scene's own target element
   * once parked (see useCharacterScroll's lookAt wiring). Set false to opt out. */
  lookAtTarget?: boolean;
  desktop: CharacterPlacement;
  /** overrides for tablet/phone, when the desktop values don't translate directly.
   * Omit `side` here to let the mobile safe-placement algorithm choose
   * top/bottom/left/right automatically based on available space. */
  mobile?: Partial<CharacterPlacement>;
  /** applied on top of `mobile` when the viewport is <=390px — for targets
   * whose safe spot needs a stricter rule on very narrow phones specifically
   * (e.g. ruling out left/right entirely, or a smaller fallback scale). */
  narrowMobile?: Partial<CharacterPlacement>;
  start?: string;
  end?: string;
  /** skip this scene below the tablet breakpoint (no safe spot there) */
  compactSkip?: boolean;
}

/** Deterministic default gesture per parking side — verified against the
 * actual GLB (see CHARACTER_3D.md "Point direction"), not assumed from the
 * clip name alone: standing left of a target points with the body's own
 * left arm (PointLeft), which on a camera-facing character reads on-screen
 * as reaching toward its right — i.e. toward the target. Same logic for
 * top/bottom via PointDown/PointUp. */
export function defaultActionForSide(side: Side): AnimationName {
  switch (side) {
    case 'left':
      return 'PointLeft';
    case 'right':
      return 'PointRight';
    case 'top':
      return 'PointDown';
    case 'bottom':
      return 'PointUp';
    default:
      return 'Idle';
  }
}

export interface CharacterControllerAPI {
  /** Crossfades to a new clip. Loops Idle/Walk; plays everything else once and
   * auto-returns to Idle when it finishes. */
  playAnimation(name: AnimationName): void;
  /** Walks the character from its current position to (x, y) in world units —
   * turning to face the travel direction, crossfading through Walk, slowing
   * in, turning to face the camera, then playing `arrival`. `fast` compresses
   * the whole sequence for catch-up during rapid scrolling. */
  walkTo(x: number, y: number, arrival: AnimationName, options?: { fast?: boolean }): void;
  /** Repositions instantly (resize/orientation correction) without the walk flourish. */
  snapTo(x: number, y: number): void;
  setScale(scale: number): void;
  /** Subtle additive head-turn toward a world point, applied on top of
   * whatever clip is currently playing. Only takes effect while parked
   * (not mid-walk) — see CharacterController's useFrame. */
  lookAt(x: number, y: number): void;
  clearLookAt(): void;
  isReady(): boolean;
}

// Measured directly from output/character-animated.glb (character-3d project) —
// see character-3d/PROJECT_STATE.md. Feet sit at local Y=0.
export const MODEL_HEIGHT_UNITS = 1.75;

/** The rig's baked "forward" is +X in glTF space (Blender export axis convention:
 * gltf_X = blender_X, and character-3d docs record the character facing +X in
 * Blender). Rotating -90° around Y turns that to face +Z, i.e. toward the camera. */
export const FACE_CAMERA_ROTATION_Y = -Math.PI / 2;
/** rotation.y = 0 points local forward (+X) at world +X, i.e. screen-right. */
export const FACE_RIGHT_ROTATION_Y = 0;
/** rotation.y = π points local forward at world -X, i.e. screen-left. */
export const FACE_LEFT_ROTATION_Y = Math.PI;

export const GLTF_PATH = '/models/character-animated.glb';

// Bone names as they appear in the exported GLB (verified via pygltflib node
// dump against output/character-animated.glb — see character-3d/README.md
// "RIGGING" for the full 24-bone list).
export const HEAD_BONE_NAME = 'head';
export const NECK_BONE_NAME = 'neck';

export const HEAD_TRACK_MAX_YAW = (25 * Math.PI) / 180;
export const HEAD_TRACK_MAX_PITCH = (12 * Math.PI) / 180;

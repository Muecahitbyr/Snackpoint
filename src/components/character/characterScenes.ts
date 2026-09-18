// Central choreography config for the scroll-driven character companion.
// Add a new beat by adding an entry here — no changes needed elsewhere.

export type PoseId = 'greet' | 'point-dual' | 'point-right' | 'point-left' | 'walk-away';
export type ActionId = 'intro' | 'point' | 'watch' | 'attention' | 'outro';
export type Side = 'left' | 'right';
export type Align = 'top' | 'center' | 'bottom';

export const POSE_SRC: Record<PoseId, string> = {
  greet: '/character/offer-hand.webp',
  'point-dual': '/character/point-dual-diagonal.webp',
  'point-right': '/character/point-right-chest.webp',
  'point-left': '/character/point-left-reach.webp',
  'walk-away': '/character/walk-away-back.webp',
};

/**
 * Which way each pose points on screen, unflipped. `null` means the pose isn't
 * directional (e.g. the hero greet or the footer walk-away).
 */
const POSE_BASE_DIRECTION: Record<PoseId, Side | null> = {
  greet: null,
  'point-dual': 'right',
  'point-right': 'right',
  'point-left': 'left',
  'walk-away': null,
};

export interface CharacterScene {
  id: string;
  /** data-character-target value used as the ScrollTrigger trigger element */
  section: string;
  pose: PoseId;
  action: ActionId;
  /**
   * Which side of the target element the character stands on. Ignored when
   * `center` is set (the footer's walk-off beat centers on its target instead).
   */
  side: Side;
  /** vertical alignment against the target's own box (default 'center') */
  align?: Align;
  /** stand centered on the target instead of to a side (footer outro) */
  center?: boolean;
  offsetX?: number;
  offsetY?: number;
  /** overrides for phone/tablet, when the desktop values don't translate directly */
  mobileSide?: Side;
  mobileAlign?: Align;
  mobileOffsetX?: number;
  mobileOffsetY?: number;
  /** relative size multiplier against the CSS clamp() base size */
  scale?: number;
  flip?: boolean;
  start?: string;
  end?: string;
  /** keep a gentle idle bob/rotate loop going while parked in this scene */
  idle?: boolean;
  /**
   * For sections with several internal data-character-target elements (e.g.
   * service or product cards): the character glides between them as the user
   * scrolls through the section, alternating pose/flip so it always points at
   * the active item. On phone/tablet this still changes pose per item, but
   * parks beside `anchorTarget` (the whole group) rather than physically
   * chasing each one — a tall stacked column leaves too little room between
   * items for per-card tracking without overlap.
   */
  subtargets?: string[];
  /** the whole-group element subtargets fall back to positioning against on phone/tablet */
  anchorTarget?: string;
  /** skip this scene on phone/tablet (a transient beat with no safe spot there) */
  compactSkip?: boolean;
}

export const characterScenes: CharacterScene[] = [
  {
    id: 'hero-intro',
    section: 'hero',
    pose: 'greet',
    action: 'intro',
    side: 'right',
    offsetX: -32,
    offsetY: 60,
    mobileOffsetY: 275,
    mobileOffsetX: -12,
    scale: 1,
    idle: true,
  },
  {
    id: 'hero-cta',
    section: 'cta-hero',
    pose: 'point-left',
    action: 'attention',
    side: 'right',
    offsetX: 12,
    offsetY: -6,
    scale: 0.8,
    start: 'top 68%',
    end: 'bottom 45%',
    compactSkip: true,
  },
  {
    id: 'about-watch',
    section: 'about-text',
    pose: 'point-left',
    action: 'watch',
    side: 'right',
    offsetX: 36,
    offsetY: -30,
    mobileAlign: 'top',
    mobileOffsetY: 4,
    scale: 0.95,
    idle: true,
  },
  {
    id: 'services-walk',
    section: 'services',
    anchorTarget: 'services',
    pose: 'point-dual',
    action: 'point',
    side: 'left',
    offsetX: -16,
    offsetY: 0,
    mobileAlign: 'top',
    mobileOffsetY: 4,
    scale: 0.85,
    start: 'top 68%',
    end: 'bottom bottom',
    subtargets: ['snacks', 'dhl', 'lotto'],
    idle: true,
  },
  {
    id: 'highlight-hype',
    section: 'highlight',
    pose: 'point-dual',
    action: 'attention',
    side: 'right',
    flip: true,
    align: 'top',
    offsetX: -28,
    offsetY: 32,
    mobileOffsetY: 4,
    scale: 0.85,
  },
  {
    id: 'products-walk',
    section: 'products',
    anchorTarget: 'products-grid',
    pose: 'point-right',
    action: 'point',
    side: 'left',
    offsetX: -14,
    offsetY: 0,
    mobileAlign: 'top',
    mobileOffsetY: -8,
    scale: 0.85,
    start: 'top 65%',
    end: 'bottom bottom',
    subtargets: ['product-0', 'product-1', 'product-2', 'product-3'],
  },
  {
    id: 'reviews-watch',
    section: 'reviews',
    pose: 'point-left',
    action: 'watch',
    side: 'right',
    align: 'top',
    offsetX: 20,
    offsetY: 24,
    mobileOffsetY: 4,
    scale: 0.85,
    idle: true,
  },
  {
    id: 'hours-point',
    section: 'hours',
    pose: 'point-right',
    action: 'point',
    side: 'left',
    align: 'top',
    offsetX: -18,
    offsetY: 8,
    scale: 0.85,
    start: 'top 72%',
    end: 'bottom 40%',
    idle: true,
    // The 7-row table runs close to full-width in the single-column mobile
    // layout — there's no gutter beside or above it wide/tall enough for the
    // character not to cover at least one row. route-point fires moments
    // later for the same location block, so the section still gets visited.
    compactSkip: true,
  },
  {
    id: 'route-point',
    section: 'route',
    pose: 'point-right',
    action: 'point',
    side: 'left',
    offsetX: -16,
    offsetY: -14,
    scale: 0.85,
  },
  {
    id: 'footer-outro',
    section: 'footer',
    pose: 'walk-away',
    action: 'outro',
    side: 'left',
    center: true,
    offsetY: -60,
    // The footer is short on phone/tablet, so "centered, nudged up" (good on
    // desktop, where the footer is wider and text sits on one line) lands
    // right on top of the brand text. Push it down toward the empty space
    // near the bottom of the footer instead.
    mobileOffsetY: 70,
    scale: 0.9,
    start: 'top 95%',
    end: 'bottom 5%',
  },
];

function effectiveDirection(pose: PoseId, flip?: boolean): Side | null {
  const base = POSE_BASE_DIRECTION[pose];
  if (!base) return null;
  if (!flip) return base;
  return base === 'left' ? 'right' : 'left';
}

/**
 * A character standing to the LEFT of its target must reach toward the
 * RIGHT to point at it (and vice versa) — checked once in dev so a future
 * scene can't silently regress it.
 */
function requiredDirection(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}

export function validateCharacterScenes(scenes: CharacterScene[]) {
  scenes.forEach((scene) => {
    if (scene.center) return;
    const required = requiredDirection(scene.side);
    const effective = effectiveDirection(scene.pose, scene.flip);
    if (effective && effective !== required) {
      // eslint-disable-next-line no-console
      console.warn(
        `[character] scene "${scene.id}" stands to the ${scene.side} of its target but its pose points ${effective}, ` +
          `not ${required} — the arm should reach toward the target, not away from it.`
      );
    }
  });
}

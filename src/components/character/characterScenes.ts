// Central choreography config for the scroll-driven character companion.
// Add a new beat by adding an entry here — no changes needed elsewhere.

export type PoseId = 'greet' | 'point-dual' | 'point-right' | 'point-left' | 'walk-away';
export type ActionId = 'intro' | 'point' | 'watch' | 'attention' | 'outro';
export type Anchor = 'left' | 'right' | 'above' | 'below' | 'center' | 'corner';

export const POSE_SRC: Record<PoseId, string> = {
  greet: '/character/offer-hand.png',
  'point-dual': '/character/point-dual-diagonal.png',
  'point-right': '/character/point-right-chest.png',
  'point-left': '/character/point-left-reach.png',
  'walk-away': '/character/walk-away-back.png',
};

/**
 * Which way each pose points on screen, unflipped. `null` means the pose isn't
 * directional (e.g. the hero greet or the footer walk-away).
 */
const POSE_BASE_DIRECTION: Record<PoseId, 'left' | 'right' | null> = {
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
  /** which side of the target element the character stands on */
  anchor: Anchor;
  /**
   * Overrides which data-character-target the position anchor is computed from
   * (defaults to `section`). Useful when `section` is only used to time the
   * ScrollTrigger but the character should stay parked beside a narrower element.
   */
  anchorTarget?: string;
  offsetX?: number;
  offsetY?: number;
  /** relative size multiplier (further multiplied by the responsive tier scale) */
  scale?: number;
  flip?: boolean;
  start?: string;
  end?: string;
  /** keep a gentle idle bob/rotate loop going while parked in this scene */
  idle?: boolean;
  /**
   * For sections with several internal data-character-target elements (e.g. product
   * cards): the character glides between them as the user scrolls through the section,
   * alternating pose/flip so it always points at the active item.
   */
  subtargets?: string[];
  /**
   * Skip this scene on phone/tablet. Use for transient "point at a small, tightly
   * packed target" beats where nearby siblings (e.g. two buttons side by side)
   * leave no safe gutter on compact screens — better to stay in the previous
   * scene's position than to land on top of other content.
   */
  compactSkip?: boolean;
  /**
   * Anchor side to use on phone/tablet instead of `anchor`. Layouts that go
   * single-column on small screens often have no side gutter left to stand in.
   */
  compactAnchor?: Anchor;
  /** offsetY to use on phone/tablet instead of offsetY, when the two need to differ. */
  compactOffsetY?: number;
}

export const characterScenes: CharacterScene[] = [
  {
    id: 'hero-intro',
    section: 'hero',
    pose: 'greet',
    action: 'intro',
    anchor: 'right',
    offsetX: -32,
    offsetY: 60,
    scale: 1,
    idle: true,
  },
  {
    id: 'hero-cta',
    section: 'cta-hero',
    pose: 'point-left',
    action: 'attention',
    anchor: 'right',
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
    anchor: 'right',
    // The text block runs full-width on phone/tablet, so there's no gutter
    // beside it to hug without landing on the paragraph itself.
    compactAnchor: 'corner',
    compactOffsetY: -40,
    offsetX: 36,
    offsetY: -30,
    scale: 0.95,
    idle: true,
  },
  {
    id: 'services-point',
    section: 'services',
    pose: 'point-dual',
    action: 'point',
    anchor: 'left',
    // Three stacked cards on phone/tablet are taller than the viewport, so
    // "beside the whole group" (fine on desktop's 3-column row) drifts onto
    // whichever card happens to be at that fixed viewport height.
    compactAnchor: 'corner',
    offsetX: -16,
    offsetY: -70,
    scale: 0.9,
    idle: true,
  },
  {
    id: 'highlight-hype',
    section: 'highlight',
    pose: 'point-dual',
    action: 'attention',
    anchor: 'right',
    flip: true,
    // The quote wraps onto several lines on phone/tablet, leaving no reliably
    // clear spot beside it — corner is the same safe fallback as elsewhere.
    compactAnchor: 'corner',
    offsetX: -28,
    offsetY: 70,
    scale: 0.85,
  },
  {
    id: 'products-walk',
    section: 'products',
    anchorTarget: 'products-grid',
    pose: 'point-right',
    action: 'point',
    anchor: 'left',
    // The grid is much taller than one viewport on phone/tablet, so any
    // rect-based anchor eventually drifts out of sync as the user scrolls
    // past it (the character is fixed-position and only repositions on
    // scene changes). A stable viewport corner avoids that entirely.
    compactAnchor: 'corner',
    offsetX: -14,
    offsetY: 0,
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
    anchor: 'right',
    // The marquee cards run edge-to-edge on phone/tablet, so there's no gutter
    // beside them to hug without overlapping a card — park in the stable corner
    // instead, same as the product grid.
    compactAnchor: 'corner',
    offsetX: 20,
    offsetY: -90,
    compactOffsetY: 130,
    scale: 0.85,
    idle: true,
  },
  {
    id: 'location-point',
    section: 'cta-location',
    pose: 'point-right',
    action: 'point',
    anchor: 'left',
    offsetX: -16,
    offsetY: -14,
    scale: 0.85,
  },
  {
    id: 'footer-outro',
    section: 'footer',
    pose: 'walk-away',
    action: 'outro',
    anchor: 'center',
    offsetY: -60,
    // The footer is short on phone/tablet, so "centered, nudged up" (good on
    // desktop, where the footer is wider and text sits on one line) lands
    // right on top of the brand text. Push it down toward the empty space
    // near the bottom of the footer instead.
    compactOffsetY: 70,
    scale: 0.9,
    start: 'top 95%',
    end: 'bottom 5%',
  },
];

function effectiveDirection(pose: PoseId, flip?: boolean): 'left' | 'right' | null {
  const base = POSE_BASE_DIRECTION[pose];
  if (!base) return null;
  if (!flip) return base;
  return base === 'left' ? 'right' : 'left';
}

/**
 * A character standing to the LEFT of its target must reach toward the
 * RIGHT to point at it (and vice versa) — this is the rule the user asked
 * to always enforce. Checked once in dev so a future scene can't silently
 * regress it.
 */
function requiredDirection(anchor: Anchor): 'left' | 'right' | null {
  if (anchor === 'left') return 'right';
  if (anchor === 'right') return 'left';
  return null;
}

export function validateCharacterScenes(scenes: CharacterScene[]) {
  scenes.forEach((scene) => {
    const required = requiredDirection(scene.anchor);
    if (!required) return;
    const effective = effectiveDirection(scene.pose, scene.flip);
    if (effective && effective !== required) {
      // eslint-disable-next-line no-console
      console.warn(
        `[character] scene "${scene.id}" stands to the ${scene.anchor} of its target but its pose points ${effective}, ` +
          `not ${required} — the arm should reach toward the target, not away from it.`
      );
    }
  });
}

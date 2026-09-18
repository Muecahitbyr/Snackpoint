// Central choreography config for the scroll-driven character companion.
// Add a new beat by adding an entry here — no changes needed elsewhere.

export type PoseId = 'greet' | 'point-dual' | 'point-right' | 'point-left' | 'walk-away';
export type ActionId = 'intro' | 'point' | 'watch' | 'attention' | 'outro';
export type Anchor = 'left' | 'right' | 'above' | 'below' | 'center';

export const POSE_SRC: Record<PoseId, string> = {
  greet: '/character/offer-hand.png',
  'point-dual': '/character/point-dual-diagonal.png',
  'point-right': '/character/point-right-chest.png',
  'point-left': '/character/point-left-reach.png',
  'walk-away': '/character/walk-away-back.png',
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
  },
  {
    id: 'about-watch',
    section: 'about-text',
    pose: 'point-left',
    action: 'watch',
    anchor: 'right',
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
    offsetX: 20,
    offsetY: -90,
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
    scale: 0.9,
    start: 'top 95%',
    end: 'bottom 5%',
  },
];

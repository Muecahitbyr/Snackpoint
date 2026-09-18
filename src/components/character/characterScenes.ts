// Central choreography config for the scroll-driven 3D character companion.
// Add a new beat by adding an entry here — no changes needed elsewhere.
//
// `side` is which side of the target element the character parks on (it
// always stands OUTSIDE the target's own box, never over it). `action` is
// optional — when omitted, `defaultActionForSide` (characterTypes.ts) picks
// PointLeft/Right/Up/Down from the resolved side automatically, verified
// against the actual GLB rather than assumed from the clip name (see
// CHARACTER_3D.md "Point direction"). Set it explicitly only when a scene
// wants something other than a point (Wave, LookLeft, ...).
//
// `mobile: { side: 'auto' }` hands positioning to the safe-placement
// algorithm in useCharacterScroll (tries below → above → left → right,
// picks the first that actually fits the viewport) instead of a hand-tuned
// coordinate — use it for targets whose safe spot depends on how much
// vertical room happens to be around at that scroll position.

import type { CharacterScene } from './characterTypes';

export const characterScenes: CharacterScene[] = [
  {
    id: 'hero-intro',
    section: 'hero',
    action: 'Wave',
    lookAtTarget: false,
    desktop: { side: 'right', align: 'center', offsetX: -60, offsetY: -40 },
    mobile: { offsetX: -16, offsetY: -170 },
  },
  {
    id: 'about-watch',
    section: 'about-text',
    // about-text and about-visual sit in a 2-column grid with only a 60px
    // gap (About.css) — standing to the right would land on top of the
    // glow-card image, so the character parks in the left page margin instead.
    action: 'LookLeft',
    desktop: { side: 'left', align: 'center', offsetX: -12, offsetY: -20, scale: 0.72 },
    // Mobile stacks about-text full-width (About.css), so there's no side
    // gutter to stand in — park in the section's generous top padding
    // (`.about { padding: 160px ... }`) just above the eyebrow instead.
    mobile: { align: 'top', offsetX: 0, offsetY: -110, scale: 0.6 },
  },
  {
    id: 'services-point',
    section: 'services',
    desktop: { side: 'left', align: 'top', offsetX: -30, offsetY: 60 },
    mobile: { align: 'top', offsetX: -8, offsetY: 56, scale: 0.65 },
  },
  {
    id: 'products-point',
    section: 'products',
    desktop: { side: 'right', align: 'top', offsetX: -30, offsetY: 60 },
    mobile: { align: 'top', offsetX: 8, offsetY: 56, scale: 0.65 },
  },
  {
    id: 'reviews-watch',
    section: 'reviews',
    // A second quiet, no-pointing beat (like about-watch) — LookRight's
    // natural spot: character parks right of the reviews marquee, so the
    // content it's watching reads to its screen-left (own-right = screen-left
    // when facing camera, see the body-relative naming note up top).
    action: 'LookRight',
    desktop: { side: 'right', align: 'center', offsetX: 30, offsetY: -10, scale: 0.85 },
    mobile: { align: 'top', offsetX: 0, offsetY: -70, scale: 0.55 },
  },
  {
    id: 'hours-point',
    section: 'hours',
    desktop: { side: 'left', align: 'top', offsetX: -26, offsetY: 8 },
    // The 7-row table runs close to full-width on phone/tablet, so there's
    // no reliable side gutter — let the safe-placement algorithm choose
    // above/below based on actual space, which also naturally picks
    // PointDown/PointUp instead of a cramped PointLeft/Right.
    // offsetX/offsetY reset to 0 — the desktop values position relative to a
    // manually-chosen side and would just push the auto-picked candidate
    // (see pickSafePlacement) further into whatever's next to it.
    mobile: { side: 'auto', offsetX: 0, offsetY: 0, scale: 0.6 },
    // <=390px specifically: never squeeze into a side gutter (there isn't
    // one at that width) — try above, then below, and only shrink further
    // as a last resort. The gap above the table (between it and the address
    // row) is only ~22px on a 375px phone, which the shrink-retry alone
    // can't clear from a normal-sized starting scale — start smaller here
    // so it settles into a clean fit instead of bottoming out against the
    // scale floor. See CHARACTER_3D.md "375px hours fix".
    narrowMobile: { scale: 0.3, sideOrder: ['top', 'bottom'] },
    start: 'top 72%',
    end: 'bottom 40%',
  },
  {
    id: 'route-point',
    section: 'route',
    desktop: { side: 'left', align: 'center', offsetX: -24, offsetY: -10 },
    mobile: { side: 'auto', offsetX: 0, offsetY: 0, scale: 0.6 },
  },
  {
    id: 'footer-outro',
    section: 'footer',
    // footer-brand/address/copyright are a single centered text block
    // (Footer.jsx) — parking dead-center would sit right on top of it, so
    // the character stands beside it instead, in the section's empty margin.
    action: 'Wave',
    lookAtTarget: false,
    desktop: { side: 'right', align: 'bottom', offsetX: -50, offsetY: -20 },
    // The footer's centered brand/address text is nearly as tall as the
    // footer itself on a narrow phone — there's no gap big enough to stand
    // in beside or under it, so the character parks small in the corner
    // instead ("kleiner skalieren" per the mobile placement rule).
    mobile: { side: 'right', align: 'bottom', offsetX: -6, offsetY: -6, scale: 0.5 },
    start: 'top 90%',
    end: 'bottom 10%',
  },
];

/** True when the visitor asked their OS for reduced motion. JS-driven
 * effects (parallax, tilt, magnetic buttons, count-ups) check this and stay
 * still; CSS animations are handled by the media query in index.css. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

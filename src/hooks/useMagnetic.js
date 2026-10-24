import { useRef } from 'react';
import { prefersReducedMotion } from './motion';

/** Pulls an element a few pixels towards the cursor while hovered. Uses the
 * standalone `translate` property so it stacks with the element's own
 * hover `transform` instead of overwriting it. */
export function useMagnetic(strength = 0.3) {
  const ref = useRef(null);

  function onMouseMove(e) {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    el.style.translate = `${x}px ${y}px`;
  }

  function onMouseLeave() {
    if (ref.current) ref.current.style.translate = '';
  }

  return { ref, onMouseMove, onMouseLeave };
}

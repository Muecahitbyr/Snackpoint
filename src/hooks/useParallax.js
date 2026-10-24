import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './motion';

/** Shifts the element along `axis` ('y' or 'x') as it scrolls past the
 * viewport center — negative speeds move against the scroll. */
export function useParallax(speed = 0.2, axis = 'y') {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let ticking = false;
    const translate = axis === 'x' ? 'translateX' : 'translateY';

    function update() {
      const rect = el.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const distance = elementCenter - viewportCenter;
      el.style.transform = `${translate}(${distance * -speed * 0.15}px)`;
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [speed, axis]);

  return ref;
}

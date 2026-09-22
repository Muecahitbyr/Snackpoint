import { useEffect, useRef, useState } from 'react';

/** Like useReveal, but keeps tracking after the first intersection instead
 * of disconnecting — used to pause decorative infinite CSS animations while
 * their section is off-screen (see e.g. Hero's blobs/particles), so the
 * compositor isn't kept busy animating things nobody can see. */
export function useInView({ threshold = 0, rootMargin = '200px 0px' } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}

import { useEffect, useState } from 'react';
import { useReveal } from './useReveal';

export function useCountUp(target, { decimals = 0, duration = 1400 } = {}) {
  const { ref, visible } = useReveal({ threshold: 0.5 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) requestAnimationFrame(frame);
      else setValue(target);
    }
    requestAnimationFrame(frame);
  }, [visible, target, duration]);

  const formatted = decimals > 0
    ? value.toFixed(decimals)
    : Math.floor(value).toLocaleString('de-DE');

  return { ref, formatted };
}

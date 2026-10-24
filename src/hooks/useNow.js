import { useEffect, useState } from 'react';

/** The current time, re-rendering on every full minute — enough for
 * "Geöffnet / Geschlossen" and the today-timeline to flip on their own. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer;
    function schedule() {
      const msToNextMinute = 60000 - (Date.now() % 60000);
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, msToNextMinute);
    }
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return now;
}

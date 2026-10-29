// True while scripts/prerender.mjs renders a page at build time. Anything that
// depends on the current time ("Jetzt geöffnet", count-up numbers) renders a
// neutral, timeless version then; the browser renders the live one as before.
export const IS_PRERENDER = typeof window === 'undefined';

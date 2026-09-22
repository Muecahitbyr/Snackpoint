// TEMPORARY diagnostic instrumentation for the "chatbot open/close feels
// slow on real phones" investigation — not meant to stay in the codebase.
// Remove this file and every import of it once the cause is found and fixed.
//
// Measures the full requested chain for a single open or close gesture:
//   native event → onClick handler runs → setState → React commits the DOM
//   change (useLayoutEffect, fires before the browser paints) → the browser
//   has actually painted that change (double-rAF) → optionally, whether
//   anything is still intercepting clicks at that spot afterward.
//
// Enabled only with ?chatPerf=1 in the URL — everyone else gets the
// unmodified production behavior.

export interface PerfStage {
  label: string;
  tSinceStart: number;
}

export interface PerfRun {
  gesture: 'open' | 'close';
  runId: number;
  stages: PerfStage[];
  totalMs: number;
  blockedByElement?: string | null;
}

export const chatPerfEnabled =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('chatPerf') === '1';

/** ?chatSimple=1 strips every animation/transition/blur/shadow from the
 * widget (see .snackbot-simple in SnackBotWidget.css) so open/close becomes
 * a plain, instant DOM swap with no compositing work at all — isolates
 * whether the delay is React/JS (still slow here) or rendering/CSS
 * (fixed here). */
export const chatSimpleEnabled =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('chatSimple') === '1';

let runCounter = 0;

/** Call at the very start of the onClick handler, with the native event so
 * we can see how long the browser itself took to dispatch the event before
 * our code even ran (event.timeStamp is the browser's own clock, same
 * origin as performance.now()). */
export function startPerfRun(gesture: 'open' | 'close', nativeEventTimeStamp: number) {
  runCounter += 1;
  const runId = runCounter;
  const tHandlerStart = performance.now();
  const stages: PerfStage[] = [
    { label: 'native event fired', tSinceStart: 0 },
    { label: 'onClick handler running', tSinceStart: tHandlerStart - nativeEventTimeStamp },
  ];
  return { gesture, runId, t0: nativeEventTimeStamp, stages };
}

export type PerfRunHandle = ReturnType<typeof startPerfRun>;

export function markStage(run: PerfRunHandle, label: string) {
  run.stages.push({ label, tSinceStart: performance.now() - run.t0 });
}

/** Call after the state update that should show/hide the panel. Resolves
 * once React has committed the DOM change AND the browser has painted it
 * (double requestAnimationFrame is the standard way to detect "the previous
 * frame's DOM change is now on screen" without devtools). */
export function finishPerfRun(
  run: PerfRunHandle,
  onDone: (result: PerfRun) => void,
  checkBlockedAt?: () => string | null
) {
  // React commits synchronously inside the event handler for a plain
  // setState in this app (no transitions/concurrent features in use), so by
  // the time this microtask runs the DOM already reflects the new state —
  // this stage exists to prove that with a timestamp, not assume it.
  queueMicrotask(() => {
    markStage(run, 'DOM committed (microtask after setState)');

    requestAnimationFrame(() => {
      markStage(run, 'first rAF after commit (pre-paint)');
      requestAnimationFrame(() => {
        markStage(run, 'second rAF (previous frame painted)');
        const blockedByElement = checkBlockedAt ? checkBlockedAt() : null;
        const totalMs = performance.now() - run.t0;
        onDone({ gesture: run.gesture, runId: run.runId, stages: run.stages, totalMs, blockedByElement });
      });
    });
  });
}

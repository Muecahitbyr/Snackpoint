import type { PerfRun } from './chatPerf';

// TEMPORARY — see chatPerf.ts. Renders directly on the page (bottom-left,
// out of the chat widget's own corner) so timing is visible on a real phone
// without needing Safari's remote inspector or a cable.
export default function ChatPerfHUD({ runs }: { runs: PerfRun[] }) {
  if (runs.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        zIndex: 9999,
        maxWidth: '92vw',
        maxHeight: '60vh',
        overflowY: 'auto',
        background: 'rgba(10,10,12,0.94)',
        color: '#0f0',
        font: '10px/1.4 ui-monospace, Menlo, monospace',
        padding: '8px 10px',
        borderRadius: 8,
        pointerEvents: 'none',
        whiteSpace: 'pre',
      }}
    >
      {runs
        .slice()
        .reverse()
        .map((run) => (
          <div key={run.runId} style={{ marginBottom: 8, borderBottom: '1px solid #333', paddingBottom: 6 }}>
            <div style={{ color: '#fff', fontWeight: 'bold' }}>
              #{run.runId} {run.gesture.toUpperCase()} — total {run.totalMs.toFixed(1)}ms
            </div>
            {run.stages.map((s, i) => (
              <div key={i}>
                {s.tSinceStart.toFixed(1).padStart(7)}ms  {s.label}
              </div>
            ))}
            {run.blockedByElement !== undefined && (
              <div style={{ color: run.blockedByElement ? '#f55' : '#5f5' }}>
                blocked-by: {run.blockedByElement ?? 'nothing (clear)'}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

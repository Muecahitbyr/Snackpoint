interface SnackBotButtonProps {
  onClick: () => void;
  hasUnread: boolean;
}

/** A small stylized 2D mascot (inline SVG, no external asset/3D dependency)
 * standing in for a finished brand mascot — see PROJECT_STATE for swapping
 * in a final illustration later without touching the chat logic. */
export default function SnackBotButton({ onClick, hasUnread }: SnackBotButtonProps) {
  return (
    <button
      type="button"
      className="snackbot-fab"
      onClick={onClick}
      aria-label="SnackPoint Assistent öffnen"
    >
      <svg viewBox="0 0 64 64" className="snackbot-fab-mascot" aria-hidden="true">
        <defs>
          <linearGradient id="snackbot-face-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        {/* waving arm */}
        <ellipse className="snackbot-arm" cx="50" cy="40" rx="6" ry="10" fill="var(--accent-3)" />
        {/* head */}
        <circle cx="32" cy="32" r="24" fill="url(#snackbot-face-grad)" />
        {/* cheeks */}
        <circle cx="20" cy="36" r="3.5" fill="#fff" opacity="0.35" />
        <circle cx="44" cy="36" r="3.5" fill="#fff" opacity="0.35" />
        {/* eyes */}
        <circle cx="24" cy="29" r="3.4" fill="#1d1d1f" />
        <circle cx="40" cy="29" r="3.4" fill="#1d1d1f" />
        <circle cx="25" cy="27.7" r="1" fill="#fff" />
        <circle cx="41" cy="27.7" r="1" fill="#fff" />
        {/* smile */}
        <path d="M22 39 Q32 47 42 39" stroke="#1d1d1f" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* little kiosk-roof cap */}
        <path d="M12 18 L32 8 L52 18 Z" fill="var(--accent-3)" />
        <rect x="10" y="16" width="44" height="5" rx="2.5" fill="var(--accent-3)" />
      </svg>
      {hasUnread && <span className="snackbot-fab-dot" aria-hidden="true" />}
    </button>
  );
}

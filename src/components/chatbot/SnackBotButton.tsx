interface SnackBotButtonProps {
  onClick: () => void;
  hasUnread: boolean;
}

export default function SnackBotButton({ onClick, hasUnread }: SnackBotButtonProps) {
  return (
    <button
      type="button"
      className="snackbot-fab"
      onClick={onClick}
      aria-label="SnackPoint Assistent öffnen"
    >
      <img src="/mascot.png" alt="" className="snackbot-fab-mascot" />
      {hasUnread && <span className="snackbot-fab-dot" aria-hidden="true" />}
    </button>
  );
}

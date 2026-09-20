import { useEffect, useRef, useState, type FormEvent } from 'react';
import { QUICK_ACTIONS, type ChatCTA } from '../../data/chatbotKnowledge';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  cta?: ChatCTA;
}

interface SnackBotPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onQuickAction: (entryId: string) => void;
  onClose: () => void;
}

export default function SnackBotPanel({ messages, onSend, onQuickAction, onClose }: SnackBotPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div className="snackbot-panel" role="dialog" aria-label="SnackPoint Assistent">
      <div className="snackbot-panel-header">
        <img src="/mascot.png" alt="" className="snackbot-panel-avatar" />
        <div className="snackbot-panel-heading">
          <p className="snackbot-panel-title">SnackPoint Assistent</p>
          <p className="snackbot-panel-subtitle">
            Frag mich z. B. nach Snacks, Zigaretten, DHL, Lotto oder Öffnungszeiten.
          </p>
        </div>
        <button type="button" className="snackbot-panel-close" onClick={onClose} aria-label="Chat schließen">
          ✕
        </button>
      </div>

      <div className="snackbot-messages" ref={scrollRef}>
        {messages.map((message) => (
          <div key={message.id} className={`snackbot-bubble-row snackbot-bubble-row-${message.sender}`}>
            <div className={`snackbot-bubble snackbot-bubble-${message.sender}`}>
              {message.text.split('\n').map((line, i) => (
                <span key={i} className="snackbot-bubble-line">
                  {line}
                </span>
              ))}
              {message.cta && (
                <a
                  className="snackbot-cta"
                  href={message.cta.href}
                  target={message.cta.external ? '_blank' : undefined}
                  rel={message.cta.external ? 'noopener noreferrer' : undefined}
                >
                  {message.cta.label}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="snackbot-quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="snackbot-chip"
            onClick={() => onQuickAction(action.entryId)}
          >
            {action.label}
          </button>
        ))}
      </div>

      <form className="snackbot-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          className="snackbot-input"
          placeholder="Deine Frage an SnackPoint…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="Nachricht an den SnackPoint Assistenten"
        />
        <button type="submit" className="snackbot-send" aria-label="Nachricht senden" disabled={!draft.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}

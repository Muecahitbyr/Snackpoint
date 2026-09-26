import { useCallback, useRef, useState } from 'react';
import SnackBotButton from './SnackBotButton';
import SnackBotPanel, { type ChatMessage } from './SnackBotPanel';
import { respond } from './chatbotEngine';
import type { ChatContext } from './types';
import { GREETING_MESSAGE } from '../../data/chatbotKnowledge';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import './SnackBotWidget.css';

let messageCounter = 0;
function nextId() {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

export default function SnackBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: nextId(), sender: 'bot', text: GREETING_MESSAGE }]);
  // On narrow screens the cookie banner is tall enough to visually cover
  // the chat button's spot in the same bottom-right corner — rather than
  // trying to keep two independent fixed-position elements out of each
  // other's way, just don't show the button until the banner's resolved
  // (an already-open panel is left alone, since the user is mid-conversation).
  const { consent } = useCookieConsent();

  const open = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // What the bot remembers for follow-ups like "Welche?" — not rendered, so a ref.
  const contextRef = useRef<ChatContext>({});

  const pushBotReply = useCallback((userText: string) => {
    const { reply, context } = respond(userText, contextRef.current);
    contextRef.current = context;
    setMessages((prev) => [...prev, { id: nextId(), sender: 'bot', text: reply.text, cta: reply.cta }]);
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      setMessages((prev) => [...prev, { id: nextId(), sender: 'user', text }]);
      pushBotReply(text);
    },
    [pushBotReply]
  );

  // Chips answer like a typed question, just without echoing it as a user bubble.
  const handleQuickAction = useCallback((query: string) => pushBotReply(query), [pushBotReply]);

  if (!isOpen && consent === null) return null;

  return (
    <div className="snackbot-root">
      {isOpen ? (
        <SnackBotPanel messages={messages} onSend={handleSend} onQuickAction={handleQuickAction} onClose={close} />
      ) : (
        <SnackBotButton onClick={open} hasUnread={hasUnread} />
      )}
    </div>
  );
}

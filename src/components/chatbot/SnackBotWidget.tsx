import { useCallback, useState } from 'react';
import SnackBotButton from './SnackBotButton';
import SnackBotPanel, { type ChatMessage } from './SnackBotPanel';
import { matchKnowledge } from './chatbotUtils';
import { FALLBACK_MESSAGE, GREETING_MESSAGE, getEntryById } from '../../data/chatbotKnowledge';
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

  const pushBotReply = useCallback((userText: string) => {
    const entry = matchKnowledge(userText);
    const reply: ChatMessage = entry
      ? { id: nextId(), sender: 'bot', text: entry.getResponse(), cta: entry.cta }
      : { id: nextId(), sender: 'bot', text: FALLBACK_MESSAGE };
    setMessages((prev) => [...prev, reply]);
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      setMessages((prev) => [...prev, { id: nextId(), sender: 'user', text }]);
      pushBotReply(text);
    },
    [pushBotReply]
  );

  const handleQuickAction = useCallback((entryId: string) => {
    const entry = getEntryById(entryId);
    if (!entry) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId(), sender: 'bot', text: entry.getResponse(), cta: entry.cta },
    ]);
  }, []);

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

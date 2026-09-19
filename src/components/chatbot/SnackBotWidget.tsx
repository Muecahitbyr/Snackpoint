import { useCallback, useState } from 'react';
import SnackBotButton from './SnackBotButton';
import SnackBotPanel, { type ChatMessage } from './SnackBotPanel';
import { matchKnowledge } from './chatbotUtils';
import { FALLBACK_MESSAGE, GREETING_MESSAGE, getEntryById } from '../../data/chatbotKnowledge';
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

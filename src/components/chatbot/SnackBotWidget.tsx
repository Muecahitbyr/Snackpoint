import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';
import SnackBotButton from './SnackBotButton';
import SnackBotPanel, { type ChatMessage } from './SnackBotPanel';
import { matchKnowledge } from './chatbotUtils';
import { FALLBACK_MESSAGE, GREETING_MESSAGE, getEntryById } from '../../data/chatbotKnowledge';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import { chatPerfEnabled, chatSimpleEnabled, startPerfRun, finishPerfRun, type PerfRun } from './chatPerf';
import ChatPerfHUD from './ChatPerfHUD';
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
  const [perfRuns, setPerfRuns] = useState<PerfRun[]>([]);
  // On narrow screens the cookie banner is tall enough to visually cover
  // the chat button's spot in the same bottom-right corner — rather than
  // trying to keep two independent fixed-position elements out of each
  // other's way, just don't show the button until the banner's resolved
  // (an already-open panel is left alone, since the user is mid-conversation).
  const { consent } = useCookieConsent();

  const open = useCallback((event: ReactMouseEvent) => {
    if (!chatPerfEnabled) {
      setIsOpen(true);
      setHasUnread(false);
      return;
    }
    const run = startPerfRun('open', event.timeStamp);
    setIsOpen(true);
    setHasUnread(false);
    finishPerfRun(run, (result) => setPerfRuns((prev) => [...prev.slice(-4), result]), () => {
      const panel = document.querySelector('.snackbot-panel-close');
      if (!panel) return 'panel-close button not found in DOM';
      const r = panel.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (el === panel || panel.contains(el)) return null;
      return el ? el.className || el.tagName : 'nothing (offscreen?)';
    });
  }, []);

  const close = useCallback((timeStamp?: number) => {
    if (!chatPerfEnabled) {
      setIsOpen(false);
      return;
    }
    const run = startPerfRun('close', timeStamp ?? performance.now());
    setIsOpen(false);
    finishPerfRun(run, (result) => setPerfRuns((prev) => [...prev.slice(-4), result]), () => {
      const fab = document.querySelector('.snackbot-fab');
      if (!fab) return 'fab not found in DOM';
      const r = fab.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (el === fab || fab.contains(el)) return null;
      return el ? el.className || el.tagName : 'nothing (offscreen?)';
    });
  }, []);

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
    <>
      <div className={`snackbot-root ${chatSimpleEnabled ? 'snackbot-simple' : ''}`}>
        {isOpen ? (
          <SnackBotPanel messages={messages} onSend={handleSend} onQuickAction={handleQuickAction} onClose={close} />
        ) : (
          <SnackBotButton onClick={open} hasUnread={hasUnread} />
        )}
      </div>
      {chatPerfEnabled && <ChatPerfHUD runs={perfRuns} />}
    </>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';

type PulseChatDrawerProps = {
  patient: any;
  calendarLogs: any[];
  selectedDateLabel: string;
  onLogToCalendar: (noteText: string, targetDateStr?: string) => void;
  onLogMedsForDate?: (targetDateStr: string) => void;
};

type Message = {
  sender: 'user' | 'assistant';
  text: string;
};

export default function PulseChatDrawer({
  patient,
  calendarLogs,
  selectedDateLabel,
  onLogToCalendar,
  onLogMedsForDate,
}: PulseChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello! I'm your Pulse Clinical Assistant. Ask me anything about your records, or log a note for your calendar!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isThinking) return;

    const newMessages: Message[] = [...messages, { sender: 'user', text }];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          patient,
          selectedDateLabel,
          calendarLogs,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { sender: 'assistant', text: data.reply }]);

      // Execute action if returned from API
      if (data.action?.type === 'LOG_MEDS_TAKEN' && onLogMedsForDate) {
        onLogMedsForDate(data.action.targetDateStr);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: 'Sorry, I ran into an error answering that.' },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-4 py-3 rounded-full shadow-lg transition flex items-center gap-2 text-xs"
        >
          <span>💬 Ask Pulse AI</span>
        </button>
      ) : (
        <div className="bg-slate-900 text-white rounded-2xl w-80 sm:w-96 shadow-2xl border border-slate-700 flex flex-col overflow-hidden max-h-[500px]">
          {/* Header */}
          <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-bold">💜</span>
              <div>
                <h3 className="text-xs font-bold text-white">Pulse Companion AI</h3>
                <span className="text-[10px] text-slate-400">Target Date: {selectedDateLabel}</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-bold text-xs p-1"
            >
              ✕
            </button>
          </div>

          {/* Messages Feed */}
          <div className="p-3 overflow-y-auto space-y-2.5 flex-1 min-h-[260px] text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white font-medium rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 p-2.5 rounded-xl text-xs italic animate-pulse">
                  Pulse AI is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Clinical Disclaimer */}
          <div className="bg-amber-950/40 border-t border-amber-900/50 p-2 text-[10px] text-amber-300 font-semibold px-3">
            ⚠️ Notice: For preparation only. Not a substitute for professional clinical advice.
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question or log note for ${selectedDateLabel}...`}
              className="flex-1 bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 font-medium"
            />
            <button
              type="submit"
              disabled={isThinking}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs px-3 py-2 rounded-xl transition shadow-sm"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
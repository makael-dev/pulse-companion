'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PulseChatDrawerProps {
  patient?: any;
  calendarLogs?: any[];
  selectedDateLabel?: string;
  onLogToCalendar?: (noteText: string, targetDateStr?: string) => void;
}

type Message = {
  sender: 'user' | 'assistant';
  text: string;
};

// Helper to clean "on july 3 my..." down to just the symptom "foot hurt"
function cleanSymptomText(rawInput: string): string {
  let text = rawInput
    .replace(/(on\s+)?(july|jul)\s*\d+(st|nd|rd|th)?\s*/i, '') // Strips "on july 3"
    .replace(/^my\s+/i, '')                                    // Strips leading "my "
    .trim();

  // Capitalize first letter
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text || rawInput;
}

export default function PulseChatDrawer({
  patient,
  calendarLogs = [],
  selectedDateLabel = 'Today',
  onLogToCalendar,
}: PulseChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: `Hello! I'm your Pulse Clinical Assistant. Ask me anything about ${patient?.name || 'your'} records, or log a note for your calendar!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    const lower = userText.toLowerCase();

    const isQuestion =
      lower.includes('when') ||
      lower.includes('what') ||
      lower.includes('where') ||
      lower.includes('who') ||
      lower.includes('how') ||
      lower.includes('?') ||
      lower.includes('appointment') ||
      lower.includes('visit');

    // Extract date if specified in text
    let detectedTargetDate: string | undefined = undefined;
    const dateMatch = lower.match(/(july|jul)\s*(\d{1,2})/i);

    if (dateMatch && calendarLogs.length > 0) {
      const dayNum = dateMatch[2];
      const found = calendarLogs.find((log) =>
        log.dateStr.toLowerCase().includes(`jul ${dayNum}`)
      );
      if (found) {
        detectedTargetDate = found.dateStr;
      }
    }

    setTimeout(() => {
      let reply = '';

      if (lower.includes('appointment') || lower.includes('next visit') || lower.includes('when is')) {
        const nextDate = patient?.nextVisit?.date || 'August 18, 2026';
        const nextType = patient?.nextVisit?.type || 'Routine Follow-up';
        reply = `Your next appointment is scheduled for ${nextDate} (${nextType}) with ${patient?.primaryDoctor || 'Dr. Vance'}.`;
      } else if (lower.includes('lisinopril') || lower.includes('medication') || lower.includes('bp')) {
        reply = 'Lisinopril is an ACE inhibitor prescribed for blood pressure. Standard guidance recommends taking it daily at the same time in the morning.';
      } else if (lower.includes('lab') || lower.includes('hba1c') || lower.includes('test')) {
        reply = "Your recent labs can be reviewed under the 'Recent Lab Panels' section in Tab 1.";
      } else if (!isQuestion) {
        const cleanedNote = cleanSymptomText(userText);
        const target = detectedTargetDate || selectedDateLabel;

        if (onLogToCalendar) {
          onLogToCalendar(cleanedNote, detectedTargetDate);
        }
        reply = `Added "${cleanedNote}" to your ${target} calendar entry.`;
      } else {
        reply = "I'm here to help navigate your records! You can ask about appointments, medications, labs, or log daily symptoms.";
      }

      setMessages((prev) => [...prev, { sender: 'assistant', text: reply }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 transition hover:scale-105 text-xs"
        >
          <span>💬 Ask Pulse AI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-80 sm:w-96 flex flex-col h-[480px] overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">💜</span>
              <div>
                <h3 className="text-xs font-bold">Pulse Companion AI</h3>
                <p className="text-[10px] text-slate-300">
                  Target Date:{' '}
                  <span className="text-indigo-300 font-bold">
                    {selectedDateLabel}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-bold p-1 text-xs"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs bg-slate-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-2.5 rounded-xl text-xs ${
                    m.sender === 'user'
                      ? 'bg-indigo-700 text-white rounded-br-none'
                      : 'bg-white text-slate-900 border border-slate-200 shadow-sm rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="text-[10px] text-slate-500 italic pl-1">
                Pulse AI is thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Disclaimer Banner */}
          <div className="bg-amber-50 border-t border-amber-200 px-3 py-1.5 text-[10px] text-amber-900 font-medium">
            ⚠️ <strong>Notice:</strong> For preparation only. Not a substitute for professional clinical advice.
          </div>

          {/* Form Input */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-white border-t border-slate-200 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question or log note for ${selectedDateLabel}...`}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <button
              type="submit"
              className="bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-800 transition"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, Minus } from 'lucide-react';

interface PulseChatDrawerProps {
  patient: any;
  calendarLogs: any[];
  selectedDateLabel: string;
  enableRPGSystem?: boolean;
  activeTab?: 'vitals' | 'symptoms' | 'wellness' | 'fitness';
  onLogToCalendar?: (noteText: string, targetDateStr?: string) => void;
  onLogWorkoutToCalendar?: (exercise: string, details: string, targetDateStr?: string) => void;
  onLogMedsForDate?: (targetDateStr: string) => void;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  action?: any;
  chips?: string[];
}

export default function PulseChatDrawer({
  patient,
  calendarLogs,
  selectedDateLabel,
  enableRPGSystem = false,
  activeTab = 'vitals',
  onLogToCalendar,
  onLogWorkoutToCalendar,
  onLogMedsForDate,
}: PulseChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper to compute context-aware chips based on activeTab & RPG mode
  const getTabChips = (tab: string, rpg: boolean) => {
    if (rpg) {
      return ['What are my vitals?', 'What are my stats?', 'How do I increase stats?'];
    }

    switch (tab) {
      case 'vitals':
        return ['Explain my BP 118/78', 'What changed since last visit?', 'Active Prescriptions'];
      case 'symptoms':
        return ['Summarize symptoms for doctor', 'Draft visit agenda', 'Check risk review flag'];
      case 'wellness':
        return ['Analyze my sleep patterns', 'Average stress this week', 'Log meds taken'];
      case 'fitness':
        return ['How to improve 1-mile pace?', 'Compare PRs to benchmarks', 'Check step goal trend'];
      default:
        return ['What are my vitals?', 'View Fitness', 'Active Prescriptions'];
    }
  };

  const initialGreeting = enableRPGSystem
    ? "Hello! 👋 I'm your Pulse Companion AI. Ask me about your vitals, medications, fitness stats, or log notes for your calendar!"
    : "Hello! 👋 I'm your Pulse Companion AI. Ask me about your vitals, medications, fitness records, or log notes for your calendar!";

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: initialGreeting,
      chips: getTabChips(activeTab, enableRPGSystem),
    },
  ]);

  // Update initial message chips whenever activeTab or enableRPGSystem changes
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      // Update the chips on the initial greeting bot message if user hasn't chatted much yet
      if (updated[0].sender === 'bot') {
        updated[0] = {
          ...updated[0],
          chips: getTabChips(activeTab, enableRPGSystem),
        };
      }
      return updated;
    });
  }, [activeTab, enableRPGSystem]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend || input.trim();
    if (!queryText || isLoading) return;

    const userMessage: Message = { sender: 'user', text: queryText };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          patient,
          selectedDateLabel,
          calendarLogs,
          enableRPGSystem,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.action) {
          if (data.action.type === 'LOG_NOTE' && onLogToCalendar) {
            onLogToCalendar(data.action.noteText, data.action.targetDateStr);
          } else if (data.action.type === 'LOG_WORKOUT' && onLogWorkoutToCalendar) {
            onLogWorkoutToCalendar(data.action.exercise, data.action.details, data.action.targetDateStr);
          } else if (data.action.type === 'LOG_MEDS_TAKEN' && onLogMedsForDate) {
            onLogMedsForDate(data.action.targetDateStr);
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.reply,
            chips: data.chips || getTabChips(activeTab, enableRPGSystem),
            action: data.action,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: "I'm having a little trouble connecting right now. Feel free to ask about your vitals or medications!",
            chips: getTabChips(activeTab, enableRPGSystem),
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: "An error occurred while fetching your records. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-slate-950 hover:bg-slate-900 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 flex items-center gap-2 border-2 border-indigo-500/60 group scale-100 hover:scale-105"
        >
          <div className="p-1 rounded-lg bg-indigo-600/30 text-amber-300 border border-indigo-500/40">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-xs font-extrabold pr-1">Pulse AI Assistant</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-full sm:w-96 bg-slate-900 border-2 border-indigo-500/50 shadow-2xl rounded-2xl text-white transition-all duration-300 flex flex-col h-[520px]">
          <div className="p-3.5 bg-slate-950 border-b border-indigo-800/60 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600/30 text-amber-300 border border-indigo-500/40">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">Pulse Companion AI</h3>
                <p className="text-[10px] text-indigo-300">Target Date: {selectedDateLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Chat"
                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-indigo-600 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md font-medium'
                      : 'bg-slate-950 text-slate-200 border border-indigo-900/60 rounded-bl-none shadow'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {msg.sender === 'bot' && msg.chips && msg.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                    {msg.chips.map((chip, chipIdx) => (
                      <button
                        key={chipIdx}
                        onClick={() => handleSend(chip)}
                        className="text-[10px] font-bold bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 px-2.5 py-1 rounded-full transition shadow-sm"
                      >
                        ✨ {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-indigo-400 text-xs italic p-2 bg-slate-950 rounded-xl w-fit border border-indigo-900">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                Analyzing health record & MCP tools...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 bg-slate-950 border-t border-indigo-900/60 rounded-b-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask a question or log note for ${selectedDateLabel}...`}
                className="flex-1 bg-slate-900 text-white placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-xl border border-indigo-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[9px] text-amber-300/80 mt-1.5 text-center font-medium">
              ⚠️ Notice: For preparation only. Not a substitute for professional clinical advice.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
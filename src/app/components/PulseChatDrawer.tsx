'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User } from 'lucide-react';

interface PulseChatDrawerProps {
  patient: any;
  calendarLogs: any[];
  selectedDateLabel: string;
  enableRPGSystem: boolean;
  activeTab: string;
  onLogToCalendar: (noteText: string, targetDateStr?: string) => void;
  onLogWorkoutToCalendar: (exercise: string, details: string, targetDateStr?: string) => void;
  onLogMedsForDate: (targetDateStr: string) => void;
  onLogAllMedsForMonth?: () => void;
  onTriggerEmergencyModal?: () => void;
}

export default function PulseChatDrawer({
  patient,
  calendarLogs,
  selectedDateLabel,
  enableRPGSystem,
  activeTab,
  onLogToCalendar,
  onLogWorkoutToCalendar,
  onLogMedsForDate,
  onLogAllMedsForMonth,
  onTriggerEmergencyModal
}: PulseChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([
    {
      role: 'assistant',
      content: `Hello! 👋 I'm your Pulse Companion AI. Ask me about your vitals, medications, fitness records, or log notes for your calendar!`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (patient) {
      setMessages([
        {
          role: 'assistant',
          content: `Hello ${patient.name.split(' ')[0]}! 👋 I'm your Pulse Companion AI linked to your FHIR record. How can I help you manage your health today?`
        }
      ]);
    }
  }, [patient?.id]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage = { role: 'user' as const, content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!customText) setInput('');
    setIsLoading(true);

    try {
      const lower = textToSend.toLowerCase();
      if (lower.includes('log note') || lower.includes('add note')) {
        const noteContent = textToSend.replace(/log note|add note/gi, '').trim();
        onLogToCalendar(noteContent || textToSend, selectedDateLabel);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages,
          patientContext: patient,
          selectedDateLabel,
          calendarLogs,
          enableRPGSystem,
          activeTab
        })
      });

      const data = await response.json();

      // Check if message is a critical medical emergency
      if (data.reply && data.reply.includes('CRITICAL MEDICAL NOTICE') && onTriggerEmergencyModal) {
        onTriggerEmergencyModal();
      }

      // Trigger UI actions based on AI action
      if (data.action === 'LOG_ALL_MEDS_MONTH' && onLogAllMedsForMonth) {
        onLogAllMedsForMonth();
      } else if (data.action === 'LOG_MEDS') {
        const targetDate = data.targetDateStr || selectedDateLabel;
        onLogMedsForDate(targetDate);
      } else if (data.action === 'LOG_WORKOUT') {
        const targetDate = data.targetDateStr || selectedDateLabel;
        onLogWorkoutToCalendar(
          data.exercise || 'Workout', 
          data.details || 'Logged via AI Companion', 
          targetDate
        );
      } else if (data.action === 'LOG_NOTE') {
        const targetDate = data.targetDateStr || selectedDateLabel;
        onLogToCalendar(data.noteText || textToSend, targetDate);
      }

      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: "I've processed your request and synchronized it with your health record." }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I encountered an issue connecting to the assistant. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const bpValue = patient?.vitals?.bp || '120/80';
  const activeMedName = patient?.medications?.[0]?.name?.split(' ')[0] || 'Medications';

  return (
    <div className="fixed bottom-4 right-4 z-40 font-sans print:hidden">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-3 bg-indigo-950 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-xl border border-indigo-500/30 flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-left">
            <p className="text-xs font-extrabold leading-none">Pulse AI Assistant</p>
            <p className="text-[10px] text-indigo-300 font-medium mt-0.5">
              {patient ? `Linked to ${patient.name.split(' ')[0]}` : 'Ready for queries'}
            </p>
          </div>
        </button>
      ) : (
        <div className="bg-slate-950 text-white rounded-2xl shadow-2xl border border-indigo-500/30 w-80 sm:w-96 flex flex-col h-[520px] overflow-hidden">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  Pulse Companion AI
                  {enableRPGSystem && (
                    <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-extrabold">
                      RPG Active
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-indigo-300 font-medium">Target Date: {selectedDateLabel}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[82%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs font-medium'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-xs'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs italic">
                <Bot className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                Analyzing clinical context...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex flex-wrap gap-1.5">
            <button
              onClick={() => handleSendMessage(`Explain my BP ${bpValue}`)}
              className="text-[10px] bg-slate-800 hover:bg-indigo-900 text-indigo-200 px-2 py-1 rounded-md border border-slate-700 transition cursor-pointer"
            >
              ✨ Explain my BP {bpValue}
            </button>
            <button
              onClick={() => handleSendMessage(`What should I know about my ${activeMedName} prescription?`)}
              className="text-[10px] bg-slate-800 hover:bg-indigo-900 text-indigo-200 px-2 py-1 rounded-md border border-slate-700 transition cursor-pointer"
            >
              💊 {activeMedName} info
            </button>
            <button
              onClick={() => handleSendMessage(`Summarize my latest health changes`)}
              className="text-[10px] bg-slate-800 hover:bg-indigo-900 text-indigo-200 px-2 py-1 rounded-md border border-slate-700 transition cursor-pointer"
            >
              💡 Health Delta
            </button>
          </div>

          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask a question or log note for ${selectedDateLabel}...`}
                className="flex-1 bg-slate-950 text-white placeholder-slate-500 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white flex items-center justify-center transition shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[9px] text-slate-500 text-center mt-1.5 font-medium">
              ⚠️ Notice: For administrative preparation only. Not a substitute for professional clinical advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
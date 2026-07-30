'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X, Bot, Move } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  chips?: string[];
  timestamp: string;
}

interface PulseChatDrawerProps {
  patient: any;
  calendarLogs: any[];
  selectedDateLabel: string;
  onLogToCalendar: (noteText: string, targetDateStr?: string) => void;
  onLogWorkoutToCalendar: (exercise: string, details: string, targetDateStr?: string) => void;
  onLogMedsForDate: (targetDateStr: string) => void;
}

export default function PulseChatDrawer({
  patient,
  calendarLogs,
  selectedDateLabel,
  onLogToCalendar,
  onLogWorkoutToCalendar,
  onLogMedsForDate,
}: PulseChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- DRAGGABLE POSITION STATE ---
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0, startY: 0, initialX: 0, initialY: 0
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: "I'm here to help organize your health records! Ask me about your medications, doctor visits, workouts, or log notes.",
      chips: ['What are my vitals?', 'When is my next visit?', 'List my medications'],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          patient,
          selectedDateLabel,
          calendarLogs,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.reply || "I'm here to help organize your health records!",
          chips: data.chips || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (data.action?.type === 'LOG_MEDS_TAKEN') {
          onLogMedsForDate(data.action.targetDateStr || selectedDateLabel);
        } else if (data.action?.type === 'LOG_WORKOUT') {
          onLogWorkoutToCalendar(
            data.action.exercise || 'Workout Session',
            data.action.details || textToSend,
            data.action.targetDateStr
          );
        } else if (data.action?.type === 'LOG_NOTE') {
          onLogToCalendar(data.action.noteText || textToSend, data.action.targetDateStr);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className="fixed bottom-4 right-4 z-50 w-full max-w-xs sm:max-w-sm print:hidden transition-transform duration-75"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur flex flex-col max-h-[520px]">
        {/* DRAGGABLE HEADER */}
        <div 
          onMouseDown={handleMouseDown}
          className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-slate-500" />
            <div className="p-1 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">Pulse Companion AI</h3>
              <p className="text-[10px] text-slate-400">Target Date: {selectedDateLabel}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isOpen && (
          <>
            <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[260px] max-h-[340px] bg-slate-900/90">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1.5">
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white ml-auto max-w-[82%] shadow-sm'
                        : 'bg-slate-800 text-slate-100 mr-auto max-w-[88%] border border-slate-700/80 shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.sender === 'assistant' && msg.chips && msg.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {msg.chips.map((chipText, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(chipText)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 transition-all cursor-pointer flex items-center gap-1 shadow-sm font-medium"
                        >
                          <span>✨</span> {chipText}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="text-xs text-slate-400 italic bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-xl w-fit flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 animate-spin text-indigo-400" /> Pulse AI is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Ask a question or log note for ${selectedDateLabel}...`}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-amber-950/30 border-t border-amber-800/30 px-3 py-1.5 text-[10px] text-amber-300/70 font-medium">
              ⚠️ <strong>Notice:</strong> For preparation only. Not a substitute for professional clinical advice.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
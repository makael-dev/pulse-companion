'use client';

import React, { useState } from 'react';
import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';

interface PrepItem {
  id: string;
  timeframe: string;
  task: string;
  detail: string;
  completed: boolean;
}

export default function AppointmentPrepTimeline({ targetDate = 'August 18, 2026' }: { targetDate?: string }) {
  const [tasks, setTasks] = useState<PrepItem[]>([
    {
      id: 't-1',
      timeframe: '14 Days Prior',
      task: 'Complete Pre-Visit Lab Panel',
      detail: 'Fasting lipid and HbA1c blood draw at local Quest or Labcorp facility.',
      completed: true,
    },
    {
      id: 't-2',
      timeframe: '7 Days Prior',
      task: 'Review Medication Adherence',
      detail: 'Ensure 28-day daily pill tracker logs are updated in Pulse Companion.',
      completed: true,
    },
    {
      id: 't-3',
      timeframe: '2 Days Prior',
      task: 'Generate Doctor Prep Questions',
      detail: 'Log any new symptoms or concerns to build your PDF visit agenda.',
      completed: false,
    },
    {
      id: 't-4',
      timeframe: 'Day of Visit',
      task: 'Bring Wallet Emergency ID & Agenda PDF',
      detail: 'Present printed prep summary or wallet card at check-in.',
      completed: false,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Upcoming Visit Prep Countdown</h3>
            <p className="text-xs text-slate-400">Target Appointment: {targetDate}</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 font-medium">
          {completedCount} of {tasks.length} Step(s) Ready
        </span>
      </div>

      {/* Step Checklist */}
      <div className="space-y-3">
        {tasks.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleTask(item.id)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
              item.completed
                ? 'bg-slate-950/60 border-emerald-900/40 text-slate-300'
                : 'bg-slate-950 border-slate-800 text-slate-100 hover:border-purple-500/40'
            }`}
          >
            <div className="mt-0.5">
              {item.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-500" />
              )}
            </div>

            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${item.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                  {item.task}
                </span>
                <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/40 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {item.timeframe}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
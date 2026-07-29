'use client';

import React, { useState, useMemo, useEffect } from 'react';

interface DailyLog {
  bedtime: string;
  wakeTime: string;
  sleepHours: number;
  stressLevel: number;
  caffeineCups: number;
  mood: string;
  notes: string;
}

export default function MentalHealthTab() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({
    'Jul 29': { bedtime: '23:00', wakeTime: '06:30', sleepHours: 7.5, stressLevel: 8, caffeineCups: 2, mood: 'Anxious', notes: 'Late coffee meeting' },
    'Jul 28': { bedtime: '00:00', wakeTime: '05:00', sleepHours: 5.0, stressLevel: 8, caffeineCups: 1, mood: 'Fatigued', notes: 'Trouble falling asleep' },
    'Jul 27': { bedtime: '22:30', wakeTime: '06:30', sleepHours: 8.0, stressLevel: 4, caffeineCups: 0, mood: 'Rested', notes: 'Took melatonin' },
  });

  const [selectedDateKey, setSelectedDateKey] = useState<string>('Jul 29');
  const [copiedExport, setCopiedExport] = useState(false);

  // Load saved data from localStorage on initial render
  useEffect(() => {
    const saved = localStorage.getItem('pulse_wellness_logs');
    if (saved) {
      setLogs(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  // Auto-save to localStorage whenever logs change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('pulse_wellness_logs', JSON.stringify(logs));
    }
  }, [logs, isLoaded]);

  // Generate 28-day range
  const monthDays = useMemo(() => {
    const today = new Date();
    const days = [];

    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const dateKey = `${monthName}${dayNum}`;
      const isToday = i === 0;

      days.push({ label: isToday ? 'TODAY' : dayName, dayNum, dateKey, isToday });
    }
    return days;
  }, []);

  const currentLog = logs[selectedDateKey] || {
    bedtime: '23:00', wakeTime: '07:00', sleepHours: 8, stressLevel: 4, caffeineCups: 1, mood: 'Neutral', notes: '',
  };

  const updateLog = (fields: Partial<DailyLog>) => {
    setLogs((prev) => {
      const updated = { ...currentLog, ...fields };
      
      if (fields.bedtime || fields.wakeTime) {
        const [bHour, bMin] = updated.bedtime.split(':').map(Number);
        const [wHour, wMin] = updated.wakeTime.split(':').map(Number);
        let bDate = new Date(2026, 6, 1, bHour, bMin);
        let wDate = new Date(2026, 6, 2, wHour, wMin);
        if (wHour >= bHour) {
          wDate = new Date(2026, 6, 1, wHour, wMin);
        }
        const diffHrs = Math.max(0, (wDate.getTime() - bDate.getTime()) / (1000 * 60 * 60));
        updated.sleepHours = parseFloat(diffHrs.toFixed(1));
      }

      return { ...prev, [selectedDateKey]: updated };
    });
  };

  const getDotColor = (log?: DailyLog) => {
    if (!log) return 'bg-slate-700';
    if (log.sleepHours >= 7 && log.stressLevel <= 5 && log.caffeineCups <= 1) return 'bg-emerald-400';
    if (log.sleepHours >= 5 && log.stressLevel <= 7) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  const logEntries = Object.values(logs);
  const avgSleep = (logEntries.reduce((a, b) => a + b.sleepHours, 0) / (logEntries.length || 1)).toFixed(1);
  const highStressDays = logEntries.filter((l) => l.stressLevel >= 7).length;
  const highCaffeineDays = logEntries.filter((l) => l.caffeineCups === 2).length;

  const handleExportSummary = () => {
    const summaryText = `--- 28-DAY WELLNESS REPORT ---\nAvg Sleep: ${avgSleep} hrs\nHigh Stress Days: ${highStressDays}\nHigh Caffeine Days:${highCaffeineDays}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const isHighStress = currentLog.stressLevel >= 7;
  const isHighCaffeine = currentLog.caffeineCups === 2;
  const moodOptions = ['😊 Rested', '😐 Neutral', '😰 Anxious', '😴 Fatigued'];
  const caffeineLabels = ['None ☕', '1–2 Cups ☕', '3+ Cups ☕☕☕'];

  // Prevent UI rendering until loaded to avoid hydration mismatch
  if (!isLoaded) return <div className="p-8 text-center text-slate-400 animate-pulse">Loading Telemetry...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md flex justify-between items-center text-xs">
        <div>
          <span className="text-indigo-400 font-bold uppercase tracking-wider">Lifestyle Telemetry</span>
          <h2 className="text-sm font-bold mt-0.5">Ezekiel Walter (42y Male)</h2>
        </div>
        <button
          onClick={handleExportSummary}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition shadow-sm"
        >
          {copiedExport ? '✅ Copied!' : '📩 Export Summary'}
        </button>
      </div>

      {/* Weekly Trend Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-xs">
          <span className="text-slate-500 font-semibold uppercase">28-Day Avg Sleep</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{avgSleep} hrs</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-xs">
          <span className="text-slate-500 font-semibold uppercase">High Stress Days</span>
          <p className="text-xl font-bold text-rose-600 mt-1">{highStressDays} Days</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-xs">
          <span className="text-slate-500 font-semibold uppercase">Caffeine Alert</span>
          <p className="text-xl font-bold text-amber-600 mt-1">{highCaffeineDays} High Days</p>
        </div>
      </div>

      {/* 28-Day Mobile-Swipeable Grid */}
      <div className="p-5 bg-slate-950 text-white rounded-xl shadow-md space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-200">🗓️ 28-Day History Grid</span>
        </div>

        {/* Added overflow-x-auto and flex for mobile swiping */}
        <div className="overflow-x-auto pb-3 -mx-2 px-2 scrollbar-hide">
          <div className="flex sm:grid sm:grid-cols-14 gap-2 pt-2 min-w-max sm:min-w-0">
            {monthDays.map((day) => {
              const isSelected = selectedDateKey === day.dateKey;
              const log = logs[day.dateKey];
              const dotColor = getDotColor(log);

              return (
                <button
                  key={day.dateKey}
                  onClick={() => setSelectedDateKey(day.dateKey)}
                  className={`p-2 rounded-lg text-center border transition flex flex-col items-center justify-between min-w-[55px] sm:min-w-0 ${
                    isSelected
                      ? 'bg-white text-slate-900 border-white font-bold shadow-lg scale-105 z-10'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-[9px] uppercase tracking-wider opacity-80">{day.label}</span>
                  <span className="text-xs font-extrabold my-0.5">{day.dayNum}</span>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* EHR Clinical Insight Alert */}
      {(isHighStress || isHighCaffeine) && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-4">
          <span className="text-xl">⚠️</span>
          <div className="space-y-1">
            <h4 className="font-bold text-rose-950">EHR Clinical Correlation Warning</h4>
            <p className="leading-relaxed">
              Combined elevated caffeine and stress can exacerbate sleep disruptions. Auto-flagged for doctor prep summary.
            </p>
          </div>
        </div>
      )}

      {/* Logged Entry Controls */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-sm font-bold text-slate-800">
            ✏️ Logged Entry for: <span className="text-indigo-600 font-extrabold">{selectedDateKey}</span>
          </h3>
          <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md font-semibold">Saved</span>
        </div>

        {/* Mood Row */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Daily Mood & Energy:</label>
          <div className="flex flex-wrap gap-2">
            {moodOptions.map((mood) => {
              const label = mood.split(' ')[1];
              const isSelected = currentLog.mood === label;
              return (
                <button
                  key={mood}
                  onClick={() => updateLog({ mood: label })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Bedtime & Wake Time</span>
              <span className="text-indigo-600 font-bold">{currentLog.sleepHours} hrs</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={currentLog.bedtime} onChange={(e) => updateLog({ bedtime: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-semibold" />
              <input type="time" value={currentLog.wakeTime} onChange={(e) => updateLog({ wakeTime: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-semibold" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Stress Level</span>
              <span className={`font-bold text-sm ${isHighStress ? 'text-rose-600' : 'text-indigo-600'}`}>{currentLog.stressLevel}/10 {isHighStress ? '🔥' : ''}</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={currentLog.stressLevel} onChange={(e) => updateLog({ stressLevel: parseInt(e.target.value, 10) })} className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg mt-3" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700"><span>Caffeine Intake</span></div>
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              {caffeineLabels.map((label, idx) => (
                <button key={idx} onClick={() => updateLog({ caffeineCups: idx })} className={`py-2 px-1 text-[10px] font-semibold rounded-lg border transition ${currentLog.caffeineCups === idx ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t">
          <label className="text-xs font-semibold text-slate-700">📝 Daily Context Note:</label>
          <input type="text" placeholder="e.g. Woke up with mild headache..." value={currentLog.notes} onChange={(e) => updateLog({ notes: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50" />
        </div>
      </div>
    </div>
  );
}
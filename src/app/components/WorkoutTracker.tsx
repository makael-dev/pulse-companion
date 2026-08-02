'use client';

import { useState } from 'react';

type WorkoutEntry = {
  exercise: string;
  details: string;
  completed?: boolean;
};

type CalendarDayLog = {
  dateStr: string;
  dayLabel: string;
  workouts?: WorkoutEntry[];
  [key: string]: any;
};

type PatientProfile = {
  id?: string;
  name?: string;
  age?: number;
  gender?: string;
  vitals?: {
    bp?: string;
    heartRate?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

interface WorkoutTrackerProps {
  patient: PatientProfile | null;
  deadliftPR: number;
  benchPressPR: number;
  mileRunPR: string;
  fiveKRunPR: string;
  onUpdateDeadliftPR: (val: number) => void;
  onUpdateBenchPressPR: (val: number) => void;
  onUpdateMileRunPR: (val: string) => void;
  onUpdateFiveKRunPR: (val: string) => void;
  onOpenGenerator?: () => void;
  calendarLogs?: CalendarDayLog[];
  selectedDateLabel?: string;
  onLogWorkout?: (exercise: string, details: string) => void;
}

const PRESET_AI_ROUTINES = [
  {
    name: '💪 Arm & Bicep Blast',
    desc: '3 Dumbbell Curl sets, Tricep Dips, & Hammer Curls',
    details: '3 sets x 12 reps @ controlled tempo'
  },
  {
    name: '🏋️ Chest & Triceps Heavy',
    desc: 'Bench Press 3x8, Incline Dumbbell Press 3x10',
    details: '3 sets x 8-10 reps @ 75% 1RM'
  },
  {
    name: '🦵 Lower Body & Core',
    desc: 'Goblet Squats, Romanian Deadlifts, & Plank Hold',
    details: '3 sets x 10 reps + 60s plank'
  },
  {
    name: '⚡ 15-Min Quick Cardio HIIT',
    desc: 'Jumping Jacks, Mountain Climbers, Squats',
    details: '45 sec work / 15 sec rest x 3 rounds'
  }
];

export default function WorkoutTracker({
  patient,
  deadliftPR,
  benchPressPR,
  mileRunPR,
  fiveKRunPR,
  onUpdateDeadliftPR,
  onUpdateBenchPressPR,
  onUpdateMileRunPR,
  onUpdateFiveKRunPR,
  onOpenGenerator,
  calendarLogs = [],
  selectedDateLabel = 'Aug 1',
  onLogWorkout,
}: WorkoutTrackerProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [addedPresetIdx, setAddedPresetIdx] = useState<number | null>(null);

  // Locate current date's logged workouts dynamically
  const activeLog = calendarLogs.find(
    (l) => l.dateStr?.toLowerCase() === selectedDateLabel.toLowerCase()
  ) || calendarLogs[0];

  const loggedWorkouts = activeLog?.workouts || [];

  const handleSavePR = (field: string) => {
    if (field === 'deadlift') {
      const num = parseInt(inputValue, 10);
      if (!isNaN(num) && num > 0) onUpdateDeadliftPR(num);
    } else if (field === 'bench') {
      const num = parseInt(inputValue, 10);
      if (!isNaN(num) && num > 0) onUpdateBenchPressPR(num);
    } else if (field === 'mile') {
      if (inputValue.trim()) onUpdateMileRunPR(inputValue.trim());
    } else if (field === '5k') {
      if (inputValue.trim()) onUpdateFiveKRunPR(inputValue.trim());
    }
    setEditingField(null);
    setInputValue('');
  };

  const handleQuickAddPreset = (routineName: string, details: string, idx: number) => {
    if (onLogWorkout) {
      onLogWorkout(routineName, details);
    }
    setAddedPresetIdx(idx);
    setTimeout(() => setAddedPresetIdx(null), 1500);
  };

  const toggleCheckExercise = (key: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-4">
      {/* ACTIVE WORKOUT SESSIONS & GENERATED ROUTINES */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏋️‍♂️</span>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
                Active Workout Sessions & Generated AI Routines
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live routine tracking for <strong className="text-indigo-300">{selectedDateLabel}</strong> ({patient?.name || 'Paul Tremblay'})
            </p>
          </div>

          {onOpenGenerator && (
            <button
              onClick={onOpenGenerator}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>✨ Generate AI Routine</span>
            </button>
          )}
        </div>

        {/* LOGGED WORKOUTS LIST FOR ACTIVE DATE */}
        {loggedWorkouts.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Logged Exercises on Activity Screen ({loggedWorkouts.length} Session{loggedWorkouts.length > 1 ? 's' : ''}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {loggedWorkouts.map((w, idx) => {
                const itemKey = `${w.exercise}-${idx}`;
                const isChecked = !!completedExercises[itemKey];

                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheckExercise(itemKey)}
                    className={`p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 hover:border-indigo-500/70 text-white'
                    }`}
                  >
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white">• {w.exercise}</span>
                        <span className="text-[9px] bg-purple-900/80 text-purple-200 border border-purple-700/60 px-1.5 py-0.5 rounded font-bold">
                          AI Sync
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium leading-tight">
                        {w.details}
                      </p>
                    </div>

                    <div className="flex items-center shrink-0 pl-2">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border ${
                        isChecked
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-600 bg-slate-900 text-transparent'
                      }`}>
                        ✓
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-center space-y-2">
            <span className="text-2xl block">⚡</span>
            <p className="text-xs font-bold text-slate-300">No workout sessions logged for {selectedDateLabel} yet.</p>
            <p className="text-[11px] text-slate-500">
              Click <strong>"✨ Generate AI Routine"</strong> above or select a 1-click preset below to add a routine directly to this screen!
            </p>
          </div>
        )}

        {/* 1-CLICK INSTANT PRESET ROUTINE GENERATORS */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider block">
            ⚡ Quick 1-Click AI Routine Generators (Auto-Adds to Activity Screen):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESET_AI_ROUTINES.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickAddPreset(preset.name, preset.details, i)}
                className={`p-2.5 bg-slate-950 border rounded-xl transition text-left space-y-1 cursor-pointer group ${
                  addedPresetIdx === i
                    ? 'border-emerald-500 bg-emerald-950/40'
                    : 'border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/80'
                }`}
              >
                <div className="text-xs font-extrabold text-white group-hover:text-indigo-300 flex justify-between items-center">
                  <span>{preset.name}</span>
                  <span className={`text-[10px] font-bold ${addedPresetIdx === i ? 'text-emerald-400' : 'text-indigo-400'}`}>
                    {addedPresetIdx === i ? '✓ Added' : '+ Add'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium line-clamp-2">
                  {preset.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
              Personal Fitness Records & Demographic Benchmarks
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-full font-bold">
            🟢 Active Fitness Profile
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* DEADLIFT PR */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>🏋️</span> Deadlift (1RM)
              </span>
              {editingField === 'deadlift' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g. 315"
                    className="w-16 p-1 bg-slate-900 border border-indigo-500 rounded text-xs text-white font-bold"
                  />
                  <button onClick={() => handleSavePR('deadlift')} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold">Save</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingField('deadlift'); setInputValue(deadliftPR.toString()); }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  ✏️ Edit PR
                </button>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white">{deadliftPR}</span>
                <span className="text-xs font-bold text-slate-400 ml-1">lbs</span>
              </div>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-extrabold uppercase">
                Strength Peak
              </span>
            </div>

            <div className="pt-2 border-t border-slate-900 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Demography Standards (Male, 50y):</span>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400">Novice: 165 lbs</div>
                <div className="bg-indigo-950/80 p-1 rounded border border-indigo-700 text-indigo-200 font-bold">Intermediate: 255 lbs</div>
                <div className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400">Advanced: 345 lbs</div>
              </div>
            </div>
          </div>

          {/* BENCH PRESS PR */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>💪</span> Bench Press (1RM)
              </span>
              {editingField === 'bench' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g. 225"
                    className="w-16 p-1 bg-slate-900 border border-indigo-500 rounded text-xs text-white font-bold"
                  />
                  <button onClick={() => handleSavePR('bench')} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold">Save</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingField('bench'); setInputValue(benchPressPR.toString()); }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  ✏️ Edit PR
                </button>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white">{benchPressPR}</span>
                <span className="text-xs font-bold text-slate-400 ml-1">lbs</span>
              </div>
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded font-extrabold uppercase">
                Strength Peak
              </span>
            </div>

            <div className="pt-2 border-t border-slate-900 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Demography Standards (Male, 50y):</span>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400">Novice: 135 lbs</div>
                <div className="bg-purple-950/80 p-1 rounded border border-purple-700 text-purple-200 font-bold">Intermediate: 195 lbs</div>
                <div className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400">Advanced: 265 lbs</div>
              </div>
            </div>
          </div>

          {/* 1 MILE RUN TIME */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>⏱️</span> 1 Mile Run Time
              </span>
              {editingField === 'mile' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="7:45"
                    className="w-16 p-1 bg-slate-900 border border-indigo-500 rounded text-xs text-white font-bold"
                  />
                  <button onClick={() => handleSavePR('mile')} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold">Save</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingField('mile'); setInputValue(mileRunPR); }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  ✏️ Edit PR
                </button>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white">{mileRunPR}</span>
                <span className="text-xs font-bold text-slate-400 ml-1">mm:ss</span>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-extrabold uppercase">
                Endurance Metric
              </span>
            </div>

            <div className="pt-2 border-t border-slate-900 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Demography Standards (Male, 50y):</span>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400">Novice: 10:18</div>
                <div className="bg-cyan-950/80 p-1 rounded border border-cyan-700 text-cyan-200 font-bold">Intermediate: 8:00</div>
                <div className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400">Advanced: 6:19</div>
              </div>
            </div>
          </div>

          {/* 5K RUN TIME */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>🏃</span> 5K Run Time
              </span>
              {editingField === '5k' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="26:40"
                    className="w-16 p-1 bg-slate-900 border border-indigo-500 rounded text-xs text-white font-bold"
                  />
                  <button onClick={() => handleSavePR('5k')} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold">Save</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingField('5k'); setInputValue(fiveKRunPR); }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  ✏️ Edit PR
                </button>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white">{fiveKRunPR}</span>
                <span className="text-xs font-bold text-slate-400 ml-1">mm:ss</span>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-extrabold uppercase">
                Endurance Metric
              </span>
            </div>

            <div className="pt-2 border-t border-slate-900 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Demography Standards (Male, 50y):</span>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400">Novice: 34:00</div>
                <div className="bg-cyan-950/80 p-1 rounded border border-cyan-700 text-cyan-200 font-bold">Intermediate: 27:30</div>
                <div className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400">Advanced: 22:15</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
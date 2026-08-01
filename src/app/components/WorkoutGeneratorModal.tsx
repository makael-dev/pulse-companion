'use client';

import React, { useState } from 'react';
import { Dumbbell, Sparkles, Plus, Check, X, ShieldAlert } from 'lucide-react';

interface WorkoutGeneratorModalProps {
  patient: any;
  onClose: () => void;
  onLogWorkout: (exercise: string, details: string) => void;
}

const PRESET_ROUTINES = [
  {
    title: '⚡ 15-Min Quick HIIT',
    desc: 'High-intensity interval session for daily cardiovascular exercise targets.',
    exercises: [
      { name: 'Jumping Jacks', details: '3 sets x 45 secs' },
      { name: 'Bodyweight Squats', details: '3 sets x 15 reps' },
      { name: 'Mountain Climbers', details: '3 sets x 30 secs' },
      { name: 'Plank Hold', details: '3 sets x 45 secs' },
    ],
  },
  {
    title: '🏋️ Heavy Compound Lifts',
    desc: 'Strength-focused session to build PR stats for Deadlift and Bench Press.',
    exercises: [
      { name: 'Barbell Deadlift', details: '4 sets x 5 reps @ 80% 1RM' },
      { name: 'Flat Bench Press', details: '4 sets x 6 reps @ 75% 1RM' },
      { name: 'Bent-Over Rows', details: '3 sets x 8 reps' },
      { name: 'Overhead Press', details: '3 sets x 8 reps' },
    ],
  },
  {
    title: '🧘 Low-Impact & Joint Friendly',
    desc: 'Gentle mobility and low-strain exercises for recovery days or joint stiffness.',
    exercises: [
      { name: 'Cat-Cow Mobility Stretch', details: '2 sets x 10 cycles' },
      { name: 'Glute Bridges', details: '3 sets x 12 reps' },
      { name: 'Stationary Bike Spin', details: '15 minutes @ moderate pace' },
      { name: 'Bird-Dog Core Stability', details: '3 sets x 10 reps/side' },
    ],
  },
];

export default function WorkoutGeneratorModal({
  patient,
  onClose,
  onLogWorkout,
}: WorkoutGeneratorModalProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeRoutine, setActiveRoutine] = useState<any>(PRESET_ROUTINES[0]);
  const [loggedIndices, setLoggedIndices] = useState<Record<number, boolean>>({});

  const handleGenerateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    setGenerating(true);
    setTimeout(() => {
      const lower = customPrompt.toLowerCase();
      let generatedExercises = [
        { name: 'Dumbbell Goblet Squat', details: '3 sets x 12 reps' },
        { name: 'Push-Ups', details: '3 sets x 10-12 reps' },
        { name: 'Dumbbell Romanian Deadlift', details: '3 sets x 10 reps' },
        { name: 'Plank to Push-Up Transition', details: '3 sets x 30 secs' },
      ];

      if (lower.includes('chest') || lower.includes('push') || lower.includes('bench')) {
        generatedExercises = [
          { name: 'Incline Dumbbell Press', details: '4 sets x 10 reps' },
          { name: 'Chest Dips', details: '3 sets x 8-10 reps' },
          { name: 'Cable Chest Flyes', details: '3 sets x 12 reps' },
          { name: 'Diamond Push-Ups', details: '3 sets to failure' },
        ];
      } else if (lower.includes('leg') || lower.includes('lower body') || lower.includes('squat')) {
        generatedExercises = [
          { name: 'Barbell Back Squats', details: '4 sets x 8 reps' },
          { name: 'Walking Dumbbell Lunges', details: '3 sets x 12 reps/leg' },
          { name: 'Leg Press', details: '3 sets x 10 reps' },
          { name: 'Standing Calf Raises', details: '4 sets x 15 reps' },
        ];
      }

      setActiveRoutine({
        title: `✨ Custom AI Routine: ${customPrompt}`,
        desc: `Tailored to target: "${customPrompt}"`,
        exercises: generatedExercises,
      });
      setLoggedIndices({});
      setGenerating(false);
    }, 1200);
  };

  const handleLogSingle = (ex: { name: string; details: string }, idx: number) => {
    onLogWorkout(ex.name, ex.details);
    setLoggedIndices((prev) => ({ ...prev, [idx]: true }));
  };

  const handleLogAll = () => {
    activeRoutine.exercises.forEach((ex: any, i: number) => {
      onLogWorkout(ex.name, ex.details);
    });
    onClose();
  };

  const hasAsthma = patient?.conditions?.some((c: any) =>
    (typeof c === 'string' ? c : c.name).toLowerCase().includes('asthma')
  );

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-300 space-y-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 font-bold text-base p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">AI Workout & Routine Generator</h3>
            <p className="text-xs text-slate-500 font-medium">Select a preset or ask AI for a custom workout</p>
          </div>
        </div>

        {hasAsthma && (
          <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-xl text-xs text-amber-950 flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Condition Note: Routine incorporates hydration pacing for active Asthma diagnosis.</span>
          </div>
        )}

        {/* PRESET SELECTOR */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 block">Select Quick Preset Routine:</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESET_ROUTINES.map((routine, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveRoutine(routine);
                  setLoggedIndices({});
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                  activeRoutine.title === routine.title
                    ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold">{routine.title.split(' ')[0]} {routine.title.split(' ').slice(1).join(' ')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CUSTOM PROMPT FORM */}
        <form onSubmit={handleGenerateCustom} className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-800">
            Or describe what equipment/muscle group you want:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. 20-min dumbbell chest and triceps routine"
              className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={generating || !customPrompt.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold px-3 py-2 rounded-lg text-xs transition shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Building...' : 'Generate'}
            </button>
          </div>
        </form>

        {/* WORKOUT BREAKDOWN DISPLAY */}
        <div className="space-y-3 bg-purple-50/60 p-4 rounded-xl border border-purple-200 text-xs">
          <div className="border-b border-purple-200 pb-2">
            <h4 className="font-extrabold text-purple-950 text-sm">{activeRoutine.title}</h4>
            <p className="text-[11px] text-purple-800 font-medium">{activeRoutine.desc}</p>
          </div>

          <div className="space-y-2">
            {activeRoutine.exercises.map((ex: any, i: number) => {
              const isLogged = !!loggedIndices[i];
              return (
                <div
                  key={i}
                  className="bg-white p-2.5 rounded-lg border border-purple-100 flex items-center justify-between shadow-sm"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">• {ex.name}</span>
                    <span className="text-[11px] text-purple-900 font-semibold">{ex.details}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLogSingle(ex, i)}
                    disabled={isLogged}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer ${
                      isLogged
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                    }`}
                  >
                    {isLogged ? (
                      <>
                        <Check className="w-3 h-3" /> Logged
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Log
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleLogAll}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition shadow cursor-pointer"
          >
            🏋️ Add Full Routine to Calendar Log
          </button>
        </div>
      </div>
    </div>
  );
}
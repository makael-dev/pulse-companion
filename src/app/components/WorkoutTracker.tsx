'use client';

import React, { useState } from 'react';
import { Dumbbell, Trophy, Edit3, Flame, Timer, Activity } from 'lucide-react';

interface WorkoutTrackerProps {
  patient: any;
}

interface PersonalRecord {
  id: string;
  exercise: string;
  userRecord: string;
  unit: string;
  category: 'strength' | 'cardio';
  // Benchmarks based on ASL (Age, Sex, Location/Weight)
  avgBeginner: string;
  avgIntermediate: string;
  avgAdvanced: string;
}

export default function WorkoutTracker({ patient }: WorkoutTrackerProps) {
  const age = patient?.age || 42;
  const gender = patient?.gender || 'Male';
  const weight = patient?.vitals?.weight || '168 lbs';

  // Benchmark logic calculated based on Age, Sex, Weight
  const [records, setRecords] = useState<PersonalRecord[]>([
    {
      id: 'dl',
      exercise: 'Deadlift (1RM)',
      userRecord: '285',
      unit: 'lbs',
      category: 'strength',
      avgBeginner: '165 lbs',
      avgIntermediate: '255 lbs',
      avgAdvanced: '345 lbs',
    },
    {
      id: 'mile',
      exercise: '1 Mile Run Time',
      userRecord: '7:45',
      unit: 'mm:ss',
      category: 'cardio',
      avgBeginner: '10:18',
      avgIntermediate: '8:00',
      avgAdvanced: '6:19',
    },
    {
      id: 'bench',
      exercise: 'Bench Press (1RM)',
      userRecord: '195',
      unit: 'lbs',
      category: 'strength',
      avgBeginner: '135 lbs',
      avgIntermediate: '185 lbs',
      avgAdvanced: '245 lbs',
    },
    {
      id: '5k',
      exercise: '5K Run Time',
      userRecord: '26:40',
      unit: 'mm:ss',
      category: 'cardio',
      avgBeginner: '34:00',
      avgIntermediate: '27:30',
      avgAdvanced: '21:15',
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVal, setNewVal] = useState('');

  const handleUpdateRecord = (id: string) => {
    if (!newVal.trim()) return;
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, userRecord: newVal.trim() } : r))
    );
    setEditingId(null);
    setNewVal('');
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
      {/* Header with Patient ASL Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Trophy className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Personal Fitness Records & Demographic Benchmarks
            </h3>
            <p className="text-xs text-slate-400">
              Comparing performance against ASL averages ({gender}, {age} yrs, {weight})
            </p>
          </div>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 font-semibold flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-emerald-400" /> Active Fitness Profile
        </span>
      </div>

      {/* Grid of Workout Records & Averages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {records.map((rec) => (
          <div
            key={rec.id}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {rec.category === 'strength' ? (
                  <Dumbbell className="w-4 h-4 text-purple-400" />
                ) : (
                  <Timer className="w-4 h-4 text-sky-400" />
                )}
                <span className="text-xs font-bold text-slate-200">{rec.exercise}</span>
              </div>

              <button
                onClick={() => {
                  setEditingId(rec.id);
                  setNewVal(rec.userRecord);
                }}
                className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 font-medium transition"
              >
                <Edit3 className="w-3 h-3" /> Edit PR
              </button>
            </div>

            {/* Current Record Display / Edit Input */}
            {editingId === rec.id ? (
              <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-indigo-500/50">
                <input
                  type="text"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  placeholder={`Enter new record (${rec.unit})`}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white flex-1 focus:outline-none focus:border-indigo-400 font-bold"
                />
                <button
                  onClick={() => handleUpdateRecord(rec.id)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-500"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-slate-400 hover:text-white px-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-baseline justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Your Record</span>
                  <span className="text-xl font-extrabold text-white">
                    {rec.userRecord} <span className="text-xs text-slate-400 font-normal">{rec.unit}</span>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/40">
                  {rec.category === 'strength' ? 'Strength Peak' : 'Endurance Metric'}
                </span>
              </div>
            )}

            {/* ASL Demographic Averages */}
            <div className="pt-1 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-500" /> Demography Standards ({gender}, {age}y)
              </span>

              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block">Novice</span>
                  <strong className="text-slate-300">{rec.avgBeginner}</strong>
                </div>
                <div className="bg-indigo-950/40 p-1.5 rounded border border-indigo-800/50">
                  <span className="text-indigo-300 block font-bold">Intermediate</span>
                  <strong className="text-indigo-200">{rec.avgIntermediate}</strong>
                </div>
                <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 block">Advanced</span>
                  <strong className="text-slate-300">{rec.avgAdvanced}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
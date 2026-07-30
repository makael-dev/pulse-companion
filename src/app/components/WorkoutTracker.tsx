'use client';

import React, { useState } from 'react';
import { Trophy, BicepsFlexed, Timer, Edit3, Check } from 'lucide-react';

interface WorkoutTrackerProps {
  patient: any;
  deadliftPR: number;
  benchPressPR: number;
  mileRunPR: string;
  fiveKRunPR: string;
  onUpdateDeadliftPR: (val: number) => void;
  onUpdateBenchPressPR: (val: number) => void;
  onUpdateMileRunPR: (val: string) => void;
  onUpdateFiveKRunPR: (val: string) => void;
}

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
}: WorkoutTrackerProps) {
  const [editingCard, setEditingCard] = useState<string | null>(null);

  // Temporary edit inputs
  const [tempDeadlift, setTempDeadlift] = useState(deadliftPR);
  const [tempBench, setTempBench] = useState(benchPressPR);
  const [tempMile, setTempMile] = useState(mileRunPR);
  const [tempFiveK, setTempFiveK] = useState(fiveKRunPR);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide uppercase">
              Personal Fitness Records & Demographic Benchmarks
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparing performance against ASL averages (Male, 42 yrs, 168 lbs (76.2 kg))
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Active Fitness Profile
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 🏋️ 1. DEADLIFT (1RM) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <BicepsFlexed className="w-4 h-4 text-purple-400" /> Deadlift (1RM)
            </span>
            {editingCard === 'deadlift' ? (
              <button
                onClick={() => {
                  onUpdateDeadliftPR(tempDeadlift);
                  setEditingCard(null);
                }}
                className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Save
              </button>
            ) : (
              <button
                onClick={() => {
                  setTempDeadlift(deadliftPR);
                  setEditingCard('deadlift');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Edit3 className="w-3 h-3" /> Edit PR
              </button>
            )}
          </div>

          <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Your Record</span>
              {editingCard === 'deadlift' ? (
                <input
                  type="number"
                  value={tempDeadlift}
                  onChange={(e) => setTempDeadlift(parseInt(e.target.value, 10) || 0)}
                  className="bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-lg font-extrabold text-white w-28"
                />
              ) : (
                <span className="text-2xl font-extrabold text-white">{deadliftPR} <span className="text-xs text-slate-400 font-normal">lbs</span></span>
              )}
            </div>
            <span className="text-[11px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/60 px-2.5 py-1 rounded-md">
              Strength Peak
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Demography Standards (Male, 42y)
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block font-medium">Novice</span>
                <strong className="text-slate-200">165 lbs</strong>
              </div>
              <div className="p-1.5 rounded bg-indigo-950/40 border border-indigo-500/40">
                <span className="text-indigo-300 block font-bold">Intermediate</span>
                <strong className="text-indigo-200 font-extrabold">255 lbs</strong>
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block font-medium">Advanced</span>
                <strong className="text-slate-200">345 lbs</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 🏃‍♂️ 2. 1 MILE RUN TIME */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-sky-400" /> 1 Mile Run Time
            </span>
            {editingCard === 'mile' ? (
              <button
                onClick={() => {
                  onUpdateMileRunPR(tempMile);
                  setEditingCard(null);
                }}
                className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Save
              </button>
            ) : (
              <button
                onClick={() => {
                  setTempMile(mileRunPR);
                  setEditingCard('mile');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Edit3 className="w-3 h-3" /> Edit PR
              </button>
            )}
          </div>

          <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Your Record</span>
              {editingCard === 'mile' ? (
                <input
                  type="text"
                  value={tempMile}
                  onChange={(e) => setTempMile(e.target.value)}
                  className="bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-lg font-extrabold text-white w-28"
                />
              ) : (
                <span className="text-2xl font-extrabold text-white">{mileRunPR} <span className="text-xs text-slate-400 font-normal">mm:ss</span></span>
              )}
            </div>
            <span className="text-[11px] font-bold text-sky-300 bg-sky-950/80 border border-sky-800/60 px-2.5 py-1 rounded-md">
              Endurance Metric
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Demography Standards (Male, 42y)
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block font-medium">Novice</span>
                <strong className="text-slate-200">10:18</strong>
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block font-medium">Intermediate</span>
                <strong className="text-slate-200">8:00</strong>
              </div>
              <div className="p-1.5 rounded bg-indigo-950/40 border border-indigo-500/40">
                <span className="text-indigo-300 block font-bold">Advanced</span>
                <strong className="text-indigo-200 font-extrabold">6:19</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 🏋️ 3. BENCH PRESS (1RM) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <BicepsFlexed className="w-4 h-4 text-purple-400" /> Bench Press (1RM)
            </span>
            {editingCard === 'bench' ? (
              <button
                onClick={() => {
                  onUpdateBenchPressPR(tempBench);
                  setEditingCard(null);
                }}
                className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Save
              </button>
            ) : (
              <button
                onClick={() => {
                  setTempBench(benchPressPR);
                  setEditingCard('bench');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Edit3 className="w-3 h-3" /> Edit PR
              </button>
            )}
          </div>

          <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Your Record</span>
              {editingCard === 'bench' ? (
                <input
                  type="number"
                  value={tempBench}
                  onChange={(e) => setTempBench(parseInt(e.target.value, 10) || 0)}
                  className="bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-lg font-extrabold text-white w-28"
                />
              ) : (
                <span className="text-2xl font-extrabold text-white">{benchPressPR} <span className="text-xs text-slate-400 font-normal">lbs</span></span>
              )}
            </div>
            <span className="text-[11px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/60 px-2.5 py-1 rounded-md">
              Strength Peak
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Demography Standards (Male, 42y)
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block font-medium">Novice</span>
                <strong className="text-slate-200">135 lbs</strong>
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block font-medium">Intermediate</span>
                <strong className="text-slate-200">215 lbs</strong>
              </div>
              <div className="p-1.5 rounded bg-indigo-950/40 border border-indigo-500/40">
                <span className="text-indigo-300 block font-bold">Advanced</span>
                <strong className="text-indigo-200 font-extrabold">295 lbs</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 🏃‍♂️ 4. 5K RUN TIME */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-sky-400" /> 5K Run Time
            </span>
            {editingCard === 'fivek' ? (
              <button
                onClick={() => {
                  onUpdateFiveKRunPR(tempFiveK);
                  setEditingCard(null);
                }}
                className="text-xs bg-emerald-600 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Save
              </button>
            ) : (
              <button
                onClick={() => {
                  setTempFiveK(fiveKRunPR);
                  setEditingCard('fivek');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Edit3 className="w-3 h-3" /> Edit PR
              </button>
            )}
          </div>

          <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Your Record</span>
              {editingCard === 'fivek' ? (
                <input
                  type="text"
                  value={tempFiveK}
                  onChange={(e) => setTempFiveK(e.target.value)}
                  className="bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-lg font-extrabold text-white w-28"
                />
              ) : (
                <span className="text-2xl font-extrabold text-white">{fiveKRunPR} <span className="text-xs text-slate-400 font-normal">mm:ss</span></span>
              )}
            </div>
            <span className="text-[11px] font-bold text-sky-300 bg-sky-950/80 border border-sky-800/60 px-2.5 py-1 rounded-md">
              Endurance Metric
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Demography Standards (Male, 42y)
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block font-medium">Novice</span>
                <strong className="text-slate-200">32:00</strong>
              </div>
              <div className="p-1.5 rounded bg-indigo-950/40 border border-indigo-500/40">
                <span className="text-indigo-300 block font-bold">Intermediate</span>
                <strong className="text-indigo-200 font-extrabold">27:30</strong>
              </div>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block font-medium">Advanced</span>
                <strong className="text-slate-200">22:15</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
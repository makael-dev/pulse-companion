'use client';

import React, { useState } from 'react';
import { Shield, Flame, Heart, Zap, Award, BicepsFlexed, Sparkles } from 'lucide-react';

interface RPGStatsProps {
  patient: any;
  calendarLogs: any[];
}

type FFXIVJob = {
  id: string;
  name: string;
  role: 'Tank' | 'Melee DPS' | 'Physical Ranged' | 'Healer' | 'Caster';
  icon: string;
  perkTitle: string;
  perkDesc: string;
  primaryStat: 'STR' | 'END' | 'VIT' | 'REC';
};

const FFXIV_JOBS: FFXIVJob[] = [
  {
    id: 'war',
    name: 'Warrior (WAR)',
    role: 'Tank',
    icon: '🪓',
    perkTitle: 'Inner Release',
    perkDesc: '+15% Strength XP gain on heavy compound lift PRs',
    primaryStat: 'STR',
  },
  {
    id: 'pld',
    name: 'Paladin (PLD)',
    role: 'Tank',
    icon: '🛡️',
    perkTitle: 'Hallowed Ground',
    perkDesc: '+10% Vitality XP for consistent optimal blood pressure',
    primaryStat: 'VIT',
  },
  {
    id: 'mnk',
    name: 'Monk (MNK)',
    role: 'Melee DPS',
    icon: '🥊',
    perkTitle: 'Greased Lightning',
    perkDesc: '+12% Speed & Endurance XP on high-tempo workouts',
    primaryStat: 'STR',
  },
  {
    id: 'brd',
    name: 'Bard (BRD)',
    role: 'Physical Ranged',
    icon: '🏹',
    perkTitle: 'Peloton Pace',
    perkDesc: '+15% Endurance XP when meeting daily step target (8k+ steps)',
    primaryStat: 'END',
  },
  {
    id: 'whm',
    name: 'White Mage (WHM)',
    role: 'Healer',
    icon: '🪄',
    perkTitle: 'Curaja Recovery',
    perkDesc: '+15% Recovery XP boost when logging 7.5+ hours of sleep',
    primaryStat: 'REC',
  },
  {
    id: 'blm',
    name: 'Black Mage (BLM)',
    role: 'Caster',
    icon: '🔮',
    perkTitle: 'Ley Lines Focus',
    perkDesc: '+10% Vitality XP for maintaining low daily stress scores',
    primaryStat: 'VIT',
  },
];

export default function RPGStatsCard({ patient, calendarLogs }: RPGStatsProps) {
  // FFXIV Selected Job State
  const [selectedJobId, setSelectedJobId] = useState<string>('war');
  const activeJob = FFXIV_JOBS.find((j) => j.id === selectedJobId) || FFXIV_JOBS[0];

  // DYNAMIC STAT CALCULATIONS
  const deadlift = 285; // lbs
  const strStat = Math.min(100, Math.round((deadlift / 400) * 100));

  const steps = 7420;
  const endStat = Math.min(100, Math.round((steps / 8000) * 100));

  const hr = parseInt(patient?.vitals?.heartRate || '68', 10);
  const vitStat = Math.max(10, Math.min(100, 150 - hr));

  const avgSleep = calendarLogs.reduce((acc, curr) => acc + (curr.sleepHours || 7), 0) / (calendarLogs.length || 1);
  const recStat = Math.min(100, Math.round((avgSleep / 8) * 100));

  const charLevel = Math.round((strStat + endStat + vitStat + recStat) / 4);
  const expPercent = 74;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 shadow-2xl space-y-5 text-white">
      {/* HEADER: LEVEL & FFXIV JOB SYSTEM SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-xl shadow-lg border border-indigo-400">
            {charLevel}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeJob.icon}</span>
              <label htmlFor="ffxiv-job-select" className="sr-only">Select FFXIV Fitness Job</label>
              <select
                id="ffxiv-job-select"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="bg-slate-950 text-amber-300 font-extrabold text-xs px-3 py-1.5 rounded-lg border-2 border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer shadow-md"
              >
                {FFXIV_JOBS.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.icon} {job.name} [{job.role}]
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-indigo-300 font-medium">
              Character: <strong className="text-white">{patient?.name || 'Ezekiel Walter'}</strong> • Age {patient?.age || 42}
            </p>
          </div>
        </div>

        {/* EXP PROGRESS BAR */}
        <div className="w-full sm:w-48 space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
            <span>EXP TO LVL {charLevel + 1}</span>
            <span>{expPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full border border-indigo-500/30 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${expPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* STATS GRID (HIGHLIGHTS PRIMARY STAT FOR ACTIVE JOB) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* STR */}
        <div className={`p-3 rounded-xl bg-slate-950/80 border transition-all ${
          activeJob.primaryStat === 'STR' ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'border-purple-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <span className="flex items-center gap-1"><BicepsFlexed className="w-3.5 h-3.5" /> STR</span>
            <span className="text-sm text-white font-extrabold">{strStat}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${strStat}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Deadlift: 285 lbs</span>
        </div>

        {/* END */}
        <div className={`p-3 rounded-xl bg-slate-950/80 border transition-all ${
          activeJob.primaryStat === 'END' ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'border-sky-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-sky-300">
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> END</span>
            <span className="text-sm text-white font-extrabold">{endStat}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-sky-400 h-full rounded-full" style={{ width: `${endStat}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Steps: {steps} / 8k</span>
        </div>

        {/* VIT */}
        <div className={`p-3 rounded-xl bg-slate-950/80 border transition-all ${
          activeJob.primaryStat === 'VIT' ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> VIT</span>
            <span className="text-sm text-white font-extrabold">{vitStat}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${vitStat}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Resting HR: {hr} bpm</span>
        </div>

        {/* REC */}
        <div className={`p-3 rounded-xl bg-slate-950/80 border transition-all ${
          activeJob.primaryStat === 'REC' ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
            <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> REC</span>
            <span className="text-sm text-white font-extrabold">{recStat}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${recStat}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Avg Sleep: {avgSleep.toFixed(1)}h</span>
        </div>
      </div>

      {/* ACTIVE FFXIV JOB PERK BUFF BANNER */}
      <div className="p-3 rounded-xl bg-indigo-950/70 border border-amber-400/40 flex items-center justify-between text-xs shadow-inner">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <div>
            <strong className="text-amber-300 block font-bold">
              Active Job Ability: "{activeJob.perkTitle}"
            </strong>
            <span className="text-[11px] text-indigo-200">{activeJob.perkDesc}</span>
          </div>
        </div>
        <span className="text-[10px] font-extrabold bg-amber-400 text-slate-950 px-2.5 py-1 rounded-md uppercase tracking-wider">
          BUFF ACTIVE
        </span>
      </div>
    </div>
  );
}
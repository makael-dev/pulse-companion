'use client';

import React, { useState } from 'react';
import { Shield, Flame, Heart, Zap, BicepsFlexed, Sparkles } from 'lucide-react';

interface RPGStatsProps {
  patient: any;
  calendarLogs: any[];
  deadliftPR?: number;
  benchPressPR?: number;
  mileRunPR?: string; // e.g. "7:45"
  fiveKRunPR?: string; // e.g. "24:30"
}

type JobRole = {
  id: string;
  name: string;
  category: 'Tank' | 'Melee DPS' | 'Physical Ranged' | 'Healer' | 'Caster';
  icon: string;
  perkTitle: string;
  perkDesc: string;
  primaryStat: 'STR' | 'END' | 'VIT' | 'REC';
};

const JOB_ROLES: JobRole[] = [
  {
    id: 'warrior',
    name: 'Warrior (WAR)',
    category: 'Tank',
    icon: '🪓',
    perkTitle: 'Inner Release',
    perkDesc: '+15% Strength XP gain on heavy compound lift PRs',
    primaryStat: 'STR',
  },
  {
    id: 'paladin',
    name: 'Paladin (PLD)',
    category: 'Tank',
    icon: '🛡️',
    perkTitle: 'Hallowed Ground',
    perkDesc: '+10% Vitality XP for consistent optimal blood pressure',
    primaryStat: 'VIT',
  },
  {
    id: 'monk',
    name: 'Monk (MNK)',
    category: 'Melee DPS',
    icon: '🥊',
    perkTitle: 'Greased Lightning',
    perkDesc: '+12% Speed & Endurance XP on high-tempo workouts',
    primaryStat: 'STR',
  },
  {
    id: 'bard',
    name: 'Bard (BRD)',
    category: 'Physical Ranged',
    icon: '🏹',
    perkTitle: 'Peloton Pace',
    perkDesc: '+15% Endurance XP when meeting daily step target (8k+ steps)',
    primaryStat: 'END',
  },
  {
    id: 'white_mage',
    name: 'White Mage (WHM)',
    category: 'Healer',
    icon: '🪄',
    perkTitle: 'Curaja Recovery',
    perkDesc: '+15% Recovery XP boost when logging 7.5+ hours of sleep',
    primaryStat: 'REC',
  },
  {
    id: 'black_mage',
    name: 'Black Mage (BLM)',
    category: 'Caster',
    icon: '🔮',
    perkTitle: 'Ley Lines Focus',
    perkDesc: '+10% Vitality XP for maintaining low daily stress scores',
    primaryStat: 'VIT',
  },
];

// Helper: Convert MM:SS string to total seconds
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 480; // default 8 mins
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseInt(timeStr, 10) || 480;
}

export default function RPGStatsCard({ 
  patient, 
  calendarLogs, 
  deadliftPR = 285, 
  benchPressPR = 225,
  mileRunPR = '7:45',
  fiveKRunPR = '24:30'
}: RPGStatsProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>('warrior');
  const activeJob = JOB_ROLES.find((j) => j.id === selectedJobId) || JOB_ROLES[0];

  // --- 1. DYNAMIC STRENGTH (STR) ---
  // Influenced by Deadlift PR + Bench Press PR
  const deadliftScore = (deadliftPR / 400) * 100;
  const benchScore = (benchPressPR / 300) * 100;
  const strStat = Math.min(100, Math.round((deadliftScore * 0.6) + (benchScore * 0.4)));

  // --- 2. DYNAMIC ENDURANCE (END) ---
  // Influenced by Daily Steps (7,420 / 8k) + 1 Mile Run Time + 5K Time
  const stepScore = Math.min(100, (7420 / 8000) * 100);
  const mileSeconds = parseTimeToSeconds(mileRunPR);
  // Benchmark: 5:00 (100 pts) down to 10:00 (50 pts)
  const mileScore = Math.max(30, Math.min(100, Math.round(150 - (mileSeconds / 6)))); 
  const endStat = Math.min(100, Math.round((stepScore * 0.5) + (mileScore * 0.5)));

  // --- 3. DYNAMIC VITALITY (VIT) ---
  // Influenced by Resting Heart Rate + Blood Pressure Status
  const hr = parseInt(patient?.vitals?.heartRate || '68', 10);
  const hrScore = Math.max(20, Math.min(100, 150 - hr));
  const isBPNormal = patient?.vitals?.bpStatus === 'normal';
  const vitStat = Math.min(100, Math.round(isBPNormal ? hrScore : hrScore * 0.85));

  // --- 4. DYNAMIC RECOVERY (REC) ---
  // Influenced by 28-Day Sleep Average + Daily Stress Score
  const avgSleep = calendarLogs.reduce((acc, curr) => acc + (curr.sleepHours || 7), 0) / (calendarLogs.length || 1);
  const sleepScore = (avgSleep / 8) * 100;
  const avgStress = calendarLogs.reduce((acc, curr) => acc + (curr.stressLevel || 4), 0) / (calendarLogs.length || 1);
  const stressPenalty = (avgStress / 10) * 15; // Penalty up to 15 points
  const recStat = Math.max(10, Math.min(100, Math.round(sleepScore - stressPenalty)));

  // Overall Character Level (Fully Dynamic across all trackers)
  const charLevel = Math.round((strStat + endStat + vitStat + recStat) / 4);
  const expPercent = 74;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 shadow-2xl space-y-5 text-white">
      {/* HEADER: LEVEL & JOB SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-xl shadow-lg border border-indigo-400">
            {charLevel}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeJob.icon}</span>
              <label htmlFor="job-role-select" className="sr-only">Select Fitness Job</label>
              <select
                id="job-role-select"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="bg-slate-950 text-amber-300 font-extrabold text-xs px-3 py-1.5 rounded-lg border-2 border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer shadow-md"
              >
                {JOB_ROLES.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.icon} {job.name} [{job.category}]
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

      {/* DYNAMIC STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* STR (INFLUENCED BY DEADLIFT + BENCH) */}
        <div className={`p-3 rounded-xl bg-slate-950/80 border transition-all ${
          activeJob.primaryStat === 'STR' ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'border-purple-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <span className="flex items-center gap-1"><BicepsFlexed className="w-3.5 h-3.5" /> STR</span>
            <span className="text-sm text-white font-extrabold">{strStat}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${strStat}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 font-medium">
            DL: {deadliftPR}lb • Bench: {benchPressPR}lb
          </span>
        </div>

        {/* END (INFLUENCED BY STEPS + RUN TIMES) */}
        <div className={`p-3 rounded-xl bg-slate-950/80 border transition-all ${
          activeJob.primaryStat === 'END' ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'border-sky-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-sky-300">
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> END</span>
            <span className="text-sm text-white font-extrabold">{endStat}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-sky-400 h-full rounded-full transition-all duration-300" style={{ width: `${endStat}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 font-medium">
            Steps: 7.4k • 1M: {mileRunPR}
          </span>
        </div>

        {/* VIT (INFLUENCED BY RESTING HR + BP) */}
        <div className={`p-3 rounded-xl bg-slate-950/80 border transition-all ${
          activeJob.primaryStat === 'VIT' ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> VIT</span>
            <span className="text-sm text-white font-extrabold">{vitStat}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-rose-500 h-full rounded-full transition-all duration-300" style={{ width: `${vitStat}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 font-medium">
            RHR: {hr} bpm • BP: {patient?.vitals?.bp || '118/78'}
          </span>
        </div>

        {/* REC (INFLUENCED BY SLEEP + STRESS INDEX) */}
        <div className={`p-3 rounded-xl bg-slate-950/80 border transition-all ${
          activeJob.primaryStat === 'REC' ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg' : 'border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
            <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> REC</span>
            <span className="text-sm text-white font-extrabold">{recStat}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: `${recStat}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 font-medium">
            Sleep: {avgSleep.toFixed(1)}h • Stress: {avgStress.toFixed(0)}/10
          </span>
        </div>
      </div>

      {/* ACTIVE JOB PERK BUFF BANNER */}
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
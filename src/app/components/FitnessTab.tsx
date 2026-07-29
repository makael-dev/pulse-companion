'use client';

import React from 'react';

interface FitnessTabProps {
  selectedPatientId: string;
}

const PATIENT_FITNESS_DATA: Record<string, { steps: number; stepGoal: number; activeMins: number; minGoal: number }> = {
  'ezekiel-walter': { steps: 8420, stepGoal: 10000, activeMins: 42, minGoal: 30 },
  'paul-tremblay': { steps: 4120, stepGoal: 10000, activeMins: 18, minGoal: 30 },
  'default': { steps: 6200, stepGoal: 10000, activeMins: 25, minGoal: 30 },
};

export default function FitnessTab({ selectedPatientId }: FitnessTabProps) {
  const fitness = PATIENT_FITNESS_DATA[selectedPatientId] || PATIENT_FITNESS_DATA['default'];
  const stepPercent = Math.min(100, Math.round((fitness.steps / fitness.stepGoal) * 100));
  const minPercent = Math.min(100, Math.round((fitness.activeMins / fitness.minGoal) * 100));

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Activity & Fitness Telemetry</h3>
            <p className="text-sm text-slate-500">Live wearable data sync for current profile</p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
            ● Device Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Step Counter Card */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">Daily Steps</span>
              <span className="text-xs text-slate-500">{fitness.steps} / {fitness.stepGoal}</span>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stepPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{stepPercent}% of daily goal achieved</p>
          </div>

          {/* Active Minutes Card */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">Active Exercise Mins</span>
              <span className="text-xs text-slate-500">{fitness.activeMins} / {fitness.minGoal} mins</span>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${minPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{minPercent}% of daily exercise goal achieved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React from 'react';

interface MentalHealthTabProps {
  lifestyle: any;
  setLifestyle: (data: any) => void;
}

export default function MentalHealthTab({ lifestyle, setLifestyle }: MentalHealthTabProps) {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Sleep & Stress Monitoring</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Sleep Duration: {lifestyle?.sleepHours || 7} hrs/night
            </label>
            <input 
              type="range" 
              min="3" 
              max="12" 
              value={lifestyle?.sleepHours || 7}
              onChange={(e) => setLifestyle({ ...lifestyle, sleepHours: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Stress Level: {lifestyle?.stressLevel || 4} / 10
            </label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={lifestyle?.stressLevel || 4}
              onChange={(e) => setLifestyle({ ...lifestyle, stressLevel: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
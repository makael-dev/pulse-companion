'use client';

import React from 'react';

interface SummaryTabProps {
  patient: any;
  mcpInsight?: string;
}

export default function SummaryTab({ patient, mcpInsight }: SummaryTabProps) {
  if (!patient) return null;

  return (
    <div className="space-y-6">
      {/* EHR Summary & Patient Overview Card */}
      <div className="p-6 bg-slate-900 text-white rounded-xl shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">EHR Record</span>
            <h2 className="text-2xl font-bold mt-1">{patient.name}</h2>
            <p className="text-xs text-slate-300 mt-1">
              DOB: {patient.dob} | Sex: {patient.sex} | Location: {patient.location}
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs rounded-full">
            Active Provider: {patient.provider || 'Dr. Vance, MD'}
          </span>
        </div>
      </div>

      {/* Vitals Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
          <span className="text-xs font-medium text-slate-500">Blood Pressure</span>
          <p className="text-lg font-bold text-slate-800 mt-1">{patient.vitals?.bp || '118/78'}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
          <span className="text-xs font-medium text-slate-500">Heart Rate</span>
          <p className="text-lg font-bold text-slate-800 mt-1">{patient.vitals?.heartRate || '68'} bpm</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
          <span className="text-xs font-medium text-slate-500">SpO2</span>
          <p className="text-lg font-bold text-slate-800 mt-1">{patient.vitals?.spo2 || '98%'}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 text-center">
          <span className="text-xs font-medium text-slate-500">HbA1c</span>
          <p className="text-lg font-bold text-slate-800 mt-1">{patient.vitals?.hba1c || '5.4%'}</p>
        </div>
      </div>
    </div>
  );
}
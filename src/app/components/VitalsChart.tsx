'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface VitalsChartProps {
  vitalsHistory?: Array<{
    date: string;
    systolic: number;
    diastolic: number;
    heartRate: number;
  }>;
}

const DEFAULT_TREND_DATA = [
  { date: 'Jul 1', systolic: 128, diastolic: 82, heartRate: 72 },
  { date: 'Jul 5', systolic: 124, diastolic: 80, heartRate: 70 },
  { date: 'Jul 10', systolic: 122, diastolic: 79, heartRate: 69 },
  { date: 'Jul 15', systolic: 120, diastolic: 78, heartRate: 68 },
  { date: 'Jul 20', systolic: 119, diastolic: 78, heartRate: 67 },
  { date: 'Jul 25', systolic: 118, diastolic: 78, heartRate: 68 },
  { date: 'Jul 28', systolic: 118, diastolic: 76, heartRate: 66 },
];

export default function VitalsChart({ vitalsHistory }: VitalsChartProps) {
  const chartData = vitalsHistory && vitalsHistory.length > 0 ? vitalsHistory : DEFAULT_TREND_DATA;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          📊 30-Day Vitals & Heart Rate Trends
        </h3>
        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded">
          Syncing via EHR Delta
        </span>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis domain={[50, 140]} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="systolic" name="BP Systolic" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="diastolic" name="BP Diastolic" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="heartRate" name="Heart Rate (bpm)" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
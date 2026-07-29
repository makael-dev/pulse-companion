'use client';

import React from 'react';

interface LabItem {
  testName: string;
  value: string;
  referenceRange: string;
  status: string;
}

interface LabGaugeModalProps {
  lab: LabItem;
  onClose: () => void;
}

export default function LabGaugeModal({ lab, onClose }: LabGaugeModalProps) {
  const isAbnormal = lab.status !== 'Normal';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-sm"
        >
          ✕
        </button>

        <div className="border-b border-slate-800 pb-3">
          <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Clinical Reference Gauge</span>
          <h3 className="text-lg font-bold text-white mt-0.5">{lab.testName}</h3>
        </div>

        {/* Value Callout */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
          <div>
            <span className="text-xs text-slate-400 block">Recorded Value</span>
            <span className="text-xl font-bold text-white">{lab.value}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Standard Reference</span>
            <span className="text-xs font-semibold text-slate-300">{lab.referenceRange}</span>
          </div>
        </div>

        {/* Color-Coded Spectrum Gauge */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-[11px] font-bold text-slate-400">
            <span className="text-sky-400">Low</span>
            <span className="text-emerald-400">Optimal Range</span>
            <span className="text-amber-400">High</span>
          </div>

          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex relative">
            <div className="w-1/4 bg-sky-500/40 border-r border-slate-900" />
            <div className="w-2/4 bg-emerald-500/50 border-r border-slate-900" />
            <div className="w-1/4 bg-amber-500/40" />
            
            {/* Visual Indicator Needle */}
            <div
              className={`absolute top-0 bottom-0 w-2.5 rounded-full shadow-lg ${
                isAbnormal ? 'bg-amber-400 ring-2 ring-amber-300' : 'bg-emerald-400 ring-2 ring-emerald-300'
              }`}
              style={{ left: isAbnormal ? '80%' : '48%' }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
          {isAbnormal
            ? `⚠️ This value falls outside standard reference ranges (${lab.referenceRange}). Discuss trends with your physician during your upcoming review.`
            : `✅ Your result is within standard target ranges. Maintained via current lifestyle and treatment plan.`}
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';

interface SymptomTabProps {
  symptoms: any[];
  onRemoveSymptom: (index: number) => void;
  prepQuestions: string;
  isGenerating: boolean;
  onGenerateQuestions: () => void;
}

export default function SymptomTab({
  symptoms,
  onRemoveSymptom,
  prepQuestions,
  isGenerating,
  onGenerateQuestions,
}: SymptomTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyQuestions = () => {
    if (!prepQuestions) return;
    navigator.clipboard.writeText(prepQuestions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Active Symptoms Card */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-slate-800">Logged Health Concerns & Stress Telemetry</h3>
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
            🧠 Linked with Wellness Tab
          </span>
        </div>

        {symptoms.length === 0 ? (
          <p className="text-sm text-slate-500">No symptoms added yet. Add health concerns above.</p>
        ) : (
          <ul className="space-y-2">
            {symptoms.map((symptom, idx) => (
              <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                <span className="font-medium text-slate-700">
                  {typeof symptom === 'string' ? symptom : symptom.text}
                </span>
                <button
                  onClick={() => onRemoveSymptom(idx)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* High Stress Context Injection Banner */}
        <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
          <span>📊 <strong>Active Stress Telemetry:</strong> Logged peak stress (8/10) will be factored into generated questions.</span>
        </div>

        <button
          onClick={onGenerateQuestions}
          disabled={isGenerating}
          className="mt-4 w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          {isGenerating ? 'Generating AI Questions...' : '✨ Generate Integrated Doctor Prep Questions'}
        </button>
      </div>

      {/* Recommended Questions Output Card */}
      {prepQuestions && (
        <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 relative">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-indigo-900">Recommended Doctor Questions:</h4>

            <button
              onClick={handleCopyQuestions}
              className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold rounded-md shadow-sm transition flex items-center gap-1"
            >
              {copied ? '✅ Copied to Clipboard!' : '📋 Copy Questions'}
            </button>
          </div>

          <pre className="text-xs text-indigo-950 whitespace-pre-wrap font-sans leading-relaxed">
            {prepQuestions}
          </pre>
        </div>
      )}
    </div>
  );
}
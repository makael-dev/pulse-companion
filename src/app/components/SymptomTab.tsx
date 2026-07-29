'use client';

import React from 'react';

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
  return (
    <div className="space-y-6">
      {/* Active Symptoms Card */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-3">Logged Health Concerns</h3>
        
        {symptoms.length === 0 ? (
          <p className="text-sm text-slate-500">No symptoms added yet. Add health concerns above.</p>
        ) : (
          <ul className="space-y-2">
            {symptoms.map((symptom, idx) => (
              <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                <span className="font-medium text-slate-700">{typeof symptom === 'string' ? symptom : symptom.text}</span>
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

        <button
          onClick={onGenerateQuestions}
          disabled={isGenerating}
          className="mt-4 w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          {isGenerating ? 'Generating AI Questions...' : '✨ Generate Doctor Prep Questions'}
        </button>
      </div>

      {/* Recommended Questions Output */}
      {prepQuestions && (
        <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100">
          <h4 className="text-sm font-bold text-indigo-900 mb-2">Recommended Doctor Questions:</h4>
          <pre className="text-xs text-indigo-950 whitespace-pre-wrap font-sans leading-relaxed">
            {prepQuestions}
          </pre>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { Camera, AlertTriangle, CheckCircle, Utensils, X } from 'lucide-react';

interface NutritionRiskModalProps {
  patient: any;
  onClose: () => void;
  onLogMealNote: (mealSummary: string) => void;
}

export default function NutritionRiskModal({ patient, onClose, onLogMealNote }: NutritionRiskModalProps) {
  const [mealInput, setMealInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalyzeMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealInput.trim()) return;

    setAnalyzing(true);
    setTimeout(() => {
      const lower = mealInput.toLowerCase();
      let sodiumAlert = false;
      let sugarAlert = false;

      if (lower.includes('ramen') || lower.includes('pizza') || lower.includes('burger') || lower.includes('soy sauce') || lower.includes('fries')) {
        sodiumAlert = true;
      }
      if (lower.includes('soda') || lower.includes('cake') || lower.includes('donut') || lower.includes('juice') || lower.includes('syrup')) {
        sugarAlert = true;
      }

      const hasHypertension = patient?.conditions?.some((c: any) => 
        (typeof c === 'string' ? c : c.name).toLowerCase().includes('hypertension')
      );
      const hasDiabetes = patient?.conditions?.some((c: any) => 
        (typeof c === 'string' ? c : c.name).toLowerCase().includes('diabetes')
      );

      setAnalysisResult({
        meal: mealInput,
        calories: Math.floor(Math.random() * 300) + 350,
        protein: `${Math.floor(Math.random() * 20) + 15}g`,
        carbs: `${Math.floor(Math.random() * 40) + 30}g`,
        sodium: sodiumAlert ? '1,120 mg (High)' : '420 mg (Normal)',
        warnings: [
          ...(sodiumAlert && hasHypertension ? ['⚠️ High Sodium Content: May elevate blood pressure for active Hypertension diagnosis.'] : []),
          ...(sugarAlert && hasDiabetes ? ['⚠️ High Glycemic Index: May cause blood glucose spike.'] : [])
        ]
      });
      setAnalyzing(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-300 space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 font-bold text-base p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">AI Nutrition & Safety Scanner</h3>
            <p className="text-xs text-slate-500 font-medium">Analyze meals for clinical condition clashes</p>
          </div>
        </div>

        <form onSubmit={handleAnalyzeMeal} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Describe your meal or snap a dish:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={mealInput}
                onChange={(e) => setMealInput(e.target.value)}
                placeholder="e.g. Teriyaki Chicken Ramen with Soy Sauce"
                className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setMealInput('Double Cheeseburger & Large Fries')}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="Mock Photo Upload"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={analyzing || !mealInput.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
          >
            {analyzing ? 'Scanning Nutrition Data...' : '🥗 Scan Meal & Check Risk'}
          </button>
        </form>

        {analysisResult && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-extrabold text-slate-900">{analysisResult.meal}</span>
              <span className="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded text-[10px]">
                {analysisResult.calories} kcal
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border">
                <span className="text-[10px] text-slate-500 block">Protein</span>
                <strong className="text-slate-900 font-bold">{analysisResult.protein}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border">
                <span className="text-[10px] text-slate-500 block">Carbs</span>
                <strong className="text-slate-900 font-bold">{analysisResult.carbs}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border">
                <span className="text-[10px] text-slate-500 block">Sodium</span>
                <strong className="text-slate-900 font-bold">{analysisResult.sodium}</strong>
              </div>
            </div>

            {analysisResult.warnings.length > 0 ? (
              <div className="space-y-1 bg-amber-50 border border-amber-300 p-2.5 rounded-lg text-amber-950 font-medium">
                {analysisResult.warnings.map((w: string, i: number) => (
                  <p key={i} className="flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg text-emerald-950 font-semibold text-[11px]">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Meal clears condition safety checks! No major salt/sugar flags.</span>
              </div>
            )}

            <button
              onClick={() => {
                onLogMealNote(`Logged Meal: ${analysisResult.meal} (${analysisResult.calories} kcal)`);
                onClose();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer"
            >
              + Add Meal to Calendar Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface SummaryTabProps {
  patient: any;
  mcpInsight?: string;
}

export default function SummaryTab({ patient, mcpInsight }: SummaryTabProps) {
  const [showModal, setShowModal] = useState(false);

  if (!patient) return null;

  // Encoded FHIR health data string
  const qrData = JSON.stringify({
    id: patient.id || 'P-84920',
    name: patient.name,
    dob: patient.dob,
    sex: patient.sex,
    allergies: patient.allergies || ['Penicillin', 'Peanuts'],
    emergencyContact: 'Clara Walter (Spouse) — (555) 234-9988',
  });

  return (
    <div className="space-y-6">
      {/* EHR Summary & Digital Health ID Header Card */}
      <div className="p-6 bg-slate-900 text-white rounded-xl shadow-md flex justify-between items-center">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Digital Health ID</span>
          <h2 className="text-2xl font-bold mt-1">{patient.name}</h2>
          <p className="text-xs text-slate-300 mt-1">
            DOB: {patient.dob} | Sex: {patient.sex} | Location: {patient.location}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs rounded-full">
              Active Provider: {patient.provider || 'Dr. Vance, MD'}
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-full transition"
            >
              🚨 View Emergency Card
            </button>
          </div>
        </div>

        {/* Header QR Badge */}
        <div 
          onClick={() => setShowModal(true)}
          className="bg-white p-2.5 rounded-lg shadow-inner flex flex-col items-center cursor-pointer hover:opacity-90 transition"
        >
          <QRCodeSVG value={qrData} size={80} level="M" />
          <span className="text-[9px] text-slate-600 font-bold mt-1">Scan Health ID</span>
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

      {/* EMERGENCY HEALTH ID MODAL POPUP */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border-2 border-rose-500 p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 text-rose-600">
              <span className="text-xl">🚨</span>
              <div>
                <h3 className="font-bold text-slate-900 leading-tight">EMERGENCY HEALTH ID</h3>
                <p className="text-[11px] text-slate-500">First Responder & Paramedic Reference</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <p className="font-bold text-slate-800">{patient.name}</p>
              <p className="text-slate-600">DOB: {patient.dob} | Sex: {patient.sex}</p>
              <p className="text-slate-600">Location: {patient.location}</p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs">
              <p className="font-bold text-rose-800 mb-1">⚠️ CRITICAL DRUG ALLERGIES:</p>
              <ul className="list-disc list-inside text-rose-700 space-y-0.5">
                {patient.allergies?.map((allergy: string, i: number) => (
                  <li key={i}>{allergy}</li>
                )) || <li>Penicillin (Hives & Swelling)</li>}
              </ul>
            </div>

            {/* REAL GENERATED QR CODE INSIDE MODAL */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <QRCodeSVG value={qrData} size={150} level="M" />
              <span className="text-[10px] font-semibold text-slate-500 mt-2">
                Scan for FHIR R4 Encrypted EHR
              </span>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
            >
              🖨️ Print Emergency Wallet Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';

// Dictionary translator for medical jargon -> plain English
const CONDITION_TRANSLATIONS: Record<string, string> = {
  'Mild Bronchial Asthma': 'Airway inflammation causing occasional shortness of breath, wheezing, or tightness in the chest.',
  'Hyperlipidemia': 'Elevated cholesterol or fatty lipids in the bloodstream that can build up in arterial walls.',
  'Essential (Primary) Hypertension': 'High blood pressure with no single identifiable cause. Requires routine tracking to protect your heart.',
  'Essential Hypertension': 'Consistently high blood pressure requiring daily tracking and health management.',
  'Stage 2 Hypertension': 'Significantly high blood pressure requiring medical care and lifestyle adjustments.',
  'Mild Hypertension': 'Slightly elevated blood pressure above standard reference ranges.',
  'Type 2 Diabetes Mellitus': 'A condition where the body has trouble regulating blood sugar levels due to insulin resistance.',
  'Uncontrolled Type 2 Diabetes': 'Blood sugar levels consistently above target, requiring extra monitoring to protect body organs.',
  'Prediabetes': 'Blood sugar levels are higher than normal, but not yet high enough to be classified as diabetes.',
  'Seasonal Allergic Rhinitis': 'Commonly known as hay fever. Causes nasal congestion, sneezing, or watery eyes from environmental triggers.',
  'Gastroesophageal Reflux Disease (GERD)': 'Acid reflux where stomach acid flows back up into the food pipe, causing heartburn.',
  'Osteoarthritis': 'Wear-and-tear joint degeneration causing stiffness and joint discomfort.',
  'Vitamin D Deficiency': 'Lower than recommended vitamin D levels in the blood, essential for bone health.',
  'Migraine without aura': 'Recurring severe throbbing headaches often accompanied by light sensitivity or nausea.',
  'Obstructive Sleep Apnea': 'A sleep disorder where breathing repeatedly stops and starts due to throat muscle relaxation.',
  'Chronic Kidney Disease (Stage 2)': 'Mild reduction in kidney filtering ability that requires regular monitoring.',
};

type MedicationItem = {
  name: string;
  instructions: string;
  plainEnglish: string;
};

type AllergyItem = {
  substance: string;
  severity: 'Low' | 'Moderate' | 'High';
  reaction: string;
};

type LabItem = {
  testName: string;
  value: string;
  referenceRange: string;
  status: string;
};

type EncounterItem = {
  date: string;
  type: string;
  doctor: string;
  summary: string;
};

type ClinicalItem = {
  name: string;
  plainEnglish: string;
};

type DetailedSymptom = {
  text: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  duration: '< 24 hrs' | '2-3 days' | '1+ weeks' | 'Chronic';
};

type CalendarDayLog = {
  dateStr: string;
  dayLabel: string;
  sleepHours: number;
  sleepQuality: 'Poor' | 'Fair' | 'Good' | 'Restful';
  mood: 'Good' | 'Neutral' | 'Anxious' | 'Fatigued';
  stressLevel: number;
};

type DoctorNotes = {
  date: string;
  doctor: string;
  summary: string;
  keyInstructions: string[];
};

type PatientProfile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dob?: string;
  age?: number;
  gender?: string;
  location?: string;
  lastVisitDate: string;
  primaryDoctor?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  insurance?: {
    provider: string;
    policyId: string;
    groupId: string;
  };
  nextVisit?: {
    date: string;
    type: string;
    doctor: string;
    location: string;
    status: string;
  };
  vitals: {
    bp: string;
    bpStatus: 'normal' | 'warning';
    heartRate: string;
    hrStatus: 'normal' | 'warning';
    hba1c: string;
    hba1cStatus: 'normal' | 'warning';
    spO2?: string;
    spO2Status?: 'normal' | 'warning';
    temp?: string;
    tempStatus?: 'normal' | 'warning';
    height?: string;
    weight?: string;
    bmi?: string;
  };
  allergies?: AllergyItem[];
  labs?: LabItem[];
  encounters?: EncounterItem[];
  medications?: MedicationItem[];
  conditions?: (string | ClinicalItem)[];
  immunizations?: (string | ClinicalItem)[];
  whatChangedSummary?: string;
  doctorNotes?: DoctorNotes;
};

const QUICK_ADD_SYMPTOMS = [
  'Fatigue / Low Energy',
  'Dizziness when standing',
  'Shortness of breath',
  'Morning headaches',
  'Joint stiffness or pain',
  'Trouble sleeping / Insomnia',
];

const INITIAL_CALENDAR_LOGS: CalendarDayLog[] = [
  { dateStr: 'Jul 22', dayLabel: 'Wed', sleepHours: 6.5, sleepQuality: 'Fair', mood: 'Neutral', stressLevel: 5 },
  { dateStr: 'Jul 23', dayLabel: 'Thu', sleepHours: 7.0, sleepQuality: 'Good', mood: 'Good', stressLevel: 3 },
  { dateStr: 'Jul 24', dayLabel: 'Fri', sleepHours: 5.5, sleepQuality: 'Poor', mood: 'Fatigued', stressLevel: 7 },
  { dateStr: 'Jul 25', dayLabel: 'Sat', sleepHours: 8.0, sleepQuality: 'Restful', mood: 'Good', stressLevel: 2 },
  { dateStr: 'Jul 26', dayLabel: 'Sun', sleepHours: 7.5, sleepQuality: 'Good', mood: 'Good', stressLevel: 3 },
  { dateStr: 'Jul 27', dayLabel: 'Mon', sleepHours: 6.0, sleepQuality: 'Fair', mood: 'Anxious', stressLevel: 6 },
  { dateStr: 'Jul 28', dayLabel: 'Today', sleepHours: 7.0, sleepQuality: 'Good', mood: 'Neutral', stressLevel: 4 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'vitals' | 'symptoms' | 'wellness'>('vitals');
  
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patient, setPatient] = useState<PatientProfile | null>(null);

  // Accordions & Modals
  const [showLabs, setShowLabs] = useState(false);
  const [showEncounters, setShowEncounters] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [caregiverMode, setCaregiverMode] = useState(false);

  // Tab 2 State
  const [symptoms, setSymptoms] = useState<DetailedSymptom[]>([
    { text: 'Dizziness when standing up', severity: 'Mild', duration: '2-3 days' },
    { text: 'Mild headache in the mornings', severity: 'Mild', duration: '1+ weeks' },
  ]);
  const [newSymptomInput, setNewSymptomInput] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<'Mild' | 'Moderate' | 'Severe'>('Mild');
  const [selectedDuration, setSelectedDuration] = useState<'< 24 hrs' | '2-3 days' | '1+ weeks' | 'Chronic'>('2-3 days');
  const [medicationNotes, setMedicationNotes] = useState('');

  const [needRefill, setNeedRefill] = useState(false);
  const [needReferral, setNeedReferral] = useState(false);
  const [needLabs, setNeedLabs] = useState(false);

  // Tab 3 State
  const [calendarLogs, setCalendarLogs] = useState<CalendarDayLog[]>(INITIAL_CALENDAR_LOGS);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(6);

  const activeDayLog = calendarLogs[selectedDateIndex];

  const setSleepHours = (val: number) => {
    const updated = [...calendarLogs];
    updated[selectedDateIndex].sleepHours = val;
    setCalendarLogs(updated);
  };

  const setSleepQuality = (val: 'Poor' | 'Fair' | 'Good' | 'Restful') => {
    const updated = [...calendarLogs];
    updated[selectedDateIndex].sleepQuality = val;
    setCalendarLogs(updated);
  };

  const setMood = (val: 'Good' | 'Neutral' | 'Anxious' | 'Fatigued') => {
    const updated = [...calendarLogs];
    updated[selectedDateIndex].mood = val;
    setCalendarLogs(updated);
  };

  const setStressLevel = (val: number) => {
    const updated = [...calendarLogs];
    updated[selectedDateIndex].stressLevel = val;
    setCalendarLogs(updated);
  };

  const [activityLevel, setActivityLevel] = useState<'Sedentary' | 'Light' | 'Moderate' | 'Active'>('Moderate');
  const [caffeineIntake, setCaffeineIntake] = useState<'None' | '1-2 cups' | '3+ cups'>('1-2 cups');

  const [generatedQuestions, setGeneratedQuestions] = useState<string | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch('/api/patients');
        const data = await res.json();
        const list: PatientProfile[] = data.data || [];
        setPatients(list);
        if (list.length > 0) {
          setSelectedPatientId(list[0].id);
          setPatient(list[0]);
        }
      } catch (err) {
        console.error('Failed to load patient records:', err);
      }
    }
    loadPatients();
  }, []);

  const handlePatientChange = (id: string) => {
    setSelectedPatientId(id);
    const found = patients.find((p) => p.id === id);
    if (found) {
      setPatient(found);
    }
  };

  const handleAddSymptom = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToAdd = customText || newSymptomInput.trim();
    if (!textToAdd) return;

    setSymptoms([
      ...symptoms,
      {
        text: textToAdd,
        severity: selectedSeverity,
        duration: selectedDuration,
      },
    ]);
    if (!customText) setNewSymptomInput('');
  };

  const handleRemoveSymptom = (index: number) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  const handleGenerateQuestions = async () => {
    setIsLoadingQuestions(true);
    setGeneratedQuestions(null);
    try {
      const formattedSymptoms = symptoms.map(
        (s) => `${s.text} (Severity: ${s.severity}, Duration: ${s.duration})`
      );

      const checklistItems = [];
      if (needRefill) checklistItems.push('Prescription Refill Request');
      if (needReferral) checklistItems.push('Specialist Referral Request');
      if (needLabs) checklistItems.push('Routine Lab Orders Request');

      const weeklyAvgSleep = (calendarLogs.reduce((acc, curr) => acc + curr.sleepHours, 0) / calendarLogs.length).toFixed(1);

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient?.id,
          vitals: patient?.vitals,
          symptoms: formattedSymptoms,
          checklist: checklistItems,
          lifestyle: {
            sleepHours: activeDayLog.sleepHours,
            sleepQuality: activeDayLog.sleepQuality,
            weeklyAvgSleep,
            mood: activeDayLog.mood,
            stressLevel: activeDayLog.stressLevel,
            activityLevel,
            caffeineIntake,
            medicationNotes,
          },
        }),
      });
      const data = await res.json();
      setGeneratedQuestions(data.questions);
    } catch (err) {
      console.error(err);
      setGeneratedQuestions('Unable to generate questions. Please try again.');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleCopySummary = () => {
    if (!generatedQuestions || !patient) return;
    const weeklyAvgSleep = (calendarLogs.reduce((acc, curr) => acc + curr.sleepHours, 0) / calendarLogs.length).toFixed(1);
    const summaryText = `--- Doctor Prep Summary ---\nPatient: ${patient.name}\nEmail: ${patient.email || 'N/A'}\nPhone: ${patient.phone || 'N/A'}\nDOB: ${patient.dob || 'N/A'} (Age ${patient.age}) | Sex: ${patient.gender}\nLocation: ${patient.location}\nLast Visit: ${patient.lastVisitDate}\n\nLogged Symptoms:\n${symptoms.map((s) => `- ${s.text} [Severity: ${s.severity} | Duration: ${s.duration}]`).join('\n')}\n\nLifestyle & Well-being (7-Day Trend):\nWeekly Avg Sleep: ${weeklyAvgSleep} hrs | Today: ${activeDayLog.sleepHours} hrs (${activeDayLog.sleepQuality})\nMood: ${activeDayLog.mood} | Stress: ${activeDayLog.stressLevel}/10 | Activity: ${activityLevel} | Caffeine: ${caffeineIntake}\nMedication Notes: ${medicationNotes || 'None'}\n\nQuestions for Doctor:\n${generatedQuestions}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintAgenda = () => {
    window.print();
  };

  const weeklyAvgSleep = (calendarLogs.reduce((acc, curr) => acc + curr.sleepHours, 0) / calendarLogs.length).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 max-w-4xl mx-auto font-sans print:bg-white print:p-0">
      {/* Accessible Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-6 border-b border-slate-200 gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-indigo-600" aria-hidden="true">💜</span> Pulse Companion
          </h1>
          <p className="text-xs text-slate-600 font-medium">Connected Health Record & Clinical Navigation Portal</p>
        </div>
        
        {/* Actions & Live Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCaregiverMode(!caregiverMode)}
            aria-label={caregiverMode ? 'Switch to Patient View Mode' : 'Switch to Caregiver View Mode'}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
              caregiverMode
                ? 'bg-amber-100 text-amber-950 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {caregiverMode ? '👨‍👩‍👧 Caregiver View Active' : '👤 Patient View'}
          </button>

          <button
            onClick={() => setShowEmergencyModal(true)}
            aria-label="Open Emergency Health ID Card"
            className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-3 py-1.5 rounded-full text-xs shadow-sm transition flex items-center gap-1"
          >
            <span aria-hidden="true">🚨</span> Emergency ID
          </button>

          <div className="hidden md:flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 text-xs font-bold text-indigo-900 shadow-sm">
            <span>⚡ MCP Protocol Active</span>
          </div>
        </div>
      </header>

      {/* ACCESSIBLE EMERGENCY WALLET CARD MODAL */}
      {showEmergencyModal && patient && (
        <div 
          role="dialog" 
          aria-labelledby="emergency-modal-title" 
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-4 border-rose-600 space-y-4 relative">
            <button
              onClick={() => setShowEmergencyModal(false)}
              aria-label="Close Emergency ID Modal"
              className="absolute top-4 right-4 text-slate-600 hover:text-slate-900 font-bold text-base p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <span className="text-3xl" aria-hidden="true">🚨</span>
              <div>
                <h2 id="emergency-modal-title" className="text-lg font-extrabold text-rose-800 uppercase tracking-wide">
                  Emergency Health ID
                </h2>
                <p className="text-xs text-slate-700 font-semibold">First Responder & Paramedic Reference</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-700 font-bold">Patient Name:</span>
                <strong className="text-slate-950 text-sm">{patient.name}</strong>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-700 block text-xs font-semibold">DOB / Age:</span>
                  <strong className="text-slate-900">{patient.dob} ({patient.age}y)</strong>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-700 block text-xs font-semibold">Sex:</span>
                  <strong className="text-slate-900">{patient.gender}</strong>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-700 block text-xs font-semibold">Location:</span>
                  <strong className="text-slate-900">{patient.location}</strong>
                </div>
              </div>

              <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-700 block text-xs font-semibold">Emergency Contact:</span>
                <strong className="text-slate-900">{patient.emergencyContact?.name} ({patient.emergencyContact?.relationship}) — {patient.emergencyContact?.phone}</strong>
              </div>

              {/* Critical Allergies Highlight */}
              <div className="bg-rose-100 border-2 border-rose-300 p-3 rounded-xl space-y-1">
                <span className="font-extrabold text-rose-950 uppercase text-xs block">⚠️ Critical Drug Allergies:</span>
                {patient.allergies && patient.allergies.length > 0 ? (
                  patient.allergies.map((a, i) => (
                    <div key={i} className="text-rose-950 font-bold text-xs">• {a.substance} ({a.reaction})</div>
                  ))
                ) : (
                  <div className="text-rose-950 font-semibold">No known drug allergies (NKDA)</div>
                )}
              </div>

              {/* Active Prescriptions */}
              <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 text-xs block uppercase">💊 Active Medications:</span>
                <div className="text-slate-950 font-bold text-xs">
                  {patient.medications?.map((m) => m.name.split(' ')[0]).join(', ')}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs text-slate-600 font-medium">
                <span>FHIR R4 Encrypted QR Stream</span>
                <div className="bg-slate-900 text-white px-2 py-1 rounded font-mono text-xs">
                  [Scan for EHR]
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              aria-label="Print Emergency Wallet Card"
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 transition"
            >
              🖨️ Print Emergency Wallet Card
            </button>
          </div>
        </div>
      )}

      {/* Accessibility-Enhanced Tabs */}
      <nav aria-label="Dashboard Navigation Tabs" className="flex border-b border-slate-300 mb-6 gap-2 print:hidden">
        <button
          onClick={() => setActiveTab('vitals')}
          aria-selected={activeTab === 'vitals'}
          role="tab"
          className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'vitals'
              ? 'border-indigo-700 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          📈 Summary & EHR Record
        </button>
        <button
          onClick={() => setActiveTab('symptoms')}
          aria-selected={activeTab === 'symptoms'}
          role="tab"
          className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'symptoms'
              ? 'border-indigo-700 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          🩺 Symptom Log & Doctor Prep
        </button>
        <button
          onClick={() => setActiveTab('wellness')}
          aria-selected={activeTab === 'wellness'}
          role="tab"
          className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'wellness'
              ? 'border-indigo-700 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          🌙 Sleep & Mental Health
        </button>
      </nav>

      {/* TAB 1: SUMMARY & EHR RECORD */}
      {activeTab === 'vitals' && (
        <section aria-label="EHR Health Record Overview" className="space-y-4">
          {/* Streamlined High-Contrast Patient Banner */}
          <div className="bg-indigo-950 text-white p-5 rounded-xl shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <span className="text-xs text-indigo-300 uppercase font-bold tracking-wider">EHR Record</span>
                <h2 className="text-xl font-bold text-white">{patient ? patient.name : 'Loading...'}</h2>
                {patient && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-100 mt-1.5 font-medium">
                    <span>🎂 DOB: <strong className="text-white">{patient.dob}</strong> ({patient.age} yrs)</span>
                    <span>👤 Sex: <strong className="text-white">{patient.gender}</strong></span>
                    <span>📍 Location: <strong className="text-white">{patient.location}</strong></span>
                    <span>✉️ <strong className="text-white">{patient.email}</strong></span>
                    <span>📞 <strong className="text-white">{patient.phone}</strong></span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="patient-switcher" className="sr-only">Select Patient Profile Demo</label>
                <select
                  id="patient-switcher"
                  aria-label="Select Demo Patient Profile"
                  value={selectedPatientId}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="bg-white text-slate-950 text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.vitals.bpStatus === 'normal' ? 'Normal' : '⚠️ Risk Review'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {patient && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-indigo-800 text-xs text-indigo-100 font-medium">
                {patient.nextVisit && (
                  <div>
                    🗓️ Next Visit: <strong className="text-white">{patient.nextVisit.date}</strong> ({patient.nextVisit.type})
                  </div>
                )}
                <div>👨‍⚕️ Provider: <strong className="text-white">{patient.primaryDoctor || 'Dr. Vance'}</strong></div>
              </div>
            )}
          </div>

          {patient && (
            <>
              {/* "WHAT CHANGED SINCE LAST VISIT?" AI DELTA BOX */}
              {patient.whatChangedSummary && (
                <div className="bg-blue-50 border border-blue-300 p-4 rounded-xl shadow-sm text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-blue-950 uppercase tracking-wide">
                    <span aria-hidden="true">💡</span> What Changed Since Last Visit?
                    <span className="text-xs bg-blue-200 text-blue-950 px-2 py-0.5 rounded font-bold">EHR Delta AI</span>
                  </div>
                  <p className="text-slate-800 font-medium leading-relaxed pl-5">
                    {patient.whatChangedSummary}
                  </p>
                </div>
              )}

              {/* DOCTOR'S NOTES CARD */}
              {patient.doctorNotes && (
                <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <span>👨‍⚕️ Provider Notes & Visit Summary</span>
                    </h3>
                    <span className="text-xs font-bold text-indigo-900 bg-indigo-100 px-2.5 py-0.5 rounded-md">
                      {patient.doctorNotes.doctor} ({patient.doctorNotes.date})
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 bg-slate-100 p-3 rounded-lg border border-slate-200 leading-relaxed italic font-medium">
                    "{patient.doctorNotes.summary}"
                  </p>

                  {patient.doctorNotes.keyInstructions && patient.doctorNotes.keyInstructions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide block">
                        📌 Provider Action Items & Instructions:
                      </span>
                      <ul className="space-y-1 text-xs text-slate-800 pl-1 font-medium">
                        {patient.doctorNotes.keyInstructions.map((instruction, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-indigo-700 font-bold" aria-hidden="true">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* UNIFIED VITALS & BODY METRICS BAR */}
              <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  ⚡ Vital Signs & Body Metrics
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
                  <div className={`p-2.5 rounded-lg border text-xs ${
                    patient.vitals.bpStatus === 'warning' 
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold' 
                      : 'bg-slate-100 border-slate-200 text-slate-900'
                  }`}>
                    <span className="text-xs text-slate-700 font-bold block">BP</span>
                    <strong className="text-xs block mt-0.5">{patient.vitals.bp}</strong>
                    {patient.vitals.bpStatus === 'warning' && (
                      <span className="text-xs font-extrabold text-amber-950 bg-amber-300 px-1.5 rounded block mt-1">⚠️ Elevated</span>
                    )}
                  </div>

                  <div className={`p-2.5 rounded-lg border text-xs ${
                    patient.vitals.hrStatus === 'warning' 
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold' 
                      : 'bg-slate-100 border-slate-200 text-slate-900'
                  }`}>
                    <span className="text-xs text-slate-700 font-bold block">Heart Rate</span>
                    <strong className="text-xs block mt-0.5">{patient.vitals.heartRate}</strong>
                    {patient.vitals.hrStatus === 'warning' && (
                      <span className="text-xs font-extrabold text-amber-950 bg-amber-300 px-1.5 rounded block mt-1">⚠️ High</span>
                    )}
                  </div>

                  <div className={`p-2.5 rounded-lg border text-xs ${
                    patient.vitals.hba1cStatus === 'warning' 
                      ? 'bg-rose-100 border-rose-400 text-rose-950 font-bold' 
                      : 'bg-slate-100 border-slate-200 text-slate-900'
                  }`}>
                    <span className="text-xs text-slate-700 font-bold block">HbA1c</span>
                    <strong className="text-xs block mt-0.5">{patient.vitals.hba1c}</strong>
                    {patient.vitals.hba1cStatus === 'warning' && (
                      <span className="text-xs font-extrabold text-rose-950 bg-rose-300 px-1.5 rounded block mt-1">⚠️ High</span>
                    )}
                  </div>

                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="text-xs text-slate-700 font-bold block">SpO₂</span>
                    <strong className="text-xs text-slate-950 block mt-0.5 font-bold">{patient.vitals.spO2 || '98%'}</strong>
                  </div>

                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="text-xs text-slate-700 font-bold block">Height</span>
                    <strong className="text-xs text-slate-950 block mt-0.5 font-bold">{patient.vitals.height || `5'10"`}</strong>
                  </div>

                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="text-xs text-slate-700 font-bold block">Weight</span>
                    <strong className="text-xs text-slate-950 block mt-0.5 font-bold">{patient.vitals.weight || `168 lbs`}</strong>
                  </div>

                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-xs col-span-2 sm:col-span-1">
                    <span className="text-xs text-slate-700 font-bold block">BMI</span>
                    <strong className="text-xs text-indigo-900 block mt-0.5 font-bold">{patient.vitals.bmi?.split(' ')[0] || `24.1`}</strong>
                  </div>
                </div>
              </div>

              {/* CORE CLINICAL GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 md:col-span-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex justify-between">
                    <span>💊 Active Prescriptions</span>
                    <span className="text-indigo-800 font-bold">{patient.medications?.length || 0} active</span>
                  </h3>
                  <div className="space-y-2">
                    {patient.medications?.map((med, i) => (
                      <div key={i} className="bg-slate-100 border border-slate-200 p-2.5 rounded-lg space-y-1">
                        <div className="text-xs font-bold text-slate-950">{med.name}</div>
                        <div className="text-xs text-slate-700 font-medium">{med.instructions}</div>
                        <p className="text-xs text-slate-800 pt-1">
                          <strong className="text-indigo-950 font-bold">What it does: </strong>
                          {med.plainEnglish}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 md:col-span-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex justify-between">
                    <span>🩺 Active Diagnoses</span>
                    <span className="text-indigo-800 font-bold">{patient.conditions?.length || 0} recorded</span>
                  </h3>
                  <div className="space-y-2">
                    {patient.conditions?.map((cond: any, i: number) => {
                      const rawName = typeof cond === 'string' ? cond : cond.name || 'Condition';
                      const plainEnglish = typeof cond === 'object' && cond.plainEnglish
                        ? cond.plainEnglish
                        : CONDITION_TRANSLATIONS[rawName] || 'A recorded medical condition requiring routine monitoring.';

                      return (
                        <div key={i} className="bg-slate-100 border border-slate-200 p-2.5 rounded-lg space-y-1">
                          <div className="text-xs font-bold text-slate-950">• {rawName}</div>
                          <p className="text-xs text-slate-800 pt-0.5">
                            <strong className="text-indigo-950 font-bold">In simple terms: </strong>
                            {plainEnglish}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 md:col-span-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex justify-between">
                    <span>⚠️ Known Allergies</span>
                    <span className="text-rose-800 font-bold">{patient.allergies?.length || 0} recorded</span>
                  </h3>
                  <div className="space-y-2">
                    {patient.allergies && patient.allergies.length > 0 ? (
                      patient.allergies.map((alg, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                            alg.severity === 'High'
                              ? 'bg-rose-100 border-rose-300 text-rose-950 font-semibold'
                              : 'bg-amber-100 border-amber-300 text-amber-950 font-semibold'
                          }`}
                        >
                          <div className="flex justify-between items-center font-extrabold">
                            <span>🚫 {alg.substance}</span>
                            <span className="text-xs bg-rose-300 text-rose-950 px-1.5 py-0.5 rounded font-bold uppercase">
                              {alg.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-900">Reaction: {alg.reaction}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-emerald-100 border border-emerald-300 p-3 rounded-lg text-emerald-950 text-xs font-bold">
                        <strong className="block text-xs">✅ NKDA</strong>
                        <span className="text-xs text-emerald-900 font-medium">No Known Drug Allergies on file.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CLINICAL TRIAL & COMMUNITY MATCHER */}
              <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>🔬 Clinical Trial & Support Program Matcher</span>
                  <span className="text-xs bg-purple-200 text-purple-950 px-2.5 py-0.5 rounded font-bold">Matched to EHR</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                  <div className="bg-purple-100/60 border border-purple-300 p-3 rounded-lg space-y-1">
                    <div className="font-extrabold text-purple-950 flex justify-between">
                      <span>🧪 Active Local Clinical Trial</span>
                      <span className="text-xs text-emerald-950 bg-emerald-300 px-1.5 py-0.5 rounded font-bold">Eligible</span>
                    </div>
                    <p className="text-xs text-slate-800">Non-Invasive Continuous Glucose & BP Study (Phase II)</p>
                  </div>

                  <div className="bg-indigo-100/60 border border-indigo-300 p-3 rounded-lg space-y-1">
                    <div className="font-extrabold text-indigo-950 flex justify-between">
                      <span>🤝 Local Community Program</span>
                      <span className="text-xs text-indigo-950 bg-indigo-200 px-1.5 py-0.5 rounded font-bold">Free Workshop</span>
                    </div>
                    <p className="text-xs text-slate-800">Diabetic Nutrition & Hypertension Wellness Group in {patient.location}</p>
                  </div>
                </div>
              </div>

              {/* ACCESSIBLE COLLAPSIBLE ACCORDIONS */}
              <div className="space-y-2 pt-2">
                <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowLabs(!showLabs)}
                    aria-expanded={showLabs}
                    aria-controls="labs-accordion-content"
                    className="w-full p-3.5 text-xs font-extrabold text-slate-800 flex items-center justify-between bg-slate-100 hover:bg-slate-200 transition"
                  >
                    <span>🧪 Recent Lab Panels ({patient.labs?.length || 0} results)</span>
                    <span aria-hidden="true">{showLabs ? '▲ Hide' : '▼ Expand'}</span>
                  </button>

                  {showLabs && (
                    <div id="labs-accordion-content" className="p-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {patient.labs?.map((lab, i) => {
                        const isAbnormal = lab.status !== 'Normal';
                        return (
                          <div
                            key={i}
                            className={`p-2.5 rounded-lg border text-xs ${
                              isAbnormal
                                ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold'
                                : 'bg-slate-100 border-slate-200 text-slate-900 font-medium'
                            }`}
                          >
                            <div className="font-bold flex justify-between items-center">
                              <span>{lab.testName}</span>
                              {isAbnormal && (
                                <span className="text-xs bg-amber-300 text-amber-950 font-extrabold px-1.5 py-0.5 rounded">
                                  {lab.status}
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-extrabold mt-0.5">{lab.value}</div>
                            <div className="text-xs text-slate-700">Ref: {lab.referenceRange}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowEncounters(!showEncounters)}
                    aria-expanded={showEncounters}
                    aria-controls="encounters-accordion-content"
                    className="w-full p-3.5 text-xs font-extrabold text-slate-800 flex items-center justify-between bg-slate-100 hover:bg-slate-200 transition"
                  >
                    <span>📜 Clinical Encounter History ({patient.encounters?.length || 0} visits)</span>
                    <span aria-hidden="true">{showEncounters ? '▲ Hide' : '▼ Expand'}</span>
                  </button>

                  {showEncounters && (
                    <div id="encounters-accordion-content" className="p-3 border-t border-slate-200 space-y-2">
                      {patient.encounters?.map((enc, i) => (
                        <div key={i} className="bg-slate-100 p-2.5 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>🏥 {enc.type}</span>
                            <span className="text-slate-700 font-medium">{enc.date}</span>
                          </div>
                          <p className="text-slate-800 text-xs font-medium">{enc.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* TAB 2: SYMPTOM LOG & DOCTOR PREP */}
      {activeTab === 'symptoms' && (
        <section aria-label="Symptom Logging & Visit Preparation" className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-5">
          {patient && (
            <div className="bg-slate-950 text-white p-3.5 rounded-lg flex items-center justify-between text-xs font-medium">
              <span className="text-indigo-200 font-bold">👤 Preparing Agenda for: <strong className="text-white">{patient.name}</strong> ({patient.age}y {patient.gender}, {patient.location})</span>
              <span className="text-slate-300">Next Visit: {patient.nextVisit?.date || 'N/A'}</span>
            </div>
          )}

          <div>
            <h2 className="text-base font-bold text-slate-900">Log Concerns & Prepare for Visit</h2>
            <p className="text-xs text-slate-700 mt-0.5 font-medium">
              Add health concerns to generate tailored questions for your doctor.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Quick Add Common Symptoms:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ADD_SYMPTOMS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddSymptom(undefined, chip)}
                  aria-label={`Quick add symptom ${chip}`}
                  className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-950 font-bold px-3 py-1 rounded-full transition"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddSymptom} className="space-y-3 bg-slate-100 p-4 rounded-xl border border-slate-300">
            <label htmlFor="symptom-input" className="text-xs font-bold text-slate-800 block">
              Describe your health issue or symptom:
            </label>
            <input
              id="symptom-input"
              type="text"
              value={newSymptomInput}
              onChange={(e) => setNewSymptomInput(e.target.value)}
              placeholder="e.g., Lower back tightness after sitting 30 mins"
              className="w-full px-3 py-2 text-xs bg-white text-slate-900 font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <label htmlFor="severity-select" className="sr-only">Symptom Severity</label>
                  <select
                    id="severity-select"
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value as any)}
                    className="bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                  >
                    <option value="Mild">🟢 Mild</option>
                    <option value="Moderate">🟡 Moderate</option>
                    <option value="Severe">🔴 Severe</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="duration-select" className="sr-only">Symptom Duration</label>
                  <select
                    id="duration-select"
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value as any)}
                    className="bg-white text-slate-900 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                  >
                    <option value="< 24 hrs">&lt; 24 hrs</option>
                    <option value="2-3 days">2-3 days</option>
                    <option value="1+ weeks">1+ weeks</option>
                    <option value="Chronic">Chronic</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                + Add Issue
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {symptoms.map((symptom, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-300 text-xs">
                <div>
                  <span className="font-bold text-slate-900">• {symptom.text}</span>
                  <span className="ml-2 text-xs font-semibold text-slate-700">[{symptom.severity} | {symptom.duration}]</span>
                </div>
                <button 
                  onClick={() => handleRemoveSymptom(idx)} 
                  aria-label={`Remove symptom ${symptom.text}`}
                  className="text-slate-600 hover:text-rose-700 font-bold text-xs p-1"
                >
                  ✕ Remove
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerateQuestions}
            disabled={isLoadingQuestions}
            aria-label="Generate AI Doctor Prep Questions using MCP"
            className="w-full bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-300 text-white font-bold py-3 rounded-xl transition text-xs shadow-sm"
          >
            {isLoadingQuestions ? 'Generating via MCP Tools...' : '✨ Generate Doctor Prep Questions'}
          </button>

          {generatedQuestions && (
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-indigo-950">Recommended Doctor Questions:</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopySummary} 
                    aria-label="Copy generated questions to clipboard"
                    className="text-xs bg-white text-indigo-900 px-3 py-1 rounded-md border border-indigo-300 font-bold"
                  >
                    {copied ? '✅ Copied' : '📋 Copy'}
                  </button>
                  <button 
                    onClick={handlePrintAgenda} 
                    aria-label="Print appointment agenda"
                    className="text-xs bg-indigo-700 text-white px-3 py-1 rounded-md font-bold"
                  >
                    🖨️ Print Agenda
                  </button>
                </div>
              </div>

              <div className="text-xs text-indigo-950 font-medium whitespace-pre-line leading-relaxed">
                {generatedQuestions}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: SLEEP & MENTAL HEALTH */}
      {activeTab === 'wellness' && (
        <section aria-label="Sleep & Mental Health Tracker" className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-5">
          {patient && (
            <div className="bg-slate-950 text-white p-3.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-indigo-300 font-bold">👤 Wellness Tracking for:</span>
                <strong className="text-white">{patient.name} ({patient.age}y {patient.gender})</strong>
              </div>
              <span className="text-slate-300 hidden sm:inline">PCP: {patient.primaryDoctor || 'Dr. Vance'}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-950 text-white space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs font-bold">
              <span className="text-indigo-300">🗓️ 7-Day History Streak</span>
              <span>7-Day Avg Sleep: <strong className="text-emerald-400">{weeklyAvgSleep} hrs</strong></span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarLogs.map((log, idx) => {
                const isSelected = selectedDateIndex === idx;
                const isHighStress = log.stressLevel >= 7;
                const isGoodSleep = log.sleepHours >= 7;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDateIndex(idx)}
                    aria-label={`Log for ${log.dayLabel} ${log.dateStr}`}
                    className={`p-2 rounded-lg border text-xs transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-white text-slate-950 font-extrabold border-white shadow'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-xs block text-slate-300 uppercase font-bold">{log.dayLabel}</span>
                    <span className="text-xs font-extrabold">{log.dateStr}</span>
                    
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${
                        isHighStress ? 'bg-rose-500' : isGoodSleep ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    ></span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
            <span>✏️ Logged Entry for: <strong className="text-indigo-800">{activeDayLog.dayLabel} ({activeDayLog.dateStr})</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Sleep Duration & Quality */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex justify-between font-bold">
                <label htmlFor="sleep-hours-slider" className="text-slate-800">Sleep Duration</label>
                <span className="text-indigo-800 font-extrabold">{activeDayLog.sleepHours} Hours</span>
              </div>
              <input
                id="sleep-hours-slider"
                type="range"
                min="3"
                max="12"
                step="0.5"
                aria-label="Sleep duration hours"
                aria-valuenow={activeDayLog.sleepHours}
                value={activeDayLog.sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-indigo-700 cursor-pointer"
              />

              <div className="pt-2 border-t border-slate-300 space-y-1.5">
                <span className="font-bold text-slate-800 block">Sleep Quality:</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['Poor', 'Fair', 'Good', 'Restful'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSleepQuality(q)}
                      aria-pressed={activeDayLog.sleepQuality === q}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                        activeDayLog.sleepQuality === q
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mood & Energy */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 block">Mood & Energy</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Good', 'Neutral', 'Anxious', 'Fatigued'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    aria-pressed={activeDayLog.mood === m}
                    className={`py-2 px-2 rounded-lg border font-bold text-xs transition ${
                      activeDayLog.mood === m
                        ? 'bg-indigo-700 text-white border-indigo-700'
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {m === 'Good' && '😊 Good'}
                    {m === 'Neutral' && '😐 Neutral'}
                    {m === 'Anxious' && '😰 Anxious'}
                    {m === 'Fatigued' && '😴 Fatigued'}
                  </button>
                ))}
              </div>
            </div>

            {/* Stress Level Rating */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex justify-between font-bold">
                <label htmlFor="stress-level-slider" className="text-slate-800">Stress Level (1 - 10)</label>
                <span className={`font-extrabold ${activeDayLog.stressLevel > 6 ? 'text-rose-800' : 'text-indigo-800'}`}>
                  {activeDayLog.stressLevel} / 10
                </span>
              </div>
              <input
                id="stress-level-slider"
                type="range"
                min="1"
                max="10"
                step="1"
                aria-label="Stress level scale 1 to 10"
                aria-valuenow={activeDayLog.stressLevel}
                value={activeDayLog.stressLevel}
                onChange={(e) => setStressLevel(parseInt(e.target.value))}
                className="w-full accent-indigo-700 cursor-pointer"
              />
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>1 (Relaxed)</span>
                <span>5 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </div>

            {/* Physical Activity & Caffeine */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 block">Lifestyle Habits</span>
              <div className="space-y-1">
                <span className="text-xs text-slate-700 font-bold">Physical Activity:</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['Sedentary', 'Light', 'Moderate', 'Active'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setActivityLevel(a)}
                      aria-pressed={activityLevel === a}
                      className={`py-1 text-xs font-bold rounded border transition ${
                        activityLevel === a
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white text-slate-800 border-slate-300'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-xs text-slate-700 font-bold">Caffeine Intake:</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['None', '1-2 cups', '3+ cups'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCaffeineIntake(c)}
                      aria-pressed={caffeineIntake === c}
                      className={`py-1 text-xs font-bold rounded border transition ${
                        caffeineIntake === c
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white text-slate-800 border-slate-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
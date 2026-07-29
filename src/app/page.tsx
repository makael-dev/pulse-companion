'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import PulseChatDrawer from './components/PulseChatDrawer';
import SummaryTab from './components/SummaryTab';
import SymptomTab from './components/SymptomTab';
import MentalHealthTab from './components/MentalHealthTab';
import FitnessTab from './components/FitnessTab';
import VitalsChart from './components/VitalsChart';

export const CONDITION_TRANSLATIONS: Record<string, string> = {
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

export const PATIENT_FITNESS_DATA: Record<string, { steps: number; stepGoal: number; activeMins: number; minGoal: number; restingHR: number; weeklyAvgHR: number; note: string }> = {
  'ezekiel-walter': {
    steps: 7420,
    stepGoal: 8000,
    activeMins: 32,
    minGoal: 30,
    restingHR: 68,
    weeklyAvgHR: 67,
    note: "Ezekiel has met his daily 30-minute walking goal 5 out of the last 7 days. Resting heart rate trends show a 4% improvement in cardiovascular recovery."
  },
  'sarah-connor': {
    steps: 10250,
    stepGoal: 10000,
    activeMins: 55,
    minGoal: 45,
    restingHR: 58,
    weeklyAvgHR: 60,
    note: "Sarah is consistently exceeding daily activity targets. High cardiovascular endurance maintained with no adverse fatigue markers."
  },
  'default': {
    steps: 4100,
    stepGoal: 8000,
    activeMins: 15,
    minGoal: 30,
    restingHR: 74,
    weeklyAvgHR: 75,
    note: "Activity level is currently below target walking goal. Patient is encouraged to increase daily light aerobic movement."
  }
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
  bedtime?: string;
  wakeTime?: string;
  caffeineIntake?: 'None ☕' | '1-2 Cups ☕' | '3+ Cups ☕';
  activityLevel?: 'Sedentary' | 'Light' | 'Moderate' | 'Active';
  notes?: string;
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

function generateRolling28Days(): CalendarDayLog[] {
  const days: CalendarDayLog[] = [];
  const today = new Date();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const isToday = i === 0;
    const isYesterday = i === 1;

    let displayLabel = dayLabels[d.getDay()];
    if (isToday) displayLabel = 'Today';
    else if (isYesterday) displayLabel = 'Yest';

    const dateStr = `${monthNames[d.getMonth()]} ${d.getDate()}`;

    days.push({
      dateStr,
      dayLabel: displayLabel,
      sleepHours: 7.5,
      sleepQuality: 'Good',
      mood: 'Neutral',
      stressLevel: 4,
      bedtime: '11:00 PM',
      wakeTime: '06:30 AM',
      caffeineIntake: '1-2 Cups ☕',
      activityLevel: 'Moderate',
      notes: '',
    });
  }
  return days;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'vitals' | 'symptoms' | 'wellness' | 'fitness'>('vitals');  
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patient, setPatient] = useState<PatientProfile | null>(null);

  // --- MEDICATION TRACKER STATE ---
  const [takenMeds, setTakenMeds] = useState<Record<string, boolean>>({});

  const toggleMedTaken = (medName: string) => {
    setTakenMeds((prev) => ({
      ...prev,
      [medName]: !prev[medName],
    }));
  };

  // --- EXPANDED CONSENT & PRIVACY CONTROL STATE ---
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentPermissions, setConsentPermissions] = useState({
    shareVitals: true,
    shareDelta: true,
    shareDoctorNotes: true,
    shareSymptomPrep: true,
    shareDiagnoses: true,
    shareAllergies: true,
    shareMeds: true,
    shareLabs: true,
    shareMentalHealth: true,
    shareFitness: true,
    shareTrials: true,
    shareEncounters: true,
  });

  const toggleAllPrivacyPermissions = (showAll: boolean) => {
    setConsentPermissions({
      shareVitals: showAll,
      shareDelta: showAll,
      shareDoctorNotes: showAll,
      shareSymptomPrep: showAll,
      shareDiagnoses: showAll,
      shareAllergies: showAll,
      shareMeds: showAll,
      shareLabs: showAll,
      shareMentalHealth: showAll,
      shareFitness: showAll,
      shareTrials: showAll,
      shareEncounters: showAll,
    });
  };

  const [calendarLogs, setCalendarLogs] = useState<CalendarDayLog[]>(() => generateRolling28Days());
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(27);

  useEffect(() => {
    const savedSymptoms = localStorage.getItem('pulse_symptoms');
    if (savedSymptoms) {
      try { setSymptoms(JSON.parse(savedSymptoms)); } catch (e) { console.error(e); }
    }
    const savedLogs = localStorage.getItem('pulse_calendar_logs');
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        if (Array.isArray(parsed) && parsed.length === 28) {
          setCalendarLogs(parsed);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pulse_calendar_logs', JSON.stringify(calendarLogs));
  }, [calendarLogs]);

  const pdfRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${patient?.name || 'Patient'}_Doctor_Prep_Agenda.pdf`);
  };

  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrintCard = useReactToPrint({
    contentRef: cardRef,
    documentTitle: `${patient?.name || 'Patient'}_Emergency_ID`,
    onAfterPrint: () => setShowEmergencyModal(false),
    pageStyle: `
      @page {
        size: portrait;
        margin: 0;
      }
      body {
        margin: 0 !important;
        padding: 24px !important;
        background: white !important;
        display: flex !important;
        justify-content: center !important;
        align-items: flex-start !important;
      }
      html, body {
        height: 100% !important;
        overflow: hidden !important;
      }
    `,
  });

  const [showLabs, setShowLabs] = useState(false);
  const [showEncounters, setShowEncounters] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [caregiverMode, setCaregiverMode] = useState(false);

  const [symptoms, setSymptoms] = useState<DetailedSymptom[]>([
    { text: 'Dizziness when standing up', severity: 'Mild', duration: '2-3 days' },
    { text: 'Mild headache in the mornings', severity: 'Mild', duration: '1+ weeks' },
  ]);

  useEffect(() => {
    localStorage.setItem('pulse_symptoms', JSON.stringify(symptoms));
  }, [symptoms]);

  const [newSymptomInput, setNewSymptomInput] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<'Mild' | 'Moderate' | 'Severe'>('Mild');
  const [selectedDuration, setSelectedDuration] = useState<'< 24 hrs' | '2-3 days' | '1+ weeks' | 'Chronic'>('2-3 days');
  const [medicationNotes, setMedicationNotes] = useState('');

  const [needRefill, setNeedRefill] = useState(false);
  const [needReferral, setNeedReferral] = useState(false);
  const [needLabs, setNeedLabs] = useState(false);

  const activeDayLog = calendarLogs[selectedDateIndex] || calendarLogs[calendarLogs.length - 1];

  const handleUpdateCurrentDayNote = (noteText: string, targetDateStr?: string) => {
    const updated = [...calendarLogs];
    let targetIndex = selectedDateIndex;

    if (targetDateStr) {
      const foundIdx = updated.findIndex((log) => log.dateStr.toLowerCase() === targetDateStr.toLowerCase());
      if (foundIdx !== -1) {
        targetIndex = foundIdx;
        setSelectedDateIndex(foundIdx);
      }
    }

    const existing = updated[targetIndex].notes || '';
    updated[targetIndex].notes = existing ? `${existing}\n• ${noteText}` : `• ${noteText}`;
    setCalendarLogs(updated);
  };

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
      setTakenMeds({});
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
            caffeineIntake: activeDayLog.caffeineIntake,
            activityLevel: activeDayLog.activityLevel,
            medicationNotes: activeDayLog.notes || medicationNotes,
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
    const summaryText = `--- Doctor Prep Summary ---\nPatient: ${patient.name}\nEmail: ${patient.email || 'N/A'}\nPhone: ${patient.phone || 'N/A'}\nDOB: ${patient.dob || 'N/A'} (Age ${patient.age}) | Sex: ${patient.gender}\nLocation: ${patient.location}\nLast Visit: ${patient.lastVisitDate}\n\nLogged Symptoms:\n${symptoms.map((s) => `- ${s.text} [Severity: ${s.severity} | Duration: ${s.duration}]`).join('\n')}\n\nSelected Date Notes (${activeDayLog.dateStr}):\n${activeDayLog.notes || 'None'}\n\nQuestions for Doctor:\n${generatedQuestions}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintAgenda = () => {
    window.print();
  };

  const totalMedsCount = patient?.medications?.length || 0;
  const takenMedsCount = Object.values(takenMeds).filter(Boolean).length;
  const adherencePercent = totalMedsCount > 0 ? Math.round((takenMedsCount / totalMedsCount) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 max-w-4xl mx-auto font-sans print:bg-white print:p-0 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-6 border-b border-slate-200 gap-3 print:hidden">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="text-indigo-600" aria-hidden="true">💜</span> Pulse Companion
            </h1>
            <p className="text-xs text-slate-600 font-medium">Connected Health Record & Clinical Navigation Portal</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowConsentModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-full text-xs shadow-sm transition flex items-center gap-1"
            >
              🔒 Privacy Controls
            </button>

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

        {/* MEDBLOCKS CONSENT & PRIVACY CONTROL MODAL */}
        {showConsentModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-300 space-y-4 relative max-h-[85vh] overflow-y-auto">
              <button
                onClick={() => setShowConsentModal(false)}
                className="absolute top-4 right-4 text-slate-600 hover:text-slate-900 font-bold text-base p-1"
              >
                ✕
              </button>

              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Privacy & Visibility Controls
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Toggle component visibility across your dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* QUICK HIDE / UNHIDE ALL BUTTONS */}
              <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 pl-1">Quick Bulk Toggle:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAllPrivacyPermissions(true)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition"
                  >
                    👁️ Show All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAllPrivacyPermissions(false)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg transition"
                  >
                    🔒 Hide All
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">💡 "What Changed?" EHR Delta Summary</span>
                    <span className="text-[10px] text-slate-500">Show AI delta summary since last visit</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareDelta}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareDelta: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">👨‍⚕️ Provider Notes & Action Items</span>
                    <span className="text-[10px] text-slate-500">Show doctor visit notes and instructions</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareDoctorNotes}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareDoctorNotes: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">🩺 Symptom Log & Visit Prep Agenda</span>
                    <span className="text-[10px] text-slate-500">Show logged symptoms and AI question generator</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareSymptomPrep}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareSymptomPrep: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">📉 Vital Signs & Trend Chart</span>
                    <span className="text-[10px] text-slate-500">Show BP, HR, HbA1c and Vitals Chart</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareVitals}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareVitals: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">💊 Active Prescriptions & Reminder Tracker</span>
                    <span className="text-[10px] text-slate-500">Show medication list, adherence tracker & dose logger</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareMeds}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareMeds: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">🩺 Active Diagnoses & Explanations</span>
                    <span className="text-[10px] text-slate-500">Show medical condition history</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareDiagnoses}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareDiagnoses: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">⚠️ Known Drug Allergies</span>
                    <span className="text-[10px] text-slate-500">Show recorded allergy sensitivities</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareAllergies}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareAllergies: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">🧪 Laboratory Panels</span>
                    <span className="text-[10px] text-slate-500">Show lab test values and reference ranges</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareLabs}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareLabs: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">🔬 Clinical Trial & Support Matcher</span>
                    <span className="text-[10px] text-slate-500">Show local trial and community group recommendations</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareTrials}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareTrials: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">📜 Clinical Encounter History</span>
                    <span className="text-[10px] text-slate-500">Show doctor visit history logs</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareEncounters}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareEncounters: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">🌙 Sleep & Mental Health Grid</span>
                    <span className="text-[10px] text-slate-500">Show 28-day mood and stress tracking</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareMentalHealth}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareMentalHealth: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="font-bold text-slate-900 block">🏃‍♂️ Apple Health Activity Telemetry</span>
                    <span className="text-[10px] text-slate-500">Show step counts and exercise telemetry</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentPermissions.shareFitness}
                    onChange={(e) => setConsentPermissions({ ...consentPermissions, shareFitness: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowConsentModal(false)}
                className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 transition shadow mt-2"
              >
                Save Consent Preferences
              </button>
            </div>
          </div>
        )}

        {/* EMERGENCY WALLET CARD MODAL */}
        {showEmergencyModal && patient && (
          <div 
            role="dialog" 
            aria-labelledby="emergency-modal-title" 
            aria-modal="true"
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-600 space-y-4 relative max-h-[90vh] overflow-y-auto scrollbar-hide">
              <button
                onClick={() => setShowEmergencyModal(false)}
                aria-label="Close Emergency ID Modal"
                className="absolute top-4 right-4 text-slate-600 hover:text-slate-900 font-bold text-base p-1"
              >
                ✕
              </button>

              <div className="text-[10px] text-center font-semibold text-slate-400 tracking-wider uppercase border-b pb-1">
                ✂️ Fold / Cut Outline for Wallet Fit
              </div>

              <div ref={cardRef} className="p-4 bg-white rounded-xl border-2 border-dashed border-rose-400 space-y-3.5 max-w-md">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">🚨</span>
                    <div>
                      <h2 id="emergency-modal-title" className="text-base font-extrabold text-rose-800 uppercase tracking-wide leading-tight">
                        EMERGENCY HEALTH ID
                      </h2>
                      <p className="text-[10px] text-slate-500 font-semibold">First Responder & Paramedic Reference</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded">
                      O+
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded">
                      FULL CODE
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-slate-800 text-sm">{patient.name}</p>
                  <p className="text-slate-600">DOB: {patient.dob} ({patient.age}y) | Sex: {patient.gender} | Loc: {patient.location}</p>
                </div>

                <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 text-xs">
                  <span className="text-indigo-900 font-bold block">📞 Emergency Contact:</span>
                  <strong className="text-indigo-800 font-medium">
                    {patient.emergencyContact?.name} ({patient.emergencyContact?.relationship}) — {patient.emergencyContact?.phone}
                  </strong>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-xs">
                  <span className="font-bold text-rose-800 block mb-1">⚠️ CRITICAL DRUG ALLERGIES:</span>
                  {consentPermissions.shareAllergies ? (
                    patient.allergies && patient.allergies.length > 0 ? (
                      patient.allergies.map((a, i) => (
                        <div key={i} className="text-rose-700 font-semibold">• {a.substance} ({a.reaction})</div>
                      ))
                    ) : (
                      <div className="text-rose-700 font-semibold">No known drug allergies (NKDA)</div>
                    )
                  ) : (
                    <span className="text-slate-400 italic">🔒 Privacy Redacted by Patient</span>
                  )}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-0.5">
                  <span className="font-bold text-slate-800 block uppercase">💊 Active Medications:</span>
                  <div className="text-slate-900 font-bold">
                    {consentPermissions.shareMeds ? (
                      patient.medications?.map((m) => m.name.split(' ')[0]).join(', ')
                    ) : (
                      <span className="text-slate-400 italic">🔒 Privacy Redacted by Patient</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <QRCodeSVG 
                    value={JSON.stringify({
                      id: patient?.id || 'P-84920',
                      name: patient?.name || 'Ezekiel Walter',
                      dob: patient?.dob || '1984-05-12',
                      allergies: consentPermissions.shareAllergies ? (patient?.allergies || ['Penicillin', 'Peanuts']) : ['Redacted'],
                      contact: 'Clara Walter — (555) 234-9988'
                    })} 
                    size={130}
                    level="M"
                  />
                  <span className="text-[10px] font-semibold text-slate-500 mt-2">
                    Scan for FHIR R4 Encrypted Record
                  </span>
                </div>
              </div>

              <button
                onClick={() => handlePrintCard()}
                aria-label="Print Emergency Wallet Card"
                className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 transition shadow"
              >
                🖨️ Print Emergency Wallet Card
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
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
          <button
            onClick={() => setActiveTab('fitness')}
            aria-selected={activeTab === 'fitness'}
            role="tab"
            className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'fitness'
                ? 'border-indigo-700 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            🏃‍♂️ Activity & Fitness Sync
          </button>
        </nav>

        {/* TAB 1 */}
        {activeTab === 'vitals' && (
          <section aria-label="EHR Health Record Overview" className="space-y-4">
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

            {/* ACTIONABLE CLINICAL RISK FLAG BANNER */}
            {patient && (patient.vitals.bpStatus === 'warning' || patient.vitals.hba1cStatus === 'warning') && (
              <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl shadow-sm text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-amber-950 uppercase tracking-wide">
                    <span>⚠️ Clinical Risk Review Flag</span>
                    <span className="bg-amber-300 text-amber-950 px-2 py-0.5 rounded text-[10px]">Attention Needed</span>
                  </div>
                  <button
                    onClick={() => {
                      handleAddSymptom(undefined, `Elevated Vitals Review: Blood Pressure (${patient.vitals.bp}), HbA1c (${patient.vitals.hba1c})`);
                      setActiveTab('symptoms');
                    }}
                    className="bg-amber-900 hover:bg-amber-950 text-white font-bold px-3 py-1.5 rounded-lg transition text-[11px] shadow-sm"
                  >
                    + Add Risk Flag to Doctor Visit Agenda
                  </button>
                </div>
                <p className="text-amber-900 font-medium leading-relaxed">
                  Patient vitals reflect elevated metrics: Blood Pressure is currently <strong>{patient.vitals.bp}</strong> and HbA1c is <strong>{patient.vitals.hba1c}</strong>. Click above to auto-add these to your appointment agenda.
                </p>
              </div>
            )}

            {patient && (
              <>
                {patient.whatChangedSummary && (
                  consentPermissions.shareDelta ? (
                    <div className="bg-blue-50 border border-blue-300 p-4 rounded-xl shadow-sm text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-extrabold text-blue-950 uppercase tracking-wide">
                        <span aria-hidden="true">💡</span> What Changed Since Last Visit?
                        <span className="text-xs bg-blue-200 text-blue-950 px-2 py-0.5 rounded font-bold">EHR Delta AI</span>
                      </div>
                      <p className="text-slate-800 font-medium leading-relaxed pl-5">
                        {patient.whatChangedSummary}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-slate-300 text-center text-xs text-slate-500 italic">
                      🔒 "What Changed?" AI summary redacted by patient consent.
                    </div>
                  )
                )}

                {patient.doctorNotes && (
                  consentPermissions.shareDoctorNotes ? (
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
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-slate-300 text-center text-xs text-slate-500 italic">
                      🔒 Provider Notes & Visit Summary redacted by patient consent.
                    </div>
                  )
                )}

                {/* VITALS SIGNS & CHART WITH PRIVACY TOGGLE */}
                {consentPermissions.shareVitals ? (
                  <>
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

                    <VitalsChart vitalsHistory={(patient as any)?.vitalsHistory} />
                  </>
                ) : (
                  <div className="p-6 bg-white rounded-xl border border-slate-300 text-center space-y-1">
                    <span className="text-2xl">🔒</span>
                    <p className="text-xs font-bold text-slate-800">Vital Signs & Chart Redacted</p>
                    <p className="text-[11px] text-slate-500">Hidden via Privacy Controls.</p>
                  </div>
                )}

                {/* DAILY MEDICATION REMINDER & TRACKER */}
                {consentPermissions.shareMeds && patient.medications && (
                  <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⏰</span>
                        <div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                            Today's Pill Reminder & Adherence Tracker
                          </h3>
                          <p className="text-[10px] text-slate-500 font-medium">Click a medication to record your daily dose</p>
                        </div>
                      </div>
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md ${
                        adherencePercent === 100 ? 'bg-emerald-100 text-emerald-900' : 'bg-indigo-100 text-indigo-900'
                      }`}>
                        {takenMedsCount} / {totalMedsCount} Taken ({adherencePercent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-300" 
                        style={{ width: `${adherencePercent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {patient.medications.map((med, i) => {
                        const isTaken = !!takenMeds[med.name];
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleMedTaken(med.name)}
                            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                              isTaken 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold' 
                                : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <span className="text-xs font-extrabold block">{med.name}</span>
                              <span className="text-[11px] text-slate-600 block">{med.instructions}</span>
                            </div>
                            <span className={`text-xs font-extrabold px-2 py-1 rounded-lg ${
                              isTaken ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isTaken ? '✅ Dose Logged' : '💊 Mark Taken'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ACTIVE PRESCRIPTIONS */}
                  <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 md:col-span-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex justify-between">
                      <span>💊 Active Prescriptions</span>
                      <span className="text-indigo-800 font-bold">{patient.medications?.length || 0} active</span>
                    </h3>
                    <div className="space-y-2">
                      {consentPermissions.shareMeds ? (
                        patient.medications?.map((med, i) => (
                          <div key={i} className="bg-slate-100 border border-slate-200 p-2.5 rounded-lg space-y-1">
                            <div className="text-xs font-bold text-slate-950">{med.name}</div>
                            <div className="text-xs text-slate-700 font-medium">{med.instructions}</div>
                            <p className="text-xs text-slate-800 pt-1">
                              <strong className="text-indigo-950 font-bold">What it does: </strong>
                              {med.plainEnglish}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-slate-100 text-center rounded-lg border text-xs text-slate-500 italic">
                          🔒 Prescriptions redacted by patient consent.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTIVE DIAGNOSES */}
                  <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 md:col-span-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex justify-between">
                      <span>🩺 Active Diagnoses</span>
                      <span className="text-indigo-800 font-bold">{patient.conditions?.length || 0} recorded</span>
                    </h3>
                    <div className="space-y-2">
                      {consentPermissions.shareDiagnoses ? (
                        patient.conditions?.map((cond: any, i: number) => {
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
                        })
                      ) : (
                        <div className="p-4 bg-slate-100 text-center rounded-lg border text-xs text-slate-500 italic">
                          🔒 Diagnoses redacted by patient consent.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ALLERGIES */}
                  <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 md:col-span-1">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex justify-between">
                      <span>⚠️ Known Allergies</span>
                      <span className="text-rose-800 font-bold">{patient.allergies?.length || 0} recorded</span>
                    </h3>
                    <div className="space-y-2">
                      {consentPermissions.shareAllergies ? (
                        patient.allergies && patient.allergies.length > 0 ? (
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
                        )
                      ) : (
                        <div className="p-4 bg-slate-100 text-center rounded-lg border text-xs text-slate-500 italic">
                          🔒 Allergies redacted by patient consent.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CLINICAL TRIALS & SUPPORT MATCHER */}
                {consentPermissions.shareTrials ? (
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
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-slate-300 text-center text-xs text-slate-500 italic">
                    🔒 Clinical Trial & Support Program Matcher redacted by patient consent.
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  {/* LABS ACCORDION */}
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
                        {consentPermissions.shareLabs ? (
                          patient.labs?.map((lab, i) => {
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
                          })
                        ) : (
                          <div className="p-4 bg-slate-100 text-center rounded-lg border text-xs text-slate-500 italic col-span-2">
                            🔒 Lab panels redacted by patient consent preference.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ENCOUNTERS ACCORDION */}
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
                        {consentPermissions.shareEncounters ? (
                          patient.encounters?.map((enc, i) => (
                            <div key={i} className="bg-slate-100 p-2.5 rounded-lg text-xs space-y-1">
                              <div className="flex justify-between font-bold text-slate-900">
                                <span>🏥 {enc.type}</span>
                                <span className="text-slate-700 font-medium">{enc.date}</span>
                              </div>
                              <p className="text-slate-800 text-xs font-medium">{enc.summary}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 bg-slate-100 text-center rounded-lg border text-xs text-slate-500 italic">
                            🔒 Clinical encounters redacted by patient consent.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* TAB 2 */}
        {activeTab === 'symptoms' && (
          <section aria-label="Symptom Logging & Visit Preparation" className="space-y-4">
            {consentPermissions.shareSymptomPrep ? (
              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-5">
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
                  <div ref={pdfRef} className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-3">
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
                          onClick={handleDownloadPDF} 
                          aria-label="Download agenda as PDF"
                          className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-md font-bold transition"
                        >
                          📥 Download PDF
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
              </div>
            ) : (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-300 space-y-2">
                <span className="text-3xl">🔒</span>
                <h3 className="text-sm font-bold text-slate-900">Symptom Log & Doctor Prep Redacted</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  This section has been set to private via Patient Privacy Controls. Click "🔒 Privacy Controls" in the header to modify permissions.
                </p>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: DYNAMIC ROLLING 28-DAY CALENDAR */}
        {activeTab === 'wellness' && (
          <section aria-label="Sleep & Daily Calendar Tracking" className="space-y-4">
            {consentPermissions.shareMentalHealth ? (
              <>
                <div className="bg-slate-950 text-white p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      📅 Rolling 28-Day Calendar Grid (Click Any Day To View/Edit)
                    </h3>
                    <span className="text-[10px] bg-indigo-900 text-indigo-200 px-2.5 py-0.5 rounded font-bold">
                      Selected: {activeDayLog.dateStr} ({activeDayLog.dayLabel})
                    </span>
                  </div>

                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1">
                    {calendarLogs.map((log, idx) => {
                      const isSelected = idx === selectedDateIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDateIndex(idx)}
                          className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-400 text-white font-extrabold shadow-md scale-105 z-10'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-400">{log.dayLabel}</span>
                          <span className="text-xs font-bold mt-0.5">{log.dateStr.split(' ')[1]}</span>
                          {log.notes && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      📝 Logged Entry for: <span className="text-indigo-700">{activeDayLog.dateStr}</span> ({activeDayLog.dayLabel})
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">Auto-saves to browser & AI chat</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">Daily Mood & Energy:</label>
                    <div className="flex flex-wrap gap-2">
                      {(['Good', 'Neutral', 'Anxious', 'Fatigued'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            const updated = [...calendarLogs];
                            updated[selectedDateIndex].mood = m;
                            setCalendarLogs(updated);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                            activeDayLog.mood === m
                              ? 'bg-indigo-700 text-white border-indigo-700'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {m === 'Good' && '😊 Rested'}
                          {m === 'Neutral' && '😐 Neutral'}
                          {m === 'Anxious' && '😰 Anxious'}
                          {m === 'Fatigued' && '😴 Fatigued'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Bedtime:</label>
                      <input
                        type="text"
                        value={activeDayLog.bedtime || '11:00 PM'}
                        onChange={(e) => {
                          const updated = [...calendarLogs];
                          updated[selectedDateIndex].bedtime = e.target.value;
                          setCalendarLogs(updated);
                        }}
                        className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Wake Time:</label>
                      <input
                        type="text"
                        value={activeDayLog.wakeTime || '06:30 AM'}
                        onChange={(e) => {
                          const updated = [...calendarLogs];
                          updated[selectedDateIndex].wakeTime = e.target.value;
                          setCalendarLogs(updated);
                        }}
                        className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Caffeine Intake:</label>
                      <select
                        value={activeDayLog.caffeineIntake || '1-2 Cups ☕'}
                        onChange={(e) => {
                          const updated = [...calendarLogs];
                          updated[selectedDateIndex].caffeineIntake = e.target.value as any;
                          setCalendarLogs(updated);
                        }}
                        className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      >
                        <option value="None ☕">None ☕</option>
                        <option value="1-2 Cups ☕">1-2 Cups ☕</option>
                        <option value="3+ Cups ☕">3+ Cups ☕</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Hours Slept: {activeDayLog.sleepHours} hrs</label>
                      <input
                        type="range"
                        min="3"
                        max="12"
                        step="0.5"
                        value={activeDayLog.sleepHours}
                        onChange={(e) => {
                          const updated = [...calendarLogs];
                          updated[selectedDateIndex].sleepHours = parseFloat(e.target.value);
                          setCalendarLogs(updated);
                        }}
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Stress Level: {activeDayLog.stressLevel}/10</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={activeDayLog.stressLevel}
                        onChange={(e) => {
                          const updated = [...calendarLogs];
                          updated[selectedDateIndex].stressLevel = parseInt(e.target.value);
                          setCalendarLogs(updated);
                        }}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="date-note-input" className="text-xs font-bold text-slate-800 block">
                      ✏️ Daily Context Notes for {activeDayLog.dateStr}:
                    </label>
                    <textarea
                      id="date-note-input"
                      rows={3}
                      value={activeDayLog.notes || ''}
                      onChange={(e) => {
                        const updated = [...calendarLogs];
                        updated[selectedDateIndex].notes = e.target.value;
                        setCalendarLogs(updated);
                      }}
                      placeholder="e.g. Woke up with mild tightness, took morning Lisinopril at 8:00 AM..."
                      className="w-full p-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-300 space-y-2">
                <span className="text-3xl">🔒</span>
                <h3 className="text-sm font-bold text-slate-900">Sleep & Mental Health Module Redacted</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  This section has been set to private via Patient Privacy Controls. Click "🔒 Privacy Controls" in the header to modify permissions.
                </p>
              </div>
            )}
          </section>
        )}

        {/* TAB 4 */}
        {activeTab === 'fitness' && (
          <section aria-label="Activity and Fitness Telemetry" className="space-y-4">
            {consentPermissions.shareFitness ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide uppercase">
                      🏃‍♂️ Apple Health Telemetry & Daily Activity
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Real-time metric syncing to monitor patient compliance with physician walking instructions.
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Apple Health Connected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Daily Steps</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">92% of Goal</span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-400 mt-2">
                      7,420 <span className="text-xs text-slate-400 font-normal">/ 8,000</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Exercise</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">Goal Met (30m)</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 mt-2">
                      32 <span className="text-xs text-slate-400 font-normal">mins</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resting Heart Rate</span>
                      <span className="text-[10px] text-slate-400">Normal Range</span>
                    </div>
                    <div className="text-2xl font-bold text-rose-400 mt-2">
                      68 <span className="text-xs font-normal text-slate-400">bpm</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-3">
                      Weekly Average: <strong className="text-slate-200">67 bpm</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                  <span className="text-base">💡</span>
                  <div className="text-xs text-slate-300 space-y-1">
                    <strong className="text-white block font-semibold">AI Clinical Telemetry Summary:</strong>
                    <p>
                      Ezekiel has met his daily 30-minute walking goal 5 out of the last 7 days. Resting heart rate trends show a 4% improvement in cardiovascular recovery since starting the current Lisinopril regimen.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-300 space-y-2">
                <span className="text-3xl">🔒</span>
                <h3 className="text-sm font-bold text-slate-900">Activity Telemetry Module Redacted</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Apple Health step and heart rate telemetry has been set to private via Patient Privacy Controls.
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* FOOTER MEDICAL DISCLAIMER */}
      <footer className="mt-8 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500 print:hidden space-y-1">
        <p className="font-semibold text-slate-600">
          ⚠️ Medical Disclaimer
        </p>
        <p className="max-w-2xl mx-auto leading-relaxed">
          Pulse Companion is an AI-powered personal health administrative tool for visit prep and record organization. It does not provide medical diagnosis, treatment recommendations, or clinical advice. Always consult a licensed healthcare professional for medical concerns.
        </p>
      </footer>

      {/* FLOATING PULSE AI ASSISTANT */}
      <PulseChatDrawer 
        patient={patient} 
        calendarLogs={calendarLogs}
        selectedDateLabel={activeDayLog.dateStr}
        onLogToCalendar={(noteText, targetDateStr) => handleUpdateCurrentDayNote(noteText, targetDateStr)}
      />
    </div>
  );
}
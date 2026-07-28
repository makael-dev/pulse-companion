import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.MEDBLOCKS_API_KEY || "mb_sk_sbx_YbjtSwPXXqFVQmRRiJhyaQfchvoYaCFmiroHpqAxRXMtqujspTTXtwcUYzqXLLU";

    const response = await fetch('https://app.medblocks.com/api/v1/patients', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        return NextResponse.json(data);
      }
    }

    throw new Error('Falling back to Sandbox Patient Roster');
  } catch (error: any) {
    const sandboxPatients = [
      {
        id: '2fc00ee4-7cb2-425a-8511-55ad01b357ec',
        name: 'Ezekiel Walter',
        email: 'ezekiel.walter@medblocks.com',
        phone: '(555) 234-5678',
        dob: '1984-05-12',
        age: 42,
        gender: 'Male',
        location: 'Boston, MA',
        lastVisitDate: 'July 14, 2026',
        primaryDoctor: 'Dr. Sarah Vance, MD (Internal Medicine)',
        emergencyContact: { name: 'Clara Walter', relationship: 'Spouse', phone: '(555) 234-9988' },
        insurance: { provider: 'Blue Cross Blue Shield (PPO)', policyId: 'BCBS-88392019', groupId: 'GRP-9021' },
        whatChangedSummary: 'Blood pressure improved to 118/78 mmHg. Fasting blood glucose normal at 98 mg/dL. Lisinopril 10mg maintained.',
        doctorNotes: {
          date: 'July 14, 2026',
          doctor: 'Dr. Sarah Vance, MD',
          summary: 'Patient presented for annual physical. Blood pressure is well-managed under current Lisinopril regimen. Overall cardiovascular and metabolic markers look stable.',
          keyInstructions: [
            'Continue taking Lisinopril 10mg daily in the morning.',
            'Schedule routine CMP and Lipid panel 2 weeks before the next follow-up.',
            'Maintain current 30-minute daily walking routine.'
          ]
        },
        nextVisit: { date: 'August 18, 2026', type: 'Routine Follow-Up & Lab Review', doctor: 'Dr. Sarah Vance, MD', location: 'Medblocks Primary Care - Suite 300', status: 'Confirmed' },
        vitals: { bp: '118 / 78 mmHg', bpStatus: 'normal', heartRate: '68 bpm', hrStatus: 'normal', hba1c: '5.4 %', hba1cStatus: 'normal', spO2: '98 %', temp: '98.6 °F', height: `5' 10" (178 cm)`, weight: '168 lbs (76.2 kg)', bmi: '24.1 (Normal Weight)' },
        allergies: [
          { substance: 'Penicillin', severity: 'High', reaction: 'Hives & Facial Swelling' },
          { substance: 'Peanuts', severity: 'Moderate', reaction: 'Mild Rash & Itching' },
        ],
        labs: [
          { testName: 'Total Cholesterol', value: '185 mg/dL', referenceRange: '< 200 mg/dL', status: 'Normal' },
          { testName: 'LDL (Bad Cholesterol)', value: '105 mg/dL', referenceRange: '< 100 mg/dL', status: 'Slightly Elevated' },
          { testName: 'eGFR (Kidney Function)', value: '92 mL/min', referenceRange: '> 60 mL/min', status: 'Normal' },
        ],
        encounters: [
          { date: 'July 14, 2026', type: 'Annual Wellness Exam', doctor: 'Dr. Sarah Vance, MD', summary: 'Routine physical exam. All vitals baseline.' },
        ],
        medications: [
          { name: 'Lisinopril 10 mg', instructions: 'Take 1 tablet daily by mouth', plainEnglish: 'Relaxes blood vessels to lower blood pressure.' },
          { name: 'Metformin 500 mg', instructions: 'Take 1 tablet twice daily with meals', plainEnglish: 'Lowers blood sugar levels.' }
        ],
        conditions: [
          { name: 'Essential (Primary) Hypertension', plainEnglish: 'High blood pressure requiring routine tracking.' },
          { name: 'Type 2 Diabetes Mellitus', plainEnglish: 'Condition where body has trouble regulating blood sugar.' }
        ],
        immunizations: [
          { name: 'COVID-19 mRNA Vaccine', plainEnglish: 'Protects against severe coronavirus symptoms.' },
        ],
      },
      {
        id: 'mb-patient-002',
        name: 'Paul Tremblay',
        email: 'paul.tremblay@medblocks.com',
        phone: '(555) 345-6789',
        dob: '1976-11-23',
        age: 49,
        gender: 'Male',
        location: 'Cambridge, MA',
        lastVisitDate: 'June 28, 2026',
        primaryDoctor: 'Dr. Marcus Thorne, MD (Pulmonology)',
        emergencyContact: { name: 'Sarah Tremblay', relationship: 'Sister', phone: '(555) 345-0011' },
        insurance: { provider: 'Aetna Health Choice', policyId: 'AET-4491029', groupId: 'GRP-1044' },
        whatChangedSummary: 'Nighttime asthma wheezing reported. Renewed Albuterol inhaler. Blood pressure elevated at 138/88 mmHg.',
        doctorNotes: {
          date: 'June 28, 2026',
          doctor: 'Dr. Marcus Thorne, MD',
          summary: 'Patient reports increased nocturnal wheezing during damp weather. SpO2 is acceptable at 96%. Refilled Albuterol rescue inhaler and discussed proper inhaler technique.',
          keyInstructions: [
            'Use Albuterol inhaler 15-20 minutes before outdoor physical activity.',
            'Keep peak flow log for 14 days and bring to next appointment.',
            'Monitor blood pressure at home twice weekly.'
          ]
        },
        nextVisit: { date: 'August 04, 2026', type: 'Asthma Management & BP Check', doctor: 'Dr. Marcus Thorne, MD', location: 'Pulmonary Center', status: 'Due Soon' },
        vitals: { bp: '138 / 88 mmHg', bpStatus: 'warning', heartRate: '82 bpm', hrStatus: 'normal', hba1c: '6.1 %', hba1cStatus: 'warning', spO2: '96 %', temp: '98.8 °F', height: `6' 1" (185 cm)`, weight: '210 lbs (95.2 kg)', bmi: '27.7 (Overweight)' },
        allergies: [{ substance: 'Sulfa Drugs', severity: 'High', reaction: 'Severe Skin Rash' }],
        labs: [{ testName: 'Total Cholesterol', value: '228 mg/dL', referenceRange: '< 200 mg/dL', status: 'Elevated' }],
        encounters: [{ date: 'June 28, 2026', type: 'Asthma Follow-up', doctor: 'Dr. Marcus Thorne, MD', summary: 'Patient reported minor wheezing.' }],
        medications: [
          { name: 'Albuterol HFA 90 mcg Inhaler', instructions: 'Inhale 2 puffs as needed', plainEnglish: 'Quick-relief rescue inhaler.' },
          { name: 'Atorvastatin 20 mg', instructions: 'Take 1 tablet daily at bedtime', plainEnglish: 'Lowers bad cholesterol.' }
        ],
        conditions: [
          { name: 'Mild Bronchial Asthma', plainEnglish: 'Airway inflammation causing shortness of breath.' },
          { name: 'Hyperlipidemia', plainEnglish: 'Elevated cholesterol in bloodstream.' }
        ],
        immunizations: [{ name: 'Tdap Booster', plainEnglish: 'Tetanus, diphtheria, pertussis protection.' }],
      },
      {
        id: 'mb-patient-003',
        name: 'Eliseo Nader',
        email: 'eliseo.nader@medblocks.com',
        phone: '(555) 456-7890',
        dob: '1990-03-15',
        age: 36,
        gender: 'Male',
        location: 'Worcester, MA',
        lastVisitDate: 'July 02, 2026',
        primaryDoctor: 'Dr. Sarah Vance, MD',
        emergencyContact: { name: 'David Nader', relationship: 'Father', phone: '(555) 456-1122' },
        insurance: { provider: 'UnitedHealthcare Choice Plus', policyId: 'UHC-9921029', groupId: 'GRP-3029' },
        whatChangedSummary: 'Seasonal allergies controlled on Cetirizine. Vitals baseline.',
        doctorNotes: {
          date: 'July 02, 2026',
          doctor: 'Dr. Sarah Vance, MD',
          summary: 'Allergy flare-up resolved. Nasal congestion significantly reduced with daily Cetirizine.',
          keyInstructions: [
            'Continue Cetirizine daily during peak pollen season.',
            'Rinse eyes with saline wash after outdoor exposure.'
          ]
        },
        nextVisit: { date: 'September 15, 2026', type: 'Annual Allergy Check', doctor: 'Dr. Sarah Vance, MD', location: 'Medblocks Primary Care', status: 'Scheduled' },
        vitals: { bp: '124 / 82 mmHg', bpStatus: 'normal', heartRate: '72 bpm', hrStatus: 'normal', hba1c: '5.6 %', hba1cStatus: 'normal', spO2: '99 %', temp: '98.4 °F', height: `5' 8" (173 cm)`, weight: '155 lbs (70.3 kg)', bmi: '23.6 (Normal Weight)' },
        allergies: [],
        labs: [{ testName: 'Total IgE', value: '140 IU/mL', referenceRange: '< 100 IU/mL', status: 'Slightly High' }],
        encounters: [{ date: 'July 02, 2026', type: 'Seasonal Allergy Consultation', doctor: 'Dr. Sarah Vance, MD', summary: 'Discussed allergen triggers.' }],
        medications: [{ name: 'Cetirizine 10 mg', instructions: 'Take 1 tablet daily as needed', plainEnglish: 'Antihistamine.' }],
        conditions: [{ name: 'Seasonal Allergic Rhinitis', plainEnglish: 'Hay fever causing congestion and sneezing.' }],
        immunizations: [{ name: 'COVID-19 mRNA Vaccine', plainEnglish: 'Coronavirus protection.' }],
      },
      {
        id: 'mb-patient-004',
        name: 'Rosario Ortiz',
        email: 'rosario.ortiz@medblocks.com',
        phone: '(555) 567-8901',
        dob: '1968-08-30',
        age: 57,
        gender: 'Female',
        location: 'Springfield, MA',
        lastVisitDate: 'May 19, 2026',
        primaryDoctor: 'Dr. Elena Rostova, MD (Endocrinology)',
        emergencyContact: { name: 'Miguel Ortiz', relationship: 'Son', phone: '(555) 567-3344' },
        insurance: { provider: 'Humana Gold Plus (HMO)', policyId: 'HUM-1102938', groupId: 'GRP-7720' },
        whatChangedSummary: 'HbA1c elevated at 7.2%. Adjusted Metformin ER to 1000mg. BP warning at 142/92 mmHg.',
        doctorNotes: {
          date: 'May 19, 2026',
          doctor: 'Dr. Elena Rostova, MD',
          summary: 'HbA1c increased from 6.8% to 7.2%. Patient expressed difficulty adhering to low-carb diet due to work travel. Increased Metformin ER dose and stressed blood pressure control.',
          keyInstructions: [
            'Increase Metformin ER to 1000mg with evening meal.',
            'Log daily fasting blood glucose numbers in mobile app.',
            'Re-check HbA1c panel prior to August appointment.'
          ]
        },
        nextVisit: { date: 'August 02, 2026', type: 'Comprehensive Chronic Care & HbA1c Lab', doctor: 'Dr. Elena Rostova, MD', location: 'Endocrinology Clinic', status: 'Urgent Due' },
        vitals: { bp: '142 / 92 mmHg', bpStatus: 'warning', heartRate: '95 bpm', hrStatus: 'normal', hba1c: '7.2 %', hba1cStatus: 'warning', spO2: '97 %', temp: '99.1 °F', height: `5' 4" (162 cm)`, weight: '182 lbs (82.5 kg)', bmi: '31.2 (Obese)' },
        allergies: [{ substance: 'Codeine', severity: 'High', reaction: 'Nausea & Dizziness' }],
        labs: [{ testName: 'HbA1c', value: '7.2 %', referenceRange: '< 5.7 %', status: 'Elevated' }],
        encounters: [{ date: 'May 19, 2026', type: 'Endocrinology Follow-Up', doctor: 'Dr. Elena Rostova, MD', summary: 'HbA1c remains elevated.' }],
        medications: [
          { name: 'Amlodipine 5 mg', instructions: 'Take 1 tablet daily', plainEnglish: 'Decreases blood pressure.' },
          { name: 'Metformin ER 1000 mg', instructions: 'Take 1 tablet once daily with evening meal', plainEnglish: 'Extended-release blood sugar control.' }
        ],
        conditions: [
          { name: 'Essential Hypertension', plainEnglish: 'High blood pressure requiring daily monitoring.' },
          { name: 'Type 2 Diabetes Mellitus', plainEnglish: 'Elevated blood sugar levels.' }
        ],
        immunizations: [{ name: 'Shingrix', plainEnglish: 'Prevents shingles.' }],
      },
      {
        id: 'mb-patient-005',
        name: 'Larissa Nikolaus',
        email: 'larissa.nikolaus@medblocks.com',
        phone: '(555) 678-9012',
        dob: '1995-12-04',
        age: 30,
        gender: 'Female',
        location: 'Somerville, MA',
        lastVisitDate: 'July 25, 2026',
        primaryDoctor: 'Dr. Sarah Vance, MD',
        emergencyContact: { name: 'Mark Nikolaus', relationship: 'Spouse', phone: '(555) 678-1100' },
        insurance: { provider: 'Cigna Open Access', policyId: 'CG-8820192', groupId: 'GRP-5541' },
        whatChangedSummary: 'Heartburn well controlled with Omeprazole. All vitals baseline.',
        doctorNotes: {
          date: 'July 25, 2026',
          doctor: 'Dr. Sarah Vance, MD',
          summary: 'Acid reflux symptoms completely controlled on Omeprazole 20mg. H. pylori test returned negative.',
          keyInstructions: [
            'Take Omeprazole 30 minutes before first meal of the day.',
            'Avoid late-night meals within 3 hours of sleeping.'
          ]
        },
        nextVisit: { date: 'October 10, 2026', type: 'GERD & Reflux Check', doctor: 'Dr. Sarah Vance, MD', location: 'Medblocks Primary Care', status: 'Confirmed' },
        vitals: { bp: '110 / 72 mmHg', bpStatus: 'normal', heartRate: '62 bpm', hrStatus: 'normal', hba1c: '5.1 %', hba1cStatus: 'normal', spO2: '99 %', temp: '98.2 °F', height: `5' 6" (168 cm)`, weight: '130 lbs (59.0 kg)', bmi: '21.0 (Normal Weight)' },
        allergies: [],
        labs: [{ testName: 'H. pylori Antigen', value: 'Negative', referenceRange: 'Negative', status: 'Normal' }],
        encounters: [{ date: 'July 25, 2026', type: 'GI Evaluation', doctor: 'Dr. Sarah Vance, MD', summary: 'GERD well controlled.' }],
        medications: [{ name: 'Omeprazole 20 mg', instructions: 'Take 1 capsule daily before breakfast', plainEnglish: 'Reduces excess stomach acid.' }],
        conditions: [{ name: 'Gastroesophageal Reflux Disease (GERD)', plainEnglish: 'Acid reflux heartburn.' }],
        immunizations: [{ name: 'HPV 9-valent', plainEnglish: 'Cancer defense vaccine.' }],
      },
      {
        id: 'mb-patient-006',
        name: 'Shalanda Treutel',
        email: 'shalanda.treutel@medblocks.com',
        phone: '(555) 789-0123',
        dob: '1982-07-19',
        age: 44,
        gender: 'Female',
        location: 'Lowell, MA',
        lastVisitDate: 'July 24, 2026',
        primaryDoctor: 'Dr. Sarah Vance, MD',
        emergencyContact: { name: 'Beth Treutel', relationship: 'Mother', phone: '(555) 789-4411' },
        insurance: { provider: 'Kaiser Permanente', policyId: 'KP-9021827', groupId: 'GRP-8812' },
        whatChangedSummary: 'Vitamin D low at 22 ng/mL. Started Vitamin D3 supplement. Borderline HbA1c at 5.8%.',
        doctorNotes: {
          date: 'July 24, 2026',
          doctor: 'Dr. Sarah Vance, MD',
          summary: 'Labs show mild Vitamin D deficiency (22 ng/mL) and borderline prediabetes HbA1c (5.8%). Counseled on dietary adjustments.',
          keyInstructions: [
            'Take Vitamin D3 2000 IU daily with meals.',
            'Reduce refined sugar and simple carbs in daily diet.',
            'Re-test Vitamin D and HbA1c levels in 12 weeks.'
          ]
        },
        nextVisit: { date: 'August 24, 2026', type: 'Prediabetes & Nutrition Follow-Up', doctor: 'Dr. Sarah Vance, MD', location: 'Wellness Clinic', status: 'Due Soon' },
        vitals: { bp: '128 / 82 mmHg', bpStatus: 'warning', heartRate: '74 bpm', hrStatus: 'normal', hba1c: '5.8 %', hba1cStatus: 'warning', spO2: '98 %', temp: '98.6 °F', height: `5' 7" (170 cm)`, weight: '162 lbs (73.5 kg)', bmi: '25.4 (Overweight)' },
        allergies: [],
        labs: [{ testName: '25-OH Vitamin D', value: '22 ng/mL', referenceRange: '30 - 100 ng/mL', status: 'Low' }],
        encounters: [{ date: 'July 24, 2026', type: 'Nutrition Intake', doctor: 'Dr. Sarah Vance, MD', summary: 'Counseled on diet.' }],
        medications: [{ name: 'Vitamin D3 2000 IU', instructions: 'Take 1 softgel daily', plainEnglish: 'Restores vitamin D levels.' }],
        conditions: [{ name: 'Prediabetes', plainEnglish: 'Slightly elevated blood sugar.' }],
        immunizations: [{ name: 'MMR Vaccine', plainEnglish: 'Measles, Mumps, and Rubella protection.' }],
      },
      {
        id: 'mb-patient-007',
        name: 'Cristobal Montero',
        email: 'cristobal.montero@medblocks.com',
        phone: '(555) 890-1234',
        dob: '1988-02-14',
        age: 38,
        gender: 'Male',
        location: 'New Bedford, MA',
        lastVisitDate: 'July 20, 2026',
        primaryDoctor: 'Dr. Alan Ross, MD (Neurology)',
        emergencyContact: { name: 'Elena Montero', relationship: 'Spouse', phone: '(555) 890-9900' },
        insurance: { provider: 'Blue Cross Blue Shield (HMO)', policyId: 'BCBS-1029384', groupId: 'GRP-3301' },
        whatChangedSummary: 'Migraine frequency reduced from 4 to 1 per month with Sumatriptan. Vitals optimal.',
        doctorNotes: {
          date: 'July 20, 2026',
          doctor: 'Dr. Alan Ross, MD',
          summary: 'Excellent response to acute Sumatriptan treatment. Headaches are shorter in duration and less severe.',
          keyInstructions: [
            'Take Sumatriptan 50mg immediately at onset of headache aura.',
            'Keep headache diary noting environmental triggers.'
          ]
        },
        nextVisit: { date: 'September 01, 2026', type: 'Migraine Prevention Check', doctor: 'Dr. Alan Ross, MD', location: 'Neurology Group', status: 'Confirmed' },
        vitals: { bp: '116 / 76 mmHg', bpStatus: 'normal', heartRate: '70 bpm', hrStatus: 'normal', hba1c: '5.3 %', hba1cStatus: 'normal', spO2: '98 %', temp: '98.4 °F', height: `5' 11" (180 cm)`, weight: '175 lbs (79.4 kg)', bmi: '24.4 (Normal Weight)' },
        allergies: [],
        labs: [{ testName: 'CMP', value: 'Normal', referenceRange: 'Baseline', status: 'Normal' }],
        encounters: [{ date: 'July 20, 2026', type: 'Neurology Follow-Up', doctor: 'Dr. Alan Ross, MD', summary: 'Migraines controlled.' }],
        medications: [{ name: 'Sumatriptan 50 mg', instructions: 'Take 1 tablet at onset of headache', plainEnglish: 'Relieves acute migraines.' }],
        conditions: [{ name: 'Migraine without aura', plainEnglish: 'Severe throbbing headaches.' }],
        immunizations: [{ name: 'Tdap Booster', plainEnglish: 'Tetanus booster.' }],
      },
      {
        id: 'mb-patient-008',
        name: 'Eunice Fay',
        email: 'eunice.fay@medblocks.com',
        phone: '(555) 901-2345',
        dob: '1961-09-08',
        age: 64,
        gender: 'Female',
        location: 'Quincy, MA',
        lastVisitDate: 'July 18, 2026',
        primaryDoctor: 'Dr. Elena Rostova, MD',
        emergencyContact: { name: 'Arthur Fay', relationship: 'Spouse', phone: '(555) 901-7788' },
        insurance: { provider: 'Medicare Part B Advantage', policyId: 'MED-8830192', groupId: 'GRP-1002' },
        whatChangedSummary: 'Added Empagliflozin (Jardiance) for kidney protection. Stage 2 CKD identified with eGFR at 54 mL/min. High BP at 150/96 mmHg.',
        doctorNotes: {
          date: 'July 18, 2026',
          doctor: 'Dr. Elena Rostova, MD',
          summary: 'Blood pressure remains severely elevated at 150/96. Added Empagliflozin (Jardiance) to preserve kidney function and manage persistent hyperglycemia.',
          keyInstructions: [
            'Start Empagliflozin 10mg daily in the morning.',
            'Monitor blood pressure daily; notify clinic if systolic stays > 150.',
            'Repeat Renal function panel before August 10.'
          ]
        },
        nextVisit: { date: 'August 10, 2026', type: 'Renal Panel & BP Review', doctor: 'Dr. Elena Rostova, MD', location: 'Nephrology & Diabetes Center', status: 'Urgent Due' },
        vitals: { bp: '150 / 96 mmHg', bpStatus: 'warning', heartRate: '104 bpm', hrStatus: 'warning', hba1c: '8.4 %', hba1cStatus: 'warning', spO2: '95 %', temp: '98.9 °F', height: `5' 3" (160 cm)`, weight: '190 lbs (86.2 kg)', bmi: '33.7 (Obese)' },
        allergies: [{ substance: 'Aspirin', severity: 'High', reaction: 'GI Bleeding' }],
        labs: [{ testName: 'eGFR', value: '54 mL/min', referenceRange: '> 60 mL/min', status: 'Low (Stage 2 CKD)' }],
        encounters: [{ date: 'July 18, 2026', type: 'Chronic Care Review', doctor: 'Dr. Elena Rostova, MD', summary: 'Added Jardiance.' }],
        medications: [
          { name: 'Losartan 100 mg', instructions: 'Take 1 tablet daily', plainEnglish: 'Protects kidney function and lowers BP.' },
          { name: 'Empagliflozin 10 mg', instructions: 'Take 1 tablet daily', plainEnglish: 'Filters out excess blood sugar.' }
        ],
        conditions: [
          { name: 'Stage 2 Hypertension', plainEnglish: 'High blood pressure.' },
          { name: 'Chronic Kidney Disease (Stage 2)', plainEnglish: 'Reduced kidney filtering.' }
        ],
        immunizations: [{ name: 'Pneumococcal 20-valent', plainEnglish: 'Pneumonia vaccine.' }],
      },
      {
        id: 'mb-patient-009',
        name: 'Mauro Braun',
        email: 'mauro.braun@medblocks.com',
        phone: '(555) 012-3456',
        dob: '1973-04-21',
        age: 53,
        gender: 'Male',
        location: 'Brockton, MA',
        lastVisitDate: 'July 15, 2026',
        primaryDoctor: 'Dr. Marcus Thorne, MD',
        emergencyContact: { name: 'Julia Braun', relationship: 'Spouse', phone: '(555) 012-8822' },
        insurance: { provider: 'UnitedHealthcare PPO', policyId: 'UHC-4401928', groupId: 'GRP-2041' },
        whatChangedSummary: 'CPAP adherence excellent (6.8 hrs/night). Daytime fatigue eliminated.',
        doctorNotes: {
          date: 'July 15, 2026',
          doctor: 'Dr. Marcus Thorne, MD',
          summary: 'Reviewed 30-day CPAP machine data. AHI index down to 3.2 events/hr. Patient reports energy restored.',
          keyInstructions: [
            'Maintain CPAP pressure setting at 10 cm H2O.',
            'Clean mask and water chamber weekly.'
          ]
        },
        nextVisit: { date: 'October 22, 2026', type: 'Sleep Apnea Compliance Check', doctor: 'Dr. Marcus Thorne, MD', location: 'Sleep Clinic', status: 'Scheduled' },
        vitals: { bp: '122 / 80 mmHg', bpStatus: 'normal', heartRate: '78 bpm', hrStatus: 'normal', hba1c: '5.6 %', hba1cStatus: 'normal', spO2: '97 %', temp: '98.5 °F', height: `6' 0" (183 cm)`, weight: '205 lbs (93.0 kg)', bmi: '27.8 (Overweight)' },
        allergies: [],
        labs: [{ testName: 'AHI Index', value: '3.2 events/hr', referenceRange: '< 5.0', status: 'Normal' }],
        encounters: [{ date: 'July 15, 2026', type: 'Sleep Study Review', doctor: 'Dr. Marcus Thorne, MD', summary: 'CPAP effective.' }],
        medications: [{ name: 'CPAP Therapy', instructions: 'Use nightly', plainEnglish: 'Airway pressure device.' }],
        conditions: [{ name: 'Obstructive Sleep Apnea', plainEnglish: 'Sleep breathing disorder.' }],
        immunizations: [{ name: 'COVID-19 mRNA Vaccine', plainEnglish: 'Coronavirus protection.' }],
      },
      {
        id: 'mb-patient-010',
        name: 'Wilfredo Fritsch',
        email: 'wilfredo.fritsch@medblocks.com',
        phone: '(555) 123-4567',
        dob: '1979-10-05',
        age: 46,
        gender: 'Male',
        location: 'Lynn, MA',
        lastVisitDate: 'July 12, 2026',
        primaryDoctor: 'Dr. Sarah Vance, MD',
        emergencyContact: { name: 'Maria Fritsch', relationship: 'Spouse', phone: '(555) 123-9933' },
        insurance: { provider: 'Humana Choice', policyId: 'HUM-7730192', groupId: 'GRP-6612' },
        whatChangedSummary: 'Started Glipizide ER 5mg for diabetes control. Fasting blood glucose elevated at 126 mg/dL.',
        doctorNotes: {
          date: 'July 12, 2026',
          doctor: 'Dr. Sarah Vance, MD',
          summary: 'Fasting glucose elevated at 126 mg/dL. Initiated Glipizide ER 5mg daily to stabilize postprandial glucose surges.',
          keyInstructions: [
            'Take Glipizide 30 minutes before breakfast.',
            'Carry fast-acting glucose tablets in case of mild hypoglycemia.'
          ]
        },
        nextVisit: { date: 'August 12, 2026', type: 'Blood Pressure & Diabetes Check', doctor: 'Dr. Sarah Vance, MD', location: 'Medblocks Primary Care', status: 'Due Soon' },
        vitals: { bp: '130 / 84 mmHg', bpStatus: 'warning', heartRate: '88 bpm', hrStatus: 'normal', hba1c: '6.5 %', hba1cStatus: 'warning', spO2: '98 %', temp: '98.6 °F', height: `5' 9" (175 cm)`, weight: '180 lbs (81.6 kg)', bmi: '26.6 (Overweight)' },
        allergies: [],
        labs: [{ testName: 'Fasting Glucose', value: '126 mg/dL', referenceRange: '70 - 99 mg/dL', status: 'Elevated' }],
        encounters: [{ date: 'July 12, 2026', type: 'Diabetes Follow-Up', doctor: 'Dr. Sarah Vance, MD', summary: 'Started Glipizide.' }],
        medications: [{ name: 'Glipizide ER 5 mg', instructions: 'Take 1 tablet daily before breakfast', plainEnglish: 'Lowers blood sugar.' }],
        conditions: [{ name: 'Type 2 Diabetes Mellitus', plainEnglish: 'Elevated blood sugar.' }],
        immunizations: [{ name: 'Influenza, Quadrivalent', plainEnglish: 'Flu shot.' }],
      },
    ];

    return NextResponse.json({ data: sandboxPatients });
  }
}
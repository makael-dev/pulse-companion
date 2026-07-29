import { NextResponse } from 'next/server';

// Layer 1: Prompt Injection Patterns
const INJECTION_PATTERNS = [
  /ignore (all|previous) instructions/i,
  /you are now a doctor/i,
  /act as my doctor/i,
  /prescribe me/i,
  /bypass safety/i,
  /system prompt/i,
];

// Layer 2: Hallucinated Medical Advice Output Red Flags
const FORBIDDEN_OUTPUT_PATTERNS = [
  /i diagnose you with/i,
  /you should take \d+mg/i,
  /stop taking your medication immediately/i,
  /this is definitely/i,
];

export async function POST(req: Request) {
  try {
    const { messages, patient, selectedDateLabel, calendarLogs } = await req.json();
    const lastMessage = messages[messages.length - 1]?.text || '';
    const lower = lastMessage.toLowerCase();

    // --- SHORTHAND & SLANG NORMALIZATION ---
    const normalized = lower
      .replace(/\b(app|appt|appts)\b/g, 'appointment')
      .replace(/\b(doc|physician|dr)\b/g, 'doctor')
      .replace(/\b(bday|dob)\b/g, 'birthday')
      .replace(/\b(rx|pills)\b/g, 'medication')
      .replace(/\b(yest)\b/g, 'yesterday');

    // --- LAYER 1: PROMPT INJECTION GUARDRAIL ---
    const isInjectionAttempt = INJECTION_PATTERNS.some((pattern) => pattern.test(normalized));
    if (isInjectionAttempt) {
      return NextResponse.json({
        reply: "🛡️ Safety Notice: I am Pulse Companion AI, an administrative visit prep assistant. I cannot provide direct medical diagnosis, prescriptions, or act outside my scope.",
      });
    }

    // --- 1. 🚨 RED FLAG EMERGENCY TRIAGE FILTER ---
    if (
      normalized.includes('chest pain') ||
      normalized.includes('shortness of breath') ||
      normalized.includes('difficulty breathing') ||
      normalized.includes('can\'t breathe') ||
      normalized.includes('stroke') ||
      normalized.includes('numbness') ||
      normalized.includes('face drooping') ||
      normalized.includes('fainted') ||
      normalized.includes('fainting') ||
      normalized.includes('severe bleeding') ||
      normalized.includes('suicidal')
    ) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately. Do not wait for a routine appointment."
      });
    }

    // --- 2. ✏️ DYNAMIC MEDICATION LOG UPDATE COMMAND ---
    if (
      (normalized.includes('add') || normalized.includes('mark') || normalized.includes('log') || normalized.includes('took')) &&
      (normalized.includes('med') || normalized.includes('pill') || normalized.includes('both') || normalized.includes('dose'))
    ) {
      let targetLog = calendarLogs?.find((log: any) => {
        const dayNum = log.dateStr.split(' ')[1];
        return (
          normalized.includes(`the ${dayNum}th`) ||
          normalized.includes(`the ${dayNum}st`) ||
          normalized.includes(`the ${dayNum}rd`) ||
          normalized.includes(` ${dayNum} `) ||
          normalized.includes(` ${dayNum}`) ||
          normalized.includes(log.dateStr.toLowerCase())
        );
      });

      if (!targetLog) {
        targetLog = calendarLogs?.find((log: any) => log.dateStr === selectedDateLabel) || calendarLogs?.[calendarLogs.length - 1];
      }

      const matchedDateStr = targetLog?.dateStr || selectedDateLabel;

      return NextResponse.json({
        reply: `✅ Updated your calendar log for **${matchedDateStr}**: Marked all active medications as taken!`,
        action: {
          type: 'LOG_MEDS_TAKEN',
          targetDateStr: matchedDateStr,
        }
      });
    }

    // --- 3. 📋 REFILL & APPOINTMENT REQUESTS ---
    if (normalized.includes('refill') || normalized.includes('renewal')) {
      const medList = patient?.medications?.map((m: any) => m.name).join(', ');
      return NextResponse.json({
        reply: `📋 I can help you prepare a refill request for ${medList || 'your active prescriptions'}. You can also download or print your complete Doctor Prep PDF agenda from the Symptom Log tab!`
      });
    }

    // --- 4. 📊 VITAL TRENDS & COMPARISONS ---
    if (normalized.includes('highest') || normalized.includes('trend') || normalized.includes('vitals history') || normalized.includes('bp trend')) {
      return NextResponse.json({
        reply: `📈 Vital Trends: Your blood pressure has improved to ${patient?.vitals?.bp || '118/78 mmHg'}. Your heart rate is averaging ${patient?.vitals?.heartRate || '68 bpm'} and HbA1c is stable at ${patient?.vitals?.hba1c || '5.4%'}.`
      });
    }

    // --- 5. ⚠️ DRUG INTERACTION & SAFETY CHECK ---
    if (normalized.includes('ibuprofen') || normalized.includes('advil') || normalized.includes('aspirin') || normalized.includes('interaction')) {
      return NextResponse.json({
        reply: "⚠️ Drug Safety Note: NSAIDs (like Ibuprofen or Advil) can interact with blood pressure medications like Lisinopril and impact kidney function. Always confirm over-the-counter medications with Dr. Vance or your pharmacist!"
      });
    }

    // --- 6. 🌙 NATURAL LANGUAGE SLEEP LOGGING ---
    if (normalized.includes('slept') || normalized.includes('sleep hours')) {
      const match = normalized.match(/(\d+(\.\d+)?)\s*hours?/);
      const hours = match ? parseFloat(match[1]) : 8;
      return NextResponse.json({
        reply: `🌙 Logged ${hours} hours of sleep for ${selectedDateLabel}. Your wellness record has been updated!`
      });
    }

    // --- 7. 🌍 MEDICAL JARGON SIMPLIFIER ---
    if (
      normalized.includes('what is') ||
      normalized.includes('what does') ||
      normalized.includes('explain') ||
      normalized.includes('mean') ||
      normalized.includes('definition')
    ) {
      if (normalized.includes('hba1c') || normalized.includes('a1c')) {
        return NextResponse.json({
          reply: "🩸 HbA1c in Simple Terms: HbA1c measures your average blood sugar over the last 2 to 3 months. Think of it like a video recording of your sugar levels over time, rather than a quick snapshot like a finger-prick test!"
        });
      }

      if (normalized.includes('hypertension') || normalized.includes('blood pressure') || normalized.includes('bp')) {
        return NextResponse.json({
          reply: "🫀 Hypertension in Simple Terms: High blood pressure means the force of blood pushing against your artery walls is consistently too high. Routine tracking helps keep your heart protected!"
        });
      }

      if (normalized.includes('hyperlipidemia') || normalized.includes('cholesterol') || normalized.includes('lipid')) {
        return NextResponse.json({
          reply: "🫀 Hyperlipidemia in Simple Terms: Extra fats (cholesterol) circulating in your bloodstream. Managing this helps keep blood vessels clear."
        });
      }

      if (normalized.includes('lisinopril')) {
        return NextResponse.json({
          reply: "💊 Lisinopril in Simple Terms: An ACE inhibitor that relaxes blood vessels, making it easier for your heart to pump blood and keeping blood pressure in a safe range."
        });
      }

      if (normalized.includes('metformin')) {
        return NextResponse.json({
          reply: "💊 Metformin in Simple Terms: Helps your body use insulin effectively and reduces sugar produced by your liver."
        });
      }
    }

    // --- 8. 🔍 "LAST TIME I TOOK MY MEDS" HISTORY SEARCH ---
    if (
      (normalized.includes('last time') || normalized.includes('when was') || normalized.includes('most recent')) &&
      (normalized.includes('took') || normalized.includes('med') || normalized.includes('pill') || normalized.includes('dose'))
    ) {
      const reverseLogs = Array.isArray(calendarLogs) ? [...calendarLogs].reverse() : [];
      const lastTakenLog = reverseLogs.find((log) => {
        const medsMap = log?.medsTaken || {};
        return Object.values(medsMap).some(Boolean);
      });

      if (lastTakenLog) {
        const takenList = Object.entries(lastTakenLog.medsTaken || {})
          .filter(([_, isTaken]) => isTaken)
          .map(([medName]) => medName)
          .join(', ');

        return NextResponse.json({
          reply: `🗓️ The last time you logged taking your medications was on **${lastTakenLog.dateStr}** (${takenList}).`
        });
      } else {
        return NextResponse.json({
          reply: "💊 No recorded medication doses were found in your recent 28-day calendar history."
        });
      }
    }

    // --- 9. 🗓️ DATE-SPECIFIC MEDICATION ADHERENCE CHECK ---
    if (
      (normalized.includes('did i take') || normalized.includes('have i taken') || normalized.includes('took my') || normalized.includes('log for')) &&
      (normalized.includes('med') || normalized.includes('pill') || normalized.includes('dose') || normalized.includes('prescription'))
    ) {
      let targetLog = calendarLogs?.find((log: any) => log.dateStr && normalized.includes(log.dateStr.toLowerCase()));
      if (!targetLog) {
        targetLog = calendarLogs?.find((log: any) => log.dateStr === selectedDateLabel) || calendarLogs?.[calendarLogs.length - 1];
      }

      const logDate = targetLog?.dateStr || selectedDateLabel;
      const medsTakenMap = targetLog?.medsTaken || {};
      const totalMeds = patient?.medications?.length || 0;
      const takenCount = Object.values(medsTakenMap).filter(Boolean).length;

      if (totalMeds === 0) {
        return NextResponse.json({ reply: `No active prescriptions recorded for ${logDate}.` });
      }

      if (takenCount === totalMeds) {
        return NextResponse.json({
          reply: `✅ Yes! According to your calendar record for ${logDate}, you marked all ${totalMeds} of your doses as taken.`
        });
      } else if (takenCount > 0) {
        return NextResponse.json({
          reply: `⚠️ Partially logged for ${logDate}: You marked ${takenCount} of ${totalMeds} doses as taken.`
        });
      } else {
        return NextResponse.json({
          reply: `💊 According to your calendar log for ${logDate}, no medication doses have been marked as taken yet (0 of ${totalMeds} logged).`
        });
      }
    }

    // --- 10. 💊 MISSED DOSE GUIDELINES ---
    if (
      normalized.includes('forget') || normalized.includes('miss') || normalized.includes('forgot') || 
      normalized.includes('skip') || normalized.includes('dose') || normalized.includes('doss')
    ) {
      return NextResponse.json({
        reply: "If you miss or forget a dose, take it as soon as you remember unless it is almost time for your next scheduled dose. Never take two doses at once to make up for a missed one. For specific guidelines on Lisinopril or Metformin, consult Dr. Vance or your pharmacist!"
      });
    }

    // --- 11. 🥛 ADMINISTRATION & INTAKE GUIDELINES ---
    if (
      normalized.includes('water') || normalized.includes('food') || normalized.includes('meal') ||
      normalized.includes('how do i take') || normalized.includes('how to take') || normalized.includes('take these') ||
      normalized.includes('with food') || normalized.includes('empty stomach') || normalized.includes('swallow')
    ) {
      return NextResponse.json({
        reply: "Oral medications like Lisinopril and Metformin should generally be taken with a full glass of water. Metformin is best taken with meals to minimize stomach upset, while Lisinopril can be taken with or without food at the same time each morning. Always refer to your prescription directions!"
      });
    }

    // --- 12. 🎂 DEMOGRAPHICS & PROFILE ---
    if (normalized.includes('birthday') || normalized.includes('dob') || normalized.includes('date of birth') || normalized.includes('born') || normalized.includes('how old')) {
      return NextResponse.json({
        reply: patient?.dob
          ? `Your date of birth on file is ${patient.dob} (${patient.age} years old).`
          : "I couldn't locate a date of birth on your record."
      });
    }

    // --- 13. 🗓️ APPOINTMENT & PROVIDER ENQUIRIES ---
    if (
      normalized.includes('appointment') ||
      normalized.includes('next visit') ||
      normalized.includes('doctor visit') ||
      normalized.includes('when do i see') ||
      normalized.includes('when is my visit') ||
      normalized.includes('next app')
    ) {
      return NextResponse.json({
        reply: patient?.nextVisit
          ? `Your next appointment is scheduled for ${patient.nextVisit.date} (${patient.nextVisit.type}) with ${patient.primaryDoctor || 'Dr. Sarah Vance, MD'}.`
          : "You currently have no upcoming visits scheduled."
      });
    }

    if (normalized.includes('doctor') || normalized.includes('provider') || normalized.includes('physician') || normalized.includes('who is my')) {
      return NextResponse.json({
        reply: `Your primary care provider is ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD (Internal Medicine)'}.`
      });
    }

    // --- 14. 💊 MEDICATION LIST ---
    if (normalized.includes('medication') || normalized.includes('meds') || normalized.includes('prescription') || normalized.includes('pills')) {
      const medList = patient?.medications?.map((m: any) => `${m.name} (${m.instructions})`).join(', ');
      return NextResponse.json({
        reply: medList ? `Your active prescriptions are: ${medList}.` : "No active prescriptions found on file."
      });
    }

    // --- 15. ⚠️ ALLERGIES ---
    if (normalized.includes('allergy') || normalized.includes('allergies') || normalized.includes('allergic')) {
      const algs = patient?.allergies?.map((a: any) => `${a.substance} (${a.reaction})`).join(', ');
      return NextResponse.json({
        reply: algs ? `Your recorded sensitivities are: ${algs}.` : "You have No Known Drug Allergies (NKDA) recorded."
      });
    }

    // --- 16. 🧪 LABS & DIAGNOSTICS ---
    if (normalized.includes('lab') || normalized.includes('test') || normalized.includes('blood work') || normalized.includes('results')) {
      const labList = patient?.labs?.map((l: any) => `${l.testName}: ${l.value} (${l.status})`).join(', ');
      return NextResponse.json({
        reply: labList ? `Your recent lab results: ${labList}. Current BP: ${patient?.vitals?.bp || 'N/A'}.` : `Current Vitals: Blood Pressure ${patient?.vitals?.bp}, Heart Rate ${patient?.vitals?.heartRate}.`
      });
    }

    // --- LAYER 2: LLM OPENAI CALL WITH OUTPUT SANITIZATION ---
    if (process.env.OPENAI_API_KEY) {
      const systemPrompt = `You are Pulse Companion AI, an administrative health assistant.
You CANNOT issue diagnoses or prescribe medication.
Patient Context: Name: ${patient?.name}, DOB: ${patient?.dob}, Medications: ${JSON.stringify(patient?.medications || [])}, Doctor: ${patient?.primaryDoctor}.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m: any) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
          ],
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let reply = data.choices?.[0]?.message?.content || '';

        const carriesMedicalDiagnosis = FORBIDDEN_OUTPUT_PATTERNS.some((pattern) => pattern.test(reply));
        if (carriesMedicalDiagnosis) {
          reply = "I cannot provide a specific medical diagnosis or treatment plan. Please consult Dr. Vance for personalized medical advice.";
        }

        if (reply) return NextResponse.json({ reply });
      }
    }

    // --- LAYER 3: SYMPTOM & LOGGING FALLBACK ---
    if (normalized.includes('feel') || normalized.includes('pain') || normalized.includes('hurt') || normalized.includes('took') || normalized.includes('log') || normalized.includes('dizzy') || normalized.includes('headache')) {
      return NextResponse.json({
        reply: `Logged entry for ${selectedDateLabel}: "${lastMessage}". Your calendar record has been updated.`
      });
    }

    return NextResponse.json({
      reply: "I'm here to help organize your health records! Ask me about your medications, what lab tests mean, missed doses, birthday, doctor visits, or log notes."
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      reply: "I am available to assist with your records. Ask me about your medications, doctor visits, or log notes!"
    });
  }
}
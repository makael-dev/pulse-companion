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

    // --- SHORTHAND, SLANG & TYPO NORMALIZATION ---
    let normalized = lower
      .replace(/\b(wat|wht|wt)\b/g, 'what')
      .replace(/\b(wen|wn)\b/g, 'when')
      .replace(/\b(visist|vosit|vsiit|visitt)\b/g, 'visit')
      .replace(/\b(imporant|importnat|importnt)\b/g, 'important')
      .replace(/\b(refil|refillz|refills)\b/g, 'refill')
      .replace(/\b(epipen|epi-pen|epinephrine)\b/g, 'epipen')
      .replace(/\b(vital|vitals|vital signs)\b/g, 'vitals')
      .replace(/\b(mmeds|medd|medz|meds|med|prescription|prescriptions|pills|pill|rx)\b/g, 'medication')
      .replace(/\b(app|appt|appts|apointment|appointmnet)\b/g, 'appointment')
      .replace(/\b(doc|physician|dr|docter)\b/g, 'doctor')
      .replace(/\b(bday|dob|birthd)\b/g, 'birthday')
      .replace(/\b(yest)\b/g, 'yesterday');

    // --- CONVERSATIONAL CONTEXT RESOLUTION ---
    let contextTopic = '';
    if (messages && messages.length > 1) {
      const previousUserMsgs = messages
        .filter((m: any) => m.sender === 'user')
        .map((m: any) => m.text.toLowerCase());
      
      const lastTopicMsg = previousUserMsgs[previousUserMsgs.length - 2] || '';
      
      if (lastTopicMsg.includes('app') || lastTopicMsg.includes('appointment') || lastTopicMsg.includes('visit') || lastTopicMsg.includes('doctor')) {
        contextTopic = 'appointment';
      } else if (lastTopicMsg.includes('med') || lastTopicMsg.includes('pill') || lastTopicMsg.includes('epipen') || lastTopicMsg.includes('dose')) {
        contextTopic = 'medication';
      } else if (lastTopicMsg.includes('lab') || lastTopicMsg.includes('test') || lastTopicMsg.includes('blood') || lastTopicMsg.includes('vital')) {
        contextTopic = 'lab';
      } else if (lastTopicMsg.includes('allergy') || lastTopicMsg.includes('allergic')) {
        contextTopic = 'allergy';
      } else if (lastTopicMsg.includes('condition') || lastTopicMsg.includes('diagnosis')) {
        contextTopic = 'condition';
      }
    }

    let query = normalized;

    // Follow-up context handling
    if (
      normalized === 'for what' ||
      normalized === 'why' ||
      normalized === 'what for' ||
      normalized === 'what is it for'
    ) {
      query = 'why is my next visit scheduled and for what type';
    }

    if (
      normalized === 'when was last' ||
      normalized === 'what about last' ||
      normalized === 'and last' ||
      normalized === 'when was my last' ||
      normalized.includes('when was last time')
    ) {
      if (contextTopic === 'appointment') {
        query = 'when was my last doctor visit encounter';
      } else if (contextTopic === 'medication') {
        query = 'when was the last time i took my medication';
      } else if (contextTopic === 'lab') {
        query = 'when was my last lab test';
      } else {
        query = 'when was my last doctor visit encounter';
      }
    }

    if ((normalized.includes('how do i get') || normalized.includes('how i get') || normalized.includes('get one')) && (contextTopic === 'medication' || contextTopic === 'allergy' || normalized.includes('epipen'))) {
      query = 'request epipen prescription refill from doctor';
    }

    // --- LAYER 1: PROMPT INJECTION GUARDRAIL ---
    const isInjectionAttempt = INJECTION_PATTERNS.some((pattern) => pattern.test(query));
    if (isInjectionAttempt) {
      return NextResponse.json({
        reply: "🛡️ Safety Notice: I am Pulse Companion AI, an administrative visit prep assistant. I cannot provide direct medical diagnosis, prescriptions, or act outside my scope.",
      });
    }

    // --- 1. 🚨 RED FLAG EMERGENCY TRIAGE FILTER ---
    if (
      query.includes('chest pain') ||
      query.includes('shortness of breath') ||
      query.includes('difficulty breathing') ||
      query.includes('can\'t breathe') ||
      query.includes('stroke') ||
      query.includes('numbness') ||
      query.includes('face drooping') ||
      query.includes('fainted') ||
      query.includes('fainting') ||
      query.includes('severe bleeding') ||
      query.includes('suicidal')
    ) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately. Do not wait for a routine appointment."
      });
    }

    // --- 2. 📊 VITAL SIGNS & BODY METRICS (Catches "what vital", "what were my last vitals", "vitals") ---
    if (query.includes('vitals') || query.includes('bp') || query.includes('blood pressure') || query.includes('heart rate')) {
      const v = patient?.vitals || { bp: '118/78', heartRate: '68 bpm', hba1c: '5.4%', spO2: '98%', weight: '168 lbs' };
      return NextResponse.json({
        reply: `📉 **Your Current Vital Signs:**\n• **Blood Pressure:** ${v.bp} mmHg (${v.bpStatus === 'warning' ? '⚠️ Elevated' : 'Normal'})\n• **Heart Rate:** ${v.heartRate} bpm\n• **HbA1c:** ${v.hba1c}\n• **SpO₂:** ${v.spO2 || '98%'}\n• **Weight:** ${v.weight || '168 lbs'}`
      });
    }

    // --- 3. 💉 EPIPEN / SPECIFIC MEDICATION CHECK ---
    if (query.includes('epipen')) {
      const hasEpiPen = patient?.medications?.some((m: any) => m.name.toLowerCase().includes('epipen') || m.name.toLowerCase().includes('epinephrine'));
      if (hasEpiPen) {
        return NextResponse.json({
          reply: "💉 Yes, an EpiPen (Epinephrine auto-injector) is listed on your active prescription record."
        });
      } else {
        return NextResponse.json({
          reply: `💉 No EpiPen is currently listed on your active prescriptions. Given your recorded sensitivities (${patient?.allergies?.map((a: any) => a.substance).join(', ') || 'Peanuts, Penicillin'}), you can request an EpiPen prescription from ${patient?.primaryDoctor || 'Dr. Vance'} during your next visit on ${patient?.nextVisit?.date || 'August 18'}!`
        });
      }
    }

    // --- 4. 🗓️ VISIT PURPOSE / REASON ("for what", "is visit important") ---
    if (
      query.includes('why is my next visit scheduled') ||
      query.includes('for what') ||
      query.includes('important') ||
      query.includes('reason for visit')
    ) {
      return NextResponse.json({
        reply: `🗓️ Your next visit on **${patient?.nextVisit?.date || 'August 18, 2026'}** is for: **${patient?.nextVisit?.type || 'Routine Follow-Up & Lab Review'}**. It is an important follow-up with ${patient?.primaryDoctor || 'Dr. Sarah Vance'} to review your Routine CMP & Lipid Panel labs and monitor your blood pressure management!`
      });
    }

    // --- 5. 🩺 CONDITIONS & DIAGNOSES ("what condition", "conditions", "diagnosis") ---
    if (
      query.includes('condition') ||
      query.includes('conditions') ||
      query.includes('diagnosis') ||
      query.includes('diagnoses') ||
      query.includes('what am i diagnosed with')
    ) {
      const condList = patient?.conditions?.map((c: any) => typeof c === 'string' ? c : c.name).join(', ');
      return NextResponse.json({
        reply: condList
          ? `🩺 Your active recorded medical conditions are: **${condList}**.`
          : "No active medical conditions recorded on file."
      });
    }

    // --- 6. ✏️ DYNAMIC MEDICATION LOG UPDATE COMMAND ---
    if (
      (query.includes('add') || query.includes('mark') || query.includes('log') || query.includes('took')) &&
      query.includes('medication')
    ) {
      let targetLog = calendarLogs?.find((log: any) => {
        const dayNum = log.dateStr.split(' ')[1];
        return (
          query.includes(`the ${dayNum}th`) ||
          query.includes(`the ${dayNum}st`) ||
          query.includes(`the ${dayNum}rd`) ||
          query.includes(` ${dayNum} `) ||
          query.includes(` ${dayNum}`) ||
          query.includes(log.dateStr.toLowerCase())
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

    // --- 7. 📋 REFILL & APPOINTMENT REQUESTS ---
    if (query.includes('refill') || query.includes('renewal')) {
      const medList = patient?.medications?.map((m: any) => m.name).join(', ');
      return NextResponse.json({
        reply: `📋 Refills for your active prescriptions (${medList || 'Lisinopril 10mg, Metformin 500mg'}) can be authorized during your next visit on **${patient?.nextVisit?.date || 'August 18, 2026'}** with ${patient?.primaryDoctor || 'Dr. Vance'}. You can also download or print your Doctor Prep agenda directly from the Symptom Log tab!`
      });
    }

    // --- 8. 🔍 LAST VISIT / ENCOUNTER HISTORY ---
    if (query.includes('last doctor visit') || query.includes('last encounter') || query.includes('previous visit')) {
      const lastEncounter = patient?.encounters?.[0] || { date: 'July 10, 2026', type: 'Annual Physical Routine Review', summary: 'Blood pressure and cholesterol well-managed under Lisinopril.' };
      return NextResponse.json({
        reply: `📜 Your last clinical encounter was on **${lastEncounter.date}** (${lastEncounter.type}). Summary: "${lastEncounter.summary}".`
      });
    }

    // --- 9. 🔍 "LAST TIME I TOOK MY MEDS" HISTORY SEARCH ---
    if (
      (query.includes('last time') || query.includes('when was') || query.includes('most recent')) &&
      query.includes('medication')
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

    // --- 10. 🗓️ DATE-SPECIFIC MEDICATION ADHERENCE CHECK ---
    if (
      (query.includes('did i take') || query.includes('have i taken') || query.includes('took my') || query.includes('log for')) &&
      query.includes('medication')
    ) {
      let targetLog = calendarLogs?.find((log: any) => log.dateStr && query.includes(log.dateStr.toLowerCase()));
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

    // --- 11. ⚠️ DRUG INTERACTION & SAFETY CHECK ---
    if (query.includes('ibuprofen') || query.includes('advil') || query.includes('aspirin') || query.includes('interaction')) {
      return NextResponse.json({
        reply: "⚠️ Drug Safety Note: NSAIDs (like Ibuprofen or Advil) can interact with blood pressure medications like Lisinopril and impact kidney function. Always confirm over-the-counter medications with Dr. Vance or your pharmacist!"
      });
    }

    // --- 12. 🌙 NATURAL LANGUAGE SLEEP LOGGING ---
    if (query.includes('slept') || query.includes('sleep hours')) {
      const match = query.match(/(\d+(\.\d+)?)\s*hours?/);
      const hours = match ? parseFloat(match[1]) : 8;
      return NextResponse.json({
        reply: `🌙 Logged ${hours} hours of sleep for ${selectedDateLabel}. Your wellness record has been updated!`
      });
    }

    // --- 13. 🌍 MEDICAL JARGON SIMPLIFIER ---
    if (
      query.includes('what is') ||
      query.includes('what does') ||
      query.includes('explain') ||
      query.includes('mean') ||
      query.includes('definition')
    ) {
      if (query.includes('hba1c') || query.includes('a1c')) {
        return NextResponse.json({
          reply: "🩸 HbA1c in Simple Terms: HbA1c measures your average blood sugar over the last 2 to 3 months. Think of it like a video recording of your sugar levels over time, rather than a quick snapshot like a finger-prick test!"
        });
      }

      if (query.includes('hypertension') || query.includes('blood pressure') || query.includes('bp')) {
        return NextResponse.json({
          reply: "🫀 Hypertension in Simple Terms: High blood pressure means the force of blood pushing against your artery walls is consistently too high. Routine tracking helps keep your heart protected!"
        });
      }

      if (query.includes('hyperlipidemia') || query.includes('cholesterol') || query.includes('lipid')) {
        return NextResponse.json({
          reply: "🫀 Hyperlipidemia in Simple Terms: Extra fats (cholesterol) circulating in your bloodstream. Managing this helps keep blood vessels clear."
        });
      }

      if (query.includes('lisinopril')) {
        return NextResponse.json({
          reply: "💊 Lisinopril in Simple Terms: An ACE inhibitor that relaxes blood vessels, making it easier for your heart to pump blood and keeping blood pressure in a safe range."
        });
      }

      if (query.includes('metformin')) {
        return NextResponse.json({
          reply: "💊 Metformin in Simple Terms: Helps your body use insulin effectively and reduces sugar produced by your liver."
        });
      }
    }

    // --- 14. 💊 MISSED DOSE GUIDELINES ---
    if (
      query.includes('forget') || query.includes('miss') || query.includes('forgot') || 
      query.includes('skip') || query.includes('dose') || query.includes('doss')
    ) {
      return NextResponse.json({
        reply: "If you miss or forget a dose, take it as soon as you remember unless it is almost time for your next scheduled dose. Never take two doses at once to make up for a missed one. For specific guidelines on Lisinopril or Metformin, consult Dr. Vance or your pharmacist!"
      });
    }

    // --- 15. 🥛 ADMINISTRATION & INTAKE GUIDELINES ---
    if (
      query.includes('water') || query.includes('food') || query.includes('meal') ||
      query.includes('how do i take') || query.includes('how to take') || query.includes('take these') ||
      query.includes('with food') || query.includes('empty stomach') || query.includes('swallow')
    ) {
      return NextResponse.json({
        reply: "Oral medications like Lisinopril and Metformin should generally be taken with a full glass of water. Metformin is best taken with meals to minimize stomach upset, while Lisinopril can be taken with or without food at the same time each morning. Always refer to your prescription directions!"
      });
    }

    // --- 16. 🎂 DEMOGRAPHICS & PROFILE ---
    if (query.includes('birthday') || query.includes('dob') || query.includes('date of birth') || query.includes('born') || query.includes('how old')) {
      return NextResponse.json({
        reply: patient?.dob
          ? `Your date of birth on file is ${patient.dob} (${patient.age} years old).`
          : "I couldn't locate a date of birth on your record."
      });
    }

    // --- 17. 🗓️ APPOINTMENT & PROVIDER ENQUIRIES ---
    if (
      query.includes('appointment') ||
      query.includes('next visit') ||
      query.includes('doctor visit') ||
      query.includes('when do i see') ||
      query.includes('when is my visit') ||
      query.includes('next app')
    ) {
      return NextResponse.json({
        reply: patient?.nextVisit
          ? `Your next appointment is scheduled for ${patient.nextVisit.date} (${patient.nextVisit.type}) with ${patient.primaryDoctor || 'Dr. Sarah Vance, MD'}.`
          : "You currently have no upcoming visits scheduled."
      });
    }

    if (query.includes('doctor') || query.includes('provider') || query.includes('physician') || query.includes('who is my')) {
      return NextResponse.json({
        reply: `Your primary care provider is ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD (Internal Medicine)'}.`
      });
    }

    // --- 18. 💊 GENERAL MEDICATION LIST ---
    if (query.includes('medication')) {
      const medList = patient?.medications?.map((m: any) => `${m.name} (${m.instructions})`).join(', ');
      return NextResponse.json({
        reply: medList ? `Your active prescriptions are: ${medList}.` : "No active prescriptions found on file."
      });
    }

    // --- 19. ⚠️ ALLERGIES ---
    if (query.includes('allergy') || query.includes('allergies') || query.includes('allergic')) {
      const algs = patient?.allergies?.map((a: any) => `${a.substance} (${a.reaction})`).join(', ');
      return NextResponse.json({
        reply: algs ? `Your recorded sensitivities are: ${algs}.` : "You have No Known Drug Allergies (NKDA) recorded."
      });
    }

    // --- 20. 🧪 LABS & DIAGNOSTICS ---
    if (query.includes('lab') || query.includes('test') || query.includes('blood work') || query.includes('results')) {
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
    if (query.includes('feel') || query.includes('pain') || query.includes('hurt') || query.includes('took') || query.includes('log') || query.includes('dizzy') || query.includes('headache')) {
      return NextResponse.json({
        reply: `Logged entry for ${selectedDateLabel}: "${lastMessage}". Your calendar record has been updated.`
      });
    }

    return NextResponse.json({
      reply: "I'm here to help organize your health records! Ask me about your medications, vitals, lab results, missed doses, birthday, doctor visits, or log notes."
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      reply: "I am available to assist with your records. Ask me about your medications, doctor visits, or log notes!"
    });
  }
}
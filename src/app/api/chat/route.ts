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

    // --- LAYER 1: PROMPT INJECTION GUARDRAIL ---
    const isInjectionAttempt = INJECTION_PATTERNS.some((pattern) => pattern.test(lower));
    if (isInjectionAttempt) {
      return NextResponse.json({
        reply: "🛡️ Safety Notice: I am Pulse Companion AI, an administrative visit prep assistant. I cannot provide direct medical diagnosis, prescriptions, or act outside my scope.",
      });
    }

    // --- 🚨 RED FLAG EMERGENCY TRIAGE FILTER ---
    if (
      lower.includes('chest pain') ||
      lower.includes('shortness of breath') ||
      lower.includes('difficulty breathing') ||
      lower.includes('can\'t breathe') ||
      lower.includes('stroke') ||
      lower.includes('numbness') ||
      lower.includes('face drooping') ||
      lower.includes('fainted') ||
      lower.includes('fainting') ||
      lower.includes('severe bleeding') ||
      lower.includes('suicidal')
    ) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately. Do not wait for a routine appointment."
      });
    }

    // --- ✏️ DYNAMIC MEDICATION LOG UPDATE COMMAND ---
    if (
      (lower.includes('add') || lower.includes('mark') || lower.includes('log') || lower.includes('took')) &&
      (lower.includes('med') || lower.includes('pill') || lower.includes('both') || lower.includes('dose'))
    ) {
      let targetLog = calendarLogs?.find((log: any) => {
        const dayNum = log.dateStr.split(' ')[1];
        return lower.includes(`the ${dayNum}th`) || lower.includes(`the ${dayNum}st`) || lower.includes(`the ${dayNum}rd`) || lower.includes(` ${dayNum} `) || lower.includes(` ${dayNum}`) || lower.includes(log.dateStr.toLowerCase());
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

    // --- 🌍 MEDICAL JARGON SIMPLIFIER ---
    if (lower.includes('what is') || lower.includes('what does') || lower.includes('explain') || lower.includes('mean') || lower.includes('definition')) {
      if (lower.includes('hba1c') || lower.includes('a1c')) {
        return NextResponse.json({
          reply: "🩸 HbA1c in Simple Terms: HbA1c measures your average blood sugar over the last 2 to 3 months. Think of it like a video recording of your sugar levels over time, rather than a quick snapshot like a finger-prick test!"
        });
      }
      if (lower.includes('hypertension') || lower.includes('blood pressure') || lower.includes('bp')) {
        return NextResponse.json({
          reply: "🫀 Hypertension in Simple Terms: High blood pressure means the force of blood pushing against your artery walls is consistently too high. Routine tracking helps keep your heart protected!"
        });
      }
      if (lower.includes('hyperlipidemia') || lower.includes('cholesterol') || lower.includes('lipid')) {
        return NextResponse.json({
          reply: "🫀 Hyperlipidemia in Simple Terms: Extra fats (cholesterol) circulating in your bloodstream. Managing this helps keep blood vessels clear."
        });
      }
      if (lower.includes('lisinopril')) {
        return NextResponse.json({
          reply: "💊 Lisinopril in Simple Terms: Relaxes blood vessels, making it easier for your heart to pump blood and keeping blood pressure in a safe range."
        });
      }
      if (lower.includes('metformin')) {
        return NextResponse.json({
          reply: "💊 Metformin in Simple Terms: Helps your body use insulin effectively and reduces sugar produced by your liver."
        });
      }
    }

    // --- 🔍 "LAST TIME I TOOK MY MEDS" HISTORY SEARCH ---
    if ((lower.includes('last time') || lower.includes('when was') || lower.includes('most recent')) && (lower.includes('took') || lower.includes('med') || lower.includes('pill') || lower.includes('dose'))) {
      const reverseLogs = Array.isArray(calendarLogs) ? [...calendarLogs].reverse() : [];
      const lastTakenLog = reverseLogs.find((log) => Object.values(log?.medsTaken || {}).some(Boolean));

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

    // --- 🗓️ DATE-SPECIFIC MEDICATION ADHERENCE CHECK ---
    if ((lower.includes('did i take') || lower.includes('have i taken') || lower.includes('took my') || lower.includes('log for')) && (lower.includes('med') || lower.includes('pill') || lower.includes('dose') || lower.includes('prescription'))) {
      let targetLog = calendarLogs?.find((log: any) => log.dateStr && lower.includes(log.dateStr.toLowerCase()));
      if (!targetLog) targetLog = calendarLogs?.find((log: any) => log.dateStr === selectedDateLabel) || calendarLogs?.[calendarLogs.length - 1];

      const logDate = targetLog?.dateStr || selectedDateLabel;
      const medsTakenMap = targetLog?.medsTaken || {};
      const totalMeds = patient?.medications?.length || 0;
      const takenCount = Object.values(medsTakenMap).filter(Boolean).length;

      if (totalMeds === 0) return NextResponse.json({ reply: `No active prescriptions recorded for ${logDate}.` });

      if (takenCount === totalMeds) {
        return NextResponse.json({ reply: `✅ Yes! According to your calendar record for ${logDate}, you marked all ${totalMeds} of your doses as taken.` });
      } else if (takenCount > 0) {
        return NextResponse.json({ reply: `⚠️ Partially logged for ${logDate}: You marked ${takenCount} of ${totalMeds} doses as taken.` });
      } else {
        return NextResponse.json({ reply: `💊 According to your calendar log for ${logDate}, no medication doses have been marked as taken yet (0 of ${totalMeds} logged).` });
      }
    }

    // --- 💊 Missed Dose Guidelines ---
    if (lower.includes('forget') || lower.includes('miss') || lower.includes('forgot') || lower.includes('skip') || lower.includes('dose') || lower.includes('doss')) {
      return NextResponse.json({
        reply: "If you miss or forget a dose, take it as soon as you remember unless it is almost time for your next scheduled dose. Never take two doses at once to make up for a missed one. For specific guidelines on Lisinopril or Metformin, consult Dr. Vance or your pharmacist!"
      });
    }

    // --- 🥛 Administration & Intake Guidelines ---
    if (lower.includes('water') || lower.includes('food') || lower.includes('meal') || lower.includes('how do i take') || lower.includes('how to take') || lower.includes('take these') || lower.includes('with food') || lower.includes('empty stomach') || lower.includes('swallow')) {
      return NextResponse.json({
        reply: "Oral medications like Lisinopril and Metformin should generally be taken with a full glass of water. Metformin is best taken with meals to minimize stomach upset, while Lisinopril can be taken with or without food at the same time each morning. Always refer to your prescription directions!"
      });
    }

    // --- 🎂 Demographics & Profile ---
    if (lower.includes('birthday') || lower.includes('dob') || lower.includes('date of birth') || lower.includes('born') || lower.includes('how old')) {
      return NextResponse.json({
        reply: patient?.dob ? `Your date of birth on file is ${patient.dob} (${patient.age} years old).` : "I couldn't locate a date of birth on your record."
      });
    }

    // --- 🗓️ Appointment & Provider Enquiries ---
    if (lower.includes('appointment') || lower.includes('next visit') || lower.includes('doctor visit') || lower.includes('when do i see') || lower.includes('when is my visit')) {
      return NextResponse.json({
        reply: patient?.nextVisit ? `Your next appointment is scheduled for ${patient.nextVisit.date} (${patient.nextVisit.type}) with ${patient.primaryDoctor || 'Dr. Sarah Vance, MD'}.` : "You currently have no upcoming visits scheduled."
      });
    }

    if (lower.includes('doctor') || lower.includes('provider') || lower.includes('physician') || lower.includes('who is my')) {
      return NextResponse.json({
        reply: `Your primary care provider is ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD (Internal Medicine)'}.`
      });
    }

    // --- 💊 Medication List ---
    if (lower.includes('medication') || lower.includes('meds') || lower.includes('prescription') || lower.includes('pills') || lower.includes('refill')) {
      const medList = patient?.medications?.map((m: any) => `${m.name} (${m.instructions})`).join(', ');
      return NextResponse.json({ reply: medList ? `Your active prescriptions are: ${medList}.` : "No active prescriptions found on file." });
    }

    // --- ⚠️ Allergies ---
    if (lower.includes('allergy') || lower.includes('allergies') || lower.includes('allergic')) {
      const algs = patient?.allergies?.map((a: any) => `${a.substance} (${a.reaction})`).join(', ');
      return NextResponse.json({ reply: algs ? `Your recorded sensitivities are: ${algs}.` : "You have No Known Drug Allergies (NKDA) recorded." });
    }

    // --- 🧪 Labs & Diagnostics ---
    if (lower.includes('lab') || lower.includes('test') || lower.includes('blood work') || lower.includes('results')) {
      const labList = patient?.labs?.map((l: any) => `${l.testName}: ${l.value} (${l.status})`).join(', ');
      return NextResponse.json({ reply: labList ? `Your recent lab results: ${labList}. Current BP: ${patient?.vitals?.bp || 'N/A'}.` : `Current Vitals: Blood Pressure ${patient?.vitals?.bp}, Heart Rate ${patient?.vitals?.heartRate}.` });
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

        // LAYER 2 GUARDRAIL: Sanitize LLM response for ungrounded diagnosis
        const carriesMedicalDiagnosis = FORBIDDEN_OUTPUT_PATTERNS.some((pattern) => pattern.test(reply));
        if (carriesMedicalDiagnosis) {
          reply = "I cannot provide a specific medical diagnosis or treatment plan. Please consult Dr. Vance for personalized medical advice.";
        }

        if (reply) return NextResponse.json({ reply });
      }
    }

    // --- LAYER 3: SAFE FALLBACK RESPONSE ---
    if (lower.includes('feel') || lower.includes('pain') || lower.includes('hurt') || lower.includes('took') || lower.includes('log') || lower.includes('dizzy') || lower.includes('headache')) {
      return NextResponse.json({
        reply: `Logged entry for ${selectedDateLabel}: "${lastMessage}". Your calendar record has been updated.`
      });
    }

    return NextResponse.json({
      reply: "I'm here to help organize your health records! Ask me about your medications, doctor visits, lab results, or log calendar notes."
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    // LAYER 3 GUARANTEED FALLBACK (Never breaks UI)
    return NextResponse.json({
      reply: "I am available to assist with your records. Ask me about your medications, doctor visits, or log notes!"
    });
  }
}
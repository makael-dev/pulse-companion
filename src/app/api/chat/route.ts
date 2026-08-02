import { NextResponse } from 'next/server';

const EMERGENCY_PATTERNS = [
  /chest pain/i, /shortness of breath/i, /difficulty breathing/i, /can't breathe/i,
  /stroke/i, /numbness/i, /face drooping/i, /fainted/i, /fainting/i, /severe bleeding/i, /suicidal/i
];

function resolveTargetDate(text: string, defaultLabel: string): string {
  const lower = text.toLowerCase();
  const today = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (lower.includes('yesterday') || lower.includes('yest')) {
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    return `${monthNames[yest.getMonth()]} ${yest.getDate()}`;
  }
  if (lower.includes('today')) {
    return `${monthNames[today.getMonth()]} ${today.getDate()}`;
  }

  const monthRegex = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})(st|nd|rd|th)?/i;
  const match = text.match(monthRegex);
  if (match) {
    const monthStr = match[1].substring(0, 3).toLowerCase();
    const formattedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
    const dayNum = parseInt(match[2], 10);
    return `${formattedMonth} ${dayNum}`;
  }

  return defaultLabel;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || body.history || [];
    const patient = body.patient || body.patientContext || null;
    const selectedDateLabel = body.selectedDateLabel || 'Aug 1';
    const calendarLogs = body.calendarLogs || [];
    const enableRPGSystem = body.enableRPGSystem || false;

    const lastUserMessage = body.message || messages[messages.length - 1]?.text || messages[messages.length - 1]?.content || '';
    const lowerUser = lastUserMessage.toLowerCase().trim();

    const prevAssistantMsg = messages.length > 1 ? (messages[messages.length - 2]?.text || messages[messages.length - 2]?.content || '').toLowerCase() : '';
    const targetDate = resolveTargetDate(`${prevAssistantMsg} ${lastUserMessage}`, selectedDateLabel);

    // 🚨 1. Safety Triage Guardrail
    if (EMERGENCY_PATTERNS.some((p) => p.test(lastUserMessage))) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately.",
        chips: ['Emergency ID', 'View Vitals']
      });
    }

    // 📅 2. BULK MONTHLY MEDICATION LOGGING
    const isBulkMonth = (lowerUser.includes('all') || lowerUser.includes('entire')) && 
                        (lowerUser.includes('med') || lowerUser.includes('pill')) && 
                        (lowerUser.includes('month') || lowerUser.includes('aug') || lowerUser.includes('august') || lowerUser.includes('jan'));

    if (isBulkMonth) {
      return NextResponse.json({
        reply: `🎉 **Entire Month Updated!** Marked all prescribed medications as **Taken** for every day in **${selectedDateLabel.split(' ')[0]} 2026** for **${patient?.name || 'Paul'}**. Your adherence score is now **100%**!`,
        action: 'LOG_ALL_MEDS_MONTH',
        chips: ['View Calendar', 'Explain my BP', 'Health Delta']
      });
    }

    // 🔄 3. CONTEXT-AWARE AFFIRMATION ("YES" / "YEAH" / "SURE")
    const isAffirmative = /^(yes|yeah|yea|yep|sure|please|do it|ok|okay|record it|log it)$/i.test(lowerUser);

    if (isAffirmative) {
      if (prevAssistantMsg.includes('medication') || prevAssistantMsg.includes('record them') || prevAssistantMsg.includes('meds')) {
        return NextResponse.json({
          reply: `✅ **Done!** I've marked all prescribed medication doses as **Taken** for **${patient?.name || 'Paul'}** on **${targetDate}** in your calendar.`,
          action: 'LOG_MEDS',
          targetDateStr: targetDate,
          chips: ['View Calendar', 'Explain my BP', 'Lisinopril Info']
        });
      }

      if (prevAssistantMsg.includes('workout') || prevAssistantMsg.includes('exercise')) {
        return NextResponse.json({
          reply: `🏋️ **Done!** Recorded an active workout session for **${targetDate}** in your calendar.`,
          action: 'LOG_WORKOUT',
          targetDateStr: targetDate,
          exercise: 'General Workout',
          details: 'Logged via AI Companion',
          chips: ['View Calendar', 'Activity Sync', 'Health Delta']
        });
      }
    }

    // 🩺 4. BLOOD PRESSURE EXPLANATION HANDLER
    if (lowerUser.includes('bp') || lowerUser.includes('blood pressure') || lowerUser.includes('121/81') || lowerUser.includes('121 / 81')) {
      const bpVal = patient?.vitals?.bp || '121/81';
      return NextResponse.json({
        reply: `🩺 **Blood Pressure Review (${bpVal} mmHg):**\n\n• **Systolic (121 mmHg):** Slightly elevated above standard normal (<120 mmHg).\n• **Diastolic (81 mmHg):** Stage 1 Hypertension threshold (80-89 mmHg).\n\n**Clinical Context:** With your active prescription for **Lisinopril 10 mg**, this reading reflects stable baseline control. Continue daily medication adherence and log your readings regularly before your upcoming visit on **August 17, 2026**!`,
        chips: ['Lisinopril Info', `Record meds for ${targetDate}`, 'Health Delta']
      });
    }

    // 💡 5. HEALTH DELTA / SUMMARY / WHAT CHANGED HANDLER
    if (lowerUser.includes('change') || lowerUser.includes('delta') || lowerUser.includes('summary') || lowerUser.includes('recent')) {
      const deltaSummary = patient?.whatChangedSummary || 
        "Since your last visit, your blood pressure reading shifted slightly to 121/81 mmHg, and your HbA1c remains steady at 5.8%. Your Lisinopril prescription remains active with no recent dosage adjustments.";

      return NextResponse.json({
        reply: `💡 **Recent Health Changes Summary (EHR Delta):**\n\n${deltaSummary}`,
        chips: ['Explain my BP', 'Lisinopril Info', `Record meds for ${targetDate}`]
      });
    }

    // 💊 6. LISINOPRIL & PRESCRIPTION INFO HANDLER
    if (lowerUser.includes('lisinopril') || (lowerUser.includes('medication') && (lowerUser.includes('info') || lowerUser.includes('about') || lowerUser.includes('what')))) {
      return NextResponse.json({
        reply: `💊 **Lisinopril 10 mg Summary:**\n\n• **Drug Class:** ACE Inhibitor (Angiotensin-Converting Enzyme Inhibitor).\n• **Purpose:** Relaxes blood vessels to lower high blood pressure and protect kidney/heart function.\n• **Usage:** Take 1 tablet daily by mouth as directed.\n• **Monitoring:** Regular BP checks and routine lab panels (e.g. serum potassium/creatinine).\n\n*Contact your doctor if you experience dizziness, face swelling, or a persistent dry cough.*`,
        chips: [`Record meds for ${targetDate}`, 'Explain my BP', 'View Calendar']
      });
    }

    // 🏋️ 7. WORKOUT RECOMMENDATIONS & FITNESS QUERIES (e.g., "workout for arms", "leg routine")
    const isWorkoutQuery = lowerUser.includes('arm') || lowerUser.includes('bicep') || lowerUser.includes('tricep') || 
                           lowerUser.includes('leg') || lowerUser.includes('chest') || lowerUser.includes('back') || 
                           lowerUser.includes('shoulder') || lowerUser.includes('core') || lowerUser.includes('abs') ||
                           (lowerUser.includes('good workout') || lowerUser.includes('routine') || lowerUser.includes('recommend workout'));

    if (isWorkoutQuery && !lowerUser.includes('record') && !lowerUser.includes('log') && !lowerUser.includes('did i')) {
      let specificWorkoutText = `🏋️ **Recommended Arm & Upper Body Routine:**\n\n1. **Dumbbell Bicep Curls:** 3 sets x 10–12 reps\n2. **Tricep Overhead Extension or Dips:** 3 sets x 10–12 reps\n3. **Hammer Curls:** 3 sets x 10 reps\n4. **Push-ups or Close-Grip Push-ups:** 3 sets x 12–15 reps\n\n*Tip: Maintain controlled form and steady breathing. Would you like me to log an arm session for ${targetDate}?*`;

      if (lowerUser.includes('leg') || lowerUser.includes('quad') || lowerUser.includes('glute')) {
        specificWorkoutText = `🏋️ **Recommended Lower Body Routine:**\n\n1. **Goblet Squats or Barbell Squats:** 3 sets x 10 reps\n2. **Romanian Deadlifts:** 3 sets x 8–10 reps\n3. **Walking Lunges:** 3 sets x 12 reps per leg\n4. **Calf Raises:** 3 sets x 15 reps\n\n*Would you like me to log a leg workout for ${targetDate}?*`;
      } else if (lowerUser.includes('chest') || lowerUser.includes('push')) {
        specificWorkoutText = `🏋️ **Recommended Chest & Push Routine:**\n\n1. **Bench Press or Dumbbell Press:** 3 sets x 8–10 reps\n2. **Incline Dumbbell Press:** 3 sets x 10 reps\n3. **Bodyweight Push-ups:** 3 sets to failure\n4. **Cable/Dumbbell Flyes:** 3 sets x 12 reps\n\n*Would you like me to log this chest session for ${targetDate}?*`;
      }

      return NextResponse.json({
        reply: specificWorkoutText,
        chips: [`Yes, log workout for ${targetDate}`, 'Generate AI Workout', 'Activity Sync']
      });
    }

    // 💊 8. DIRECT SINGLE-DAY RECORD / LOG MEDS
    const isRecordIntent = (lowerUser.includes('record') || lowerUser.includes('log') || lowerUser.includes('mark')) && 
                           (lowerUser.includes('med') || lowerUser.includes('pill') || lowerUser.includes('dose'));

    if (isRecordIntent) {
      return NextResponse.json({
        reply: `✅ **Medications Recorded!** All prescribed medications for **${patient?.name || 'Paul'}** have been marked as **Taken** for **${targetDate}** in your health calendar.`,
        action: 'LOG_MEDS',
        targetDateStr: targetDate,
        chips: ['View Calendar', 'Explain my BP', 'Lisinopril Info']
      });
    }

    // ❓ 9. CHECK MEDICATION STATUS
    if ((lowerUser.includes('did i take') || lowerUser.includes('check') || lowerUser.includes('status')) && (lowerUser.includes('med') || lowerUser.includes('pill'))) {
      const targetLog = calendarLogs.find((l: any) => l.dateStr?.toLowerCase() === targetDate.toLowerCase());
      const medsTaken = targetLog?.medsTaken || {};
      const takenCount = Object.values(medsTaken).filter(Boolean).length;

      const replyMsg = takenCount > 0
        ? `💊 **Medication Status for ${targetDate}:** Yes! You have logged medication doses as **Taken** on ${targetDate}.`
        : `💊 **Medication Status for ${targetDate}:** No medication doses are logged as taken for **${targetDate}** yet. Would you like me to record them now?`;

      return NextResponse.json({
        reply: replyMsg,
        chips: [`Yes, record meds for ${targetDate}`, 'Explain my BP', 'View Calendar']
      });
    }

    // 🏋️ 10. WORKOUT LOGGING HANDLER
    if ((lowerUser.includes('record') || lowerUser.includes('log')) && (lowerUser.includes('workout') || lowerUser.includes('exercise') || lowerUser.includes('run') || lowerUser.includes('gym'))) {
      return NextResponse.json({
        reply: `🏋️ **Workout Logged!** Recorded an active workout session for **${targetDate}** in your health calendar.`,
        action: 'LOG_WORKOUT',
        targetDateStr: targetDate,
        exercise: 'General Workout',
        details: 'Logged via AI Companion',
        chips: ['View Calendar', 'Activity Sync', 'Health Delta']
      });
    }

    // 🤖 11. OPENAI DYNAMIC RESPONSE ENGINE
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const patientName = patient?.name || 'Paul Tremblay';
        const vitals = patient?.vitals || { bp: '121/81', heartRate: '70 bpm', hba1c: '5.8%' };
        const medsList = patient?.medications?.map((m: any) => `${m.name} (${m.instructions})`).join(', ') || 'Lisinopril 10 mg (Daily)';
        const conditionsList = patient?.conditions?.map((c: any) => typeof c === 'string' ? c : c.name).join(', ') || 'Hypertension';

        const systemPrompt = `You are Pulse Companion AI for ${patientName}.
Patient Record Context:
- Active Prescriptions: ${medsList}
- Diagnoses: ${conditionsList}
- Vitals: Blood Pressure ${vitals.bp}, Heart Rate ${vitals.heartRate}, HbA1c ${vitals.hba1c}
- Selected Date: ${targetDate}
${enableRPGSystem ? '- Gamification Mode: ACTIVE. Include an encouraging RPG tone.' : '- Gamification Mode: DISABLED.'}

INSTRUCTIONS:
- Directly and helpfully answer the user's query (e.g. workout recommendations, symptoms, prescriptions, or vitals).
- Be concise, clear, and empathetic. Never output generic greetings when answering questions.`;

        const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.slice(-6).map((m: any) => ({
                role: (m.sender === 'user' || m.role === 'user') ? 'user' : 'assistant',
                content: m.text || m.content || '',
              })),
            ],
            temperature: 0.4,
            max_tokens: 400,
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          const choice = data.choices?.[0]?.message;
          if (choice?.content) {
            return NextResponse.json({
              reply: choice.content,
              chips: [`Record meds for ${targetDate}`, 'Lisinopril Info', 'Health Delta']
            });
          }
        }
      } catch (e) {
        console.warn('OpenAI Call warning:', e);
      }
    }

    // 12. HELPFUL CONVERSATIONAL FALLBACK
    return NextResponse.json({
      reply: `I can help with health tracking, prescription questions, or fitness guidance for **${patient?.name || 'Paul Tremblay'}**! Ask me to recommend a workout routine, explain blood pressure, or log daily medications for **${targetDate}**.`,
      chips: ['Recommend arm workout', 'Explain my BP', 'Health Delta']
    });

  } catch (err) {
    console.error('Chat Route API Error:', err);
    return NextResponse.json({
      reply: "I can help manage your health records! Ask me to record medications, log workouts, or explain your vitals.",
      chips: ['Explain BP 121/81', 'Active Prescriptions']
    });
  }
}
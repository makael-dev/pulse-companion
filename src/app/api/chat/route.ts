import { NextResponse } from 'next/server';

// Red Flag Emergency Keywords
const EMERGENCY_PATTERNS = [
  /chest pain/i, /shortness of breath/i, /difficulty breathing/i, /can't breathe/i,
  /stroke/i, /numbness/i, /face drooping/i, /fainted/i, /fainting/i, /severe bleeding/i, /suicidal/i
];

// Relative Date & Specific Date Extractor
function resolveTargetDate(text: string, defaultLabel: string): string {
  const lower = text.toLowerCase();
  
  if (lower.includes('yesterday') || lower.includes('yest')) {
    return 'Jul 28';
  }
  if (lower.includes('today')) {
    return 'Jul 29';
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

// Symptom / Activity Statement Detector
function isActivityOrNoteStatement(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = [
    'hurt', 'hurts', 'hurting', 'pain', 'sore', 'ache', 'aches', 'aching',
    'dizzy', 'dizziness', 'headache', 'tightness', 'cramps', 'cramping',
    'swollen', 'swelling', 'nausea', 'fatigue', 'tired', 'cough', 'fever', 'sick', 'unwell', 'ill'
  ];
  return keywords.some((word) => lower.includes(word));
}

// Tool Definitions for OpenAI Function Calling
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'view_calendar',
      description: 'Provide an overview or summary of the patient 28-day rolling calendar and log entries.',
      parameters: { type: 'OBJECT', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_medication_adherence',
      description: 'Check if the patient logged taking their medications on a specific date.',
      parameters: {
        type: 'OBJECT',
        properties: {
          targetDateStr: { type: 'STRING', description: 'The date string to check (e.g., Jul 19, Jul 28).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_vitals',
      description: 'Fetch patient vital signs or explain what they mean.',
      parameters: {
        type: 'OBJECT',
        properties: {
          explain: { type: 'BOOLEAN', description: 'True if user wants an explanation.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_medications',
      description: 'Get list of active prescriptions or check for specific meds.',
      parameters: {
        type: 'OBJECT',
        properties: {
          specificMed: { type: 'STRING' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_medications_taken',
      description: 'Mark medications as taken for a target date.',
      parameters: {
        type: 'OBJECT',
        properties: {
          targetDateStr: { type: 'STRING', description: 'Target date string (e.g., Jul 19).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_workout',
      description: 'Log a workout, exercise, run, or rep count to the patient workout log.',
      parameters: {
        type: 'OBJECT',
        properties: {
          exercise: { type: 'STRING', description: 'Short exercise title, e.g. 1 Mile Run or Bench Press' },
          details: { type: 'STRING', description: 'Exercise details like 3 miles in 24 mins or 3 sets x 8 reps' },
          targetDateStr: { type: 'STRING', description: 'Target date string.' }
        },
        required: ['exercise', 'details']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_context_note',
      description: 'Log a symptom, note, or general health observation to the patient calendar.',
      parameters: {
        type: 'OBJECT',
        properties: {
          noteText: { type: 'STRING', description: 'The symptom or note content.' },
          targetDateStr: { type: 'STRING', description: 'Target date string.' }
        },
        required: ['noteText']
      }
    }
  }
];

export async function POST(req: Request) {
  try {
    const { messages, patient, selectedDateLabel, calendarLogs } = await req.json();
    const lastMessage = messages[messages.length - 1]?.text || '';
    const prevAssistantMsg = messages.slice(-2, -1)[0]?.text?.toLowerCase() || '';
    
    // Normalize typos
    let cleanMessage = lastMessage
      .replace(/\b(med|meds|pill|pills|prescription|rx)\b/gi, 'medication')
      .replace(/\b(paid|pained|paing|pane)\b/gi, 'pain')
      .replace(/\b(wat|wht)\b/gi, 'what');

    const targetDate = resolveTargetDate(cleanMessage, selectedDateLabel);
    const lower = cleanMessage.toLowerCase();

    // Check if user is asking a follow-up ("what does that mean?") right after a stat message
    const isStatFollowUp = (lower.includes('what does that mean') || lower.includes('explain that') || lower.includes('what do you mean') || lower.includes('why')) && 
      (prevAssistantMsg.includes('stat') || prevAssistantMsg.includes('endurance') || prevAssistantMsg.includes('level'));

    // --- 🚨 EMERGENCY TRIAGE GUARDRAIL ---
    if (EMERGENCY_PATTERNS.some((p) => p.test(cleanMessage))) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately.",
        chips: ['Emergency ID', 'View Vitals']
      });
    }

    // --- 🎮 FITNESS STATS & JOB SYSTEM QUERY HANDLER ---
    if (
      isStatFollowUp ||
      lower.includes('stat') ||
      lower.includes('level') ||
      lower.includes('str') ||
      lower.includes('strength') ||
      lower.includes('endurance') ||
      lower.includes('end') ||
      lower.includes('vitality') ||
      lower.includes('vit') ||
      lower.includes('recovery') ||
      lower.includes('rec') ||
      lower.includes('job') ||
      lower.includes('class') ||
      lower.includes('buff')
    ) {
      // Direct explanation for "what does that mean" follow-up
      if (isStatFollowUp || lower.includes('what does that mean') || lower.includes('explain stats')) {
        return NextResponse.json({
          reply: `💡 **Here is what your stats mean in simple terms:**\n\nYour stats convert real health & fitness tracking into a **Character Score Sheet**:\n\n• ⚡ **END (Endurance - 93):** Based on hitting your daily 8,000 steps and a 7:45 1-mile run time. High score = strong cardiovascular stamina!\n• 🔥 **REC (Recovery - 88):** Based on averaging 7.0+ hours of sleep per night. High score = good cellular repair & low fatigue.\n• ❤️ **VIT (Vitality - 82):** Based on a healthy 68 bpm resting heart rate & optimal blood pressure. High score = strong heart health.\n• 🏋️‍♂️ **STR (Strength - 71):** Based on your 285 lb Deadlift record. High score = solid physical lifting power.`,
          chips: ['How to increase stats', 'Benefits of Stats', 'Job System Info']
        });
      }

      // Individual Stat Meaning Queries
      if (lower.includes('end is') || lower.includes('endurance is') || lower.includes('my end')) {
        return NextResponse.json({
          reply: `⚡ **What High Endurance (END 93) Means:**\n\nHaving an **END score of 93** means your cardiovascular stamina and daily activity levels are top-tier!\n\n• **Daily Steps:** You are consistently hitting **7,420 / 8,000 steps** (92%+ of your daily goal).\n• **Cardio Pace:** Your 1-Mile Run time (**7:45**) places you in the **Endurance Peak** range for males in your age bracket (42y).\n• **Real-World Benefit:** Superior VO2 max, higher daily energy, and reduced risk of physical fatigue.`,
          chips: ['What is my best stat?', 'How to increase stats', 'Benefits of Stats']
        });
      }

      if (lower.includes('str is') || lower.includes('strength is') || lower.includes('my str')) {
        return NextResponse.json({
          reply: `🏋️‍♂️ **What Your Strength (STR 71) Means:**\n\nYour **STR score of 71** reflects solid muscle power and compound lifting performance!\n\n• **Lift Baseline:** Based on your **285 lb Deadlift** and **225 lb Bench Press** records.\n• **Real-World Benefit:** Protects joint stability, preserves bone density, and enhances physical power.`,
          chips: ['How to increase stats', 'Benefits of Stats', 'What are my stats?']
        });
      }

      if (lower.includes('vit is') || lower.includes('vitality is') || lower.includes('my vit')) {
        return NextResponse.json({
          reply: `❤️ **What Your Vitality (VIT 82) Means:**\n\nYour **VIT score of 82** measures overall circulatory health and heart efficiency!\n\n• **Resting Heart Rate:** Strong **68 bpm** resting pulse.\n• **Blood Pressure:** Stable BP metrics keeping arterial strain low.\n• **Real-World Benefit:** Lower cardiovascular risk and improved longevity.`,
          chips: ['Check Vitals', 'How to increase stats', 'Benefits of Stats']
        });
      }

      if (lower.includes('rec is') || lower.includes('recovery is') || lower.includes('my rec')) {
        return NextResponse.json({
          reply: `🔥 **What Your Recovery (REC 88) Means:**\n\nYour **REC score of 88** measures how effectively your body recharges through sleep and stress management!\n\n• **Sleep Average:** Averaging **7.0 - 7.5 hours** of quality sleep on your calendar log.\n• **Stress Index:** Keeping stress scores controlled (average 4/10).\n• **Real-World Benefit:** Fast muscle repair, balanced hormones, and strong immune defense.`,
          chips: ['How to increase stats', 'Benefits of Stats', 'View Calendar']
        });
      }

      // "What is my best stat?" query
      if (lower.includes('best') || lower.includes('highest') || lower.includes('top stat')) {
        return NextResponse.json({
          reply: `⚡ **Your Highest Stat is Endurance (END 93)!**\n\n• **END (93):** Excellent step count tracking (7,420 / 8k steps) & cardiovascular conditioning!\n• **REC (88):** Strong sleep average (7.0h avg).\n• **VIT (82):** Healthy resting heart rate (68 bpm).\n• **STR (71):** Deadlift PR at 285 lbs.\n\n*Overall Level: LVL 84 Warrior*`,
          chips: ['What does that mean?', 'How to increase stats', 'Benefits of Stats']
        });
      }

      // "What are my stats?" or general overview query
      if (lower.includes('what are my') || lower.includes('my stats') || lower.includes('show stats') || lower.includes('summary')) {
        return NextResponse.json({
          reply: `🎮 **Current Character Stats Overview (LVL 84):**\n\n• ⚡ **END (Endurance): 93** — Steps: 7,420 / 8k Goal\n• 🔥 **REC (Recovery): 88** — Avg Sleep: 7.0 hrs\n• ❤️ **VIT (Vitality): 82** — Resting HR: 68 bpm\n• 🏋️‍♂️ **STR (Strength): 71** — Deadlift: 285 lbs\n\n*Active Perk: "Inner Release" (+15% Strength XP gain on heavy lifts)*`,
          chips: ['What does that mean?', 'What is my best stat?', 'How to increase stats']
        });
      }

      // How to increase stats query
      if (lower.includes('increase') || lower.includes('level up') || lower.includes('raise') || lower.includes('boost')) {
        return NextResponse.json({
          reply: `🎮 **How to Increase Your Stats:**\n\n• 🏋️‍♂️ **STR (Strength):** Log heavy compound lifts (Deadlifts, Squats, Bench Press). Each PR boosts your Strength Level!\n• ⚡ **END (Endurance):** Complete daily step targets (8,000+ steps) or cardio runs (1 Mile, 5K).\n• ❤️ **VIT (Vitality):** Maintain healthy Blood Pressure & low resting heart rate (sub-70 bpm).\n• 🌿 **REC (Recovery):** Log 7.5+ hours of sleep & keep daily stress scores low.\n\n*Tip: Switch your Fitness Job in the Activity tab to get active XP buffs for your focus stat!*`,
          chips: ['Benefits of Stats', 'What are Jobs?', 'My Vitals']
        });
      }

      // Benefits query
      if (lower.includes('benefit') || lower.includes('real world') || lower.includes('why care')) {
        return NextResponse.json({
          reply: `💡 **Real-World Health Benefits of Your Stats:**\n\n• **Strength (STR):** Builds bone density, preserves muscle mass as you age, and protects lower back health.\n• **Endurance (END):** Boosts VO2 max, increases daily energy levels, and lowers risk of cardiovascular fatigue.\n• **Vitality (VIT):** Reflects a strong heart and clean arterial flow, reducing risk of stroke and hypertension.\n• **Recovery (REC):** Essential for immune function, mental clarity, hormone balance, and cell repair.`,
          chips: ['How to increase stats', 'Job System Info', 'Check Vitals']
        });
      }

      // Job details query
      if (lower.includes('job') || lower.includes('class') || lower.includes('warrior') || lower.includes('bard')) {
        return NextResponse.json({
          reply: `🛡️ **Fitness Job Roles Overview:**\n\n• 🪓 **Warrior (WAR):** Tank role focusing on **STR** (*Inner Release perk gives +15% XP on Heavy Lifts*).\n• 🛡️ **Paladin (PLD):** Tank role focusing on **VIT** (*Hallowed Ground perk gives +10% XP for stable BP*).\n• 🏹 **Bard (BRD):** Physical Ranged focusing on **END** (*Peloton Pace perk gives +15% XP on Step Goals*).\n• 🪄 **White Mage (WHM):** Healer role focusing on **REC** (*Curaja perk gives +15% XP on 7.5h+ Sleep*).\n• 🥊 **Monk (MNK):** Melee DPS for high-tempo rep workouts.\n• 🔮 **Black Mage (BLM):** Caster focusing on low-stress mental focus.`,
          chips: ['How to level up', 'Benefits of Stats', 'Activity Tab']
        });
      }
    }

    // --- 🏋️ WORKOUT & EXERCISE TRACKING HANDLER ---
    if (
      lower.includes('track') ||
      lower.includes('log') ||
      lower.includes('ran') ||
      lower.includes('run') ||
      lower.includes('deadlift') ||
      lower.includes('bench') ||
      lower.includes('workout') ||
      lower.includes('reps') ||
      lower.includes('mile')
    ) {
      const cleanedText = cleanMessage
        .replace(/^(mark|track|log|add)( that| a| my)?/i, '')
        .replace(/ on (january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s*\d{1,2}/i, '')
        .trim();

      let exerciseTitle = 'Cardio / Running';
      if (lower.includes('deadlift')) exerciseTitle = 'Deadlift';
      else if (lower.includes('bench')) exerciseTitle = 'Bench Press';
      else if (lower.includes('squat')) exerciseTitle = 'Squat';
      else if (lower.includes('run') || lower.includes('mile')) exerciseTitle = '1 Mile Run';

      const displayDetails = cleanedText || cleanMessage;

      return NextResponse.json({
        reply: `🏃‍♂️ **Logged for ${targetDate}:** ${displayDetails}. Your Workout Log and Character XP have been updated!`,
        action: { 
          type: 'LOG_WORKOUT', 
          exercise: exerciseTitle,
          details: displayDetails,
          targetDateStr: targetDate 
        },
        chips: ['What does that mean?', 'How to increase stats', 'View Calendar']
      });
    }

    // --- 🩺 GENERAL ILLNESS HANDLER ---
    if (
      lower.includes('if i am sick') ||
      lower.includes('if i get sick') ||
      lower.includes('feeling sick') ||
      lower.includes('what to do if sick') ||
      lower.includes('when sick')
    ) {
      const doctor = patient?.primaryDoctor || 'Dr. Sarah Vance, MD';
      return NextResponse.json({
        reply: `🩺 **If you are feeling sick or unwell:**\n\n1. **Severe Symptoms:** If experiencing chest pain, difficulty breathing, or severe dizziness, call **911** or go to Urgent Care immediately.\n2. **Routine Illness:** Contact ${doctor}'s office at **${patient?.phone || '(555) 234-5678'}** or send a message through your portal.\n3. **Log Symptoms:** You can type your symptoms right here to record them on your calendar for your doctor review!`,
        chips: ['Log a symptom', 'Emergency ID', 'Active Meds']
      });
    }

    // --- 💬 CONVERSATIONAL / SMALL TALK HANDLER ---
    if (
      lower.includes('conversation') ||
      lower.includes('talk') ||
      lower.includes('chat') ||
      lower.includes('hello') ||
      lower.includes('hi') ||
      lower.includes('hey') ||
      lower.includes('how are you')
    ) {
      return NextResponse.json({
        reply: "Hello! 👋 I'm your Pulse Companion AI. I can help organize your health records, answer questions about your fitness stats & jobs, check your vitals, or log workouts and symptoms!",
        chips: ['What are my stats?', 'What is my best stat?', 'How do I increase stats?', 'What are my vitals?']
      });
    }

    // --- 📅 DIRECT CALENDAR VIEW INTENT CHECK ---
    if (lower.includes('view calendar') || lower.includes('check calendar') || lower.includes('show calendar')) {
      const activeLog = calendarLogs?.find((l: any) => l.dateStr?.toLowerCase() === selectedDateLabel.toLowerCase());
      const notesSummary = activeLog?.notes ? `Notes for ${selectedDateLabel}: "${activeLog.notes}"` : `No context notes recorded for ${selectedDateLabel} yet.`;

      return NextResponse.json({
        reply: `📅 **28-Day Calendar Overview:**\n\n• Currently viewing **${selectedDateLabel}**.\n• ${notesSummary}\n\nYou can click any date on the main calendar grid to view or edit sleep hours, medication logs, and notes!`,
        chips: [`Mark taken for ${selectedDateLabel}`, 'Check Vitals', 'Active Meds']
      });
    }

    // --- 🤖 OPENAI TOOL CALLING EXECUTION ---
    if (process.env.OPENAI_API_KEY) {
      const systemPrompt = `You are Pulse Companion AI, an administrative health navigation assistant.
Patient Context:
- Name: ${patient?.name || 'Ezekiel Walter'}
- Provider: ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD'}
- Active Meds: ${JSON.stringify(patient?.medications || [])}
- Selected Calendar Date: ${selectedDateLabel}

Instructions:
Be conversational, warm, and helpful. Use functions when appropriate.`;

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
            ...messages.slice(0, -1).map((m: any) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: cleanMessage }
          ],
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const choice = data.choices?.[0]?.message;

        if (choice?.tool_calls && choice.tool_calls.length > 0) {
          const toolCall = choice.tool_calls[0];
          const fnName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || '{}');

          let reply = '';
          let chips: string[] = [];
          let action: any = null;

          switch (fnName) {
            case 'view_calendar': {
              const activeLog = calendarLogs?.find((l: any) => l.dateStr?.toLowerCase() === selectedDateLabel.toLowerCase());
              const notesSummary = activeLog?.notes ? `Notes for ${selectedDateLabel}: "${activeLog.notes}"` : `No context notes recorded for ${selectedDateLabel} yet.`;
              reply = `📅 **28-Day Calendar Overview:**\n\n• Currently viewing **${selectedDateLabel}**.\n• ${notesSummary}\n\nYou can tap any date on the calendar grid to switch dates!`;
              chips = [`Mark taken for ${selectedDateLabel}`, 'Check Vitals', 'Active Meds'];
              break;
            }

            case 'check_medication_adherence': {
              const queryDate = args.targetDateStr || targetDate;
              const logForDate = calendarLogs?.find((l: any) => l.dateStr?.toLowerCase() === queryDate.toLowerCase()) || calendarLogs?.[calendarLogs.length - 2];
              const medsMap = logForDate?.medsTaken || {};
              const total = patient?.medications?.length || 2;
              const takenCount = Object.values(medsMap).filter(Boolean).length;

              if (takenCount === total) {
                reply = `✅ Yes! According to your calendar record for **${queryDate}**, you logged taking all ${total} of your prescribed doses.`;
              } else if (takenCount > 0) {
                reply = `⚠️ Partially logged for **${queryDate}**: You logged ${takenCount} of ${total} medication doses as taken.`;
              } else {
                reply = `💊 According to your calendar log for **${queryDate}**, no medication doses were marked as taken (0 of ${total} logged).`;
              }

              chips = [`Mark taken for ${queryDate}`, 'View Calendar', 'Active Meds'];
              break;
            }

            case 'log_workout': {
              const date = args.targetDateStr || targetDate;
              const ex = args.exercise || 'Workout Session';
              const dt = args.details || cleanMessage;
              reply = `🏃‍♂️ Added workout to **${date}**: "${ex} (${dt})". Updated in your Workout & Reps Log!`;
              action = { type: 'LOG_WORKOUT', exercise: ex, details: dt, targetDateStr: date };
              chips = ['What are my stats?', 'How to increase stats', 'View Calendar'];
              break;
            }

            case 'log_context_note': {
              const date = args.targetDateStr || targetDate;
              const note = args.noteText || cleanMessage;
              reply = `📝 Added note for **${date}**: "${note}". Your daily calendar log has been updated!`;
              action = { type: 'LOG_NOTE', noteText: note, targetDateStr: date };
              chips = ['View Calendar', 'Log Meds Taken', 'Check Vitals'];
              break;
            }

            case 'get_patient_vitals': {
              const v = patient?.vitals || { bp: '118/78', heartRate: '68 bpm', hba1c: '5.4%' };
              reply = args.explain
                ? `💡 **What Your Vitals Mean:**\n\n• **BP (${v.bp}):** Normal range.\n• **Heart Rate (${v.heartRate}):** Normal resting pulse.\n• **HbA1c (${v.hba1c}):** Normal blood sugar baseline.`
                : `📉 **Your Vitals:** BP ${v.bp}, Heart Rate ${v.heartRate}, HbA1c ${v.hba1c}.`;
              chips = ['What does this mean?', 'Next Visit'];
              break;
            }

            case 'get_patient_medications': {
              const list = patient?.medications?.map((m: any) => `• **${m.name}**: ${m.instructions}`).join('\n') || 'No active meds.';
              reply = `💊 **Your Active Prescriptions:**\n${list}`;
              chips = ['Did I take meds yesterday?', 'Log meds taken'];
              break;
            }

            case 'log_medications_taken': {
              const date = args.targetDateStr || targetDate;
              reply = `✅ Marked all active prescriptions as taken for **${date}**!`;
              action = { type: 'LOG_MEDS_TAKEN', targetDateStr: date };
              chips = ['View Calendar', 'Check Vitals'];
              break;
            }
          }

          return NextResponse.json({ reply, chips, action });
        }

        if (choice?.content) {
          return NextResponse.json({
            reply: choice.content,
            chips: ['What are my stats?', 'How to increase stats', 'What are my vitals?']
          });
        }
      }
    }

    // --- FALLBACK ADHERENCE QUERY HANDLER ---
    if (cleanMessage.toLowerCase().includes('did i take') || cleanMessage.toLowerCase().includes('medication')) {
      const logForDate = calendarLogs?.find((l: any) => l.dateStr?.toLowerCase() === targetDate.toLowerCase()) || calendarLogs?.[calendarLogs.length - 2];
      const medsMap = logForDate?.medsTaken || {};
      const total = patient?.medications?.length || 2;
      const takenCount = Object.values(medsMap).filter(Boolean).length;

      return NextResponse.json({
        reply: takenCount === total
          ? `✅ Yes! According to your calendar record for **${targetDate}**, you logged taking all ${total} of your prescribed doses.`
          : `💊 According to your calendar log for **${targetDate}**, ${takenCount} of ${total} medication doses were marked as taken.`,
        chips: [`Mark taken for ${targetDate}`, 'View Calendar', 'Active Meds']
      });
    }

    if (isActivityOrNoteStatement(cleanMessage)) {
      return NextResponse.json({
        reply: `📝 Added note for **${targetDate}**: "${cleanMessage}". Your daily calendar log has been updated!`,
        action: { type: 'LOG_NOTE', noteText: cleanMessage, targetDateStr: targetDate },
        chips: ['View Calendar', 'Check Vitals', 'Active Meds']
      });
    }

    return NextResponse.json({
      reply: "Hi there! 👋 I'm your Pulse Companion AI. Ask me what your stats are, how to level up, or log notes for your calendar!",
      chips: ['What are my stats?', 'What is my best stat?', 'How to increase stats', 'Benefits of stats']
    });

  } catch (err) {
    console.error('Chat API Error:', err);
    return NextResponse.json({
      reply: "I am here to help organize your health records! Ask me about your medications, doctor visits, stats, or log notes.",
      chips: ['What are my stats?', 'How to increase stats', 'My Vitals']
    });
  }
}
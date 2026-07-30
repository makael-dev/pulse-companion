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

    // Contextual follow-up check ("what does that mean?")
    const isStatFollowUp = (lower.includes('what does that mean') || lower.includes('explain that') || lower.includes('what do you mean') || lower.includes('why')) && 
      (prevAssistantMsg.includes('stat') || prevAssistantMsg.includes('endurance') || prevAssistantMsg.includes('level'));

    // --- 🚨 EMERGENCY TRIAGE GUARDRAIL ---
    if (EMERGENCY_PATTERNS.some((p) => p.test(cleanMessage))) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately.",
        chips: ['Emergency ID', 'View Vitals']
      });
    }

    // --- 📉 CLINICAL EHR VITALS QUERY HANDLER (CHECKED BEFORE STATS) ---
    if (
      lower.includes('what are my vitals') ||
      lower.includes('show my vitals') ||
      lower.includes('check vitals') ||
      lower.includes('my vitals')
    ) {
      const v = patient?.vitals || { bp: '118/78', heartRate: '68 bpm', hba1c: '5.4%', spO2: '98%' };
      return NextResponse.json({
        reply: `📉 **Your Current EHR Vital Signs:**\n\n• **Blood Pressure:** ${v.bp} (${v.bpStatus === 'normal' ? 'Normal' : '⚠️ Risk Review'})\n• **Resting Heart Rate:** ${v.heartRate}\n• **HbA1c:** ${v.hba1c}\n• **SpO₂:** ${v.spO2 || '98%'}\n• **BMI:** ${v.bmi || '24.1'}`,
        chips: ['What does my BP mean?', 'What are my stats?', 'Active Medications']
      });
    }

    // --- 💊 MEDICATION TAKEN LOGGING HANDLER (CHECKED BEFORE WORKOUTS) ---
    if (
      (lower.includes('took') || lower.includes('take') || lower.includes('mark') || lower.includes('log')) &&
      (lower.includes('medication') || lower.includes('med') || lower.includes('pill') || lower.includes('dose'))
    ) {
      return NextResponse.json({
        reply: `✅ **Medication Log Updated for ${targetDate}:** Marked all active prescribed doses as taken!`,
        action: { 
          type: 'LOG_MEDS_TAKEN', 
          targetDateStr: targetDate 
        },
        chips: ['View Calendar', 'Check Vitals', 'How to increase stats']
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
      lower.includes('vitality stat') ||
      lower.includes('my vit stat') ||
      lower.includes('recovery') ||
      lower.includes('rec') ||
      lower.includes('job') ||
      lower.includes('class') ||
      lower.includes('buff')
    ) {
      if (isStatFollowUp || lower.includes('what does that mean') || lower.includes('explain stats')) {
        return NextResponse.json({
          reply: `💡 **Here is what your stats mean in simple terms:**\n\nYour stats convert real health & fitness tracking into a **Character Score Sheet**:\n\n• ⚡ **END (Endurance):** Based on hitting daily step goals and run times.\n• 🔥 **REC (Recovery):** Based on quality sleep averages.\n• ❤️ **VIT (Vitality):** Based on resting heart rate & blood pressure efficiency.\n• 🏋️‍♂️ **STR (Strength):** Based on compound lift PR records (Deadlift & Bench Press).`,
          chips: ['How to increase stats', 'Benefits of Stats', 'Job System Info']
        });
      }

      if (lower.includes('end is') || lower.includes('endurance is') || lower.includes('my end')) {
        return NextResponse.json({
          reply: `⚡ **What High Endurance (END) Means:**\n\nYour **END score** indicates top-tier cardiovascular stamina and daily movement!\n\n• **Daily Steps:** Hitting 7,420 / 8,000 steps (92%+ of goal).\n• **Cardio Pace:** 1-Mile Run time of 7:45 in the peak demographic range.\n• **Real-World Benefit:** Superior VO2 max and daily stamina.`,
          chips: ['What is my best stat?', 'How to increase stats', 'Benefits of Stats']
        });
      }

      if (lower.includes('str is') || lower.includes('strength is') || lower.includes('my str')) {
        return NextResponse.json({
          reply: `🏋️‍♂️ **What Your Strength (STR) Means:**\n\nYour **STR score** represents high-tier muscular powerlifting output!\n\n• **Lifting PRs:** Driven by heavy Deadlift and Bench Press records.\n• **Real-World Benefit:** Peak strength, joint stability, and bone density preservation.`,
          chips: ['How to increase stats', 'Benefits of Stats', 'What are my stats?']
        });
      }

      if (lower.includes('vit stat') || lower.includes('vitality stat') || lower.includes('my vit stat')) {
        return NextResponse.json({
          reply: `❤️ **What Your Vitality (VIT) Means:**\n\nYour **VIT score** measures overall circulatory health and heart efficiency!\n\n• **Resting Heart Rate:** Healthy resting pulse.\n• **Blood Pressure:** Stable BP metrics keeping arterial strain low.\n• **Real-World Benefit:** Lower cardiovascular risk and improved longevity.`,
          chips: ['Check Vitals', 'How to increase stats', 'Benefits of Stats']
        });
      }

      if (lower.includes('rec is') || lower.includes('recovery is') || lower.includes('my rec')) {
        return NextResponse.json({
          reply: `🔥 **What Your Recovery (REC) Means:**\n\nYour **REC score** measures how effectively your body recharges through sleep and stress management!\n\n• **Sleep Average:** Quality sleep on your calendar log.\n• **Stress Index:** Low daily stress scores.\n• **Real-World Benefit:** Fast muscle repair, balanced hormones, and immune defense.`,
          chips: ['How to increase stats', 'Benefits of Stats', 'View Calendar']
        });
      }

      if (lower.includes('best') || lower.includes('highest') || lower.includes('top stat')) {
        return NextResponse.json({
          reply: `🏋️‍♂️ **Your Highest Stat is Strength (STR)!**\n\n• **STR:** Elite compound lifting PRs!\n• **END:** High daily step tracking & cardio times.\n• **VIT:** Healthy resting heart rate.\n• **REC:** Solid sleep recovery average.`,
          chips: ['How to increase stats', 'Benefits of Stats', 'Job System Info']
        });
      }

      if (lower.includes('what are my stats') || lower.includes('my stats') || lower.includes('show stats')) {
        return NextResponse.json({
          reply: `🎮 **Current Character Stats Overview:**\n\n• 🏋️‍♂️ **STR (Strength):** High powerlifting PRs\n• ⚡ **END (Endurance):** Daily steps & mile run pace\n• ❤️ **VIT (Vitality):** Healthy heart rate & BP\n• 🔥 **REC (Recovery):** Sleep & stress management\n\n*Active Job Ability active!*`,
          chips: ['What is my best stat?', 'How to increase stats', 'Benefits of Stats']
        });
      }

      if (lower.includes('increase') || lower.includes('level up') || lower.includes('raise') || lower.includes('boost')) {
        return NextResponse.json({
          reply: `🎮 **How to Increase Your Stats:**\n\n• 🏋️‍♂️ **STR:** Log heavy compound lift PRs (Deadlift, Bench Press).\n• ⚡ **END:** Hit daily step targets (8,000+ steps) or improve run times.\n• ❤️ **VIT:** Maintain optimal blood pressure & resting HR.\n• 🌿 **REC:** Log 7.5+ hours of sleep & maintain low stress.`,
          chips: ['Benefits of Stats', 'What are Jobs?', 'My Vitals']
        });
      }

      if (lower.includes('benefit') || lower.includes('real world') || lower.includes('why care')) {
        return NextResponse.json({
          reply: `💡 **Real-World Health Benefits of Your Stats:**\n\n• **Strength (STR):** Builds bone density and protects lower back health.\n• **Endurance (END):** Boosts VO2 max and daily stamina.\n• **Vitality (VIT):** Promotes a healthy heart and vascular system.\n• **Recovery (REC):** Crucial for immune function and cellular repair.`,
          chips: ['How to increase stats', 'Job System Info', 'Check Vitals']
        });
      }

      if (lower.includes('job') || lower.includes('class') || lower.includes('warrior') || lower.includes('bard')) {
        return NextResponse.json({
          reply: `🛡️ **Fitness Job Roles Overview:**\n\n• 🪓 **Warrior (WAR):** Focuses on **STR** (*Inner Release perk*).\n• 🛡️ **Paladin (PLD):** Focuses on **VIT** (*Hallowed Ground perk*).\n• 🏹 **Bard (BRD):** Focuses on **END** (*Peloton Pace perk*).\n• 🪄 **White Mage (WHM):** Focuses on **REC** (*Curaja Recovery perk*).\n• 🥊 **Monk (MNK):** High-tempo rep workouts.\n• 🔮 **Black Mage (BLM):** Stress management & mental focus.`,
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
        reply: `🩺 **If you are feeling sick or unwell:**\n\n1. **Severe Symptoms:** Call **911** or visit urgent care for emergency symptoms.\n2. **Routine Illness:** Contact ${doctor}'s office at **${patient?.phone || '(555) 234-5678'}**.\n3. **Log Symptoms:** Record symptoms here to prepare for your next visit!`,
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
        reply: "Hello! 👋 I'm your Pulse Companion AI. Ask me about your health records, vitals, stats, or log workouts and notes!",
        chips: ['What are my vitals?', 'What are my stats?', 'How do I increase stats?', 'When is my next visit?']
      });
    }

    // --- 📅 DIRECT CALENDAR VIEW INTENT CHECK ---
    if (lower.includes('view calendar') || lower.includes('check calendar') || lower.includes('show calendar')) {
      const activeLog = calendarLogs?.find((l: any) => l.dateStr?.toLowerCase() === selectedDateLabel.toLowerCase());
      const notesSummary = activeLog?.notes ? `Notes for ${selectedDateLabel}: "${activeLog.notes}"` : `No context notes recorded for ${selectedDateLabel} yet.`;

      return NextResponse.json({
        reply: `📅 **28-Day Calendar Overview:**\n\n• Currently viewing **${selectedDateLabel}**.\n• ${notesSummary}\n\nClick any date on the calendar grid to switch dates!`,
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
            chips: ['What are my vitals?', 'What are my stats?', 'How to increase stats']
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
      reply: "Hi there! 👋 I'm your Pulse Companion AI. Ask me about your vitals, stats, or log notes for your calendar!",
      chips: ['What are my vitals?', 'What are my stats?', 'How to increase stats', 'Benefits of stats']
    });

  } catch (err) {
    console.error('Chat API Error:', err);
    return NextResponse.json({
      reply: "I am here to help organize your health records! Ask me about your medications, doctor visits, stats, or log notes.",
      chips: ['What are my vitals?', 'What are my stats?', 'My Vitals']
    });
  }
}
import { NextResponse } from 'next/server';

// Red Flag Emergency Keywords
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

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'log_medications_taken',
      description: 'Mark all or specific prescribed medication doses as taken on a specific calendar date.',
      parameters: {
        type: 'OBJECT',
        properties: {
          targetDateStr: { type: 'STRING', description: 'The date string to log for (e.g. Jul 29, Jul 30).' }
        },
        required: ['targetDateStr']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_workout',
      description: 'Log an exercise, workout, run, or rep PR to the user workout calendar.',
      parameters: {
        type: 'OBJECT',
        properties: {
          exercise: { type: 'STRING', description: 'Short exercise title, e.g. Deadlift, Bench Press, 1 Mile Run.' },
          details: { type: 'STRING', description: 'Details like 500 lbs, 3 sets x 8 reps, or 7:45 time.' },
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
      description: 'Log a symptom, daily health observation, or note to the calendar.',
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
    const { messages, patient, selectedDateLabel, calendarLogs, enableRPGSystem = false } = await req.json();
    const lastMessage = messages[messages.length - 1]?.text || '';
    const lower = lastMessage.toLowerCase();
    const targetDate = resolveTargetDate(lastMessage, selectedDateLabel);

    // 🚨 1. Safety Triage Guardrail
    if (EMERGENCY_PATTERNS.some((p) => p.test(lastMessage))) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately.",
        chips: ['Emergency ID', 'View Vitals']
      });
    }

    // 📅 2. DATE / TODAY QUERY DIRECT HANDLER
    if (
      lower.includes('what day is it') ||
      lower.includes('what is today') ||
      lower.includes('today\'s date') ||
      lower.includes('what date is it') ||
      lower.includes('what is the date')
    ) {
      const liveDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      return NextResponse.json({
        reply: `📅 **Today's Date:** Today is **${liveDateStr}**.\n\nYou are currently viewing health logs for **${selectedDateLabel}** on your dashboard.`,
        chips: ['View Calendar', 'What are my vitals?', 'Log meds taken']
      });
    }

    const vitals = patient?.vitals || { bp: '118/78', heartRate: '68 bpm', hba1c: '5.4%', bmi: '24.1' };
    const medications = patient?.medications || [];
    
    const activeLog = calendarLogs?.find((l: any) => l.dateStr?.toLowerCase() === selectedDateLabel.toLowerCase());
    const dayMedsTaken = activeLog?.medsTaken || {};

    const gamificationPrompt = enableRPGSystem ? `
CHARACTER STATS & GAMIFICATION SHEET STATE:
- Character Role: Warrior (WAR) [Tank Class] | Overall Level: LVL 87
- Strength (STR 100): Driven by Deadlift (500 lbs) & Bench Press (315 lbs) PRs.
- Endurance (END 83): Driven by 7,420 / 8,000 steps and a 7:45 1-Mile run pace.
- Vitality (VIT 82): Driven by resting HR (68 bpm) and stable blood pressure.
- Recovery (REC 82): Driven by 7.0h avg sleep and controlled daily stress index.
` : `
GAMIFICATION SYSTEM DISABLED BY USER PREFERENCE:
- The user has disabled the RPG Fitness & Job System in Privacy Controls.
- DO NOT refer to character levels, job titles (Warrior, Paladin, etc.), XP, or gamified stats. Stick strictly to standard clinical metrics, vital signs, and physical fitness tracking.
`;

    const systemPrompt = `
You are Pulse Companion AI, an intelligent personal health and administrative visit navigation assistant.

LIVE PATIENT EHR & DASHBOARD STATE:
- Current System Date: ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
- Patient Name: ${patient?.name || 'Ezekiel Walter'} (Age ${patient?.age || 42}, ${patient?.gender || 'Male'})
- Primary Provider: ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD'}
- Current Vitals: Blood Pressure ${vitals.bp} (${vitals.bpStatus || 'Normal'}), Resting HR ${vitals.heartRate}, HbA1c ${vitals.hba1c}, BMI ${vitals.bmi || '24.1'}
- Prescriptions: ${JSON.stringify(medications.map((m: any) => m.name))}
- Currently Selected Calendar Date: ${selectedDateLabel} (Logged Meds: ${JSON.stringify(dayMedsTaken)})

${gamificationPrompt}

BEHAVIORAL INSTRUCTIONS:
1. Answer all health, vitals, stats, date, and medication questions conversationally, accurately, and empathetically.
2. If asked what day/date it is, answer with today's live date directly.
3. If asked about BP (e.g. "What does my BP mean?"), evaluate their specific Blood Pressure (${vitals.bp}) and explain that 118/78 mmHg is in the optimal normal range for heart health.
4. If the user wants to log medications, workouts, or notes, execute the appropriate tool function call.
5. Provide 3 short, relevant quick-reply suggestion chips at the end of helpful responses.
`;

    if (process.env.OPENAI_API_KEY) {
      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map((m: any) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
          ],
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.2,
        }),
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        const choice = data.choices?.[0]?.message;

        if (choice?.tool_calls && choice.tool_calls.length > 0) {
          const toolCall = choice.tool_calls[0];
          const fnName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || '{}');
          const dateForAction = args.targetDateStr || targetDate;

          let reply = '';
          let chips: string[] = [];
          let action: any = null;

          if (fnName === 'log_medications_taken') {
            reply = `✅ **Medication Log Updated for ${dateForAction}:** Marked active prescription doses as taken!`;
            action = { type: 'LOG_MEDS_TAKEN', targetDateStr: dateForAction };
            chips = ['View Calendar', 'What are my vitals?', enableRPGSystem ? 'What are my stats?' : 'View Fitness'];
          } else if (fnName === 'log_workout') {
            reply = `🏃‍♂️ **Logged Workout for ${dateForAction}:** ${args.exercise} (${args.details}). Workout log updated!`;
            action = { type: 'LOG_WORKOUT', exercise: args.exercise, details: args.details, targetDateStr: dateForAction };
            chips = [enableRPGSystem ? 'What are my stats?' : 'View Fitness', 'View Calendar', 'Check Vitals'];
          } else if (fnName === 'log_context_note') {
            reply = `📝 **Logged Note for ${dateForAction}:** "${args.noteText}". Updated in your calendar log!`;
            action = { type: 'LOG_NOTE', noteText: args.noteText, targetDateStr: dateForAction };
            chips = ['View Calendar', 'Log Meds Taken', 'Check Vitals'];
          }

          return NextResponse.json({ reply, chips, action });
        }

        if (choice?.content) {
          return NextResponse.json({
            reply: choice.content,
            chips: ['What are my vitals?', enableRPGSystem ? 'What are my stats?' : 'View Fitness', 'Active Prescriptions']
          });
        }
      }
    }

    const liveDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return NextResponse.json({
      reply: `I can help with your health record! Today is ${liveDateStr}. Your Blood Pressure is ${vitals.bp} (Normal).`,
      chips: ['What are my vitals?', 'Log meds taken', 'View Calendar']
    });

  } catch (err) {
    console.error('Chat Route API Error:', err);
    return NextResponse.json({
      reply: "I am here to help organize your health records! Ask me about your vitals, medications, or fitness records.",
      chips: ['What are my vitals?', 'Active Prescriptions']
    });
  }
}
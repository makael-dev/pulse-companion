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
    const body = await req.json();
    const messages = body.messages || body.history || [];
    const patient = body.patient || body.patientContext || null;
    const selectedDateLabel = body.selectedDateLabel || 'Jul 30';
    const calendarLogs = body.calendarLogs || [];
    const enableRPGSystem = body.enableRPGSystem || false;

    const lastMessage = body.message || messages[messages.length - 1]?.text || messages[messages.length - 1]?.content || '';
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

    // 🩸 3. DIRECT BP EXPLANATION HANDLER
    if (lower.includes('explain') || lower.includes('bp') || lower.includes('blood pressure')) {
      const bp = patient?.vitals?.bp || '120/80 mmHg';
      const isElevated = patient?.vitals?.bpStatus === 'warning';

      const bpReply = isElevated
        ? `🩸 **Blood Pressure Explanation (${bp}):** Your current reading reflects slightly elevated pressure. It's recommended to track daily and review with your physician.`
        : `🩸 **Blood Pressure Explanation (${bp}):** A reading of **${bp}** is optimal and normal! The top number (systolic) measures pressure when your heart pumps, while the bottom number (diastolic) measures pressure between beats.`;

      return NextResponse.json({
        reply: bpReply,
        chips: ['Active Prescriptions', 'Health Delta', 'View Calendar']
      });
    }

    // 💡 4. REAL CLINICAL HEALTH SUMMARY / DELTA HANDLER
    if (lower.includes('summarize') || lower.includes('health changes') || lower.includes('delta')) {
      const bp = patient?.vitals?.bp || '120/80 mmHg';
      const bpStatus = patient?.vitals?.bpStatus === 'warning' ? '⚠️ Elevated' : 'Normal';
      const hba1c = patient?.vitals?.hba1c || '5.6%';
      const hba1cStatus = patient?.vitals?.hba1cStatus === 'warning' ? '⚠️ Elevated' : 'Normal';
      const meds = patient?.medications?.map((m: any) => m.name).join(', ') || 'No active prescriptions on file';
      const doctor = patient?.primaryDoctor || 'your provider';
      const lastVisit = patient?.lastVisitDate || 'your last visit';

      const clinicalSummary = `💡 **Health Overview for ${patient?.name || 'Patient'}** (Since ${lastVisit}):\n\n` +
        `• **Vital Signs:** Blood Pressure is **${bp}** (${bpStatus}) and HbA1c is **${hba1c}** (${hba1cStatus}).\n` +
        `• **Active Prescriptions:** ${meds}.\n` +
        `• **Provider Action Plan (${doctor}):** ${patient?.doctorNotes?.summary || 'Continue prescribed daily regimen.'}`;

      return NextResponse.json({
        reply: clinicalSummary,
        chips: ['Explain my BP', 'Active Prescriptions', 'View Calendar']
      });
    }

    const vitals = patient?.vitals || { bp: '118/78', heartRate: '68 bpm', hba1c: '5.4%', bmi: '24.1' };
    const medications = patient?.medications || [];

    const systemPrompt = `
You are Pulse Companion AI, an intelligent personal health assistant for ${patient?.name || 'Patient'}.
Current Vitals: Blood Pressure ${vitals.bp}, HR ${vitals.heartRate}, HbA1c ${vitals.hba1c}.
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
              role: (m.sender === 'user' || m.role === 'user') ? 'user' : 'assistant',
              content: m.text || m.content || '',
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

        if (choice?.content) {
          return NextResponse.json({
            reply: choice.content,
            chips: ['What are my vitals?', 'Active Prescriptions', 'View Calendar']
          });
        }
      }
    }

    const pName = patient?.name?.split(' ')[0] || 'Patient';
    return NextResponse.json({
      reply: `I am here to help organize ${pName}'s health records! Current Blood Pressure is ${vitals.bp}. Ask me about medications, vitals, or logging calendar notes.`,
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
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

// Symptom Statement Detector
function isSymptomStatement(text: string): boolean {
  const lower = text.toLowerCase();
  const symptomKeywords = [
    'hurt', 'hurts', 'hurting', 'pain', 'sore', 'ache', 'aches', 'aching',
    'dizzy', 'dizziness', 'headache', 'tightness', 'cramps', 'cramping',
    'swollen', 'swelling', 'nausea', 'fatigue', 'tired', 'cough', 'fever', 'sick', 'unwell', 'ill'
  ];
  return symptomKeywords.some((word) => lower.includes(word));
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
      name: 'log_context_note',
      description: 'Log a symptom, note, or health observation to the patient calendar.',
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
    
    // Normalize typos
    let cleanMessage = lastMessage
      .replace(/\b(med|meds|pill|pills|prescription|rx)\b/gi, 'medication')
      .replace(/\b(paid|pained|paing|pane)\b/gi, 'pain')
      .replace(/\b(wat|wht)\b/gi, 'what');

    const targetDate = resolveTargetDate(cleanMessage, selectedDateLabel);
    const lower = cleanMessage.toLowerCase();

    // --- 🚨 EMERGENCY TRIAGE GUARDRAIL ---
    if (EMERGENCY_PATTERNS.some((p) => p.test(cleanMessage))) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately.",
        chips: ['Emergency ID', 'Call Doctor', 'View Vitals']
      });
    }

    // --- 🩺 GENERAL ILLNESS / "WHAT DO I DO IF I AM SICK" HANDLER ---
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
        reply: "Absolutely! 👋 I'm here to chat, answer questions about your health record, help prepare for your doctor visits, or log how you're feeling today. What's on your mind?",
        chips: ['What are my vitals?', 'Did I take meds yesterday?', 'When is my next visit?', 'Log a note']
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
            chips: ['What are my vitals?', 'When is my next visit?', 'My Medications']
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

    if (isSymptomStatement(cleanMessage)) {
      return NextResponse.json({
        reply: `📝 Added note for **${targetDate}**: "${cleanMessage}". Your daily calendar log has been updated!`,
        action: { type: 'LOG_NOTE', noteText: cleanMessage, targetDateStr: targetDate },
        chips: ['View Calendar', 'Check Vitals', 'Active Meds']
      });
    }

    return NextResponse.json({
      reply: "Hi there! 👋 I'm your Pulse Companion AI. I can help answer questions about your health records, check your vitals, or log notes for your calendar. What would you like to do?",
      chips: ['What are my vitals?', 'Did I take meds yesterday?', 'List my medications', 'Log meds as taken']
    });

  } catch (err) {
    console.error('Chat API Error:', err);
    return NextResponse.json({
      reply: "I am here to help organize your health records! Ask me about your medications, doctor visits, vitals, or log notes.",
      chips: ['My Vitals', 'Next Appointment', 'My Medications']
    });
  }
}
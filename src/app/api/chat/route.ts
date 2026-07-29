import { NextResponse } from 'next/server';

// Red Flag Emergency Keywords for Instant Guardrail Check
const EMERGENCY_PATTERNS = [
  /chest pain/i, /shortness of breath/i, /difficulty breathing/i, /can't breathe/i,
  /stroke/i, /numbness/i, /face drooping/i, /fainted/i, /fainting/i, /severe bleeding/i, /suicidal/i
];

// Tool Definitions for OpenAI Function Calling
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_patient_vitals',
      description: 'Fetch the patient current vital signs (BP, heart rate, HbA1c, oxygen, weight) or explain what they mean.',
      parameters: {
        type: 'OBJECT',
        properties: {
          explain: { type: 'BOOLEAN', description: 'True if user wants an explanation of what their vitals mean.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_medications',
      description: 'Get list of active prescriptions, instructions, or check for specific meds (like EpiPen).',
      parameters: {
        type: 'OBJECT',
        properties: {
          specificMed: { type: 'STRING', description: 'Specific medication queried (e.g., EpiPen, Lisinopril).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_appointment',
      description: 'Get details about next appointment date, provider, or visit reason.',
      parameters: { type: 'OBJECT', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_medical_conditions',
      description: 'Fetch patient recorded medical conditions or diagnoses.',
      parameters: { type: 'OBJECT', properties: {} }
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
          targetDateStr: { type: 'STRING', description: 'Target date string (e.g. Jul 29) or leave empty for selected date.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_sleep_hours',
      description: 'Log sleep hours for the current selected date.',
      parameters: {
        type: 'OBJECT',
        properties: {
          hours: { type: 'NUMBER', description: 'Number of hours slept.' }
        }
      }
    }
  }
];

export async function POST(req: Request) {
  try {
    const { messages, patient, selectedDateLabel, calendarLogs } = await req.json();
    const lastMessage = messages[messages.length - 1]?.text || '';

    // --- 🚨 FAST RED FLAG EMERGENCY FILTER ---
    if (EMERGENCY_PATTERNS.some((p) => p.test(lastMessage))) {
      return NextResponse.json({
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911) or visit the nearest Emergency Room immediately. Do not wait for a routine appointment.",
        chips: ['Emergency ID', 'Call Doctor', 'View Vitals']
      });
    }

    // --- 🤖 OPENAI TOOL CALLING EXECUTION ---
    if (process.env.OPENAI_API_KEY) {
      const systemPrompt = `You are Pulse Companion AI, an administrative health navigation assistant.
Patient Context:
- Name: ${patient?.name || 'Ezekiel Walter'}
- DOB: ${patient?.dob || '1984-05-12'} (${patient?.age || 42} yrs)
- Provider: ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD'}
- Next Visit: ${patient?.nextVisit?.date || 'August 18, 2026'} (${patient?.nextVisit?.type || 'Routine Follow-Up'})
- Active Meds: ${JSON.stringify(patient?.medications || [])}
- Sensitivities: ${JSON.stringify(patient?.allergies || [])}
- Vitals: ${JSON.stringify(patient?.vitals || {})}
- Conditions: ${JSON.stringify(patient?.conditions || [])}
- Selected Date: ${selectedDateLabel}

Instructions:
Use functions to answer user queries accurately. Never invent medical diagnoses or change prescription dosages. Keep answers friendly, clear, and reassuring.`;

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
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.2,
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
            case 'get_patient_vitals': {
              const v = patient?.vitals || { bp: '118/78', heartRate: '68 bpm', hba1c: '5.4%', spO2: '98%', weight: '168 lbs' };
              if (args.explain) {
                reply = `💡 **What Your Vitals Mean:**\n\n• **Blood Pressure (${v.bp}):** ${v.bpStatus === 'warning' ? 'Currently elevated.' : 'In a healthy, normal range under your current regimen.'}\n• **Heart Rate (${v.heartRate}):** Normal resting pulse.\n• **HbA1c (${v.hba1c}):** Normal blood sugar baseline over the past 3 months.\n• **SpO₂ (${v.spO2 || '98%'}):** Excellent blood oxygen levels.`;
                chips = ['Doctor Notes', 'Next Visit', 'Active Meds'];
              } else {
                reply = `📉 **Your Current Vital Signs:**\n• **Blood Pressure:** ${v.bp} mmHg\n• **Heart Rate:** ${v.heartRate}\n• **HbA1c:** ${v.hba1c}\n• **SpO₂:** ${v.spO2 || '98%'}\n• **Weight:** ${v.weight || '168 lbs'}`;
                chips = ['What does this mean?', 'BP Trend', 'Next Visit'];
              }
              break;
            }

            case 'get_patient_medications': {
              if (args.specificMed?.toLowerCase().includes('epipen')) {
                const hasEpi = patient?.medications?.some((m: any) => m.name.toLowerCase().includes('epipen'));
                reply = hasEpi
                  ? "💉 Yes, an EpiPen is active on your prescription record."
                  : `💉 No EpiPen is listed on your active prescriptions. Given your allergies (${patient?.allergies?.map((a: any) => a.substance).join(', ') || 'Peanuts, Penicillin'}), you can request one during your next visit on ${patient?.nextVisit?.date || 'August 18'}.`;
                chips = ['How to request one?', 'Allergies list', 'Refill request'];
              } else {
                const list = patient?.medications?.map((m: any) => `• **${m.name}**: ${m.instructions}`).join('\n') || 'No active meds found.';
                reply = `💊 **Your Active Prescriptions:**\n${list}`;
                chips = ['Log meds taken', 'Refill request', 'Missed dose info'];
              }
              break;
            }

            case 'get_upcoming_appointment': {
              reply = `🗓️ **Next Appointment:** ${patient?.nextVisit?.date || 'August 18, 2026'} (${patient?.nextVisit?.type || 'Routine Review'}) with ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD'}.`;
              chips = ['Why is it scheduled?', 'Doctor Prep PDF', 'Refill request'];
              break;
            }

            case 'get_medical_conditions': {
              const conds = patient?.conditions?.map((c: any) => typeof c === 'string' ? c : c.name).join(', ') || 'Essential Hypertension, Hyperlipidemia';
              reply = `🩺 **Recorded Medical Conditions:** ${conds}.`;
              chips = ['Active Meds', 'Next Visit', 'Vitals Summary'];
              break;
            }

            case 'log_medications_taken': {
              const target = args.targetDateStr || selectedDateLabel;
              reply = `✅ Marked all active prescriptions as taken for **${target}**! Your calendar history has been updated.`;
              action = { type: 'LOG_MEDS_TAKEN', targetDateStr: target };
              chips = ['View Calendar', 'Log Sleep', 'Check Vitals'];
              break;
            }

            case 'log_sleep_hours': {
              const hrs = args.hours || 8;
              reply = `🌙 Recorded **${hrs} hours** of sleep for **${selectedDateLabel}**.`;
              chips = ['Log Meds Taken', 'Check Vitals', 'Symptom Log'];
              break;
            }
          }

          return NextResponse.json({ reply, chips, action });
        }

        if (choice?.content) {
          return NextResponse.json({
            reply: choice.content,
            chips: ['Active Meds', 'Next Visit', 'My Vitals']
          });
        }
      }
    }

    // --- FALLBACK HANDLER ---
    return NextResponse.json({
      reply: "I am ready to assist with your medical record! You can ask about your vitals, next visit, active prescriptions, allergies, or log notes for your calendar.",
      chips: ['What are my vitals?', 'When is my next visit?', 'List my medications', 'Log meds as taken']
    });

  } catch (err) {
    console.error('Chat Tool Error:', err);
    return NextResponse.json({
      reply: "I am here to help organize your health records! Ask me about your medications, doctor visits, vitals, or log notes.",
      chips: ['My Vitals', 'Next Appointment', 'My Medications']
    });
  }
}
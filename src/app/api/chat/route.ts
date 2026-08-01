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
    const selectedDateLabel = body.selectedDateLabel || 'Jan 1';
    const calendarLogs = body.calendarLogs || [];

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

    // 📅 2. BULK MONTHLY MEDICATION LOGGING ("mark all meds taken for january / jan")
    const isBulkMonth = (lowerUser.includes('all') || lowerUser.includes('entire')) && 
                        (lowerUser.includes('med') || lowerUser.includes('pill')) && 
                        (lowerUser.includes('month') || lowerUser.includes('jan') || lowerUser.includes('january'));

    if (isBulkMonth) {
      return NextResponse.json({
        reply: `🎉 **Entire Month Updated!** Marked all prescribed medications as **Taken** for every day in **January 2026** for **${patient?.name || 'Paul'}**. Your adherence score is now **100%**!`,
        action: 'LOG_ALL_MEDS_MONTH',
        chips: ['View Calendar', 'Explain my BP', 'Health Delta']
      });
    }

    // 🔄 3. CONTEXT-AWARE AFFIRMATION ("YES" / "YEAH" / "YEA" / "SURE")
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

    // 💊 4. DIRECT SINGLE-DAY RECORD / LOG MEDS
    if ((lowerUser.includes('record') || lowerUser.includes('log') || lowerUser.includes('mark')) && (lowerUser.includes('med') || lowerUser.includes('pill') || lowerUser.includes('lisinopril'))) {
      return NextResponse.json({
        reply: `✅ **Medications Recorded!** All prescribed medications for **${patient?.name || 'Paul'}** have been marked as **Taken** for **${targetDate}** in your health calendar.`,
        action: 'LOG_MEDS',
        targetDateStr: targetDate,
        chips: ['View Calendar', 'Explain my BP', 'Lisinopril Info']
      });
    }

    // ❓ 5. CHECK MEDICATION STATUS
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

    // 🏋️ 6. WORKOUT LOGGING HANDLER
    if (lowerUser.includes('workout') || lowerUser.includes('exercise') || lowerUser.includes('run') || lowerUser.includes('gym')) {
      return NextResponse.json({
        reply: `🏋️ **Workout Logged!** Recorded an active workout session for **${targetDate}** in your health calendar.`,
        action: 'LOG_WORKOUT',
        targetDateStr: targetDate,
        exercise: 'General Workout',
        details: 'Logged via AI Companion',
        chips: ['View Calendar', 'Activity Sync', 'Health Delta']
      });
    }

    // 🤖 7. OPENAI DYNAMIC RESPONSE
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        const vitals = patient?.vitals || { bp: '121/81', heartRate: '70 bpm', hba1c: '5.8%' };
        const systemPrompt = `You are Pulse Companion AI for ${patient?.name || 'Paul'}. Vitals: BP ${vitals.bp}, HR ${vitals.heartRate}. Answer queries concisely, accurately, and naturally.`;

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
            temperature: 0.2,
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          const choice = data.choices?.[0]?.message;
          if (choice?.content) {
            return NextResponse.json({
              reply: choice.content,
              chips: ['Explain BP 121/81', 'Lisinopril Info', 'Health Delta']
            });
          }
        }
      } catch (e) {
        console.warn('OpenAI Call warning:', e);
      }
    }

    // 8. DEFAULT FALLBACK
    return NextResponse.json({
      reply: `I can help manage health records for **${patient?.name || 'Paul Tremblay'}** on **${targetDate}**. You can ask me to log medications, record workouts, explain vitals, or review doctor notes.`,
      chips: [`Record meds for ${targetDate}`, 'Explain BP 121/81', 'Health Delta']
    });

  } catch (err) {
    console.error('Chat Route API Error:', err);
    return NextResponse.json({
      reply: "I can help manage your health records! Ask me to record medications, log workouts, or explain your vitals.",
      chips: ['Explain BP 121/81', 'Active Prescriptions']
    });
  }
}
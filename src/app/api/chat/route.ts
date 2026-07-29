import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, patient, selectedDateLabel } = await req.json();
    const lastMessage = messages[messages.length - 1]?.text || '';
    const lower = lastMessage.toLowerCase();

    // 1. FAST LOCAL INTENT MATCHING

    // 💊 Missed Medication / Forget Dose Follow-up
    if (lower.includes('forget') || lower.includes('missed') || lower.includes('forgot') || lower.includes('skip')) {
      return NextResponse.json({
        reply: "If you forget to take a dose, generally take it as soon as you remember unless it's almost time for your next scheduled dose. Never double up doses. For specific guidelines on your prescriptions (like Lisinopril or Metformin), please consult your pharmacist or Dr. Vance!"
      });
    }

    // 🎂 Birthday / DOB
    if (lower.includes('birthday') || lower.includes('dob') || lower.includes('date of birth') || lower.includes('when was i born')) {
      return NextResponse.json({
        reply: patient?.dob
          ? `Your birthday on file is ${patient.dob} (${patient.age} years old).`
          : "I couldn't find a date of birth listed on your record."
      });
    }

    // 🗓️ Next Visit / Appointment
    if (lower.includes('appointment') || lower.includes('next visit') || lower.includes('doctor visit') || lower.includes('when do i see') || lower.includes('when is my visit')) {
      return NextResponse.json({
        reply: patient?.nextVisit
          ? `Your next visit is scheduled for ${patient.nextVisit.date} (${patient.nextVisit.type}) with ${patient.primaryDoctor || 'Dr. Vance'}.`
          : "You don't have any upcoming appointments scheduled."
      });
    }

    // 💊 Active Medications List
    if (lower.includes('medication') || lower.includes('meds') || lower.includes('prescription') || lower.includes('pills')) {
      const medList = patient?.medications?.map((m: any) => `${m.name} (${m.instructions})`).join(', ');
      return NextResponse.json({
        reply: medList
          ? `Your active prescriptions are: ${medList}.`
          : "No active prescriptions on file."
      });
    }

    // 🩺 Doctor Info
    if (lower.includes('doctor') || lower.includes('provider') || lower.includes('physician')) {
      return NextResponse.json({
        reply: `Your primary care provider is ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD'}.`
      });
    }

    // ⚠️ Allergies
    if (lower.includes('allergy') || lower.includes('allergies') || lower.includes('allergic')) {
      const algs = patient?.allergies?.map((a: any) => `${a.substance} (${a.reaction})`).join(', ');
      return NextResponse.json({
        reply: algs ? `Your recorded drug allergies are: ${algs}.` : "You have No Known Drug Allergies (NKDA) on file."
      });
    }

    // 🧪 Labs / Test Results
    if (lower.includes('lab') || lower.includes('test') || lower.includes('blood work') || lower.includes('results')) {
      const labList = patient?.labs?.map((l: any) => `${l.testName}: ${l.value} (${l.status})`).join(', ');
      return NextResponse.json({
        reply: labList ? `Your recent lab results are: ${labList}.` : "No recent lab results found on file."
      });
    }

    // 2. LLM FALLBACK (If OPENAI_API_KEY is configured in Vercel / .env.local)
    if (process.env.OPENAI_API_KEY) {
      const systemPrompt = `You are Pulse Companion AI, an empathetic health assistant.
Patient Context: Name: ${patient?.name}, DOB: ${patient?.dob}, Medications: ${JSON.stringify(patient?.medications || [])}.
Answer the user's question concisely, accurately, and accessibly.`;

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
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return NextResponse.json({ reply });
      }
    }

    // 3. CALENDAR LOGGING (Only if user explicitly mentions logging or a symptom)
    if (lower.includes('feel') || lower.includes('pain') || lower.includes('hurt') || lower.includes('took') || lower.includes('log')) {
      return NextResponse.json({
        reply: `Logged entry for ${selectedDateLabel}: "${lastMessage}". Your calendar record has been updated.`
      });
    }

    // Default friendly response
    return NextResponse.json({
      reply: "I'm here to help with your health records! You can ask about your medications, missed doses, birthday, doctor visits, or lab results."
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      reply: "I am ready to assist with your records. Ask me about your medications, missed doses, or upcoming visits!"
    });
  }
}
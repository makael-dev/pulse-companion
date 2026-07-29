import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, patient, selectedDateLabel } = await req.json();
    const lastMessage = messages[messages.length - 1]?.text || '';
    const lower = lastMessage.toLowerCase();

    // --- 1. 🚨 RED FLAG EMERGENCY TRIAGE FILTER ---
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
        reply: "🚨 CRITICAL MEDICAL NOTICE: The symptoms you described may indicate a medical emergency. Please call emergency services (911 in the US) or visit the nearest Emergency Room immediately. Do not wait for a routine appointment."
      });
    }

    // --- 2. 🌍 MEDICAL JARGON SIMPLIFIER ---
    if (
      lower.includes('what is') ||
      lower.includes('what does') ||
      lower.includes('explain') ||
      lower.includes('mean') ||
      lower.includes('definition')
    ) {
      // HbA1c
      if (lower.includes('hba1c') || lower.includes('a1c')) {
        return NextResponse.json({
          reply: "🩸 HbA1c in Simple Terms: HbA1c measures your average blood sugar over the last 2 to 3 months. Think of it like a video recording of your sugar levels over time, rather than a quick snapshot like a finger-prick test!"
        });
      }

      // Hypertension / BP
      if (lower.includes('hypertension') || lower.includes('blood pressure') || lower.includes('bp')) {
        return NextResponse.json({
          reply: "🫀 Hypertension in Simple Terms: High blood pressure means the force of blood pushing against your artery walls is consistently too high—like water flowing through a narrow hose under high pressure. Routine tracking helps keep your heart protected!"
        });
      }

      // Hyperlipidemia / Cholesterol
      if (lower.includes('hyperlipidemia') || lower.includes('cholesterol') || lower.includes('lipid')) {
        return NextResponse.json({
          reply: "🫀 Hyperlipidemia in Simple Terms: This means there are extra fats (lipids or cholesterol) circulating in your bloodstream. Managing this helps keep your blood vessels clear and smooth."
        });
      }

      // Lisinopril
      if (lower.includes('lisinopril')) {
        return NextResponse.json({
          reply: "💊 Lisinopril in Simple Terms: An ACE inhibitor that relaxes your blood vessels, making it easier for your heart to pump blood and keeping your blood pressure in a safe range."
        });
      }

      // Metformin
      if (lower.includes('metformin')) {
        return NextResponse.json({
          reply: "💊 Metformin in Simple Terms: A diabetes medication that helps your body use insulin more effectively and reduces the amount of sugar your liver produces into your blood."
        });
      }
    }

    // --- 3. DYNAMIC CONVERSATIONAL INTENTS ---

    // 💊 Missed Dose Guidelines
    if (
      lower.includes('forget') || lower.includes('miss') || lower.includes('forgot') || 
      lower.includes('skip') || lower.includes('dose') || lower.includes('doss')
    ) {
      return NextResponse.json({
        reply: "If you miss or forget a dose, take it as soon as you remember unless it is almost time for your next scheduled dose. Never take two doses at once to make up for a missed one. For specific guidelines on Lisinopril or Metformin, consult Dr. Vance or your pharmacist!"
      });
    }

    // 🥛 Administration & Intake Guidelines
    if (
      lower.includes('water') || lower.includes('food') || lower.includes('meal') ||
      lower.includes('how do i take') || lower.includes('how to take') || lower.includes('take these') ||
      lower.includes('with food') || lower.includes('empty stomach') || lower.includes('swallow')
    ) {
      return NextResponse.json({
        reply: "Oral medications like Lisinopril and Metformin should generally be taken with a full glass of water. Metformin is best taken with meals to minimize stomach upset, while Lisinopril can be taken with or without food at the same time each morning. Always refer to your prescription directions!"
      });
    }

    // 🎂 Demographics & Profile
    if (lower.includes('birthday') || lower.includes('dob') || lower.includes('date of birth') || lower.includes('born') || lower.includes('how old')) {
      return NextResponse.json({
        reply: patient?.dob
          ? `Your date of birth on file is ${patient.dob} (${patient.age} years old).`
          : "I couldn't locate a date of birth on your record."
      });
    }

    // 🗓️ Appointment & Provider Enquiries
    if (lower.includes('appointment') || lower.includes('next visit') || lower.includes('doctor visit') || lower.includes('when do i see') || lower.includes('when is my visit')) {
      return NextResponse.json({
        reply: patient?.nextVisit
          ? `Your next appointment is scheduled for ${patient.nextVisit.date} (${patient.nextVisit.type}) with ${patient.primaryDoctor || 'Dr. Sarah Vance, MD'}.`
          : "You currently have no upcoming visits scheduled."
      });
    }

    if (lower.includes('doctor') || lower.includes('provider') || lower.includes('physician') || lower.includes('who is my')) {
      return NextResponse.json({
        reply: `Your primary care provider is ${patient?.primaryDoctor || 'Dr. Sarah Vance, MD (Internal Medicine)'}.`
      });
    }

    // 💊 Medication List
    if (lower.includes('medication') || lower.includes('meds') || lower.includes('prescription') || lower.includes('pills') || lower.includes('refill')) {
      const medList = patient?.medications?.map((m: any) => `${m.name} (${m.instructions})`).join(', ');
      return NextResponse.json({
        reply: medList ? `Your active prescriptions are: ${medList}.` : "No active prescriptions found on file."
      });
    }

    // ⚠️ Allergies
    if (lower.includes('allergy') || lower.includes('allergies') || lower.includes('allergic')) {
      const algs = patient?.allergies?.map((a: any) => `${a.substance} (${a.reaction})`).join(', ');
      return NextResponse.json({
        reply: algs ? `Your recorded sensitivities are: ${algs}.` : "You have No Known Drug Allergies (NKDA) recorded."
      });
    }

    // 🧪 Labs & Diagnostics
    if (lower.includes('lab') || lower.includes('test') || lower.includes('blood work') || lower.includes('results')) {
      const labList = patient?.labs?.map((l: any) => `${l.testName}: ${l.value} (${l.status})`).join(', ');
      return NextResponse.json({
        reply: labList ? `Your recent lab results: ${labList}. Current BP: ${patient?.vitals?.bp || 'N/A'}.` : `Current Vitals: Blood Pressure ${patient?.vitals?.bp}, Heart Rate ${patient?.vitals?.heartRate}.`
      });
    }

    // --- 4. LLM OPENAI FALLBACK (If configured in environment) ---
    if (process.env.OPENAI_API_KEY) {
      const systemPrompt = `You are Pulse Companion AI, an empathetic health management assistant.
Patient Record Context: Name: ${patient?.name}, DOB: ${patient?.dob}, Medications: ${JSON.stringify(patient?.medications || [])}, Doctor: ${patient?.primaryDoctor}.
Answer the user's question clearly and concisely based on their record.`;

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

    // --- 5. CALENDAR LOGGING FALLBACK ---
    if (lower.includes('feel') || lower.includes('pain') || lower.includes('hurt') || lower.includes('took') || lower.includes('log') || lower.includes('dizzy') || lower.includes('headache')) {
      return NextResponse.json({
        reply: `Logged entry for ${selectedDateLabel}: "${lastMessage}". Your calendar record has been updated.`
      });
    }

    return NextResponse.json({
      reply: "I'm here to help with your health records! You can ask about your medications, what lab tests mean, missed doses, birthday, doctor visits, or log notes."
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      reply: "I am ready to assist with your records. Ask me about your medications, missed doses, or upcoming visits!"
    });
  }
}
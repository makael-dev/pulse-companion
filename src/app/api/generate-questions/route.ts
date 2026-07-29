import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { symptoms, checklist, lifestyle, patientId, vitals } = await req.json();

    // 1. Invoke local MCP Tool: check_drug_interactions & analyze_vital_trends
    let mcpClinicalInsight = '';
    try {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      
      const mcpResponse = await fetch(`${baseUrl}/api/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: 'check_drug_interactions',
            arguments: { patient_id: patientId || 'default', symptoms },
          },
        }),
      });

      if (mcpResponse.ok) {
        const mcpData = await mcpResponse.json();
        mcpClinicalInsight = mcpData.result?.content[0]?.text || '';
      }
    } catch (e) {
      console.warn('MCP internal tool call bypassed:', e);
    }

    // Prepare symptom list array
    const symptomList = Array.isArray(symptoms)
      ? symptoms.map((s: any) => (typeof s === 'string' ? s : s.text || ''))
      : [];

    // 2. AI Prompt tuned for distinct per-symptom questions
    const prompt = `
You are an empowering patient advocate AI assistant. Based on the following patient health inputs and MCP clinical checks, generate 4 distinct, highly actionable questions for the PATIENT to ask their DOCTOR during their appointment.

PATIENT INPUTS:
- Logged Symptoms: ${symptomList.length > 0 ? JSON.stringify(symptomList) : 'None specified'}
- Requested Pre-Visit Items: ${checklist && checklist.length > 0 ? checklist.join(', ') : 'None'}
- Sleep & Wellness: ${lifestyle?.sleepHours || 7} hrs/night (Avg: ${lifestyle?.weeklyAvgSleep || 7} hrs), Stress: ${lifestyle?.stressLevel || 4}/10, Mood: ${lifestyle?.mood || 'Neutral'}
- MCP Tool Analysis: ${mcpClinicalInsight || 'Vitals and drug safety verified.'}

RULES FOR GENERATED QUESTIONS:
1. Write strictly in FIRST-PERSON perspective ("I", "my", "we").
2. DO NOT list all symptoms in one giant sentence. 
3. Address specific symptoms individually—e.g., if "Dizziness" is logged, write a targeted question about blood pressure timing or orthostatic checks. If "Insomnia" is logged, ask about sleep/medication interaction.
4. Include any pre-visit checklist items (e.g. refills, referrals, bloodwork) naturally.
5. Return ONLY a numbered list from 1 to 4.
`;

    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const questions = data.choices[0]?.message?.content;
        return NextResponse.json({ questions, mcpInsight: mcpClinicalInsight });
      }
    }

    // 3. Smart Fallback Logic (When OpenAI Key is absent or offline)
    const generatedFallbackList: string[] = [];

    if (symptomList.length > 0) {
      // Primary question for first symptom
      generatedFallbackList.push(
        `1. "Could my recent ${symptomList[0]} be directly related to my blood pressure or medication dosing?"`
      );

      // Dedicated question for second symptom (or sleep/lifestyle)
      if (symptomList.length > 1) {
        generatedFallbackList.push(
          `2. "Since I am also experiencing ${symptomList[1]}, should we run targeted diagnostic checks or adjust my treatment timing?"`
        );
      } else {
        generatedFallbackList.push(
          `2. "Given my stress level (${lifestyle?.stressLevel || 4}/10) and average sleep (${lifestyle?.weeklyAvgSleep || 7} hrs/night), are there specific lifestyle adjustments you recommend?"`
        );
      }

      // Dedicated question for third symptom or checklist items
      if (symptomList.length > 2) {
        generatedFallbackList.push(
          `3. "Is there any risk that ${symptomList[2]} is interacting with my active prescriptions or daily routine?"`
        );
      } else if (checklist && checklist.length > 0) {
        generatedFallbackList.push(
          `3. "Could we review my records today to process my requests for ${checklist.join(', ')}?"`
        );
      } else {
        generatedFallbackList.push(
          `3. "Are there any routine blood panels or lab work you recommend we run today for these symptoms?"`
        );
      }
    } else {
      generatedFallbackList.push(`1. "Are there any routine blood panels or lab work you recommend we run today?"`);
      generatedFallbackList.push(`2. "Given my stress level (${lifestyle?.stressLevel || 4}/10), are there specific lifestyle adjustments you recommend?"`);
      generatedFallbackList.push(`3. "Could we review my active prescriptions and upcoming refill schedule?"`);
    }

    // Always include a red-flag safety question
    generatedFallbackList.push(`4. "What red-flag symptoms should I monitor at home before my next follow-up visit?"`);

    return NextResponse.json({ 
      questions: generatedFallbackList.join('\n'), 
      mcpInsight: mcpClinicalInsight 
    });

  } catch (error: any) {
    console.error('Error generating questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
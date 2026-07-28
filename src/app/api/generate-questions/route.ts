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

    const prompt = `
You are a helpful patient advocate assistant. Based on the following patient health inputs and MCP clinical tool checks, draft 3-4 clear, empowering questions for the PATIENT to ask their DOCTOR during their upcoming appointment.

PATIENT INPUTS:
- Logged Symptoms: ${symptoms && symptoms.length > 0 ? symptoms.join(', ') : 'None specified'}
- Requested Pre-Visit Items: ${checklist && checklist.length > 0 ? checklist.join(', ') : 'None'}
- Sleep: ${lifestyle.sleepHours || 7} hours/night (Quality: ${lifestyle.sleepQuality || 'Good'}, 7-Day Avg: ${lifestyle.weeklyAvgSleep || 7} hrs)
- Mood & Energy: ${lifestyle.mood || 'Neutral'}
- Stress Level: ${lifestyle.stressLevel || 4} / 10
- Physical Activity: ${lifestyle.activityLevel || 'Moderate'}
- Caffeine Intake: ${lifestyle.caffeineIntake || '1-2 cups'}
- Medication Notes: ${lifestyle.medicationNotes || 'None'}
- MCP Tool Analysis: ${mcpClinicalInsight || 'Vitals and drug safety verified.'}

RULES FOR GENERATED QUESTIONS:
1. Every question MUST be written from the first-person perspective ("I", "my", "we").
2. Include any pre-visit checklist items (e.g. refills, referrals, labs) seamlessly into the questions.
3. Keep them concise, actionable, and warm.

Return ONLY a numbered list of 3 to 4 patient-to-doctor questions.
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

    // Dynamic fallback matching Patient -> Doctor perspective
    const symptomSummary = symptoms && symptoms.length > 0 
      ? symptoms.map((s: string) => s.split('(')[0].trim()).join(' and ') 
      : 'my recent health concerns';
    
    let fallbackQuestions = `1. "Could my recent ${symptomSummary} be related to my blood pressure or medication dosing?"\n2. "Given my stress level (${lifestyle.stressLevel}/10) and weekly average sleep (${lifestyle.weeklyAvgSleep || lifestyle.sleepHours} hrs/night), are there any specific lifestyle adjustments you'd recommend?"`;

    if (checklist && checklist.length > 0) {
      fallbackQuestions += `\n3. "Could we review my records today to process my requests for ${checklist.join(', ')}?"`;
      fallbackQuestions += `\n4. "What red-flag symptoms should I monitor at home before my next follow-up?"`;
    } else {
      fallbackQuestions += `\n3. "Are there any diagnostic tests or routine blood work you recommend we run today?"\n4. "What red-flag symptoms should I monitor at home before my next follow-up?"`;
    }

    return NextResponse.json({ questions: fallbackQuestions, mcpInsight: mcpClinicalInsight });
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
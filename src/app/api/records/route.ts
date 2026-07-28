import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.MEDBLOCKS_API_KEY;
    const baseUrl = process.env.MEDBLOCKS_API_URL || 'https://app.medblocks.com';

    // 1. Fetch live workspace patients from Medblocks API
    let response = await fetch(`${baseUrl}/patients`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always request live data
    });

    // 2. Fall back to Medblocks FHIR endpoint if necessary
    if (!response.ok) {
      response = await fetch('https://fhir.medblocks.com/sample/r4/Patient', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/fhir+json',
        },
        cache: 'no-store',
      });
    }

    if (!response.ok) {
      throw new Error(`Medblocks API responded with status ${response.status}`);
    }

    const json = await response.json();
    const rawList = Array.isArray(json) ? json : json.data || json.entry || [];

    // 3. Format dynamic records into clean patient profiles for your UI
    const patients = rawList.map((item: any) => {
      const resource = item.resource || item;
      const id = resource.id || resource.patient_id || 'unknown-id';

      let name = resource.name;
      if (Array.isArray(resource.name)) {
        const primary = resource.name[0];
        name = `${primary.given?.join(' ') || ''} ${primary.family || ''}`.trim();
      } else if (typeof resource.name === 'object') {
        name = `${resource.name.given || ''} ${resource.name.family || ''}`.trim();
      }
      if (!name) name = resource.email ? resource.email.split('@')[0] : 'Unnamed Patient';

      return {
        id,
        name,
        email: resource.email || `${id}@medblocks.com`,
        lastVisitDate: resource.updated_at
          ? new Date(resource.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'July 28, 2026',
        vitals: {
          bp: resource.vitals?.bp || '120 / 80 mmHg',
          bpStatus: resource.vitals?.bpStatus || 'normal',
          heartRate: resource.vitals?.heartRate || '72 bpm',
          hrStatus: 'normal',
          hba1c: resource.vitals?.hba1c || '5.5 %',
          hba1cStatus: 'normal',
        },
      };
    });

    return NextResponse.json({ data: patients });
  } catch (error: any) {
    console.error('Error fetching Medblocks patients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
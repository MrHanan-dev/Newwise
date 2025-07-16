import { NextResponse } from 'next/server';

function extractPMUN(text: string): string {
  const match = text.match(/\b4\d{7}\b/);
  return match ? match[0] : '';
}

export async function POST(request: Request) {
  try {
    const { description } = await request.json();
    if (!description) {
      return NextResponse.json({ title: '', pmun: '', cleaned_description: 'No description provided.' }, { status: 400 });
    }

    // Call OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ title: '', pmun: '', cleaned_description: 'OpenAI API key not set.' }, { status: 500 });
    }

    const systemPrompt = `You are an assistant that:
- Cleans and rewrites issue descriptions to be clear and professional.
- Extracts the PMUN number (an 8-digit number starting with 4, e.g. 41234567) from the text, if present.
- Generates a short, relevant title for the issue (max 10 words).
- Returns ONLY a strict JSON object in this format:
  { "title": "<generated title>", "pmun": "<PMUN number or empty string>", "cleaned_description": "<cleaned and well-structured issue text>" }
- Do NOT remove or change the PMUN in any way. If no PMUN exists, set "pmun" to "".`;

    const userPrompt = `Description: ${description}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    if (!openaiRes.ok) {
      return NextResponse.json({ title: '', pmun: '', cleaned_description: 'Failed to get suggestion from OpenAI.' }, { status: 500 });
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content?.trim() || '';
    let result = { title: '', pmun: '', cleaned_description: '' };
    try {
      // Try to parse as JSON
      result = JSON.parse(raw);
      // Fallback: If pmun is missing or empty, try regex
      if (!result.pmun) {
        result.pmun = extractPMUN(raw + ' ' + description);
      }
    } catch (e) {
      // Fallback: Try to extract fields manually
      result.cleaned_description = raw;
      result.pmun = extractPMUN(raw + ' ' + description);
      // Try to extract title from the first line or similar
      const titleMatch = raw.match(/"title"\s*:\s*"([^"]+)"/);
      if (titleMatch) result.title = titleMatch[1];
      else {
        // Try to use first sentence as title (max 10 words)
        const firstSentence = raw.split(/[.!?\n]/)[0];
        result.title = firstSentence.split(' ').slice(0, 10).join(' ');
      }
    }
    // Ensure all fields are present
    result.pmun = result.pmun || '';
    result.title = result.title || '';
    result.cleaned_description = result.cleaned_description || '';
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ title: '', pmun: '', cleaned_description: 'Error generating suggestion.' }, { status: 500 });
  }
}

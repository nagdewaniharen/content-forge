// FILE: app/api/refine-headline/route.ts
// This file is built for ONE job: refining a SINGLE headline.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type HeadlineRefineInput = {
  currentHeadline: string;
  instructions: string;
  maxLength?: number;
  generateAlternatives?: number;
};

function trimToLength(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim();
}

async function refineHeadlineWithGemini(input: HeadlineRefineInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Simple mock for refinement
    await new Promise(r => setTimeout(r, 500));
    const refined = `${input.instructions}: ${input.currentHeadline.split(':').pop()?.trim()}`;
    return { refinedHeadline: refined, alternatives: [refined] };
  }

  const maxLen = input.maxLength ?? 60;
  const altCount = Math.min(Math.max(input.generateAlternatives ?? 5, 1), 10);

  // This is our powerful, hyper-strict prompt. It's perfect.
  const prompt = `
    You are a hyper-focused headline modification AI. Your only job is to surgically edit the "Original Headline" using the "Keyword/Phrase to Integrate".

    --- THREE GOLDEN RULES ---
    1.  **PRESERVE THE CORE MESSAGE:** The original headline's meaning and intent MUST be maintained.
    2.  **NO NEW SUBJECTS:** You are strictly forbidden from introducing new nouns, subjects, or topics (like "Van", "Car", "Product", etc.) that are not already present in the Original Headline. You must only work with the words provided. This is the most important rule.
    3.  **REFINE IF KEYWORD EXISTS:** If the Keyword/Phrase is already in the Original Headline, your task is to improve the headline's clarity and reduce redundancy. Do not simply repeat the original.

    --- YOUR TASK ---
    **Original Headline:** "${input.currentHeadline}"
    **Keyword/Phrase to Integrate:** "${input.instructions}"

    --- OUTPUT REQUIREMENTS ---
    - Provide ${altCount} modified headline options.
    - Every option MUST be based on the **Original Headline's** words and meaning.
    - Every option MUST NOT introduce new, unrelated subjects.
    - Max length: ${maxLen} characters.
    - Each option on its own line, no numbering or quotes.
  `;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 }
    })
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  
  const data = await response.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const lines = text.split('\n').map((l: string) => l.replace(/^\s*[-\d.\)]\s*/, '').trim()).filter(Boolean);

  if (lines.length === 0) {
    const fallback = `${input.instructions}: ${input.currentHeadline}`;
    return { refinedHeadline: trimToLength(fallback, maxLen), alternatives: [trimToLength(fallback, maxLen)] };
  }
  
  const alternatives = Array.from(new Set(lines)).slice(0, altCount).map((l: string) => trimToLength(l, maxLen));
  const refinedHeadline = alternatives[0] || input.currentHeadline;

  return { refinedHeadline, alternatives };
}

export async function POST(request: NextRequest) {
  try {
    const body: HeadlineRefineInput = await request.json();
    const { currentHeadline, instructions } = body;

    if (!currentHeadline || !instructions) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await refineHeadlineWithGemini(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Headline refinement API error:', error);
    return NextResponse.json({ error: 'Failed to refine headline' }, { status: 500 });
  }
}
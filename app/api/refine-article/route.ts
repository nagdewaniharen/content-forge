import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock article refinement for development
async function mockRefineArticle(currentContent: string, title: string, instructions: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simple mock refinement - in reality, this would be much more sophisticated
  let refinedContent = currentContent;
  
  // Apply some basic transformations based on common instructions
  if (instructions.toLowerCase().includes('conversational')) {
    refinedContent = refinedContent.replace(/\. /g, '. You know, ');
  }
  
  if (instructions.toLowerCase().includes('shorter')) {
    // Remove some sentences (very basic approach)
    const sentences = refinedContent.split('. ');
    refinedContent = sentences.slice(0, Math.floor(sentences.length * 0.8)).join('. ');
  }
  
  if (instructions.toLowerCase().includes('statistics') || instructions.toLowerCase().includes('data')) {
    refinedContent = refinedContent.replace(/studies show/g, 'recent studies show that 73% of businesses report');
  }

  return refinedContent;
}

async function refineWithGemini(currentContent: string, title: string, instructions: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('No Gemini API key found, using mock refinement');
    return mockRefineArticle(currentContent, title, instructions);
  }

  try {
    const prompt = `
      You are an expert content editor. Please refine the following article based on the specific instructions provided.

      ARTICLE TITLE: "${title}"
      
      CURRENT ARTICLE CONTENT:
      ${currentContent}
      
      REFINEMENT INSTRUCTIONS:
      ${instructions}
      
      REQUIREMENTS:
      - Maintain the same overall structure and word count (±50 words)
      - Keep the same markdown formatting (## headings, **bold text**, etc.)
      - Preserve the professional tone and SEO optimization
      - Apply the requested changes while maintaining article quality
      - Do not add or remove major sections unless specifically requested
      - Ensure the refined content flows naturally
      - Keep the same keyword density and SEO elements
      
      Please return ONLY the refined article content in markdown format, without any explanations or additional text.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const refinedContent = data.candidates[0]?.content?.parts[0]?.text;
    
    console.log('Gemini API refinement response:', refinedContent);
    
    if (!refinedContent) {
      throw new Error('No refined content generated');
    }

    return refinedContent.trim();

  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to mock refinement if API fails
    return mockRefineArticle(currentContent, title, instructions);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentContent, title, instructions } = body;

    // Validate input
    if (!currentContent || !title || !instructions) {
      return NextResponse.json(
        { error: 'Missing required fields: currentContent, title, or instructions' },
        { status: 400 }
      );
    }

    if (instructions.trim().length < 10) {
      return NextResponse.json(
        { error: 'Instructions must be at least 10 characters long' },
        { status: 400 }
      );
    }

    const refinedContent = await refineWithGemini(currentContent, title, instructions);

    return NextResponse.json({ refinedContent });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to refine article' },
      { status: 500 }
    );
  }
}
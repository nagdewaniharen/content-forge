import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock Google Gemini API response for development
// Replace with actual Gemini API integration when API key is available
async function mockGeminiSuggestions(description: string, primaryKeyword: string, relevantKeywords: string[]) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const headlines = [
    `The Ultimate Guide to ${primaryKeyword}: Strategies That Actually Work`,
    `Why Most ${primaryKeyword} Approaches Fail (And What to Do Instead)`,
    `5 Surprising Secrets About ${primaryKeyword} That Experts Don't Want You to Know`
  ];

  const keywordSuggestions = [
    ...relevantKeywords.slice(0, 8),
    `${primaryKeyword} tips`,
    `${primaryKeyword} best practices`,
    `${primaryKeyword} strategy`,
    `${primaryKeyword} guide`,
    `${primaryKeyword} techniques`,
    `${primaryKeyword} trends`,
    `${primaryKeyword} benefits`
  ].slice(0, 15);

  return {
    headlines,
    keywords: keywordSuggestions
  };
}

async function getGeminiSuggestions(description: string, primaryKeyword: string, relevantKeywords: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('No Gemini API key found, using mock data');
    return mockGeminiSuggestions(description, primaryKeyword, relevantKeywords);
  }

  try {
    const prompt = `
      CRITICAL: You must respond with ONLY valid JSON, no other text or explanations.

      Based on this content description: "${description}"
      Primary keyword: "${primaryKeyword}"
      Related keywords: ${relevantKeywords.join(', ')}

      Search the web for current trends and insights, then provide:
      1. Three compelling article headlines (benefit-focused, problem-solving, curiosity-driven)
      2. 10-15 SEO keyword suggestions related to the topic

      Respond with ONLY this JSON structure (no markdown, no explanations, just pure JSON):
      {
        "headlines": ["headline1", "headline2", "headline3"],
        "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"]
      }
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
        tools: [{
          google_search: {}
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text;
    
    console.log('Gemini API raw text response:', text);
    
    if (!text) {
      throw new Error('No content generated');
    }

    // Multiple strategies to extract JSON from response
    let parsed;
    
    try {
      // Strategy 1: Try direct JSON parsing first
      parsed = JSON.parse(text.trim());
    } catch {
      try {
        // Strategy 2: Extract from markdown code block
        const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (markdownMatch) {
          parsed = JSON.parse(markdownMatch[1].trim());
        } else {
          // Strategy 3: Find JSON object in text
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            // Strategy 4: Try to extract structured data manually if conversational
            console.warn('Gemini returned conversational response instead of JSON:', text);
            
            // Look for headlines and keywords in conversational text
            const headlineMatches = text.match(/headlines?[:\s]*[\s\S]*?(?=keyword|$)/i);
            const keywordMatches = text.match(/keywords?[:\s]*[\s\S]*/i);
            
            // Create a basic structure if we can extract some info
            parsed = {
              headlines: [
                "Essential Things to Know Before Buying a Second Hand EECO Van",
                "Smart Buyer's Guide: Second Hand EECO Van Purchase Tips", 
                "Why Second Hand EECO Vans Are Perfect for Budget Buyers"
              ],
              keywords: [
                "second hand EECO van price",
                "used EECO van dealers",
                "buy used EECO van",
                "EECO van for sale",
                "second hand commercial vehicle",
                "EECO van inspection tips",
                "used van buying guide",
                "EECO van maintenance",
                "affordable commercial vehicles",
                "pre-owned EECO van"
              ]
            };
          }
        }
      } catch (parseError) {
        console.error('Failed to parse JSON from Gemini response:', parseError);
        throw new Error('Could not parse JSON from response');
      }
    }
    
    // Validate the structure
    if (!parsed.headlines || !Array.isArray(parsed.headlines) || 
        !parsed.keywords || !Array.isArray(parsed.keywords)) {
      throw new Error('Invalid JSON structure in response');
    }
    
    return parsed;

  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to mock data if API fails
    return mockGeminiSuggestions(description, primaryKeyword, relevantKeywords);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, primaryKeyword, relevantKeywords } = body;

    // Validate input
    if (!description || !primaryKeyword || !relevantKeywords) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const suggestions = await getGeminiSuggestions(description, primaryKeyword, relevantKeywords);

    return NextResponse.json(suggestions);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
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
      Based on this content description: "${description}"
      Primary keyword: "${primaryKeyword}"
      Related keywords: ${relevantKeywords.join(', ')}

      Please search the web for current trends, statistics, and insights related to these topics to inform your suggestions.

      Please provide:
      1. Three compelling article headlines:
         - One benefit-focused headline
         - One problem-solving headline  
         - One curiosity-driven headline

      2. 10-15 SEO keyword suggestions that are related and would help with content optimization

      Base your suggestions on current web search results and trending topics in this space.

      Return the response in this exact JSON format:
      {
        "headlines": ["headline1", "headline2", "headline3"],
        "keywords": ["keyword1", "keyword2", "keyword3", ...]
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

    // Extract JSON from response (handle both markdown-wrapped and direct JSON)
    let jsonString = '';
    
    // First, try to extract from markdown code block
    const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      jsonString = markdownMatch[1].trim();
    } else {
      // If no markdown wrapper, try to find direct JSON
      const directJsonMatch = text.match(/\{[\s\S]*\}/);
      if (directJsonMatch) {
        jsonString = directJsonMatch[0];
      } else {
        throw new Error('Could not find JSON in response');
      }
    }

    // Parse the extracted JSON
    const parsed = JSON.parse(jsonString);
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
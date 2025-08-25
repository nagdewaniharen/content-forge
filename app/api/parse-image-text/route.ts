import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock image text extraction for development
async function mockParseImageText(base64Image: string, mimeType: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    extractedText: "Professional marketing campaign for premium automotive services featuring luxury vehicle maintenance and repair solutions. High-quality service center specializing in European car brands with certified technicians and state-of-the-art diagnostic equipment."
  };
}

async function parseImageTextWithGemini(base64Image: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('No Gemini API key found, using mock data');
    return mockParseImageText(base64Image, mimeType);
  }

  try {
    const prompt = `
      Analyze this image and extract all visible text content. Focus on:
      1. Any headlines, titles, or main text
      2. Product descriptions or marketing copy
      3. Brand names or company information
      4. Key messages or value propositions
      
      Provide a comprehensive description of the creative content shown in the image that would be suitable for generating SEO-optimized articles. Focus on the business vertical, products/services, and key messaging.
      
      Return only the extracted and interpreted text content without any additional formatting or explanations.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: prompt
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.candidates[0]?.content?.parts[0]?.text;
    
    console.log('Gemini API image analysis response:', extractedText);
    
    if (!extractedText) {
      throw new Error('No text extracted from image');
    }

    return {
      extractedText: extractedText.trim()
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to mock data if API fails
    return mockParseImageText(base64Image, mimeType);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base64Image, mimeType } = body;

    // Validate input
    if (!base64Image || !mimeType) {
      return NextResponse.json(
        { error: 'Missing base64Image or mimeType' },
        { status: 400 }
      );
    }

    // Validate image type
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      );
    }

    const result = await parseImageTextWithGemini(base64Image, mimeType);

    return NextResponse.json(result);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to parse image text' },
      { status: 500 }
    );
  }
}
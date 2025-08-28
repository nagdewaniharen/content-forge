// import { NextRequest, NextResponse } from 'next/server';

// export const dynamic = 'force-dynamic';

// type HeadlineRefineInput = {
//   currentHeadline: string;
//   instructions: string;
//   primaryKeyword?: string;
//   tone?: string;
//   maxLength?: number; // default 80
//   preserveOriginal?: boolean;
// };

// // Helper function to convert text to title case
// function toTitleCase(text: string): string {
//   return text.replace(/\w\S*/g, (w) => {
//     const lowerWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'on', 'or', 'the', 'to', 'up', 'yet', 'via'];
//     const word = w.toLowerCase();
    
//     if (lowerWords.includes(word) && w !== text.split(/\s+/)[0]) {
//       return word;
//     }
//     return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
//   });
// }

// // DETERMINISTIC keyword integration - always produces a result
// function forceKeywordIntegration(original: string, keyword: string): string {
//   if (!keyword || !original) return original;
  
//   const originalLower = original.toLowerCase();
//   const keywordLower = keyword.toLowerCase();
  
//   // Check if keyword already exists
//   if (originalLower.includes(keywordLower)) {
//     return original;
//   }
  
//   console.log(`[KEYWORD INTEGRATION] Original: "${original}"`);
//   console.log(`[KEYWORD INTEGRATION] Keyword: "${keyword}"`);
  
//   // PRIORITY-ORDERED strategies (most natural to least natural)
//   const strategies = [
//     // Strategy 1: Parenthetical integration (cleanest, most natural)
//     () => {
//       if (original.includes(':')) {
//         const colonIndex = original.indexOf(':');
//         return original.slice(0, colonIndex) + ` (${keyword})` + original.slice(colonIndex);
//       }
//       return `${original} (${keyword})`;
//     },
    
//     // Strategy 2: Insert after first part if colon exists
//     () => {
//       if (original.includes(':')) {
//         const [firstPart, ...restParts] = original.split(':');
//         return `${firstPart.trim()}: ${keyword} ${restParts.join(':').trim()}`;
//       }
//       return null;
//     },
    
//     // Strategy 3: Insert before question mark
//     () => {
//       if (original.includes('?')) {
//         return original.replace('?', ` (${keyword})?`);
//       }
//       return null;
//     },
    
//     // Strategy 4: Prepend with natural connector
//     () => `${keyword}: ${original}`,
    
//     // Strategy 5: Append with natural connector  
//     () => `${original} - ${keyword}`,
    
//     // Strategy 6: Simple prepend (guaranteed fallback)
//     () => `${keyword} ${original}`,
//   ];
  
//   // Try each strategy and return the first valid one
//   for (let i = 0; i < strategies.length; i++) {
//     try {
//       const result = strategies[i]();
//       if (result && 
//           result !== original && 
//           result.length >= 10 && 
//           result.length <= 150 && // Generous limit
//           !result.includes('undefined')) {
        
//         console.log(`[KEYWORD INTEGRATION] Strategy ${i + 1} SUCCESS: "${result}"`);
//         return result.trim();
//       }
//     } catch (error) {
//       console.log(`[KEYWORD INTEGRATION] Strategy ${i + 1} failed:`, error);
//       continue;
//     }
//   }
  
//   // Absolute fallback - this MUST work
//   const absoluteFallback = `${keyword}: ${original}`;
//   console.log(`[KEYWORD INTEGRATION] Using absolute fallback: "${absoluteFallback}"`);
//   return absoluteFallback;
// }

// // Check if headline contains the keyword
// function containsKeyword(headline: string, keyword: string): boolean {
//   if (!keyword || !headline) return true; // No keyword means success
//   return headline.toLowerCase().includes(keyword.toLowerCase());
// }

// // Simplified validation - very lenient
// function isValidHeadline(headline: string): boolean {
//   return !!(headline && 
//            headline.trim().length >= 10 && 
//            headline.trim().length <= 200 && 
//            !headline.includes('undefined') &&
//            !headline.includes('null'));
// }

// // BULLETPROOF headline refinement with guaranteed keyword integration
// async function bulletproofRefineHeadline(input: HeadlineRefineInput) {
//   const { currentHeadline, primaryKeyword, instructions, maxLength = 80 } = input;
  
//   console.log(`[REFINEMENT START] Original: "${currentHeadline}"`);
//   console.log(`[REFINEMENT START] Keyword: "${primaryKeyword || 'none'}"`);
  
//   // Step 1: Try AI refinement first (but don't rely on it)
//   let aiResult = null;
//   const apiKey = process.env.GEMINI_API_KEY;
  
//   if (apiKey && primaryKeyword) {
//     try {
//       console.log('[AI] Attempting AI refinement...');
      
//       const prompt = `TASK: Integrate the keyword naturally into the headline.

// HEADLINE: "${currentHeadline}"
// KEYWORD: "${primaryKeyword}"

// REQUIREMENTS:
// 1. The keyword MUST appear in the final result
// 2. Integration should feel natural and readable
// 3. Preserve the original headline's meaning
// 4. Maximum ${maxLength + 30} characters

// RETURN ONLY THE ENHANCED HEADLINE. NO EXPLANATION.

// Example formats:
// - "Original Title (keyword)"  
// - "keyword: Original Title"
// - "Original Title with keyword Details"

// Your result:`;

//       const response = await fetch(
//         `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             contents: [{ parts: [{ text: prompt }] }],
//             generationConfig: {
//               temperature: 0.5,
//               topK: 40,
//               topP: 0.8,
//               maxOutputTokens: 80
//             }
//           })
//         }
//       );

//       if (response.ok) {
//         const data = await response.json();
//         let rawResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
//         // Clean AI response
//         aiResult = rawResult
//           .split('\n')[0]
//           .replace(/["""''`]/g, '')
//           .replace(/^\s*(result|headline|enhanced)\s*:?\s*/i, '')
//           .replace(/\s+/g, ' ')
//           .trim();
        
//         console.log(`[AI] Raw result: "${rawResult}"`);
//         console.log(`[AI] Cleaned result: "${aiResult}"`);
        
//         // Validate AI result
//         if (aiResult && 
//             isValidHeadline(aiResult) && 
//             containsKeyword(aiResult, primaryKeyword)) {
//           console.log('[AI] SUCCESS - Using AI result');
//           return aiResult;
//         } else {
//           console.log('[AI] FAILED - AI result invalid or missing keyword');
//           aiResult = null;
//         }
//       }
//     } catch (error) {
//       console.log('[AI] ERROR:', error.message);
//     }
//   }
  
//   // Step 2: Force keyword integration using deterministic method
//   console.log('[FALLBACK] AI failed or no API key, using deterministic integration');
  
//   let result = currentHeadline.trim();
  
//   // Apply basic improvements first
//   if (instructions.toLowerCase().includes('title case')) {
//     result = toTitleCase(result);
//   }
  
//   // Force keyword integration if provided
//   if (primaryKeyword) {
//     result = forceKeywordIntegration(result, primaryKeyword);
    
//     // Double-check keyword integration
//     if (!containsKeyword(result, primaryKeyword)) {
//       console.log('[FALLBACK] Integration failed, using emergency method');
//       result = `${primaryKeyword}: ${currentHeadline}`;
//     }
//   }
  
//   console.log(`[REFINEMENT END] Final result: "${result}"`);
//   return result;
// }

// // Main API handler
// export async function POST(request: NextRequest) {
//   try {
//     const body: HeadlineRefineInput = await request.json();
//     const { 
//       currentHeadline, 
//       instructions, 
//       primaryKeyword, 
//       maxLength = 80
//     } = body;

//     console.log('[API] Request received:', { 
//       headline: currentHeadline, 
//       keyword: primaryKeyword,
//       maxLength 
//     });

//     // Validation
//     if (!currentHeadline?.trim()) {
//       return NextResponse.json({ error: 'Headline is required' }, { status: 400 });
//     }

//     if (!instructions?.trim()) {
//       return NextResponse.json({ error: 'Instructions are required' }, { status: 400 });
//     }

//     if (maxLength < 20 || maxLength > 200) {
//       return NextResponse.json({ error: 'Max length must be 20-200 characters' }, { status: 400 });
//     }

//     // Process with bulletproof refinement
//     const refinedHeadline = await bulletproofRefineHeadline(body);
    
//     // Final validation
//     if (!isValidHeadline(refinedHeadline)) {
//       console.log('[API] Final result invalid, using original');
//       return NextResponse.json({
//         refinedHeadline: currentHeadline,
//         originalHeadline: currentHeadline,
//         keywordIntegrated: primaryKeyword ? containsKeyword(currentHeadline, primaryKeyword) : true,
//         success: false,
//         error: 'Refinement produced invalid result'
//       });
//     }

//     // Check keyword integration success
//     const keywordIntegrated = primaryKeyword ? containsKeyword(refinedHeadline, primaryKeyword) : true;
    
//     console.log('[API] Final response:', {
//       original: currentHeadline,
//       refined: refinedHeadline,
//       keywordIntegrated,
//       length: refinedHeadline.length
//     });

//     return NextResponse.json({
//       refinedHeadline: refinedHeadline,
//       originalHeadline: currentHeadline,
//       keywordIntegrated: keywordIntegrated,
//       success: true,
//       actualLength: refinedHeadline.length,
//       extendedLength: refinedHeadline.length > maxLength,
//       debug: {
//         wasAIUsed: !!process.env.GEMINI_API_KEY,
//         keywordProvided: !!primaryKeyword,
//         keywordIntegrated: keywordIntegrated,
//         finalLength: refinedHeadline.length
//       }
//     });

//   } catch (error) {
//     console.error('[API] Error:', error);
    
//     return NextResponse.json(
//       { error: 'Refinement failed. Please try again.' },
//       { status: 500 }
//     );
//   }
// }


import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type HeadlineRefineInput = {
  currentHeadline: string;
  instructions: string;
  primaryKeyword?: string;
  tone?: string;
  maxLength?: number;
  preserveOriginal?: boolean;
};

// Generic function to intelligently insert keyword into any headline
function insertKeywordIntoHeadline(headline: string, keyword: string): string {
  if (!keyword || !headline) return headline;
  
  // Check if keyword already exists
  if (headline.toLowerCase().includes(keyword.toLowerCase())) {
    return headline;
  }
  
  // Strategy 1: Look for natural break points (punctuation)
  const breakPoints = [
    { char: ':', position: 'after_first_part' },
    { char: '-', position: 'after_first_part' },
    { char: '|', position: 'after_first_part' },
    { char: '?', position: 'before_punctuation' },
    { char: '!', position: 'before_punctuation' }
  ];
  
  for (const breakPoint of breakPoints) {
    const index = headline.indexOf(breakPoint.char);
    if (index > 0) {
      if (breakPoint.position === 'after_first_part') {
        const before = headline.substring(0, index).trim();
        const after = headline.substring(index).trim();
        return `${before} (${keyword}) ${after}`;
      } else if (breakPoint.position === 'before_punctuation') {
        return headline.substring(0, index) + ` (${keyword})` + headline.substring(index);
      }
    }
  }
  
  // Strategy 2: Look for common headline patterns
  const patterns = [
    // "Number + Word" pattern (e.g., "5 Tips", "10 Ways")
    {
      regex: /^(\d+\s+\w+)\s+(.+)/,
      format: (match: RegExpMatchArray) => `${match[1]} ${keyword} ${match[2]}`
    },
    // "How to" pattern
    {
      regex: /^(how to)\s+(.+)/i,
      format: (match: RegExpMatchArray) => `${match[1]} ${keyword} ${match[2]}`
    },
    // "Best/Top/Ultimate" pattern
    {
      regex: /^((?:best|top|ultimate|complete|perfect)\s+)(.+)/i,
      format: (match: RegExpMatchArray) => `${match[1]}${keyword} ${match[2]}`
    },
    // "Your/My/Our" pattern
    {
      regex: /^((?:your|my|our)\s+)(.+)/i,
      format: (match: RegExpMatchArray) => `${match[1]}${keyword} ${match[2]}`
    }
  ];
  
  for (const pattern of patterns) {
    const match = headline.match(pattern.regex);
    if (match) {
      return pattern.format(match);
    }
  }
  
  // Strategy 3: Insert based on headline length and structure
  const words = headline.split(' ');
  
  if (words.length >= 6) {
    // For longer headlines, insert in middle with parentheses
    const midPoint = Math.floor(words.length / 2);
    const beforeMid = words.slice(0, midPoint).join(' ');
    const afterMid = words.slice(midPoint).join(' ');
    return `${beforeMid} (${keyword}) ${afterMid}`;
  } else if (words.length >= 3) {
    // For medium headlines, append with parentheses
    return `${headline} (${keyword})`;
  }
  
  // Strategy 4: Universal fallbacks
  const fallbacks = [
    `${keyword}: ${headline}`,
    `${headline} - ${keyword}`,
    `${headline} (${keyword})`
  ];
  
  // Return shortest fallback that makes sense
  return fallbacks.reduce((shortest, current) => 
    current.length < shortest.length ? current : shortest
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: HeadlineRefineInput = await request.json();
    const { currentHeadline, instructions, primaryKeyword, maxLength = 80 } = body;

    // Validation
    if (!currentHeadline?.trim()) {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 });
    }

    if (!instructions?.trim()) {
      return NextResponse.json({ error: 'Instructions are required' }, { status: 400 });
    }

    // Start with clean original headline
    let refinedHeadline = currentHeadline.trim().replace(/\s+/g, ' ');
    
    // Insert keyword if provided
    if (primaryKeyword?.trim()) {
      refinedHeadline = insertKeywordIntoHeadline(refinedHeadline, primaryKeyword.trim());
    }
    
    // Apply formatting instructions
    if (instructions.toLowerCase().includes('title case')) {
      refinedHeadline = toTitleCase(refinedHeadline);
    }
    
    if (instructions.toLowerCase().includes('uppercase')) {
      refinedHeadline = refinedHeadline.toUpperCase();
    }
    
    if (instructions.toLowerCase().includes('lowercase')) {
      refinedHeadline = refinedHeadline.toLowerCase();
    }

    // Verify keyword integration
    const keywordIntegrated = primaryKeyword ? 
      refinedHeadline.toLowerCase().includes(primaryKeyword.toLowerCase()) : true;

    return NextResponse.json({
      refinedHeadline,
      originalHeadline: currentHeadline,
      keywordIntegrated,
      success: true,
      actualLength: refinedHeadline.length,
      extendedLength: refinedHeadline.length > maxLength
    });

  } catch (error) {
    console.error('Headline refinement error:', error);
    return NextResponse.json(
      { error: 'Refinement failed. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper function for title case conversion
function toTitleCase(text: string): string {
  const lowerWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'on', 'or', 'the', 'to', 'up', 'yet', 'via'];
  
  return text.replace(/\w\S*/g, (word, index) => {
    const lowerWord = word.toLowerCase();
    
    // Always capitalize first word
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    
    // Keep small words lowercase unless they're the first word
    if (lowerWords.includes(lowerWord)) {
      return lowerWord;
    }
    
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { AppState } from '@/types/app';

interface SuggestionsSectionProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  onGenerateArticle: () => void;
}

export default function SuggestionsSection({ state, updateState, onGenerateArticle }: SuggestionsSectionProps) {
  const [showHeadlineDropdown, setShowHeadlineDropdown] = useState(false);
  const [isRefiningHeadline, setIsRefiningHeadline] = useState(false);
  const [refinedAlternatives, setRefinedAlternatives] = useState<string[]>([]);
  const [refineKeyword, setRefineKeyword] = useState('');

  const handleHeadlineSelect = (headline: string) => {
    updateState({ selectedHeadline: headline });
    setShowHeadlineDropdown(false);
    // Keep refinedAlternatives when selecting a refined option
  };

  const handleKeywordToggle = (keyword: string) => {
    const isSelected = state.selectedKeywords.includes(keyword);
    let newSelected;
    
    if (isSelected) {
      newSelected = state.selectedKeywords.filter(k => k !== keyword);
    } else {
      newSelected = [...state.selectedKeywords, keyword];
    }
    
    updateState({ selectedKeywords: newSelected });
  };

  const canGenerate = state.selectedHeadline && 
                     state.selectedKeywords.length >= 5 && 
                     state.selectedKeywords.length <= 10 &&
                     !state.isGeneratingArticle;

  const refineHeadline = async () => {
    if (!state.selectedHeadline) return;
    try {
      setIsRefiningHeadline(true);
      const hasCustomKeyword = Boolean(refineKeyword && refineKeyword.trim().length > 0);
      const instructions = hasCustomKeyword
        ? `Minimally edit the current headline to naturally include the phrase "${refineKeyword.trim()}" (or a grammatically correct close variant). Preserve the original meaning, tone, and most of the wording. Keep punctuation and structure similar. Max 60 characters. Provide options that are SMALL variations of the original; the first option should be the closest minimal change.`
        : 'Make it concise, professional, avoid clickbait, include the primary keyword naturally.';
      const response = await fetch('/api/refine-headline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentHeadline: state.selectedHeadline,
          instructions,
          primaryKeyword: (refineKeyword || state.primaryKeyword),
          mode: 'minimal',
          tone: 'helpful, authoritative',
          maxLength: 60,
          generateAlternatives: 6
        })
      });
      const data = await response.json();
      if (response.ok) {
        const alts: string[] = Array.isArray(data.alternatives) ? data.alternatives : [];
        // Ensure refined option is first
        const list = Array.from(new Set([
          ...(data.refinedHeadline ? [data.refinedHeadline] : []),
          ...alts
        ]));
        setRefinedAlternatives(list);
        // Only update the selected headline, not all headlines
        if (list.length > 0) {
          updateState({ selectedHeadline: list[0] });
        }
        setShowHeadlineDropdown(true);
      } else {
        console.error('Headline refinement failed:', data?.error || 'Unknown error');
      }
    } catch (e) {
      console.error('Headline refinement error:', e);
    } finally {
      setIsRefiningHeadline(false);
    }
  };

  if (state.isLoadingSuggestions) {
    return (
      <div className="p-8 bg-white slide-in">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            AI is analyzing your content idea...
          </h3>
          <p className="text-gray-600">
            Generating optimized headlines and keyword suggestions based on current trends
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white slide-in">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            AI Suggestions Ready
          </h2>
        </div>

        {/* Headline Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            Choose Your Headline
          </label>
          <div className="relative">
            <button
              onClick={() => setShowHeadlineDropdown(!showHeadlineDropdown)}
              className="w-full p-4 text-left bg-white border border-gray-300 rounded-xl hover:border-indigo-400 transition-colors duration-200"
            >
              {state.selectedHeadline || 'Select a headline...'}
            </button>
                         <div className="flex items-center justify-between mt-2 gap-3">
               <input
                 type="text"
                 value={refineKeyword}
                 onChange={(e) => setRefineKeyword(e.target.value)}
                 placeholder={state.primaryKeyword || 'Enter keyword for refinement'}
                 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
               />
               <div className="flex gap-2">
                 {refinedAlternatives.length > 0 && (
                   <button
                     onClick={() => setRefinedAlternatives([])}
                     className="text-sm font-medium px-3 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                   >
                     Reset
                   </button>
                 )}
                 <button
                   onClick={refineHeadline}
                   disabled={!state.selectedHeadline || isRefiningHeadline}
                   className={`text-sm font-medium px-3 py-1 rounded-lg border transition-colors duration-200 ${
                     state.selectedHeadline && !isRefiningHeadline
                       ? 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                       : 'border-gray-200 text-gray-400 cursor-not-allowed'
                   }`}
                 >
                   {isRefiningHeadline ? (
                     <span className="inline-flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-1" /> Refining...</span>
                   ) : (
                     'Refine Headline'
                   )}
                 </button>
               </div>
             </div>
            
                         {showHeadlineDropdown && (
               <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg">
                 {refinedAlternatives.length > 0 ? (
                   // Show refined headline options first, followed by a separator
                   <>
                     {refinedAlternatives.map((headline, index) => (
                       <button
                         key={`refined-${index}`}
                         onClick={() => handleHeadlineSelect(headline)}
                         className="w-full p-4 text-left hover:bg-gray-50 first:rounded-t-xl transition-colors duration-200"
                       >
                         <div className="font-medium text-gray-900">{headline}</div>
                         <div className="text-sm text-gray-500 mt-1">Refined option</div>
                       </button>
                     ))}
                     <div className="border-t border-gray-200 my-2"></div>
                   </>
                 ) : null}
                 {/* Only show original headlines when no refinement has been done */}
                 {refinedAlternatives.length === 0 && state.suggestedHeadlines.map((headline, index) => (
                   <button
                     key={`original-${index}`}
                     onClick={() => handleHeadlineSelect(headline)}
                     className={`w-full p-4 text-left hover:bg-gray-50 ${
                       index === 0 ? 'rounded-t-xl' : ''
                     } ${
                       index === state.suggestedHeadlines.length - 1 ? 'rounded-b-xl' : ''
                     } transition-colors duration-200`}
                   >
                     <div className="font-medium text-gray-900">{headline}</div>
                     <div className="text-sm text-gray-500 mt-1">
                       {index === 0 && 'Benefit-focused approach'}
                       {index === 1 && 'Problem-solving angle'}
                       {index === 2 && 'Curiosity-driven hook'}
                     </div>
                   </button>
                 ))}
              </div>
            )}
          </div>
        </div>

        {/* Keyword Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-4">
            Select Keywords (Choose 5-10 for optimal SEO)
          </label>
          <div className="flex flex-wrap gap-3">
            {state.suggestedKeywords.map((keyword, index) => (
              <button
                key={index}
                onClick={() => handleKeywordToggle(keyword)}
                className={`keyword-chip ${
                  state.selectedKeywords.includes(keyword)
                    ? 'keyword-chip-selected'
                    : 'keyword-chip-default'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span>{keyword}</span>
                  {state.selectedKeywords.includes(keyword) && (
                    <Check className="h-4 w-4" />
                  )}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Selected: {state.selectedKeywords.length} keywords 
            {state.selectedKeywords.length < 5 && ' (minimum 5 required)'}
            {state.selectedKeywords.length > 10 && ' (maximum 10 recommended)'}
          </p>
        </div>

        {/* Generate Button */}
        <div className="pt-4">
          <button
            onClick={onGenerateArticle}
            disabled={!canGenerate}
            className={`w-full px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
              canGenerate
                ? 'gradient-green hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {state.isGeneratingArticle ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Crafting Your Article...</span>
              </>
            ) : (
              <>
                <span>🚀 Generate Professional Article</span>
              </>
            )}
          </button>
          
          {!canGenerate && state.selectedHeadline && (
            <p className="mt-3 text-sm text-center text-gray-500">
              {state.selectedKeywords.length < 5 
                ? `Select ${5 - state.selectedKeywords.length} more keywords to continue`
                : 'Maximum 10 keywords recommended for best results'
              }
            </p>
          )}
          
          {!state.selectedHeadline && (
            <p className="mt-3 text-sm text-center text-gray-500">
              Please select a headline to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
/**
 * Question Complexity Analyzer
 * 
 * Utility for analyzing if a question is complex enough to route through
 * the enhanced multi-agent debate system.
 */

/**
 * Determine if a question is complex enough to warrant using the debate system
 * @param text The question or message text to analyze
 * @returns boolean indicating if the question should use the debate system
 */
export function isComplexQuestion(text: string): boolean {
  // Don't use debate for very short queries
  if (text.length < 15) return false;
  
  // Check for patterns that indicate complex questions
  const complexPatterns = [
    // Questions with multiple parts
    /\band\b|\bor\b|\bas well as\b|\balso\b/i,
    // Comparing/contrasting
    /\bcompare\b|\bversus\b|\bvs\b|\bdifference\b|\bsimilar\b/i,
    // Seeking explanation or reasoning
    /\bwhy\b|\bhow\b|\bexplain\b|\bunderstand\b|\breason\b/i,
    // Analysis requests
    /\banalyze\b|\banalysis\b|\bassess\b|\bevaluate\b/i,
    // Open-ended questions requiring judgment
    /\bbest\b|\bworst\b|\bmost\b|\bleast\b|\bshould\b|\bwould\b|\bcould\b/i,
    // Questions about implications
    /\bimplication\b|\bconsequence\b|\bimpact\b|\beffect\b|\baffect\b/i,
    // Questions seeking recommendations
    /\brecommend\b|\bsuggestion\b|\badvice\b/i,
    // Questions about future predictions
    /\bprediction\b|\bforecast\b|\bfuture\b|\bexpect\b/i
  ];
  
  // Consider it complex if it matches any complex pattern
  return complexPatterns.some(pattern => pattern.test(text));
}
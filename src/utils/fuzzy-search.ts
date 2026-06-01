/**
 * Simple fuzzy string matching algorithm
 * Returns a score between 0 and 1, where 1 is a perfect match
 */
export function fuzzyMatch(search: string, target: string): number {
  if (!search || !target) return 0;

  const searchLower = search.toLowerCase().trim();
  const targetLower = target.toLowerCase();

  // Exact match gets highest score
  if (targetLower === searchLower) return 1;

  // Contains search term gets high score
  if (targetLower.includes(searchLower)) return 0.8;

  // Fuzzy matching: check if all characters from search appear in order in target
  let searchIndex = 0;
  let matches = 0;

  for (
    let i = 0;
    i < targetLower.length && searchIndex < searchLower.length;
    i++
  ) {
    if (targetLower[i] === searchLower[searchIndex]) {
      matches++;
      searchIndex++;
    }
  }

  // If all search characters were found in order, calculate score based on match density
  if (searchIndex === searchLower.length) {
    const density = matches / targetLower.length;
    const coverage = matches / searchLower.length;
    return Math.min(0.7, density * coverage * 2); // Cap at 0.7 for fuzzy matches
  }

  return 0;
}

/**
 * Search multiple fields and return the highest match score
 */
export function fuzzySearchFields(
  search: string,
  fields: (string | null | undefined)[],
): number {
  if (!search.trim()) return 1; // No search term means everything matches

  let maxScore = 0;

  for (const field of fields) {
    if (field) {
      const score = fuzzyMatch(search, field);
      maxScore = Math.max(maxScore, score);
    }
  }

  return maxScore;
}

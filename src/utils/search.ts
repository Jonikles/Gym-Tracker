/**
 * Check if a text matches all search words (order-independent)
 * Example: "incline bench" matches "Incline Dumbbell Bench Press"
 */
export function matchesAllWords(text: string, searchQuery: string): boolean {
    const textLower = text.toLowerCase();
    const words = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);

    // Empty search matches everything
    if (words.length === 0) return true;

    // ALL words must be found in the text
    return words.every(word => textLower.includes(word));
}
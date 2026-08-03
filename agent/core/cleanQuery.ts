// Query cleaner to strip helper words before searching
export function cleanQuery(q: string): string {
  if (!q) return "";
  
  return q
    .toLowerCase()
    .replace(/\b(can you|please|find|look up|search|in|the|database|clients?|leads?|show me)\b/gi, "")
    .replace(/[^\w@\.\s+-]/g, "")   // strip punctuation
    .replace(/\s+/g, " ")          // collapse multiple spaces
    .trim();
}
// Generate a unique ID using crypto.randomUUID()
export const generateId = (): string => {
  return crypto.randomUUID();
};

// Generate a deterministic ID from a string (for dedup)
export const generateDeterministicId = (input: string): string => {
  // Simple hash function for deterministic IDs
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

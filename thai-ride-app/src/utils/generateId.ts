/**
 * Generate a unique ID with a given prefix
 * @param prefix - The prefix for the ID (default: 'id')
 * @returns A unique ID string
 */
export function generateUniqueId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`
}

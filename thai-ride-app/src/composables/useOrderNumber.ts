/**
 * useOrderNumber - Composable for order number formatting
 * 
 * Provides utilities to format UUID order IDs into human-readable formats
 */

export type OrderNumberFormat = 'short' | 'full'

/**
 * Format a UUID order ID into a display-friendly format
 * 
 * @param uuid - The full UUID string or RID- prefixed ID
 * @param format - 'short' for #XXXXXXXX (8 chars), 'full' for complete UUID
 * @returns Formatted order number string
 * 
 * @example
 * formatOrderNumber('550e8400-e29b-41d4-a716-446655440000', 'short')
 * // Returns: '#550E8400'
 * 
 * formatOrderNumber('RID-MKJ5EEA8', 'short')
 * // Returns: '#RID-MKJ5EEA8'
 * 
 * formatOrderNumber('550e8400-e29b-41d4-a716-446655440000', 'full')
 * // Returns: '550e8400-e29b-41d4-a716-446655440000'
 */
export function formatOrderNumber(
  uuid: string,
  format: OrderNumberFormat = 'short'
): string {
  // Handle empty or invalid input
  if (!uuid || typeof uuid !== 'string') {
    return ''
  }

  // Trim whitespace
  const cleanUuid = uuid.trim()

  // Return full UUID if requested
  if (format === 'full') {
    return cleanUuid
  }

  // Check if it's already in RID- format (or other prefix format)
  if (cleanUuid.match(/^[A-Z]{3}-/)) {
    // Already has prefix (RID-, DEL-, SHP-, etc.)
    return `#${cleanUuid}`
  }

  // Extract first 8 characters (before first dash) and uppercase
  const shortId = cleanUuid.substring(0, 8).toUpperCase()
  
  // Add # prefix for short format
  return `#${shortId}`
}

/**
 * Composable hook for order number utilities
 * 
 * @returns Object with formatOrderNumber function
 */
export function useOrderNumber() {
  return {
    formatOrderNumber
  }
}

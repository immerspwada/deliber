/**
 * Icon Sanitization Utility
 * =========================
 * Sanitizes SVG/HTML content for safe v-html rendering
 * Prevents XSS attacks while allowing valid SVG markup
 */

import DOMPurify from 'dompurify'

/**
 * Sanitize SVG icon content for safe rendering
 * @param icon - Raw SVG/HTML string
 * @returns Sanitized HTML string safe for v-html
 */
export function sanitizeIcon(icon: string): string {
  if (!icon) return ''
  
  return DOMPurify.sanitize(icon, {
    ALLOWED_TAGS: [
      'svg',
      'path',
      'circle',
      'rect',
      'line',
      'polyline',
      'polygon',
      'ellipse',
      'g',
      'defs',
      'use',
      'symbol'
    ],
    ALLOWED_ATTR: [
      'viewBox',
      'width',
      'height',
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'd',
      'cx',
      'cy',
      'r',
      'rx',
      'ry',
      'x',
      'x1',
      'x2',
      'y',
      'y1',
      'y2',
      'points',
      'transform',
      'id',
      'class'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  })
}

/**
 * Sanitize HTML content with more restrictive rules
 * @param html - Raw HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'span', 'div'],
    ALLOWED_ATTR: ['class']
  })
}

/**
 * Check if content is safe (already sanitized or from trusted source)
 * @param content - Content to check
 * @returns true if content appears safe
 */
export function isSafeContent(content: string): boolean {
  if (!content) return true
  
  // Check for common XSS patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(content))
}

/**
 * Sanitize icon with caching for performance
 */
const iconCache = new Map<string, string>()
const MAX_CACHE_SIZE = 100

export function sanitizeIconCached(icon: string): string {
  if (!icon) return ''
  
  // Check cache
  if (iconCache.has(icon)) {
    return iconCache.get(icon)!
  }
  
  // Sanitize
  const sanitized = sanitizeIcon(icon)
  
  // Cache result
  if (iconCache.size >= MAX_CACHE_SIZE) {
    // Clear oldest entry
    const firstKey = iconCache.keys().next().value
    iconCache.delete(firstKey)
  }
  iconCache.set(icon, sanitized)
  
  return sanitized
}

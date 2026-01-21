/**
 * XSS Prevention Utilities
 * Sanitizes HTML content to prevent XSS attacks
 */
import DOMPurify from 'dompurify'

/**
 * Sanitize HTML content for safe rendering with v-html
 * @param html - Raw HTML string
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span', 'div', 'svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon'],
    ALLOWED_ATTR: ['class', 'style', 'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points'],
    KEEP_CONTENT: false
  })
}

/**
 * Sanitize icon HTML specifically for icon components
 * @param iconHtml - Icon HTML string (usually SVG)
 * @returns Sanitized icon HTML
 */
export function sanitizeIcon(iconHtml: string): string {
  if (!iconHtml) return ''
  
  return DOMPurify.sanitize(iconHtml, {
    ALLOWED_TAGS: ['svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'defs', 'use'],
    ALLOWED_ATTR: ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'id', 'href'],
    KEEP_CONTENT: false
  })
}
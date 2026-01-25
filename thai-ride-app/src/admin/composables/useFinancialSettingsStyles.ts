/**
 * Composable for Financial Settings CSS classes
 * Minimal, professional design system
 */

export function useFinancialSettingsStyles() {
  // Table styles - minimal, clean
  const tableHeaderCell = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50'
  
  const tableRowBase = 'border-b border-gray-100 hover:bg-gray-50 transition-colors'
  
  const getTableRowColor = () => {
    return tableRowBase
  }

  // Form input styles - consistent, minimal
  const formInputBase = 'w-32 min-h-[44px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors'
  
  const getFormInputColor = () => {
    return formInputBase
  }

  // Button styles - removed (using SettingsActionButtons component)
  const getBtnColor = () => {
    return 'min-h-[44px] px-4 py-2.5 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2'
  }

  // Icon container styles - minimal
  const iconContainerBase = 'w-8 h-8 rounded-md flex items-center justify-center bg-gray-100'
  
  const getIconContainerColor = () => {
    return iconContainerBase
  }

  // Icon color styles - neutral
  const getIconColorClass = () => {
    return 'text-gray-600'
  }

  return {
    tableHeaderCell,
    getTableRowColor,
    getFormInputColor,
    getBtnColor,
    getIconContainerColor,
    getIconColorClass
  }
}

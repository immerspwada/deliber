/**
 * Composable for Financial Settings CSS classes
 * Provides reusable Tailwind CSS class combinations
 */

export function useFinancialSettingsStyles() {
  // Table styles
  const tableHeaderCell = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
  
  const tableRowBase = 'group transition-all duration-200'
  
  const getTableRowColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'hover:bg-blue-50 hover:shadow-sm focus-within:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset',
      green: 'hover:bg-green-50 hover:shadow-sm focus-within:bg-green-50 focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-inset',
      purple: 'hover:bg-purple-50 hover:shadow-sm focus-within:bg-purple-50 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-inset',
      orange: 'hover:bg-orange-50 hover:shadow-sm focus-within:bg-orange-50 focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-inset',
      yellow: 'hover:bg-yellow-50 hover:shadow-sm focus-within:bg-yellow-50 focus-within:ring-2 focus-within:ring-yellow-500 focus-within:ring-inset',
      cyan: 'hover:bg-cyan-50 hover:shadow-sm focus-within:bg-cyan-50 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-inset'
    }
    return `${tableRowBase} ${colors[color] || colors.blue}`
  }

  // Form input styles
  const formInputBase = 'w-32 min-h-[44px] px-4 py-2.5 text-base border border-gray-300 rounded-lg transition-all duration-200'
  
  const getFormInputColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      green: 'focus:ring-2 focus:ring-green-500 focus:border-green-500',
      purple: 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500',
      orange: 'focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
      yellow: 'focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500',
      cyan: 'focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500'
    }
    return `${formInputBase} ${colors[color] || colors.blue}`
  }

  // Button styles
  const btnBase = 'min-h-[44px] px-6 py-2.5 text-sm font-medium text-white rounded-lg focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 inline-flex items-center justify-center gap-2'
  
  const getBtnColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-600 hover:bg-blue-700 active:scale-95 focus:ring-blue-500',
      green: 'bg-green-600 hover:bg-green-700 active:scale-95 focus:ring-green-500',
      purple: 'bg-purple-600 hover:bg-purple-700 active:scale-95 focus:ring-purple-500',
      orange: 'bg-orange-600 hover:bg-orange-700 active:scale-95 focus:ring-orange-500',
      yellow: 'bg-yellow-600 hover:bg-yellow-700 active:scale-95 focus:ring-yellow-500',
      cyan: 'bg-cyan-600 hover:bg-cyan-700 active:scale-95 focus:ring-cyan-500'
    }
    return `${btnBase} ${colors[color] || colors.blue}`
  }

  // Icon container styles
  const iconContainerBase = 'w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-200'
  
  const getIconContainerColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 group-hover:bg-blue-200',
      green: 'bg-green-100 group-hover:bg-green-200',
      purple: 'bg-purple-100 group-hover:bg-purple-200',
      orange: 'bg-orange-100 group-hover:bg-orange-200',
      yellow: 'bg-yellow-100 group-hover:bg-yellow-200',
      cyan: 'bg-cyan-100 group-hover:bg-cyan-200'
    }
    return `${iconContainerBase} ${colors[color] || colors.blue}`
  }

  return {
    tableHeaderCell,
    getTableRowColor,
    getFormInputColor,
    getBtnColor,
    getIconContainerColor
  }
}

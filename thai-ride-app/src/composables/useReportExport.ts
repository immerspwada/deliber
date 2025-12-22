/**
 * useReportExport - CSV/Excel Export
 * Feature: F231 - Report Export
 */

import { ref } from 'vue'

export function useReportExport() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
    if (!data.length) return
    const keys = headers || Object.keys(data[0])
    const csvContent = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n')
    downloadFile(csvContent, `${filename}.csv`, 'text/csv')
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const formatDate = (date: Date): string => date.toISOString().split('T')[0]

  return { loading, error, exportToCSV, downloadFile, formatDate }
}

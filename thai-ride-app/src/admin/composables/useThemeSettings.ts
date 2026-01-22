/**
 * Theme Settings Composable
 */

import { ref, reactive } from 'vue'
import { supabase } from '@/lib/supabase'

export interface ThemeColors {
  skinColor: {
    primary: string
    secondary: string
  }
  buttonColor: {
    normal: string
    hover: string
  }
  header: {
    background: string
  }
  footer: {
    background: string
  }
  headerNav: {
    normal: string
    hover: string
  }
  footerNav: {
    normal: string
    hover: string
  }
}

const DEFAULT_THEME: ThemeColors = {
  skinColor: {
    primary: '#FFFFFF',
    secondary: '#0671E3'
  },
  buttonColor: {
    normal: '#0B1223',
    hover: '#DEDEDE'
  },
  header: {
    background: '#FFFFFF'
  },
  footer: {
    background: '#00000C'
  },
  headerNav: {
    normal: '#00000C',
    hover: '#0B1223'
  },
  footerNav: {
    normal: '#FFFFFF',
    hover: '#FFFFFF'
  }
}

export function useThemeSettings() {
  const theme = reactive<ThemeColors>(JSON.parse(JSON.stringify(DEFAULT_THEME)))
  const defaultTheme = ref<ThemeColors>(JSON.parse(JSON.stringify(DEFAULT_THEME)))
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadTheme(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('category', 'theme')

      if (queryError) throw queryError

      if (data && data.length > 0) {
        // Map database keys to theme structure
        const keyMap: Record<string, { section: keyof ThemeColors; property: string }> = {
          'skin_color_primary': { section: 'skinColor', property: 'primary' },
          'skin_color_secondary': { section: 'skinColor', property: 'secondary' },
          'button_color_normal': { section: 'buttonColor', property: 'normal' },
          'button_color_hover': { section: 'buttonColor', property: 'hover' },
          'header_background': { section: 'header', property: 'background' },
          'footer_background': { section: 'footer', property: 'background' },
          'header_nav_normal': { section: 'headerNav', property: 'normal' },
          'header_nav_hover': { section: 'headerNav', property: 'hover' },
          'footer_nav_normal': { section: 'footerNav', property: 'normal' },
          'footer_nav_hover': { section: 'footerNav', property: 'hover' }
        }

        data.forEach(setting => {
          const mapping = keyMap[setting.setting_key]
          if (mapping) {
            (theme[mapping.section] as any)[mapping.property] = setting.setting_value
          }
        })
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load theme'
      console.error('[useThemeSettings] loadTheme error:', e)
    } finally {
      loading.value = false
    }
  }

  async function saveTheme(): Promise<{ success: boolean; message?: string }> {
    try {
      // Map theme to database keys
      const settings = [
        { key: 'skin_color_primary', value: theme.skinColor.primary },
        { key: 'skin_color_secondary', value: theme.skinColor.secondary },
        { key: 'button_color_normal', value: theme.buttonColor.normal },
        { key: 'button_color_hover', value: theme.buttonColor.hover },
        { key: 'header_background', value: theme.header.background },
        { key: 'footer_background', value: theme.footer.background },
        { key: 'header_nav_normal', value: theme.headerNav.normal },
        { key: 'header_nav_hover', value: theme.headerNav.hover },
        { key: 'footer_nav_normal', value: theme.footerNav.normal },
        { key: 'footer_nav_hover', value: theme.footerNav.hover }
      ]

      let successCount = 0
      let failCount = 0

      for (const setting of settings) {
        const { error: rpcError } = await supabase.rpc('update_setting', {
          p_setting_key: setting.key,
          p_new_value: setting.value,
          p_category: 'theme'
        })

        if (rpcError) {
          failCount++
          console.error(`Failed to update ${setting.key}:`, rpcError)
        } else {
          successCount++
        }
      }

      if (failCount === 0) {
        return { success: true }
      } else if (successCount > 0) {
        return { 
          success: true, 
          message: `บันทึกสำเร็จ ${successCount} รายการ แต่มี ${failCount} รายการที่ล้มเหลว` 
        }
      } else {
        return { success: false, message: 'ไม่สามารถบันทึกธีมได้' }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save theme'
      console.error('[useThemeSettings] saveTheme error:', e)
      return { success: false, message }
    }
  }

  async function resetTheme(): Promise<{ success: boolean; message?: string }> {
    Object.assign(theme, DEFAULT_THEME)
    return await saveTheme()
  }

  function exportThemeData() {
    return {
      version: '1.0',
      exported_at: new Date().toISOString(),
      theme: { ...theme }
    }
  }

  async function importThemeData(jsonData: string): Promise<{ success: boolean; message?: string }> {
    try {
      const data = JSON.parse(jsonData)
      
      if (!data.theme) {
        return { success: false, message: 'รูปแบบข้อมูลไม่ถูกต้อง' }
      }

      const requiredKeys = ['skinColor', 'buttonColor', 'header', 'footer', 'headerNav', 'footerNav']
      for (const key of requiredKeys) {
        if (!(key in data.theme)) {
          return { success: false, message: `ข้อมูลไม่ครบถ้วน: ขาด ${key}` }
        }
      }

      Object.assign(theme, data.theme)
      return await saveTheme()
    } catch (e) {
      return { success: false, message: 'ไม่สามารถอ่านข้อมูลได้' }
    }
  }

  return {
    theme,
    defaultTheme,
    loading,
    error,
    loadTheme,
    saveTheme,
    resetTheme,
    exportThemeData,
    importThemeData
  }
}

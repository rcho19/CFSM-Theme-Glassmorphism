import type { SiteConfig } from '@/types/cfsm'

export type ThemeSettingsAccess = 'pending' | 'allowed' | 'blocked'

/** 访问展示策略只认主站已确认配置；浏览器覆盖和草稿不能解除站点限制。 */
export function resolveThemeSettingsAccess(
  config: SiteConfig | null,
  state: 'idle' | 'loading' | 'ready' | 'partial' | 'error',
): ThemeSettingsAccess {
  if (config === null) return state === 'error' ? 'blocked' : 'pending'
  return config.themeOptions.hideThemeSettingsWhenLoggedOut === true && config.authorization !== true
    ? 'blocked' : 'allowed'
}

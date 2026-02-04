/**
 * 兼容层：从 Pinia user store 导出 state/actions，保证原有 import 写法仍可用且响应式一致
 */
import { computed } from 'vue'
import { getPinia } from './piniaInstance'
import { useUserStore, type HomePageCacheData } from './user'

export type { HomePageCacheData }

function getStore() {
  const p = getPinia()
  if (!p) throw new Error('Pinia not initialized')
  return useUserStore(p)
}

export const userInfo = computed(() => getStore().userInfo)
export const user_token = computed(() => getStore().user_token)
export const companyInfo = computed(() => getStore().companyInfo)
export const defaultCompanyIdCache = computed(() => getStore().defaultCompanyIdCache)
export const defaultCompanyIdCacheTime = computed(() => getStore().defaultCompanyIdCacheTime)
export const homePageCache = computed(() => getStore().homePageCache)
export const companyDetailCache = computed(() => getStore().companyDetailCache)


export const setDefaultCompanyIdCache = (companyId: number | null) => getStore().setDefaultCompanyIdCache(companyId)
export const isDefaultCompanyIdCacheValid = () => getStore().isDefaultCompanyIdCacheValid()
export const getDefaultCompanyIdFromStorage = () => getStore().getDefaultCompanyIdFromStorage()
export const getHomePageCacheValid = (companyId: number) => getStore().getHomePageCacheValid(companyId)
export const setHomePageCache = (companyId: number, data: HomePageCacheData) => getStore().setHomePageCache(companyId, data)
export const setCompanyDetailCache = (companyId: number, data: any) => getStore().setCompanyDetailCache(companyId, data)
export const getCompanyDetailFromCache = (companyId: number) => getStore().getCompanyDetailFromCache(companyId)
export const invalidateCompanyDetailCache = (companyId?: number) => getStore().invalidateCompanyDetailCache(companyId)
export const setUserContext = (info: any) => getStore().setUserContext(info)
export const setCompanyContext = (info: any) => getStore().setCompanyContext(info)
export const restoreUserFromStorage = () => getStore().restoreUserFromStorage()
export const updateUserInfo = (partial: Partial<Record<string, unknown>>) => getStore().updateUserInfo(partial)
export const isUserInfoCacheValid = () => getStore().isUserInfoCacheValid()
export const ensureUserInfoCached = () => getStore().ensureUserInfoCached()
export const clearUserContext = () => getStore().clearUserContext()

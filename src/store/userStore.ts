import { ref, reactive } from 'vue'

/** 配置/公司缓存 TTL：5 分钟 */
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000
/** 公司详情缓存 TTL：2 分钟 */
const COMPANY_DETAIL_CACHE_TTL_MS = 2 * 60 * 1000

// 用户信息
export const userInfo = ref<any>({})

// 用户token
export const user_token = ref<string>('')

// 公司信息
export const companyInfo = ref<any>({})

// 默认公司 ID 缓存（全局获取一次，定期刷新）
export const defaultCompanyIdCache = ref<number | null>(null)
export const defaultCompanyIdCacheTime = ref<number>(0)

export function setDefaultCompanyIdCache(companyId: number | null) {
  defaultCompanyIdCache.value = companyId
  defaultCompanyIdCacheTime.value = Date.now()
}

export function isDefaultCompanyIdCacheValid(): boolean {
  return defaultCompanyIdCacheTime.value > 0 && Date.now() - defaultCompanyIdCacheTime.value < CONFIG_CACHE_TTL_MS
}

// 公司详情缓存（按 companyId，用于 hidden_*_ids 等，减少重复请求）
interface CompanyDetailCacheItem {
  data: any
  ts: number
}
export const companyDetailCache = reactive<Record<number, CompanyDetailCacheItem>>({})

export function setCompanyDetailCache(companyId: number, data: any) {
  companyDetailCache[companyId] = { data, ts: Date.now() }
}

export function getCompanyDetailFromCache(companyId: number): any | null {
  const item = companyDetailCache[companyId]
  if (!item || Date.now() - item.ts > COMPANY_DETAIL_CACHE_TTL_MS) return null
  return item.data
}

export function invalidateCompanyDetailCache(companyId?: number) {
  if (companyId != null) delete companyDetailCache[companyId]
  else Object.keys(companyDetailCache).forEach((k) => delete companyDetailCache[Number(k)])
}

// 设置用户上下文
export function setUserContext(info: any) {
  userInfo.value = info.user
  user_token.value = info.token
  
  // 持久化到本地存储
  if (info.user) {
    uni.setStorageSync('userInfo', info.user)
  }
  if (info.token) {
    uni.setStorageSync('token', info.token)
  }
  if (info.userId) {
    uni.setStorageSync('userId', info.userId)
  }
}

// 设置公司上下文
export function setCompanyContext(info: any) {
  companyInfo.value = info
  if (info?.id) {
    uni.setStorageSync('companyId', info.id)
  }
}

// 从本地存储恢复用户状态
export function restoreUserFromStorage() {
  try {
    const token = uni.getStorageSync('token')
    const userId = uni.getStorageSync('userId')
    const userInfoData = uni.getStorageSync('userInfo')
    
    if (token && userId) {
      user_token.value = token
      if (userInfoData) {
        userInfo.value = userInfoData
      } else {
        // 如果只有 userId，可以尝试从后端获取用户信息
        userInfo.value = { id: userId }
      }
      return true
    }
    return false
  } catch (error) {
    console.error('恢复用户状态失败:', error)
    return false
  }
}

// 局部更新用户信息（如修改头像、昵称、简介后同步到内存和本地存储）
export function updateUserInfo(partial: Partial<Record<string, unknown>>) {
  if (!partial || typeof partial !== 'object') return
  userInfo.value = { ...userInfo.value, ...partial }
  try {
    uni.setStorageSync('userInfo', userInfo.value)
  } catch (e) {
    console.error('同步 userInfo 到存储失败', e)
  }
}

// 清除用户状态（退出登录）
export function clearUserContext() {
  userInfo.value = {}
  user_token.value = ''
  uni.removeStorageSync('token')
  uni.removeStorageSync('userId')
  uni.removeStorageSync('userInfo')
}

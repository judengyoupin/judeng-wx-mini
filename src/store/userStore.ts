import { ref } from 'vue'

// 用户信息
export const userInfo = ref<any>({})

// 用户token
export const user_token = ref<string>('')

// 公司信息
export const companyInfo = ref<any>({})

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

// 清除用户状态（退出登录）
export function clearUserContext() {
  userInfo.value = {}
  user_token.value = ''
  uni.removeStorageSync('token')
  uni.removeStorageSync('userId')
  uni.removeStorageSync('userInfo')
}

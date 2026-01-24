<template>
  <view class="login-container">
    <!-- 顶部装饰 -->
    <view class="header-decoration"></view>

    <!-- 登录表单 -->
    <view class="login-form">
      <view class="form-title">欢迎登录</view>
      <view class="form-subtitle">请选择登录方式</view>

      <!-- 密码登录表单 -->
      <view class="form-content">
        <view class="input-group">
          <view class="input-label">手机号</view>
          <input
            class="input-field"
            type="number"
            placeholder="请输入手机号"
            v-model="passwordForm.mobile"
            maxlength="11"
          />
        </view>

        <view class="input-group">
          <view class="input-label">密码</view>
          <input
            class="input-field"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            v-model="passwordForm.password"
          />
          <view class="password-toggle" @click="showPassword = !showPassword">
            <text class="toggle-icon">{{ showPassword ? '👁️' : '👁️‍🗨️' }}</text>
          </view>
        </view>

        <button 
          class="login-button" 
          :disabled="!canSubmitPassword || isLoading"
          :loading="isLoading"
          @click="handlePasswordLogin"
        >
          {{ isLoading ? '登录中...' : '密码登录' }}
        </button>

        <view class="divider">
          <view class="divider-line"></view>
          <text class="divider-text">或</text>
          <view class="divider-line"></view>
        </view>

        <!-- 微信授权登录 -->
        <button 
          class="wechat-login-button"
          open-type="getPhoneNumber"
          @getphonenumber="handleWechatLogin"
          :disabled="isLoading"
        >
          <text class="wechat-icon">🔐</text>
          <text>微信手机号授权登录</text>
        </button>

        <view class="form-footer">
          <text class="link-text" @click="goToRegister">注册账号</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { passwordLogin, wechatLogin } from '@/api/user/index';
import { setUserContext } from '@/store/userStore';
import { getUserManagedCompanyId } from '@/utils/company';
import { syncCompanyInfo } from '@/api/company/index';

const showPassword = ref(false);
const isLoading = ref(false);

// 密码登录表单
const passwordForm = ref({
  mobile: '',
  password: '',
});

// 计算属性：是否可以提交密码登录
const canSubmitPassword = computed(() => {
  return passwordForm.value.mobile.length === 11 && passwordForm.value.password.length >= 6;
});

// 密码登录
const handlePasswordLogin = async () => {
  if (!canSubmitPassword.value) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none',
    });
    return;
  }

  isLoading.value = true;

  try {
    const result = await passwordLogin({
      mobile: passwordForm.value.mobile,
      password: passwordForm.value.password,
    });

    if (result && result.token) {
      // 保存用户信息（setUserContext 内部会保存到本地存储）
      setUserContext({
        user: result.user || { id: result.userId },
        token: result.token,
        userId: result.userId,
      });

      // 如果是公司管理员，自动获取管理的公司信息
      try {
        const managedCompanyId = await getUserManagedCompanyId();
        if (managedCompanyId) {
          await syncCompanyInfo(managedCompanyId);
          uni.setStorageSync('companyId', managedCompanyId);
        }
      } catch (error) {
        console.error('获取公司信息失败:', error);
      }

      uni.showToast({
        title: '登录成功',
        icon: 'success',
      });

      // 延迟跳转，确保toast显示
      setTimeout(() => {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          uni.navigateBack();
        } else {
          uni.switchTab({
            url: '/pages/index/index',
          });
        }
      }, 1500);
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none',
    });
  } finally {
    isLoading.value = false;
  }
};

// 微信授权登录
const handleWechatLogin = async (e: any) => {
  console.log('微信授权回调:', e);

  if (e.detail.errMsg === 'getPhoneNumber:ok') {
    isLoading.value = true;

    try {
      const result = await wechatLogin({
        code: e.detail.code,
        codeSource: 'phone',
      });

      if (result && result.token) {
        // 保存用户信息（setUserContext 内部会保存到本地存储）
        setUserContext({
          user: result.user || { id: result.userId },
          token: result.token,
          userId: result.userId,
        });

        // 如果是公司管理员，自动获取管理的公司信息
        try {
          const managedCompanyId = await getUserManagedCompanyId();
          if (managedCompanyId) {
            await syncCompanyInfo(managedCompanyId);
            uni.setStorageSync('companyId', managedCompanyId);
          }
        } catch (error) {
          console.error('获取公司信息失败:', error);
        }

        uni.showToast({
          title: '登录成功',
          icon: 'success',
        });

        // 延迟跳转
        setTimeout(() => {
          const pages = getCurrentPages();
          if (pages.length > 1) {
            uni.navigateBack();
          } else {
            uni.switchTab({
              url: '/pages/index/index',
            });
          }
        }, 1500);
      }
    } catch (error: any) {
      uni.showToast({
        title: error.message || '登录失败',
        icon: 'none',
      });
    } finally {
      isLoading.value = false;
    }
  } else {
    // 用户拒绝授权
    console.log('用户拒绝授权手机号');
    uni.showToast({
      title: '您拒绝了授权',
      icon: 'none',
    });
  }
};

// 跳转到注册页面
const goToRegister = () => {
  // TODO: 实现注册页面
  uni.showToast({
    title: '注册功能开发中',
    icon: 'none',
  });
};

onLoad((options) => {
  // 可以从参数中获取登录类型
  console.log('登录页面参数:', options);
});
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx;
  box-sizing: border-box;
}

.header-decoration {
  height: 200rpx;
}

.login-form {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333333;
  text-align: center;
  margin-bottom: 16rpx;
}

.form-subtitle {
  font-size: 28rpx;
  color: #999999;
  text-align: center;
  margin-bottom: 60rpx;
}

.form-content {
  margin-top: 40rpx;
}

.input-group {
  margin-bottom: 32rpx;
  position: relative;
}

.input-label {
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.input-field {
  width: 100%;
  height: 88rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  color: #333333;
  box-sizing: border-box;
}

.input-field::placeholder {
  color: #cccccc;
}

.password-toggle {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  margin-top: 20rpx;
  padding: 8rpx;
  cursor: pointer;
}

.toggle-icon {
  font-size: 32rpx;
}

.login-button {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 40rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-button[disabled] {
  background: #cccccc;
  color: #999999;
}

.divider {
  display: flex;
  align-items: center;
  margin: 40rpx 0;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: #e0e0e0;
}

.divider-text {
  margin: 0 24rpx;
  font-size: 28rpx;
  color: #999999;
}

.wechat-login-button {
  width: 100%;
  height: 88rpx;
  background: #07c160;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.wechat-login-button[disabled] {
  background: #cccccc;
  color: #999999;
}

.wechat-icon {
  font-size: 36rpx;
}

.form-footer {
  text-align: center;
  margin-top: 40rpx;
}

.link-text {
  font-size: 28rpx;
  color: #667eea;
  text-decoration: underline;
}
</style>

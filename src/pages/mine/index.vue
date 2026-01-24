<template>
  <view class="mine-page">
    <!-- 顶部装饰背景 -->
    <view class="header-bg">
      <view class="bg-decoration"></view>
    </view>

    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-header">
        <view class="avatar-section" @click="handleAvatarClick">
          <view class="avatar-wrapper">
            <image
              class="avatar"
              :src="userInfo?.avatar_url || '../../static/mine/touxiang.png'"
              mode="aspectFill"
            ></image>
            <view v-if="user_token" class="avatar-badge">
              <text class="badge-icon">✓</text>
            </view>
          </view>
        </view>
        <view class="user-info">
          <view class="nickname-section">
            <text class="nickname" v-if="user_token">
              {{ userInfo?.nickname || userInfo?.mobile || "用户" }}
            </text>
            <text class="nickname" v-else>未登录</text>
            <view v-if="isAdmin" class="role-badge admin">
              <text class="role-text">平台管理员</text>
            </view>
            <view v-else-if="isCompanyAdminUser" class="role-badge company-admin">
              <text class="role-text">公司管理员</text>
            </view>
            <view v-else-if="isCompanyUser" class="role-badge user">
              <text class="role-text">公司用户</text>
            </view>
          </view>
          <view v-if="user_token && userInfo?.mobile" class="phone-section">
            <text class="phone-icon">📱</text>
            <text class="phone-number">{{ userInfo.mobile }}</text>
          </view>
          <view v-if="!user_token" class="login-prompt">
            <text class="prompt-text">登录后享受更多服务</text>
            <button class="login-btn" @click="goToLogin">立即登录</button>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷功能区域 -->
    <view class="quick-actions">
      <view class="action-item" @click="goToOrders">
        <view class="action-icon-wrapper order">
          <image class="action-icon" src="../../static/mine/order.png" mode="aspectFit"></image>
        </view>
        <text class="action-label">我的订单</text>
      </view>
      <view class="action-item" @click="goToFiles">
        <view class="action-icon-wrapper resource">
          <image class="action-icon" src="../../static/mine/ziliao.png" mode="aspectFit"></image>
        </view>
        <text class="action-label">资料库</text>
      </view>
      <view class="action-item" @click="goToSettings">
        <view class="action-icon-wrapper settings">
          <image class="action-icon" src="../../static/mine/shezhi.png" mode="aspectFit"></image>
        </view>
        <text class="action-label">设置</text>
      </view>
    </view>

    <!-- 管理功能区域 -->
    <view v-if="isAdmin || isCompanyAdminUser" class="admin-section">
      <view class="section-header">
        <text class="section-title">管理功能</text>
      </view>
      
      <!-- 平台管理员 -->
      <template v-if="isAdmin">
        <view class="admin-grid">
          <view class="admin-item" @click="goToCompanyManagement">
            <view class="admin-icon-wrapper company">
              <text class="admin-icon">🏢</text>
            </view>
            <text class="admin-label">公司管理</text>
            <text class="admin-desc">管理公司信息</text>
          </view>
          <view class="admin-item" @click="goToConfigManagement">
            <view class="admin-icon-wrapper config">
              <text class="admin-icon">⚙️</text>
            </view>
            <text class="admin-label">配置管理</text>
            <text class="admin-desc">设置默认展示</text>
          </view>
        </view>
      </template>

      <!-- 公司管理员 -->
      <template v-if="isCompanyAdminUser">
        <view class="admin-grid">
          <view class="admin-item" @click="goToProductManagement">
            <view class="admin-icon-wrapper product">
              <text class="admin-icon">📦</text>
            </view>
            <text class="admin-label">商品管理</text>
            <text class="admin-desc">管理商品分类</text>
          </view>
          <view class="admin-item" @click="goToOrderManagement">
            <view class="admin-icon-wrapper order">
              <text class="admin-icon">📋</text>
            </view>
            <text class="admin-label">订单管理</text>
            <text class="admin-desc">处理订单</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 注册提示 -->
    <view v-if="user_token && !isCompanyUser" class="register-tip">
      <view class="tip-icon">💡</view>
      <view class="tip-content">
        <text class="tip-title">提示</text>
        <text class="tip-text">您还未注册为公司用户，请联系管理员注册后即可查看价格和下单</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view v-if="user_token" class="logout-section">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { userInfo, user_token, companyInfo, clearUserContext } from '@/store/userStore';
import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import { isPlatformAdmin, isCompanyAdmin } from '@/utils/auth';

const isCompanyUser = ref(false);
const isAdmin = ref(false);
const isCompanyAdminUser = ref(false);

// 检查用户权限
const checkUserPermissions = async () => {
  if (!user_token.value || !userInfo.value?.id) {
    isCompanyUser.value = false;
    isAdmin.value = false;
    isCompanyAdminUser.value = false;
    return;
  }

  // 检查平台管理员
  isAdmin.value = await isPlatformAdmin();

  // 检查公司用户和管理员
  if (companyInfo.value?.id) {
    isCompanyUser.value = await checkCompanyUser();
    isCompanyAdminUser.value = await isCompanyAdmin();
  } else {
    isCompanyUser.value = false;
    isCompanyAdminUser.value = false;
  }
};

// 检查用户是否注册到公司
const checkCompanyUser = async (): Promise<boolean> => {
  if (!user_token.value || !userInfo.value?.id || !companyInfo.value?.id) {
    return false;
  }

  try {
    const query = `
      query CheckCompanyUser($userId: bigint!, $companyId: bigint!) {
        company_users(
          where: {
            user_users: { _eq: $userId }
            company_companies: { _eq: $companyId }
          }
          limit: 1
        ) {
          id
          price_factor
        }
      }
    `;

    const result = await client.execute({
      query,
      variables: {
        userId: Number(userInfo.value.id),
        companyId: Number(companyInfo.value.id),
      },
    });

    return (result?.company_users?.length || 0) > 0;
  } catch (error) {
    console.error('检查公司用户失败:', error);
    return false;
  }
};

// 跳转到登录页
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index',
  });
};

// 跳转到订单列表
const goToOrders = () => {
  if (!user_token.value) {
    goToLogin();
    return;
  }
  uni.navigateTo({
    url: '/pages/order-list/index',
  });
};

// 跳转到资料库
const goToFiles = () => {
  if (!user_token.value) {
    goToLogin();
    return;
  }
  uni.navigateTo({
    url: '/pages/resource/index',
  });
};

// 跳转到设置
const goToSettings = () => {
  uni.navigateTo({
    url: '/pages/settings/index',
  });
};

// 跳转到商品管理（公司管理员）
const goToProductManagement = () => {
  if (!user_token.value) {
    goToLogin();
    return;
  }
  uni.navigateTo({
    url: '/subPackages/admin/product-list/index',
  });
};

// 跳转到订单管理（公司管理员）
const goToOrderManagement = () => {
  if (!user_token.value) {
    goToLogin();
    return;
  }
  uni.navigateTo({
    url: '/subPackages/admin/order-list/index',
  });
};

// 跳转到公司管理（平台管理员）
const goToCompanyManagement = () => {
  if (!user_token.value) {
    goToLogin();
    return;
  }
  uni.navigateTo({
    url: '/subPackages/admin/company-list/index',
  });
};

// 跳转到配置管理（平台管理员）
const goToConfigManagement = () => {
  if (!user_token.value) {
    goToLogin();
    return;
  }
  uni.navigateTo({
    url: '/subPackages/admin/config/index',
  });
};

// 处理头像点击
const handleAvatarClick = () => {
  if (!user_token.value) {
    goToLogin();
    return;
  }
  uni.navigateTo({
    url: '/pages/user-profile/index',
  });
};

// 退出登录
const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        // 清除用户信息
        clearUserContext();

        // 清除本地存储
        uni.removeStorageSync('token');
        uni.removeStorageSync('userId');

        // 清除公司用户状态
        isCompanyUser.value = false;
        isAdmin.value = false;
        isCompanyAdminUser.value = false;

        uni.showToast({
          title: '已退出登录',
          icon: 'success',
        });

        // 刷新页面
        setTimeout(() => {
          uni.switchTab({
            url: '/pages/mine/index',
          });
        }, 1000);
      }
    },
  });
};

onMounted(() => {
  checkUserPermissions();
});

onShow(() => {
  // 每次显示页面时检查用户状态和权限
  checkUserPermissions();
});
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
  padding-bottom: 40rpx;
}

/* 顶部背景装饰 */
.header-bg {
  position: relative;
  height: 280rpx;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  transform: skewY(-3deg);
  transform-origin: top left;
  margin-top: -40rpx;
}

/* 用户信息卡片 */
.user-card {
  position: relative;
  margin: -200rpx 30rpx 30rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(102, 126, 234, 0.15);
  z-index: 10;
}

.user-header {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  position: relative;
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 4rpx solid #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.avatar-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36rpx;
  height: 36rpx;
  background: #52c41a;
  border-radius: 50%;
  border: 3rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-icon {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: bold;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.nickname-section {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.nickname {
  font-size: 40rpx;
  font-weight: bold;
  color: #1a1a1a;
}

.role-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.role-badge.admin {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: #ffffff;
}

.role-badge.company-admin {
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
  color: #ffffff;
}

.role-badge.user {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #333333;
}

.role-text {
  font-size: 22rpx;
  font-weight: 500;
}

.phone-section {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  width: fit-content;
}

.phone-icon {
  font-size: 24rpx;
}

.phone-number {
  font-size: 26rpx;
  color: #666666;
}

.login-prompt {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.prompt-text {
  font-size: 26rpx;
  color: #999999;
}

.login-btn {
  width: 180rpx;
  height: 64rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 32rpx;
  font-size: 28rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
}

.login-btn::after {
  border: none;
}

/* 快捷功能区域 */
.quick-actions {
  display: flex;
  justify-content: space-around;
  margin: 0 30rpx 30rpx;
  padding: 30rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.action-icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.action-icon-wrapper.order {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.action-icon-wrapper.resource {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.action-icon-wrapper.settings {
  background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);
}

.action-icon {
  width: 56rpx;
  height: 56rpx;
}

.action-label {
  font-size: 26rpx;
  color: #333333;
  font-weight: 500;
}

/* 管理功能区域 */
.admin-section {
  margin: 0 30rpx 30rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-header {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #1a1a1a;
  position: relative;
  padding-left: 16rpx;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3rpx;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.admin-item {
  padding: 30rpx;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 16rpx;
  border: 2rpx solid #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  transition: all 0.3s;
}

.admin-item:active {
  transform: scale(0.98);
  background: linear-gradient(135deg, #f0f0f0 0%, #f8f9fa 100%);
}

.admin-icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.admin-icon-wrapper.company {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.admin-icon-wrapper.config {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.admin-icon-wrapper.product {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.admin-icon-wrapper.order {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.admin-icon {
  font-size: 48rpx;
}

.admin-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #1a1a1a;
}

.admin-desc {
  font-size: 22rpx;
  color: #999999;
}

/* 注册提示 */
.register-tip {
  margin: 0 30rpx 30rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
  border-radius: 16rpx;
  border-left: 6rpx solid #ffc107;
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
}

.tip-icon {
  font-size: 40rpx;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tip-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #856404;
}

.tip-text {
  font-size: 26rpx;
  color: #856404;
  line-height: 1.6;
}

/* 退出登录 */
.logout-section {
  margin: 0 30rpx;
  padding: 20rpx 0;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  background: #ffffff;
  color: #ff6b6b;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 500;
  border: 2rpx solid #ffebee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn::after {
  border: none;
}

.logout-btn:active {
  background: #fff5f5;
}
</style>

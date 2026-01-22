<template>
  <view class="content">
    <image class="logo" src="/static/logo.png" />
    <view class="text-area">
      <text class="title">你好，{{ user?.nickname || "" }}</text>
      <view v-if="user?.bio" class="bio">{{ user.bio }}</view>
      <view v-if="loading" class="loading">加载中...</view>
    </view>

    <!-- 页面导航入口 -->
    <view class="nav-section">
      <view class="nav-title">测试页面</view>
      <view class="nav-list">
        <view class="nav-item" @click="navigateTo('/pages/upload/index')">
          <view class="nav-icon">📤</view>
          <view class="nav-content">
            <text class="nav-name">文件上传</text>
            <text class="nav-desc">七牛云客户端直传示例</text>
          </view>
          <view class="nav-arrow">›</view>
        </view>
        <view class="nav-item" @click="navigateTo('/subPackages/other-package/index')">
          <view class="nav-icon">📋</view>
          <view class="nav-content">
            <text class="nav-name">其他页面</text>
            <text class="nav-desc">分包页面示例</text>
          </view>
          <view class="nav-arrow">›</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getUser } from "@/api/user";
import type { Users } from "@/types/graphql";

export default {
  setup() {
    const user = ref<Users | null>(null);
    const loading = ref(false);

    onLoad(async () => {
      loading.value = true;
      try {
        user.value = await getUser({});
      } catch (error) {
        console.error("获取用户信息失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    });

    // 导航到指定页面
    const navigateTo = (url: string) => {
      uni.navigateTo({
        url,
        fail: (error) => {
          console.error("导航失败:", error);
          uni.showToast({
            title: "页面不存在",
            icon: "none",
          });
        },
      });
    };

    return { user, loading, navigateTo };
  },
};
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 200rpx;
  width: 200rpx;
  margin-top: 200rpx;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 50rpx;
}

.text-area {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.title {
  font-size: 36rpx;
  color: #8f8f94;
}

.bio {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #666;
}

.loading {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #999;
}

.nav-section {
  width: 100%;
  margin-top: 80rpx;
  padding: 0 32rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.nav-item:active {
  background: #f5f5f5;
  transform: scale(0.98);
}

.nav-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
}

.nav-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.nav-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.nav-desc {
  font-size: 24rpx;
  color: #999;
}

.nav-arrow {
  font-size: 40rpx;
  color: #ccc;
  margin-left: 16rpx;
}
</style>

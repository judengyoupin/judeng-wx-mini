<template>
  <view class="switch-company-page">
    <PageNavBar title="切换公司" :show-back="true" @back="goBack" />

    <view v-if="loading" class="loading-wrap">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="list.length === 0" class="empty-wrap">
      <text class="empty-icon">🏢</text>
      <text class="empty-text">您还未加入任何公司</text>
      <text class="empty-hint">请联系管理员将您加入公司</text>
    </view>

    <scroll-view v-else scroll-y class="list-scroll">
      <view
        v-for="item in list"
        :key="item.id"
        class="company-row"
        :class="{ active: item.id === currentCompanyId }"
        @click="onSelectCompany(item)"
      >
        <view class="company-logo-wrap">
          <image
            v-if="item.logo_url"
            class="company-logo"
            :src="item.logo_url"
            mode="aspectFill"
          />
          <view v-else class="company-logo-placeholder">
            <text>{{ (item.name || '公')[0] }}</text>
          </view>
        </view>
        <text class="company-name">{{ item.name || '未命名公司' }}</text>
        <text v-if="item.id === currentCompanyId" class="current-tag">当前</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getUserJoinedCompanies } from '@/utils/company';
import type { UserJoinedCompany } from '@/utils/company';
import { syncCompanyInfo } from '@/api/company/index';
import { companyInfo } from '@/store/userStore';
import { clearCompanyUserRoleCache } from '@/utils/auth';
import { safeNavigateBack } from '@/utils/navigation';
import PageNavBar from '@/components/PageNavBar.vue';

const loading = ref(true);
const list = ref<UserJoinedCompany[]>([]);

const currentCompanyId = computed(() => companyInfo.value?.id ?? null);

const goBack = () => {
  safeNavigateBack();
};

const onSelectCompany = async (item: UserJoinedCompany) => {
  if (item.id === currentCompanyId.value) {
    uni.showToast({ title: '已是当前公司', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '切换中...' });
  try {
    clearCompanyUserRoleCache();
    uni.setStorageSync('companyId', item.id);
    await syncCompanyInfo(item.id);
    uni.hideLoading();
    uni.showToast({ title: '已切换', icon: 'success' });
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' });
    }, 400);
  } catch (error: any) {
    uni.hideLoading();
    uni.showToast({
      title: error?.message || '切换失败',
      icon: 'none',
    });
  }
};

onLoad(async () => {
  try {
    const data = await getUserJoinedCompanies();
    list.value = data;
  } catch (e) {
    console.error('加载公司列表失败', e);
    list.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.switch-company-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  gap: 24rpx;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.empty-icon {
  font-size: 80rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 30rpx;
  color: #333;
}

.empty-hint {
  font-size: 26rpx;
  color: #999;
}

.list-scroll {
  flex: 1;
  padding: 24rpx;
}

.company-row {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.company-row.active {
  border: 2rpx solid #667eea;
  background: #f8f9ff;
}

.company-logo-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 24rpx;
}

.company-logo {
  width: 100%;
  height: 100%;
  display: block;
}

.company-logo-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.company-logo-placeholder text {
  font-size: 36rpx;
  color: #fff;
  font-weight: bold;
}

.company-name {
  flex: 1;
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.current-tag {
  font-size: 24rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.15);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}
</style>

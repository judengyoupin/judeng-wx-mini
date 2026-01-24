<template>
  <view class="package-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-title">套餐</view>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-box">
      <view class="search-input">
        <image class="search-icon" src="/static/index/srch.png" mode="aspectFit"></image>
        <input
          type="text"
          confirm-type="search"
          v-model="searchKeyword"
          placeholder="请输入套餐名称"
          @confirm="onSearchConfirm"
        />
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>

    <!-- 套餐列表 -->
    <view v-else class="package-list">
      <view
        v-for="pkg in packages"
        :key="pkg.id"
        class="package-item"
        @click="goToPackageDetail(pkg.id)"
      >
        <image
          class="package-image"
          :src="pkg.cover_image_url || '/static/default.png'"
          mode="aspectFill"
        ></image>
        <view class="package-info">
          <view class="package-name">{{ pkg.name }}</view>
          <view class="package-desc" v-if="pkg.description">
            {{ pkg.description.length > 50 ? pkg.description.substring(0, 50) + '...' : pkg.description }}
          </view>
          <view class="package-skus">
            <text class="sku-count">包含 {{ pkg.package_product_skus?.length || 0 }} 个商品</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="packages.length === 0" class="empty-state">
        <text class="empty-text">暂无套餐</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { getPackageList } from '@/api/package/index';
import { companyInfo } from '@/store/userStore';

const packages = ref<any[]>([]);
const loading = ref(false);
const searchKeyword = ref('');
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);

// 加载套餐列表
const loadPackages = async (reset = false) => {
  if (loading.value || (!hasMore.value && !reset)) {
    return;
  }

  if (reset) {
    page.value = 1;
    hasMore.value = true;
  }

  if (!companyInfo.value?.id) {
    uni.showToast({
      title: '公司信息不存在',
      icon: 'none',
    });
    return;
  }

  loading.value = true;

  try {
    const result = await getPackageList({
      companyId: companyInfo.value.id,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });

    if (reset) {
      packages.value = [];
    }

    if (result.packages && result.packages.length > 0) {
      packages.value = [...packages.value, ...result.packages];
      
      if (result.packages.length < pageSize) {
        hasMore.value = false;
      } else {
        page.value++;
      }
    } else {
      hasMore.value = false;
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
};

// 搜索
const onSearchConfirm = () => {
  // 搜索功能可以后续实现，先跳转到商品搜索页
  if (searchKeyword.value.trim()) {
    uni.navigateTo({
      url: `/pages/product/index?keyword=${encodeURIComponent(searchKeyword.value)}`,
    });
  }
};

// 加载更多
const loadMore = () => {
  if (!loading.value && hasMore.value) {
    loadPackages();
  }
};

// 跳转到套餐详情
const goToPackageDetail = (packageId: number) => {
  uni.navigateTo({
    url: `/pages/package-detail/index?id=${packageId}`,
  });
};

onMounted(() => {
  loadPackages(true);
});

onPullDownRefresh(() => {
  loadPackages(true);
});

onReachBottom(() => {
  loadMore();
});
</script>

<style scoped>
.package-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  background: #ffffff;
  z-index: 1000;
  border-bottom: 1rpx solid #e0e0e0;
}

.navbar-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 30rpx;
  padding-top: var(--status-bar-height, 0);
}

.navbar-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
}

.search-box {
  margin-top: 88rpx;
  padding: 20rpx 30rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e0e0e0;
}

.search-input {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 50rpx;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.search-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.search-input input {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.loading-container {
  padding: 100rpx 0;
  text-align: center;
  color: #999999;
  font-size: 28rpx;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.package-list {
  padding: 20rpx;
}

.package-item {
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.package-image {
  width: 100%;
  height: 400rpx;
  background: #f0f0f0;
}

.package-info {
  padding: 24rpx;
}

.package-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 12rpx;
}

.package-desc {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 12rpx;
}

.package-skus {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sku-count {
  font-size: 24rpx;
  color: #999999;
}

.empty-state {
  padding: 200rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.load-more {
  padding: 40rpx 0;
  text-align: center;
  color: #667eea;
  font-size: 28rpx;
}
</style>

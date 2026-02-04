<template>
  <view class="product-list-page">
    <!-- 统一导航栏（含状态栏高度） -->
    <PageNavBar :title="pageTitle" :show-back="true" @back="goBack" />

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-box">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索商品"
          confirm-type="search"
          @confirm="onSearch"
        />
        <text v-if="keyword" class="clear-icon" @click="clearSearch">×</text>
      </view>
    </view>

    <!-- 骨架屏 -->
    <view v-if="loading && products.length === 0" class="skeleton-area">
      <SkeletonScreen type="list-grid-2" :count="6" />
    </view>

    <!-- 商品列表 -->
    <scroll-view
      v-else
      scroll-y
      class="scroll-content"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="product-grid" v-if="products.length > 0">
        <view
          v-for="product in products"
          :key="product.id"
          class="product-item"
          @click="goDetail(product)"
        >
          <image
            class="product-image"
            :src="product.cover_image_url"
            mode="aspectFill"
            lazy-load
          ></image>
          <view class="product-info">
            <view class="product-name">{{ product.name }}</view>
            <view class="product-desc" v-if="product.description">
              {{ truncateText(getTextFromRichText(product.description), 20) }}
            </view>
            <view class="product-bottom">
              <view v-if="canViewPrice" class="product-price">
                <text class="currency">¥</text>
                <text class="amount">{{ getMinPrice(product) }}</text>
                <text class="unit">起</text>
              </view>
              <view v-else class="price-placeholder">
                查看详情
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-text">暂无商品</text>
      </view>

      <!-- 加载更多（非首屏） -->
      <view v-if="loading && products.length > 0" class="loading-more">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
      <view v-else-if="products.length > 0 && !hasMore" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getProductList } from '@/api/product/index';
import { userInfo, user_token, companyInfo } from '@/store/userStore';
import { getCompanyUserRoleCached } from '@/utils/auth';
import { safeNavigateBack } from '@/utils/navigation';
import PageNavBar from '@/components/PageNavBar.vue';
import SkeletonScreen from '@/components/SkeletonScreen.vue';

const keyword = ref('');
const products = ref<any[]>([]);
const loading = ref(false);
const isRefreshing = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;
const categoryId = ref<number | null>(null);
const categoryName = ref('');
const canViewPrice = ref(false);
const priceFactor = ref(1); // 价格系数，默认为1

const pageTitle = computed(() => {
  if (categoryName.value) return categoryName.value;
  return companyInfo.value?.name || '商品列表';
});

// 从富文本提取纯文本
const getTextFromRichText = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '');
};

const truncateText = (text: string, length: number) => {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '...' : text;
};

// 计算最低价格（应用价格系数）
const getMinPrice = (product: any) => {
  if (!product.product_skus || product.product_skus.length === 0) return '0.00';
  const prices = product.product_skus.map((sku: any) => (sku.price || 0) * priceFactor.value);
  return Math.min(...prices).toFixed(2);
};

const checkPermissions = async () => {
  if (!user_token.value) {
    canViewPrice.value = false;
    priceFactor.value = 1;
    return;
  }
  try {
    const roleInfo = await getCompanyUserRoleCached();
    if (roleInfo) {
      canViewPrice.value = roleInfo.canViewPrice;
      priceFactor.value = roleInfo.priceFactor || 1;
    } else {
      canViewPrice.value = false;
      priceFactor.value = 1;
    }
  } catch (e) {
    canViewPrice.value = false;
    priceFactor.value = 1;
  }
};

const loadData = async (refresh = false) => {
  if (loading.value) return;
  loading.value = true;
  
  if (refresh) {
    page.value = 1;
    hasMore.value = true;
  }

  try {
    const res = await getProductList({
      companyId: userInfo.value?.manager?.company?.id,
      categoryId: categoryId.value || undefined,
      keyword: keyword.value,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });

    if (refresh) {
      products.value = res.products;
    } else {
      products.value = [...products.value, ...res.products];
    }

    if (res.products.length < pageSize) {
      hasMore.value = false;
    } else {
      page.value++;
    }
  } catch (error) {
    console.error('加载商品列表失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
    isRefreshing.value = false;
  }
};

const onSearch = () => {
  loadData(true);
};

const clearSearch = () => {
  keyword.value = '';
  loadData(true);
};

const onRefresh = () => {
  isRefreshing.value = true;
  loadData(true);
};

const loadMore = () => {
  if (hasMore.value && !loading.value) {
    loadData();
  }
};

const goDetail = (product: any) => {
  uni.navigateTo({
    url: `/pages/product-detail/index?id=${product.id}`,
  });
};

const goBack = () => {
  safeNavigateBack();
};

onLoad(async (options?) => {
  if (options?.keyword) {
    keyword.value = decodeURIComponent(options.keyword);
  }
  if (options?.categoryId) {
    categoryId.value = Number(options.categoryId);
  }
  if (options?.categoryName) {
    categoryName.value = decodeURIComponent(options.categoryName);
  }

  await checkPermissions();
  loadData(true);
});
</script>

<style scoped>
.product-list-page {
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.search-bar {
  background: #ffffff;
  padding: 20rpx 30rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-input-box {
  background: #f5f5f5;
  border-radius: 40rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  padding: 0 30rpx;
}

.search-icon {
  font-size: 32rpx;
  color: #999;
  margin-right: 10rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
}

.clear-icon {
  font-size: 32rpx;
  color: #999;
  padding: 10rpx;
}

.skeleton-area {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.scroll-content {
  flex: 1;
  overflow: hidden;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  padding: 20rpx;
}

.product-item {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.product-image {
  width: 100%;
  height: 340rpx;
  background: #f0f0f0;
}

.product-info {
  padding: 20rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-desc {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.product-price {
  color: #ff6b6b;
  font-weight: bold;
  display: flex;
  align-items: baseline;
}

.currency {
  font-size: 24rpx;
}

.amount {
  font-size: 36rpx;
}

.unit {
  font-size: 24rpx;
  color: #999;
  margin-left: 4rpx;
  font-weight: normal;
}

.price-placeholder {
  font-size: 24rpx;
  color: #667eea;
  background: #eff6ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.empty-state {
  padding: 100rpx 0;
  text-align: center;
}

.empty-text {
  color: #999;
  font-size: 28rpx;
}

.loading-more,
.no-more {
  padding: 30rpx 0;
  text-align: center;
  color: #999;
  font-size: 24rpx;
}

.loading-spinner {
  display: inline-block;
  width: 30rpx;
  height: 30rpx;
  border: 3rpx solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10rpx;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

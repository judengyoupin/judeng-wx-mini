<template>
  <view class="search-page">
    <PageNavBar :title="pageTitle" :show-back="true" @back="goBack" />

    <!-- 搜索栏：进入页面自动聚焦 -->
    <view class="search-bar">
      <view class="search-input-box">
        <text class="search-icon">🔍</text>
        <input :adjust-position="false"
          class="search-input"
          v-model="keyword"
          :placeholder="searchPlaceholder"
          :focus="inputFocused"
          confirm-type="search"
          @confirm="onSearch"
          @input="onInput"
        />
        <text v-if="keyword" class="clear-icon" @click="clearSearch">×</text>
      </view>
    </view>

    <!-- 传入分类筛选时：展示当前分类名称说明（左侧蓝条 + 分类名） -->
    <view v-if="categoryName" class="category-desc-bar">
      <view class="category-desc-line"></view>
      <text class="category-desc-text">{{ categoryName }}</text>
    </view>

    <!-- 骨架屏（首屏/搜索加载中且无数据时） -->
    <view
      v-if="loading && (searchType === 'product' ? products.length === 0 : packages.length === 0)"
      class="skeleton-area"
    >
      <SkeletonScreen :type="searchType === 'product' ? 'list-grid-2' : 'list-grid-3'" :count="6" />
    </view>

    <!-- 商品列表 -->
    <scroll-view
      v-else-if="searchType === 'product'"
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
          class="product-card"
          @click="goProductDetail(product)"
        >
          <view class="product-card-image-wrap">
            <image class="product-card-image" :src="product.cover_image_url" mode="aspectFill" lazy-load />
            <ProductImageBadges :tags="product.tags" :out-of-stock="isProductOutOfStock(product)" />
          </view>
          <view class="product-card-info">
            <view class="product-card-name">{{ product.name }}</view>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">
        <text class="empty-text">暂无商品</text>
      </view>
      <view v-if="loading && products.length > 0" class="loading-more">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
      <view v-else-if="products.length > 0 && !hasMore" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 套餐列表 -->
    <scroll-view
      v-else
      scroll-y
      class="scroll-content"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="package-list" v-if="packages.length > 0">
        <view
          v-for="pkg in packages"
          :key="pkg.id"
          class="package-item"
          @click="goPackageDetail(pkg.id)"
        >
          <view class="package-image-wrap">
            <image
              class="package-image"
              :src="pkg.cover_image_url || '/static/default.png'"
              mode="aspectFill"
              lazy-load
            />
            <ProductImageBadges :tags="pkg.tags" :out-of-stock="false" />
          </view>
          <view class="package-info">
            <view class="package-name">{{ pkg.name }}</view>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">
        <text class="empty-text">暂无套餐</text>
      </view>
      <view v-if="loading && packages.length > 0" class="loading-more">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
      <view v-else-if="packages.length > 0 && !hasMore" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { whenAppReady } from '@/utils/appReady';
import { onLoad, onReady, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { getProductList } from '@/api/product/index';
import { getPackageList } from '@/api/package/index';
import { userInfo, companyInfo } from '@/store/userStore';
import { safeNavigateBack } from '@/utils/navigation';
import PageNavBar from '@/components/PageNavBar.vue';
import SkeletonScreen from '@/components/SkeletonScreen.vue';
import ProductImageBadges from '@/components/ProductImageBadges.vue';

const searchType = ref<'product' | 'package'>('product');
const keyword = ref('');
const inputFocused = ref(false);
const categoryId = ref<number | null>(null);
const categoryName = ref('');
const products = ref<any[]>([]);
const packages = ref<any[]>([]);
const loading = ref(false);
const isRefreshing = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 12;

const pageTitle = computed(() => {
  if (searchType.value === 'package') return '搜索套餐';
  if (categoryName.value) return `搜索商品-${categoryName.value}`;
  return '搜索商品';
});
const searchPlaceholder = computed(() =>
  searchType.value === 'product' ? '请输入商品名称' : '请输入套餐名称'
);

const isProductOutOfStock = (product: any) => {
  const total = product?.product_skus_aggregate?.aggregate?.sum?.stock ?? 0;
  return Number(total) <= 0;
};

const loadData = async (refresh = false) => {
  if (loading.value) return;
  if (refresh) {
    page.value = 1;
    hasMore.value = true;
  }

  // 使用当前用户所属公司 ID，getProductList/getPackageList 内部会按该公司 hidden_*_ids 过滤
  const companyId = userInfo.value?.manager?.company?.id || companyInfo.value?.id;
  if (!companyId) {
    loading.value = false;
    isRefreshing.value = false;
    return;
  }

  loading.value = true;

  try {
    if (searchType.value === 'product') {
      const res = await getProductList({
        companyId,
        categoryId: categoryId.value || undefined,
        keyword: keyword.value.trim() || undefined,
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
      });
      if (refresh) products.value = res.products;
      else products.value = [...products.value, ...res.products];
      hasMore.value = res.products.length >= pageSize;
    } else {
      const res = await getPackageList({
        companyId,
        keyword: keyword.value.trim() || undefined,
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
      });
      if (refresh) packages.value = res.packages;
      else packages.value = [...packages.value, ...res.packages];
      hasMore.value = (res.packages?.length || 0) >= pageSize;
    }
    page.value++;
  } catch (error) {
    console.error('搜索失败', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    isRefreshing.value = false;
  }
};

const onSearch = () => {
  loadData(true);
};

let inputTimer: ReturnType<typeof setTimeout> | null = null;
const onInput = () => {
  if (inputTimer) clearTimeout(inputTimer);
  inputTimer = setTimeout(() => {
    loadData(true);
  }, 400);
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
  if (hasMore.value && !loading.value) loadData();
};

const goProductDetail = (product: any) => {
  uni.navigateTo({ url: `/pages/product-detail/index?id=${product.id}` });
};

const goPackageDetail = (id: number) => {
  uni.navigateTo({ url: `/pages/package-detail/index?id=${id}` });
};

const goBack = () => {
  safeNavigateBack();
};

onLoad(async (options?) => {
  await whenAppReady();
  if (options?.type === 'package' || options?.type === 'product') {
    searchType.value = options.type;
  }
  if (options?.keyword) {
    keyword.value = decodeURIComponent(options.keyword);
  }
  if (options?.categoryId) {
    categoryId.value = Number(options.categoryId);
  }
  if (options?.categoryName) {
    categoryName.value = decodeURIComponent(options.categoryName);
  }
  // 无关键词时也加载列表（商品/套餐列表，已排除当前公司隐藏项；商品可能带分类筛选）
  loadData(true);
});

onReady(() => {
  inputFocused.value = true;
});

function getSharePath() {
  const cid = companyInfo.value?.id ?? uni.getStorageSync('companyId') ?? '';
  const parts = ['/pages/search/index'];
  const params = new URLSearchParams();
  if (cid) params.set('companyId', String(cid));
  if (searchType.value) params.set('type', searchType.value);
  if (keyword.value) params.set('keyword', keyword.value);
  if (categoryId.value != null) params.set('categoryId', String(categoryId.value));
  if (categoryName.value) params.set('categoryName', categoryName.value);
  const q = params.toString();
  return q ? `${parts[0]}?${q}` : parts[0];
}

function getShareQuery() {
  const cid = companyInfo.value?.id ?? uni.getStorageSync('companyId') ?? '';
  const params = new URLSearchParams();
  if (cid) params.set('companyId', String(cid));
  if (searchType.value) params.set('type', searchType.value);
  if (keyword.value) params.set('keyword', keyword.value);
  if (categoryId.value != null) params.set('categoryId', String(categoryId.value));
  if (categoryName.value) params.set('categoryName', categoryName.value);
  return params.toString();
}

onShareAppMessage(() => {
  return {
    title: pageTitle.value || (companyInfo.value?.name ? `${companyInfo.value.name} - 搜索` : '搜索'),
    path: getSharePath(),
  };
});

onShareTimeline(() => {
  return {
    title: pageTitle.value || (companyInfo.value?.name ? `${companyInfo.value.name} - 搜索` : '搜索'),
    query: getShareQuery(),
  };
});
</script>

<style scoped>
.search-page {
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.search-bar {
  background: #fff;
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

/* 分类筛选说明：左侧蓝色竖条 + 分类名称 */
.category-desc-bar {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #eee;
  gap: 16rpx;
}

.category-desc-line {
  width: 6rpx;
  height: 32rpx;
  background: #007aff;
  border-radius: 3rpx;
  flex-shrink: 0;
}

.category-desc-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.skeleton-area {
  flex: 1;
  min-height: 400rpx;
  overflow: hidden;
}

.scroll-content {
  flex: 1;
  overflow: hidden;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  padding: 16rpx;
}

.product-card {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.product-card-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #f5f5f5;
  border-radius: 20rpx 20rpx 0 0;
  overflow: hidden;
}

.product-card-image {
  width: 100%;
  height: 100%;
  display: block;
}

.product-card-info {
  padding: 20rpx 16rpx;
}

.product-card-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 套餐列表：与套餐页一致，每行 3 个 */
.package-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  padding: 16rpx;
}

.package-item {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.package-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #f5f5f5;
  overflow: hidden;
}

.package-image {
  width: 100%;
  height: 100%;
  display: block;
}

.package-info {
  padding: 16rpx 12rpx;
}

.package-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

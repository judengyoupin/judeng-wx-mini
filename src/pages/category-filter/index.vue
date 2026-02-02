<template>
  <view class="category-filter-page">
    <!-- 统一导航栏（含状态栏高度） -->
    <PageNavBar :title="companyInfo?.name || pageTitle" :show-back="true" @back="goBack" />

    <view class="content-container">
      <!-- 左侧子分类导航 -->
      <scroll-view scroll-y class="sidebar">
        <view
          v-for="(item, index) in subCategories"
          :key="item.id"
          class="sidebar-item"
          :class="{ active: currentCategoryId === item.id }"
          @click="switchCategory(item)"
        >
          <view class="sidebar-text">{{ item.name }}</view>
          <view class="active-indicator" v-if="currentCategoryId === item.id"></view>
        </view>
      </scroll-view>

      <!-- 右侧商品列表 -->
      <scroll-view
        scroll-y
        class="main-content"
        @scrolltolower="loadMore"
        refresher-enabled
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
      >
        <!-- 当前分类标题（可选） -->
        <view class="category-header" v-if="currentCategory">
          <text class="category-title">{{ currentCategory.name }}</text>
        </view>

        <!-- 商品网格 -->
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
              <view class="product-bottom">
                <view v-if="canViewPrice" class="product-price">
                  <text class="currency">¥</text>
                  <text class="amount">{{ getMinPrice(product) }}</text>
                </view>
                <view v-else class="price-placeholder">查看详情</view>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else-if="!loading" class="empty-state">
          <image src="/static/empty.png" mode="aspectFit" class="empty-icon" />
          <text class="empty-text">该分类暂无商品</text>
        </view>

        <!-- 加载更多 -->
        <view v-if="loading" class="loading-more">
          <view class="loading-spinner"></view>
          <text>加载中...</text>
        </view>
        <view v-else-if="products.length > 0 && !hasMore" class="no-more">
          <text>没有更多了</text>
        </view>
        
        <!-- 底部占位 -->
        <view class="footer-placeholder"></view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getCategoryTree } from '@/api/category/index';
import { getProductList } from '@/api/product/index';
import { userInfo, user_token, companyInfo } from '@/store/userStore';
import PageNavBar from '@/components/PageNavBar.vue';
import { getCompanyUserRole } from '@/utils/auth';

const parentId = ref<number | null>(null);
const pageTitle = ref('分类筛选');
const subCategories = ref<any[]>([]);
const currentCategoryId = ref<number | null>(null);
const products = ref<any[]>([]);
const loading = ref(false);
const isRefreshing = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = 10;
const canViewPrice = ref(false);
const priceFactor = ref(1); // 价格系数，默认为1

const currentCategory = computed(() => {
  return subCategories.value.find(c => c.id === currentCategoryId.value);
});

// 计算最低价格（应用价格系数）
const getMinPrice = (product: any) => {
  if (!product.product_skus || product.product_skus.length === 0) return '0.00';
  const prices = product.product_skus.map((sku: any) => (sku.price || 0) * priceFactor.value);
  return Math.min(...prices).toFixed(2);
};

// 检查权限
const checkPermissions = async () => {
  if (!user_token.value) {
    canViewPrice.value = false;
    priceFactor.value = 1;
    return;
  }
  try {
    const roleInfo = await getCompanyUserRole();
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

// 加载子分类
const loadSubCategories = async () => {
  if (!parentId.value) return;
  
  try {
    // 这里为了简单，重新获取整个分类树并在前端查找
    // 实际项目中如果有直接获取子分类的 API 会更好
    const res = await getCategoryTree(companyInfo.value?.id);
    if (res.code === 0 && res.data) {
      const parent = res.data.find((c: any) => c.id === parentId.value);
      if (parent && parent.children) {
        subCategories.value = parent.children;
        // 默认选中第一个子分类
        if (subCategories.value.length > 0) {
          currentCategoryId.value = subCategories.value[0].id;
          loadProducts(true);
        }
      }
    }
  } catch (error) {
    console.error('加载子分类失败:', error);
  }
};

// 加载商品
const loadProducts = async (refresh = false) => {
  if (loading.value) return;
  if (!currentCategoryId.value) return;

  loading.value = true;
  if (refresh) {
    page.value = 1;
    hasMore.value = true;
    products.value = [];
  }

  try {
    const res = await getProductList({
      companyId: userInfo.value?.manager?.company?.id,
      categoryId: currentCategoryId.value,
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
    console.error('加载商品失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
    isRefreshing.value = false;
  }
};

// 切换分类
const switchCategory = (category: any) => {
  if (currentCategoryId.value === category.id) return;
  currentCategoryId.value = category.id;
  loadProducts(true);
};

const onRefresh = () => {
  isRefreshing.value = true;
  loadProducts(true);
};

const loadMore = () => {
  if (hasMore.value && !loading.value) {
    loadProducts();
  }
};

const goDetail = (product: any) => {
  uni.navigateTo({
    url: `/pages/product-detail/index?id=${product.id}`,
  });
};

const goBack = () => {
  uni.navigateBack();
};

onLoad(async (options) => {
  if (options.categoryId) {
    parentId.value = Number(options.categoryId);
  }
  if (options.categoryName) {
    pageTitle.value = decodeURIComponent(options.categoryName);
  }

  await checkPermissions();
  loadSubCategories();
});
</script>

<style scoped>
.category-filter-page {
  height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.content-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧导航 */
.sidebar {
  width: 180rpx;
  background: #f8f8f8;
  height: 100%;
}

.sidebar-item {
  height: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 26rpx;
  color: #666;
  padding: 0 20rpx;
  text-align: center;
}

.sidebar-item.active {
  background: #ffffff;
  color: #333;
  font-weight: bold;
}

.active-indicator {
  position: absolute;
  left: 0;
  top: 30rpx;
  bottom: 30rpx;
  width: 6rpx;
  background: #667eea;
  border-radius: 0 4rpx 4rpx 0;
}

.sidebar-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 右侧内容 */
.main-content {
  flex: 1;
  height: 100%;
  background: #ffffff;
  padding: 20rpx;
  box-sizing: border-box;
}

.category-header {
  padding: 20rpx 0;
  margin-bottom: 20rpx;
}

.category-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  padding-left: 16rpx;
  border-left: 6rpx solid #667eea;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.product-item {
  background: #ffffff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid #f0f0f0;
}

.product-image {
  width: 100%;
  height: 260rpx; /* 稍微缩小图片高度以适应双列 */
  background: #f0f0f0;
}

.product-info {
  padding: 16rpx;
}

.product-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 72rpx;
}

.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  color: #ff6b6b;
  font-weight: bold;
  display: flex;
  align-items: baseline;
}

.currency {
  font-size: 22rpx;
}

.amount {
  font-size: 32rpx;
}

.price-placeholder {
  font-size: 22rpx;
  color: #667eea;
  background: #eff6ff;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
}

.empty-state {
  padding: 100rpx 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 20rpx;
  opacity: 0.5;
}

.empty-text {
  color: #999;
  font-size: 26rpx;
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

.footer-placeholder {
  height: 40rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

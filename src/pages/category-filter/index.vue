<template>
  <view class="category-filter-page">
    <!-- 导航栏：展示分类时为 [分类名称]-分类，展示商品时为 [分类名称]-商品，不显示公司名 -->
    <PageNavBar :title="navTitle" :show-back="true" @back="goBack" />

    <!-- 搜索：展示分类时带关键词跳转搜索页；展示商品时在当前页按关键词筛选 -->
    <view class="search-bar">
      <view class="search-input-box">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="请输入商品名称"
          confirm-type="search"
          @confirm="onSearchConfirm"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearchKeyword">×</text>
      </view>
    </view>

    <view class="content-container">
      <!-- 有子分类时：三列分类网格（图片绿框 + 名称） -->
      <scroll-view
        v-if="subCategories.length > 0"
        scroll-y
        class="main-content category-grid-wrap"
        refresher-enabled
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
      >
        <view class="category-grid">
          <view
            v-for="item in subCategories"
            :key="item.id"
            class="category-card"
            @click="onCategoryTap(item)"
          >
            <view class="category-card-image-wrap">
              <image
                class="category-card-image"
                :src="item.icon_url || item.icon || item.image || '/static/default.png'"
                mode="aspectFill"
              />
            </view>
            <text class="category-card-name">{{ item.name }}</text>
          </view>
        </view>
        <view v-if="subCategories.length === 0 && !loading" class="empty-state">
          <text class="empty-text">暂无分类</text>
        </view>
        <view class="footer-placeholder"></view>
      </scroll-view>

      <!-- 无子分类时：当前分类下的商品列表 -->
      <scroll-view
        v-else
        scroll-y
        class="main-content"
        @scrolltolower="loadMore"
        refresher-enabled
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
      >
        <view class="category-header">
          <text class="category-title">{{ currentCategory ? currentCategory.name : pageTitle }}</text>
        </view>

        <view class="product-grid" v-if="displayProducts.length > 0">
          <view
            v-for="product in displayProducts"
            :key="product.id"
            class="product-card"
            @click="goDetail(product)"
          >
            <view class="product-card-image-wrap">
              <image
                class="product-card-image"
                :src="product.cover_image_url"
                mode="aspectFill"
                lazy-load
              />
              <view v-if="getFirstTag(product.tags)" class="product-tag">{{ getFirstTag(product.tags) }}</view>
            </view>
            <view class="product-card-info">
              <view class="product-card-name">{{ product.name }}</view>
              <view class="product-card-bottom">
                <view v-if="canViewPrice" class="product-price">
                  <text class="currency">¥</text>
                  <text class="amount">{{ getMinPrice(product) }}</text>
                </view>
                <view v-else class="price-placeholder">查看详情</view>
              </view>
            </view>
          </view>
        </view>

        <view v-else-if="!loading" class="empty-state">
          <image src="/static/default.png" mode="aspectFit" class="empty-icon" />
          <text class="empty-text">{{ searchKeyword ? '未找到匹配的商品' : '该分类暂无商品' }}</text>
        </view>

        <view v-if="loading" class="loading-more">
          <view class="loading-spinner"></view>
          <text>加载中...</text>
        </view>
        <view v-else-if="displayProducts.length > 0 && !hasMore" class="no-more">
          <text>没有更多了</text>
        </view>
        <view class="footer-placeholder"></view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getCategoryChildren } from '@/api/category/index';
import { getProductList } from '@/api/product/index';
import { userInfo, user_token, companyInfo } from '@/store/userStore';
import PageNavBar from '@/components/PageNavBar.vue';
import { getCompanyUserRoleCached } from '@/utils/auth';

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

const searchKeyword = ref('');

// 展示分类时无商品列表；展示商品时按关键词在当前页筛选
const displayProducts = computed(() => {
  const kw = (searchKeyword.value || '').trim().toLowerCase();
  if (!kw) return products.value;
  return products.value.filter(
    (p: any) =>
      (p.name || '').toLowerCase().includes(kw) ||
      (p.description || '').toLowerCase().includes(kw)
  );
});

// 展示分类时：带关键词跳转搜索页；展示商品时：仅当前页筛选（由 displayProducts 完成）
const onSearchConfirm = () => {
  if (subCategories.value.length > 0) {
    const kw = (searchKeyword.value || '').trim();
    let url = `/pages/search/index?type=product`;
    if (parentId.value != null) url += `&categoryId=${parentId.value}`;
    if (pageTitle.value && pageTitle.value !== '分类筛选') url += `&categoryName=${encodeURIComponent(pageTitle.value)}`;
    if (kw) url += `&keyword=${encodeURIComponent(kw)}`;
    uni.navigateTo({ url });
  }
};

const clearSearchKeyword = () => {
  searchKeyword.value = '';
};

// 导航栏标题：展示分类时 [分类名称]-分类，展示商品时 [分类名称]-商品，不显示公司名
const navTitle = computed(() => {
  const name = pageTitle.value && pageTitle.value !== '分类筛选' ? pageTitle.value : '分类筛选';
  const suffix = subCategories.value.length > 0 ? '分类' : '商品';
  return `${name}-${suffix}`;
});

const getMinPrice = (product: any) => {
  if (!product.product_skus || product.product_skus.length === 0) return '0.00';
  const prices = product.product_skus.map((sku: any) => (sku.price || 0) * priceFactor.value);
  return Math.min(...prices).toFixed(2);
};

const getFirstTag = (tagsStr: string | null | undefined) => {
  if (!tagsStr || !String(tagsStr).trim()) return '';
  return String(tagsStr).split(/[,，|｜]/)[0].trim() || '';
};

// 检查权限
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

// 加载子分类（按父级 ID 拉取；无子分类时用当前分类 ID 展示该分类下的商品）
const loadSubCategories = async () => {
  if (!parentId.value) return;

  try {
    const res = await getCategoryChildren(parentId.value, companyInfo.value?.id ?? undefined);
    if (res.code === 0 && res.data) {
      subCategories.value = res.data;
      if (subCategories.value.length > 0) {
        currentCategoryId.value = subCategories.value[0].id;
      } else {
        // 无子分类：直接展示当前分类（父级）下的商品
        currentCategoryId.value = parentId.value;
      }
      loadProducts(true);
    }
  } catch (error) {
    console.error('加载子分类失败', error);
  } finally {
    isRefreshing.value = false;
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

// 点击分类卡片：进入该分类（继续看子分类或商品列表）
const onCategoryTap = (category: any) => {
  uni.navigateTo({
    url: `/pages/category-filter/index?categoryId=${category.id}&categoryName=${encodeURIComponent(category.name || '')}`,
  });
};

// 切换分类（无子分类时内部使用）
const switchCategory = (category: any) => {
  if (currentCategoryId.value === category.id) return;
  currentCategoryId.value = category.id;
  loadProducts(true);
};

const onRefresh = () => {
  isRefreshing.value = true;
  if (parentId.value) {
    loadSubCategories();
  } else {
    loadProducts(true);
  }
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

onLoad(async (options?) => {
  if (options?.categoryId) {
    parentId.value = Number(options.categoryId);
  }
  if (options?.categoryName) {
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
  overflow: hidden;
  background: #f5f5f5;
}

.search-bar {
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #e0e0e0;
}

.search-input-box {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 50rpx;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.search-input-box .search-icon {
  font-size: 32rpx;
  color: #999;
  flex-shrink: 0;
}

.search-input-box .search-input {
  flex: 1;
  font-size: 28rpx;
}

.search-input-box .clear-icon {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx;
}

.main-content {
  height: 100%;
  background: #f5f5f5;
  padding: 24rpx;
  box-sizing: border-box;
}

.category-grid-wrap {
  padding: 20rpx 24rpx;
}

/* 双列分类网格（图片绿框 + 名称） */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}

.category-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.category-card-image-wrap {
  width: 100%;
  aspect-ratio: 1;
  padding: 8rpx;
  box-sizing: border-box;
  border: 4rpx solid #22c55e;
  border-radius: 12rpx 12rpx 0 0;
  background: #fff;
}

.category-card-image {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  display: block;
  background: #f0f0f0;
}

.category-card-name {
  display: block;
  padding: 20rpx 16rpx;
  font-size: 26rpx;
  color: #333;
  text-align: center;
  line-height: 1.4;
  min-height: 72rpx;
}

/* 无子分类时的右侧内容 */
.main-content .category-header {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.category-header {
  padding: 20rpx 24rpx;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
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

.product-tag {
  position: absolute;
  left: 12rpx;
  bottom: 12rpx;
  background: #22c55e;
  color: #fff;
  padding: 6rpx 14rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
}

.product-card-info {
  padding: 20rpx 16rpx;
}

.product-card-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card-bottom {
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

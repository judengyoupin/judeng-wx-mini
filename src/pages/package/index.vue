<template>
  <view class="package-page">
    <!-- 统一导航栏（含状态栏高度） -->
    <PageNavBar :title="companyInfo?.name || '套餐'" />

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

    <!-- 分类筛选 -->
    <view class="category-filter">
      <scroll-view scroll-x class="category-scroll">
        <view class="category-list">
          <view
            class="category-item"
            :class="{ active: selectedCategoryId === null }"
            @click="selectCategory(null)"
          >
            <text>全部</text>
          </view>
          <view
            v-for="category in categories"
            :key="category.id"
            class="category-item"
            :class="{ active: selectedCategoryId === category.id }"
            @click="selectCategory(category.id)"
          >
            <text>{{ category.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>

    <!-- 套餐列表：每行 3 个 -->
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
          <view class="package-skus">
            <text class="sku-count">{{ pkg.package_product_skus?.length || 0 }} 个商品</text>
          </view>
        </view>
      </view>

      <!-- 空状态（跨整行） -->
      <view v-if="packages.length === 0" class="empty-state full-row">
        <text class="empty-text">暂无套餐</text>
      </view>

      <!-- 加载更多（跨整行） -->
      <view v-if="hasMore && !loading" class="load-more full-row" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { getPackageList } from '@/api/package/index';
import { getCategoryTree } from '@/api/category/index';
import { companyInfo } from '@/store/userStore';
import PageNavBar from '@/components/PageNavBar.vue';

const packages = ref<any[]>([]);
const loading = ref(false);
const searchKeyword = ref('');
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const categories = ref<any[]>([]);
const selectedCategoryId = ref<number | null>(null);
const loadingCategories = ref(false);

// 加载分类列表（套餐分类）
const loadCategories = async () => {
  if (!companyInfo.value?.id) return;

  loadingCategories.value = true;
  try {
    const result = await getCategoryTree(companyInfo.value.id, 'package');
    if (result.code === 0 && result.data) {
      // 扁平化分类树，只显示一级分类
      categories.value = result.data;
    }
  } catch (error: any) {
    console.error('加载分类失败:', error);
  } finally {
    loadingCategories.value = false;
  }
};

// 选择分类
const selectCategory = (categoryId: number | null) => {
  selectedCategoryId.value = categoryId;
  loadPackages(true); // 重新加载套餐列表
};

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
      categoryId: selectedCategoryId.value || undefined,
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
  loadCategories();
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

.search-box {
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.package-list .full-row {
  grid-column: 1 / -1;
}

.package-item {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.package-image {
  width: 100%;
  aspect-ratio: 1;
  background: #f0f0f0;
}

.package-info {
  padding: 16rpx 12rpx;
}

.package-name {
  font-size: 26rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

.package-skus {
  display: flex;
  align-items: center;
}

.sku-count {
  font-size: 22rpx;
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

.category-filter {
  background: #ffffff;
  border-bottom: 1rpx solid #e0e0e0;
}

.category-scroll {
  white-space: nowrap;
  width: 100%;
}

.category-list {
  display: flex;
  padding: 20rpx 30rpx;
  gap: 20rpx;
}

.category-item {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666666;
  white-space: nowrap;
  flex-shrink: 0;
}

.category-item.active {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}
</style>

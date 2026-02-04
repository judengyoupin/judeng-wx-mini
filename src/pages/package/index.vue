<template>
  <view class="package-page">
    <!-- 统一导航栏（含状态栏高度） -->
    <PageNavBar :title="companyInfo?.name || '套餐'" />

    <!-- 搜索框：当前页按名称/介绍筛选，不跳转 -->
    <view class="search-bar">
      <view class="search-input-box">
        <image class="search-icon" src="/static/index/srch.png" mode="aspectFit" />
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="请输入套餐名称"
          confirm-type="search"
          @confirm="onSearchConfirm"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="searchKeyword = ''">×</text>
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

    <!-- 骨架屏（首屏加载） -->
    <view v-if="loading && packages.length === 0" class="skeleton-area">
      <SkeletonScreen type="list-grid-3" :count="6" />
    </view>

    <!-- 套餐列表：每行 3 个，按关键词在当前页筛选 -->
    <view v-else class="package-list">
      <view
        v-for="pkg in filteredPackages"
        :key="pkg.id"
        class="package-item"
        @click="goToPackageDetail(pkg.id)"
      >
        <view class="package-image-wrap">
          <image
            class="package-image"
            :src="pkg.cover_image_url || '/static/default.png'"
            mode="aspectFill"
          />
          <view v-if="getFirstTag(pkg.tags)" class="package-tag">{{ getFirstTag(pkg.tags) }}</view>
        </view>
        <view class="package-info">
          <view class="package-name">{{ pkg.name }}</view>
        </view>
      </view>

      <!-- 空状态（跨整行） -->
      <view v-if="filteredPackages.length === 0" class="empty-state full-row">
        <text class="empty-text">{{ searchKeyword ? '未找到匹配的套餐' : '暂无套餐' }}</text>
      </view>

      <!-- 加载更多（跨整行） -->
      <view v-if="loading && packages.length > 0" class="load-more full-row">
        <text>加载中...</text>
      </view>
      <view v-else-if="hasMore && !searchKeyword" class="load-more full-row" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { getPackageList } from '@/api/package/index';
import { getCategoryTree } from '@/api/category/index';
import { companyInfo } from '@/store/userStore';
import PageNavBar from '@/components/PageNavBar.vue';
import SkeletonScreen from '@/components/SkeletonScreen.vue';

const packages = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const categories = ref<any[]>([]);
const selectedCategoryId = ref<number | null>(null);
const loadingCategories = ref(false);
const searchKeyword = ref('');

// 当前页按关键词筛选套餐（名称、介绍）
const filteredPackages = computed(() => {
  const kw = (searchKeyword.value || '').trim().toLowerCase();
  if (!kw) return packages.value;
  return packages.value.filter(
    (p: any) =>
      (p.name || '').toLowerCase().includes(kw) ||
      (p.description || '').toLowerCase().includes(kw)
  );
});

const onSearchConfirm = () => {
  // 筛选由 computed 完成，无需额外逻辑
};

const PACKAGE_PAGE_CACHE_TTL = 5 * 60 * 1000;
const packagePageCache = ref<{
  companyId: number;
  categoryId: number | null;
  categories: any[];
  packages: any[];
  timestamp: number;
} | null>(null);

const getFirstTag = (tagsStr: string | null | undefined) => {
  if (!tagsStr || !String(tagsStr).trim()) return '';
  return String(tagsStr).split(/[,，|｜]/)[0].trim() || '';
};

// 加载分类列表（套餐分类），成功时更新缓存
const loadCategories = async (useCache = true) => {
  const companyId = companyInfo.value?.id;
  if (!companyId) return;

  const cache = packagePageCache.value;
  if (useCache && cache && cache.companyId === companyId && Date.now() - cache.timestamp < PACKAGE_PAGE_CACHE_TTL && cache.categories.length > 0) {
    categories.value = cache.categories;
    return;
  }

  loadingCategories.value = true;
  try {
    const result = await getCategoryTree(companyId, 'package');
    if (result.code === 0 && result.data) {
      categories.value = result.data;
    }
  } catch (error: any) {
    console.error('加载分类失败:', error);
  } finally {
    loadingCategories.value = false;
  }
};

// 选择分类（必走接口，不用缓存）
const selectCategory = (categoryId: number | null) => {
  selectedCategoryId.value = categoryId;
  loadPackages(true, false);
};

// 加载套餐列表，reset 时可选使用/写入 5 分钟缓存
const loadPackages = async (reset = false, useCache = true) => {
  const companyId = companyInfo.value?.id;
  if (!companyId) {
    uni.showToast({ title: '公司信息不存在', icon: 'none' });
    return;
  }

  if (reset) {
    page.value = 1;
    hasMore.value = true;
  }

  const cid = selectedCategoryId.value ?? null;
  const cache = packagePageCache.value;
  const cacheValid = useCache && reset && cache && cache.companyId === companyId && cache.categoryId === cid
    && Date.now() - cache.timestamp < PACKAGE_PAGE_CACHE_TTL;

  if (cacheValid && cache) {
    packages.value = cache.packages;
    hasMore.value = cache.packages.length >= pageSize;
    if (cache.packages.length >= pageSize) page.value = 2;
    if (typeof uni !== 'undefined' && uni.stopPullDownRefresh) uni.stopPullDownRefresh();
    return;
  }

  if (loading.value || (!hasMore.value && !reset)) return;

  loading.value = true;
  try {
    const result = await getPackageList({
      companyId,
      categoryId: cid ?? undefined,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });

    if (reset) packages.value = [];

    if (result.packages && result.packages.length > 0) {
      packages.value = [...packages.value, ...result.packages];
      hasMore.value = result.packages.length >= pageSize;
      if (result.packages.length >= pageSize) page.value++;
      else hasMore.value = false;
    } else {
      hasMore.value = false;
    }

    if (reset) {
      packagePageCache.value = {
        companyId,
        categoryId: cid,
        categories: categories.value,
        packages: packages.value,
        timestamp: Date.now(),
      };
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    if (typeof uni !== 'undefined' && uni.stopPullDownRefresh) uni.stopPullDownRefresh();
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

onShow(() => {
  if (!companyInfo.value?.id) return;
  // 优先用 5 分钟缓存，减少重复请求
  loadCategories(true).then(() => {
    loadPackages(true, true);
  });
});

onPullDownRefresh(() => {
  loadCategories(false);
  loadPackages(true, false);
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
  width: 32rpx;
  height: 32rpx;
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

.skeleton-area {
  padding: 24rpx;
  min-height: 400rpx;
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
  padding: 24rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}

.package-list .full-row {
  grid-column: 1 / -1;
}

/* 套餐卡片：白底圆角、轻阴影，参考图示 */
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

.package-tag {
  position: absolute;
  left: 12rpx;
  bottom: 12rpx;
  background: #22c55e;
  color: #fff;
  padding: 6rpx 14rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
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
  background: #22c55e;
  color: #ffffff;
}
</style>

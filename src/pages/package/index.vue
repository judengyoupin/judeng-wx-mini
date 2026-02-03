<template>
  <view class="package-page">
    <!-- 统一导航栏（含状态栏高度） -->
    <PageNavBar :title="companyInfo?.name || '套餐'" />

    <!-- 搜索框：点击跳转搜索页并自动聚焦 -->
    <SearchBox type="package" placeholder="请输入套餐名称" search-icon="/static/index/srch.png" />

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

    <!-- 套餐列表：每行 3 个，参考图示卡片样式 -->
    <view v-else class="package-list">
      <view
        v-for="pkg in packages"
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
      <view v-if="packages.length === 0" class="empty-state full-row">
        <text class="empty-text">暂无套餐</text>
      </view>

      <!-- 加载更多（跨整行） -->
      <view v-if="loading && packages.length > 0" class="load-more full-row">
        <text>加载中...</text>
      </view>
      <view v-else-if="hasMore" class="load-more full-row" @click="loadMore">
        <text>加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { getPackageList } from '@/api/package/index';
import { getCategoryTree } from '@/api/category/index';
import { companyInfo } from '@/store/userStore';
import PageNavBar from '@/components/PageNavBar.vue';
import SearchBox from '@/components/SearchBox.vue';
import SkeletonScreen from '@/components/SkeletonScreen.vue';

const packages = ref<any[]>([]);
const loading = ref(false);
const searchKeyword = ref('');
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const categories = ref<any[]>([]);
const selectedCategoryId = ref<number | null>(null);
const loadingCategories = ref(false);

const getFirstTag = (tagsStr: string | null | undefined) => {
  if (!tagsStr || !String(tagsStr).trim()) return '';
  return String(tagsStr).split(/[,，|｜]/)[0].trim() || '';
};

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
  // 每次进入页面（含从详情返回、切换 tab）都刷新分类和套餐列表，保证数据实时
  if (companyInfo.value?.id) {
    loadCategories();
    loadPackages(true);
  }
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

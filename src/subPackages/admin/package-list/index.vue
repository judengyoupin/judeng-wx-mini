<template>
  <view class="package-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <button class="add-btn" @click="goToAddPackage">+ 添加套餐</button>
    </view>

    <!-- 套餐列表 -->
    <view class="package-list">
      <view 
        v-for="pkg in packages" 
        :key="pkg.id"
        class="package-item"
        @click="goToEditPackage(pkg.id)"
      >
        <image 
          class="package-image" 
          :src="pkg.cover_image_url" 
          mode="aspectFill"
        ></image>
        <view class="package-info">
          <view class="package-name">{{ pkg.name }}</view>
          <view class="package-meta">
            <text class="sku-count">{{ pkg.package_product_skus?.length || 0 }}个商品</text>
          </view>
          <view v-if="pkg.description" class="package-desc">
            {{ pkg.description }}
          </view>
        </view>
        <view class="package-actions">
          <view class="action-btn delete" @click.stop="handleDelete(pkg)">删除</view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="packages.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无套餐</text>
        <button class="empty-btn" @click="goToAddPackage">添加套餐</button>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { getPackageList, deletePackage } from '@/api/admin/package';

const packages = ref<any[]>([]);
const loading = ref(false);
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

  loading.value = true;

  try {
    const result = await getPackageList({
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });

    if (reset) {
      packages.value = [];
    }

    packages.value = [...packages.value, ...(result.packages || [])];

    if (result.total <= packages.value.length) {
      hasMore.value = false;
    } else {
      page.value++;
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

// 删除套餐
const handleDelete = (pkg: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除套餐"${pkg.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deletePackage(pkg.id);
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          });
          loadPackages(true);
        } catch (error: any) {
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none',
          });
        }
      }
    },
  });
};

// 跳转到添加套餐
const goToAddPackage = () => {
  uni.navigateTo({
    url: '/subPackages/admin/package-edit/index',
  });
};

// 跳转到编辑套餐
const goToEditPackage = (packageId: number) => {
  uni.navigateTo({
    url: `/subPackages/admin/package-edit/index?id=${packageId}`,
  });
};

onMounted(() => {
  loadPackages(true);
});

onShow(() => {
  // 页面显示时刷新数据（从编辑页面返回时）
  loadPackages(true);
});

onPullDownRefresh(() => {
  loadPackages(true);
});

onReachBottom(() => {
  loadPackages();
});
</script>

<style scoped>
.package-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-bar {
  background: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.add-btn {
  padding: 10rpx 20rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;
}

.package-list {
  padding: 20rpx;
}

.package-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.package-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.package-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.package-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.package-meta {
  font-size: 24rpx;
  color: #999999;
}

.package-desc {
  font-size: 26rpx;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.package-actions {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.action-btn {
  padding: 8rpx 20rpx;
  background: #f0f0f0;
  color: #333333;
  border-radius: 8rpx;
  font-size: 24rpx;
  text-align: center;
}

.action-btn.delete {
  background: #fff5f5;
  color: #ff6b6b;
}

.empty-state {
  padding: 100rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
  display: block;
  margin-bottom: 40rpx;
}

.empty-btn {
  padding: 20rpx 40rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.loading-state {
  padding: 40rpx 0;
  text-align: center;
  color: #999999;
  font-size: 28rpx;
}
</style>

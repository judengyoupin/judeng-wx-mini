<template>
  <view class="product-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <view class="header-actions">
        <view class="filter-tabs">
          <view 
            class="tab-item" 
            :class="{ active: currentTab === 'all' }"
            @click="currentTab = 'all'"
          >
            全部
          </view>
          <view 
            class="tab-item" 
            :class="{ active: currentTab === 'shelved' }"
            @click="currentTab = 'shelved'"
          >
            已上架
          </view>
          <view 
            class="tab-item" 
            :class="{ active: currentTab === 'unshelved' }"
            @click="currentTab = 'unshelved'"
          >
            已下架
          </view>
        </view>
        <button class="add-btn" @click="goToAddProduct">+ 添加商品</button>
      </view>
      <!-- 管理入口 -->
      <view class="management-tabs">
        <view class="management-item" @click="goToCategoryManagement">
          <text class="management-icon">📁</text>
          <text class="management-text">分类管理</text>
        </view>
        <view class="management-item" @click="goToPackageManagement">
          <text class="management-icon">📦</text>
          <text class="management-text">套餐管理</text>
        </view>
        <view class="management-item" @click="goToUserManagement">
          <text class="management-icon">👥</text>
          <text class="management-text">用户管理</text>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="product-list">
      <view 
        v-for="product in products" 
        :key="product.id"
        class="product-item"
        @click="goToEditProduct(product.id)"
      >
        <image 
          class="product-image" 
          :src="product.cover_image_url" 
          mode="aspectFill"
        ></image>
        <view class="product-info">
          <view class="product-name">{{ product.name }}</view>
          <view class="product-meta">
            <text class="sku-count">{{ product.product_skus?.length || 0 }}个规格</text>
            <text class="status" :class="{ 'status-shelved': product.is_shelved }">
              {{ product.is_shelved ? '已上架' : '已下架' }}
            </text>
          </view>
        </view>
        <view class="product-actions">
          <view class="action-btn" @click.stop="toggleShelve(product)">
            {{ product.is_shelved ? '下架' : '上架' }}
          </view>
          <view class="action-btn delete" @click.stop="handleDelete(product)">
            删除
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="products.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无商品</text>
        <button class="empty-btn" @click="goToAddProduct">添加商品</button>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getProductList, deleteProduct, updateProduct } from '@/api/admin/product';

const products = ref<any[]>([]);
const loading = ref(false);
const currentTab = ref<'all' | 'shelved' | 'unshelved'>('all');
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);

// 加载商品列表
const loadProducts = async (reset = false) => {
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
    const where: any = {
      companyId: companyInfo.value.id,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    };

    if (currentTab.value === 'shelved') {
      // 已上架的商品需要额外过滤，这里先获取全部，前端过滤
    } else if (currentTab.value === 'unshelved') {
      // 已下架的商品需要额外过滤
    }

    const result = await getProductList(where);

    if (reset) {
      products.value = [];
    }

    // 根据tab过滤
    let filteredProducts = result.products || [];
    if (currentTab.value === 'shelved') {
      filteredProducts = filteredProducts.filter((p: any) => p.is_shelved);
    } else if (currentTab.value === 'unshelved') {
      filteredProducts = filteredProducts.filter((p: any) => !p.is_shelved);
    }

    products.value = [...products.value, ...filteredProducts];

    if (result.total <= products.value.length) {
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

// 切换上架/下架
const toggleShelve = async (product: any) => {
  try {
    await updateProduct(product.id, {
      is_shelved: !product.is_shelved,
    });

    uni.showToast({
      title: product.is_shelved ? '已下架' : '已上架',
      icon: 'success',
    });

    // 重新加载列表
    loadProducts(true);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none',
    });
  }
};

// 删除商品
const handleDelete = (product: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除商品"${product.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteProduct(product.id);
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          });
          loadProducts(true);
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

// 跳转到添加商品
const goToAddProduct = () => {
  uni.navigateTo({
    url: '/subPackages/admin/product-edit/index',
  });
};

// 跳转到编辑商品
const goToEditProduct = (productId: number) => {
  uni.navigateTo({
    url: `/subPackages/admin/product-edit/index?id=${productId}`,
  });
};

// 跳转到分类管理
const goToCategoryManagement = () => {
  uni.navigateTo({
    url: '/subPackages/admin/category-list/index',
  });
};

// 跳转到套餐管理
const goToPackageManagement = () => {
  uni.navigateTo({
    url: '/subPackages/admin/package-list/index',
  });
};

// 跳转到用户管理
const goToUserManagement = () => {
  uni.navigateTo({
    url: '/subPackages/admin/company-user-list/index',
  });
};

// 监听tab切换
watch(currentTab, () => {
  loadProducts(true);
});

onMounted(() => {
  loadProducts(true);
});

onShow(() => {
  // 页面显示时刷新数据（从编辑页面返回时）
  loadProducts(true);
});

onPullDownRefresh(() => {
  loadProducts(true);
});

onReachBottom(() => {
  loadProducts();
});
</script>

<style scoped>
.product-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-bar {
  background: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: 20rpx;
}

.tab-item {
  padding: 10rpx 20rpx;
  font-size: 28rpx;
  color: #666666;
  border-radius: 8rpx;
  transition: all 0.3s;
}

.tab-item.active {
  background: #667eea;
  color: #ffffff;
}

.add-btn {
  padding: 10rpx 20rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;
}

.management-tabs {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 0;
  border-top: 1rpx solid #e0e0e0;
  margin-top: 20rpx;
}

.management-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx;
}

.management-icon {
  font-size: 40rpx;
}

.management-text {
  font-size: 24rpx;
  color: #666666;
}

.product-list {
  padding: 20rpx;
}

.product-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.product-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  gap: 20rpx;
  font-size: 24rpx;
  color: #999999;
}

.status {
  color: #ff6b6b;
}

.status-shelved {
  color: #51cf66;
}

.product-actions {
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

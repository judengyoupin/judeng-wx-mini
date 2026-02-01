<template>
  <view class="category-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <button class="add-btn" @click="goToAddCategory">+ 添加分类</button>
    </view>

    <!-- 分类树 -->
    <view class="category-tree">
      <view 
        v-for="category in categories" 
        :key="category.id"
        class="category-item"
      >
        <view class="category-main" @click="toggleExpand(category)">
          <view class="category-info">
            <image 
              v-if="category.icon_url" 
              :src="category.icon_url" 
              class="category-icon"
              mode="aspectFill"
            />
            <text class="category-name">{{ category.name }}</text>
            <text class="category-level">L{{ category.level }}</text>
          </view>
          <view class="category-actions">
            <view class="action-btn" @click.stop="goToEditCategory(category)">编辑</view>
            <view class="action-btn delete" @click.stop="handleDelete(category)">删除</view>
          </view>
        </view>
        
        <!-- 子分类 -->
        <view 
          v-if="category.expanded && category.categories && category.categories.length > 0"
          class="sub-categories"
        >
          <view 
            v-for="subCategory in category.categories" 
            :key="subCategory.id"
            class="sub-category-item"
          >
            <view class="category-info">
              <image 
                v-if="subCategory.icon_url" 
                :src="subCategory.icon_url" 
                class="category-icon"
                mode="aspectFill"
              />
              <text class="category-name">{{ subCategory.name }}</text>
              <text class="category-level">L{{ subCategory.level }}</text>
            </view>
            <view class="category-actions">
              <view class="action-btn" @click.stop="goToEditCategory(subCategory)">编辑</view>
              <view class="action-btn delete" @click.stop="handleDelete(subCategory)">删除</view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="categories.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无分类</text>
        <button class="empty-btn" @click="goToAddCategory">添加分类</button>
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
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getCategoryTree, deleteCategory } from '@/api/admin/category';

const categories = ref<any[]>([]);
const loading = ref(false);

// 加载分类树
const loadCategories = async () => {
  if (!companyInfo.value?.id) {
    uni.showToast({
      title: '公司信息不存在',
      icon: 'none',
    });
    return;
  }

  loading.value = true;

  try {
    const result = await getCategoryTree(companyInfo.value.id);
    // 添加展开状态
    categories.value = result.map((cat: any) => ({
      ...cat,
      expanded: false,
    }));
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

// 切换展开/收起
const toggleExpand = (category: any) => {
  category.expanded = !category.expanded;
};

// 跳转到添加分类
const goToAddCategory = () => {
  uni.navigateTo({
    url: '/subPackages/admin/category-edit/index',
  });
};

// 跳转到编辑分类
const goToEditCategory = (category: any) => {
  uni.navigateTo({
    url: `/subPackages/admin/category-edit/index?id=${category.id}`,
  });
};

// 删除分类
const handleDelete = (category: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除分类"${category.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteCategory(category.id);
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          });
          loadCategories();
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

onMounted(() => {
  loadCategories();
});

onShow(() => {
  // 页面显示时刷新数据（从编辑页面返回时）
  loadCategories();
});

onPullDownRefresh(() => {
  loadCategories();
});
</script>

<style scoped>
.category-list-page {
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

.category-tree {
  padding: 20rpx;
}

.category-item {
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.category-main {
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.category-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}

.category-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.category-level {
  padding: 4rpx 12rpx;
  background: #f0f0f0;
  color: #666666;
  border-radius: 4rpx;
  font-size: 22rpx;
}

.category-actions {
  display: flex;
  gap: 10rpx;
}

.action-btn {
  padding: 8rpx 16rpx;
  background: #f0f0f0;
  color: #333333;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.action-btn.delete {
  background: #fff5f5;
  color: #ff6b6b;
}

.sub-categories {
  padding: 0 20rpx 20rpx 80rpx;
  background: #f8f8f8;
}

.sub-category-item {
  padding: 16rpx;
  background: #ffffff;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

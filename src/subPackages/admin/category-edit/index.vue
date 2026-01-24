<template>
  <view class="category-edit-page">
    <scroll-view scroll-y class="scroll-content">
      <view class="form-section">
        <view class="form-item">
          <view class="form-label">分类名称 <text class="required">*</text></view>
          <input 
            class="form-input" 
            v-model="form.name" 
            placeholder="请输入分类名称"
            maxlength="20"
          />
        </view>

        <view class="form-item">
          <view class="form-label">分类图标 <text class="required">*</text></view>
          <view class="form-upload square" @click="uploadIcon">
            <image 
              v-if="form.icon_url" 
              :src="form.icon_url" 
              class="uploaded-image"
              mode="aspectFill"
            />
            <view v-else class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传图标</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <view class="form-label">父级分类</view>
          <picker 
            mode="selector" 
            :range="parentCategoryOptions" 
            range-key="name"
            :value="selectedParentIndex"
            @change="onParentChange"
          >
            <view class="form-picker" :class="{ placeholder: !selectedParent }">
              {{ selectedParent ? selectedParent.name : '顶级分类（无父级）' }}
            </view>
          </picker>
        </view>

        <view class="form-item">
          <view class="form-label">展示方式</view>
          <picker 
            mode="selector" 
            :range="routeUiStyles" 
            :value="routeUiStyleIndex"
            @change="onRouteUiStyleChange"
          >
            <view class="form-picker">
              {{ routeUiStyles[routeUiStyleIndex] }}
            </view>
          </picker>
        </view>

        <view class="form-item">
          <view class="form-label">排序 <text class="required">*</text></view>
          <input 
            class="form-input" 
            type="number" 
            v-model="form.sort_order" 
            placeholder="数字越小越靠前"
          />
        </view>
      </view>

      <view class="footer-actions">
        <button class="save-btn" @click="handleSave">保存</button>
        <button class="cancel-btn" @click="handleCancel">取消</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getCategoryTree, createCategory, updateCategory } from '@/api/admin/category';
import { uploadFile } from '@/api/upload';

const categoryId = ref<number | null>(null);
const form = ref({
  name: '',
  icon_url: '',
  parent_categories: undefined as number | undefined,
  level: 0,
  route_ui_style: 'categories' as 'categories' | 'products',
  sort_order: 0,
});
const categories = ref<any[]>([]);
const routeUiStyles = ['继续展示分类', '展示产品'];
const routeUiStyleIndex = ref(0);

const parentCategoryOptions = computed(() => {
  const flatten = (cats: any[], excludeId?: number): any[] => {
    let result: any[] = [];
    cats.forEach(cat => {
      if (cat.id !== excludeId) {
        result.push(cat);
        if (cat.categories && cat.categories.length > 0) {
          result = result.concat(flatten(cat.categories, excludeId));
        }
      }
    });
    return result;
  };
  return [{ id: null, name: '顶级分类（无父级）' }, ...flatten(categories.value, categoryId.value || undefined)];
});

const selectedParentIndex = computed(() => {
  if (form.value.parent_categories === undefined) return 0;
  const index = parentCategoryOptions.value.findIndex(c => c.id === form.value.parent_categories);
  return index >= 0 ? index : 0;
});

const selectedParent = computed(() => {
  return parentCategoryOptions.value[selectedParentIndex.value];
});

// 加载分类树
const loadCategories = async () => {
  if (!companyInfo.value?.id) return;
  try {
    categories.value = await getCategoryTree(companyInfo.value.id);
  } catch (error) {
    console.error('加载分类失败:', error);
  }
};

// 加载分类详情
const loadCategoryDetail = async () => {
  if (!categoryId.value) return;
  // TODO: 实现获取分类详情的API
  // const category = await getCategoryDetail(categoryId.value);
  // if (category) {
  //   form.value = { ...category };
  //   routeUiStyleIndex.value = category.route_ui_style === 'products' ? 1 : 0;
  // }
};

// 上传图标
const uploadIcon = async () => {
  try {
    uni.chooseImage({
      count: 1,
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        try {
          const url = await uploadFile(tempFilePath);
          form.value.icon_url = url;
        } catch (error: any) {
          uni.showToast({
            title: error.message || '上传失败',
            icon: 'none',
          });
        }
      },
    });
  } catch (error) {
    console.error('选择图片失败:', error);
  }
};

// 父级分类选择
const onParentChange = (e: any) => {
  const index = e.detail.value;
  const parent = parentCategoryOptions.value[index];
  if (parent.id === null) {
    form.value.parent_categories = undefined;
    form.value.level = 0;
  } else {
    form.value.parent_categories = parent.id;
    form.value.level = (parent.level || 0) + 1;
  }
};

// 展示方式选择
const onRouteUiStyleChange = (e: any) => {
  const index = e.detail.value;
  routeUiStyleIndex.value = index;
  form.value.route_ui_style = index === 1 ? 'products' : 'categories';
};

// 保存
const handleSave = async () => {
  if (!form.value.name || !form.value.icon_url) {
    uni.showToast({
      title: '请填写分类名称和图标',
      icon: 'none',
    });
    return;
  }

  if (!companyInfo.value?.id) {
    uni.showToast({
      title: '公司信息不存在',
      icon: 'none',
    });
    return;
  }

  try {
    const categoryData = {
      ...form.value,
      company_companies: companyInfo.value.id,
    };

    if (categoryId.value) {
      await updateCategory(categoryId.value, categoryData);
    } else {
      await createCategory(categoryData);
    }

    uni.showToast({
      title: '保存成功',
      icon: 'success',
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none',
    });
  }
};

// 取消
const handleCancel = () => {
  uni.navigateBack();
};

onLoad((options) => {
  if (options.id) {
    categoryId.value = Number(options.id);
  }
  loadCategories();
  if (categoryId.value) {
    loadCategoryDetail();
  }
});
</script>

<style scoped>
@import '@/styles/form-inputs.css';

.category-edit-page {
  height: 100vh;
  background: #f5f5f5;
}

.scroll-content {
  height: 100%;
}

.form-section {
  background: #ffffff;
  margin: 20rpx;
  padding: 30rpx;
  border-radius: 16rpx;
}

.uploaded-image {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.upload-icon {
  font-size: 48rpx;
}

.upload-text {
  font-size: 24rpx;
  color: #999999;
}

.footer-actions {
  padding: 30rpx;
  background: #ffffff;
  display: flex;
  gap: 20rpx;
}

.save-btn,
.cancel-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 8rpx;
  font-size: 32rpx;
  border: none;
}

.save-btn {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.cancel-btn {
  background: #f0f0f0;
  color: #666666;
}
</style>

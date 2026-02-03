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

        <view class="form-item parent-selector">
          <view class="form-label">父级分类</view>
          <view class="parent-current">
            {{ selectedParentDisplay }}
          </view>
          <view class="parent-tree">
            <view
              v-for="(opt, idx) in parentCategoryOptions"
              :key="opt.id ?? 'root'"
              class="parent-option"
              :class="{ selected: isParentSelected(opt), 'opt-root': opt.id === null }"
              :style="{ paddingLeft: (opt._depth ?? 0) * 24 + 24 + 'rpx' }"
              @click="selectParent(opt)"
            >
              <text class="parent-option-icon">{{ isParentSelected(opt) ? '✓' : '' }}</text>
              <text class="parent-option-name">{{ opt.id === null ? '顶级分类（无父级）' : opt.name }}</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <view class="form-label">分类类型 <text class="required">*</text></view>
          <picker 
            mode="selector" 
            :range="categoryTypes" 
            :value="categoryTypeIndex"
            @change="onCategoryTypeChange"
          >
            <view class="form-picker">
              {{ categoryTypes[categoryTypeIndex] }}
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
import { getCategoryTree, getCategoryDetail, createCategory, updateCategory } from '@/api/admin/category';
import { uploadFile } from '@/api/upload';

const categoryId = ref<number | null>(null);
const form = ref({
  name: '',
  icon_url: '',
  parent_categories: undefined as number | undefined,
  level: 0,
  route_ui_style: 'categories' as 'categories' | 'products',
  sort_order: 0,
  type: 'product' as 'product' | 'package',
});
const categories = ref<any[]>([]);
const routeUiStyles = ['继续展示分类', '展示产品'];
const routeUiStyleIndex = ref(0);
const categoryTypes = ['产品分类', '套餐分类'];
const categoryTypeIndex = ref(0);

// 按类型筛选分类树（与当前表单类型一致，避免跨类型选父级）
const filteredCategoryTree = computed(() => {
  const type = form.value.type;
  if (!type) return categories.value;
  function filterByType(cats: any[]): any[] {
    return cats
      .filter((cat: any) => cat.type === type)
      .map((cat: any) => ({
        ...cat,
        categories: cat.categories ? filterByType(cat.categories) : [],
      }));
  }
  return filterByType(categories.value);
});

// 父级选项：顶级 + 按层级展开的列表（带 _depth 便于缩进）
const parentCategoryOptions = computed(() => {
  const flatten = (cats: any[], excludeId?: number, depth = 0): any[] => {
    let result: any[] = [];
    cats.forEach(cat => {
      if (cat.id !== excludeId) {
        result.push({ ...cat, _depth: depth });
        if (cat.categories && cat.categories.length > 0) {
          result = result.concat(flatten(cat.categories, excludeId, depth + 1));
        }
      }
    });
    return result;
  };
  const list = flatten(filteredCategoryTree.value, categoryId.value || undefined);
  return [{ id: null, name: '顶级分类（无父级）', _depth: 0 }, ...list];
});

// 当前选中的父级展示文案
const selectedParentDisplay = computed(() => {
  if (form.value.parent_categories === undefined || form.value.parent_categories === null) {
    return '顶级分类（无父级）';
  }
  const opt = parentCategoryOptions.value.find(c => c.id === form.value.parent_categories);
  return opt ? opt.name : '顶级分类（无父级）';
});

function isParentSelected(opt: any): boolean {
  if (opt.id === null) {
    return form.value.parent_categories === undefined || form.value.parent_categories === null;
  }
  return form.value.parent_categories === opt.id;
}

function selectParent(opt: any) {
  if (opt.id === null) {
    form.value.parent_categories = undefined;
    form.value.level = 0;
  } else {
    form.value.parent_categories = opt.id;
    form.value.level = (opt.level ?? 0) + 1;
  }
}

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
  try {
    const category = await getCategoryDetail(categoryId.value);
    if (category) {
      form.value = {
        name: category.name,
        icon_url: category.icon_url,
        parent_categories: category.parent_categories || undefined,
        level: category.level,
        route_ui_style: category.route_ui_style,
        sort_order: category.sort_order,
        type: category.type || 'product',
      };
      routeUiStyleIndex.value = category.route_ui_style === 'products' ? 1 : 0;
      categoryTypeIndex.value = category.type === 'package' ? 1 : 0;
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  }
};

// 上传图标
const uploadIcon = async () => {
  try {
    uni.chooseImage({
      count: 1,
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        try {
          const url = await uploadFile(tempFilePath, undefined, '.jpg');
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

// 分类类型选择（小程序 picker 的 detail.value 是字符串，需转成数字再比较）；切换类型后父级选项会变，重置为顶级
const onCategoryTypeChange = (e: any) => {
  const index = Number(e.detail.value);
  categoryTypeIndex.value = index;
  form.value.type = index === 1 ? 'package' : 'product';
  form.value.parent_categories = undefined;
  form.value.level = 0;
};

// 展示方式选择（小程序 picker 的 detail.value 是字符串，需转成数字再比较）
const onRouteUiStyleChange = (e: any) => {
  const index = Number(e.detail.value);
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

onLoad((options?: { id?: string }) => {
  if (options?.id) {
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

/* 父级分类树形选择 */
.parent-selector .parent-current {
  padding: 20rpx 24rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
}

.parent-tree {
  max-height: 400rpx;
  overflow-y: auto;
  border: 1rpx solid #eee;
  border-radius: 12rpx;
  background: #fff;
}

.parent-option {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
  border-bottom: 1rpx solid #f0f0f0;
  min-height: 44rpx;
}

.parent-option:last-child {
  border-bottom: none;
}

.parent-option.selected {
  background: #eef1fc;
  color: #667eea;
  font-weight: 500;
}

.parent-option-icon {
  width: 40rpx;
  margin-right: 12rpx;
  font-size: 32rpx;
  color: #667eea;
}

.parent-option-name {
  flex: 1;
}

.parent-option.opt-root .parent-option-name {
  color: #666;
}
</style>

<template>
  <view class="product-edit-page">
    <scroll-view scroll-y class="scroll-content">
      <!-- 基本信息 -->
      <view class="section">
        <view class="section-title">基本信息</view>
        
        <view class="form-item">
          <view class="form-label">商品名称 <text class="required">*</text></view>
          <input 
            class="form-input" 
            v-model="form.name" 
            placeholder="请输入商品名称"
            maxlength="50"
          />
        </view>

        <view class="form-item">
          <view class="form-label">封面图 <text class="required">*</text></view>
          <view class="form-upload square" @click="uploadCoverImage">
            <image 
              v-if="form.cover_image_url" 
              :src="form.cover_image_url" 
              class="uploaded-image"
              mode="aspectFill"
            />
            <view v-else class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传封面图</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <view class="form-label">所属分类</view>
          <view class="form-picker" :class="{ placeholder: !selectedCategory }" @click="showCategoryPicker = true">
            {{ selectedCategory ? selectedCategory.name : '请选择分类' }}
          </view>
        </view>

        <view class="form-item">
          <view class="form-label">
            商品介绍
            <text class="hint">（支持富文本）</text>
          </view>
          <textarea 
            class="form-textarea" 
            v-model="form.description" 
            placeholder="请输入商品介绍"
            maxlength="5000"
          />
        </view>

        <view class="form-item">
          <view class="form-label">商品视频</view>
          <view class="video-url-row">
            <input 
              class="form-input video-input" 
              v-model="form.video_url" 
              placeholder="请输入视频URL或点击上传"
            />
            <button class="upload-video-btn" type="button" @click="uploadProductVideo">上传视频</button>
          </view>
        </view>
      </view>

      <!-- 详细信息媒体（可上传图片或视频） -->
      <view class="section">
        <view class="section-title">详细信息媒体</view>
        <view class="media-list">
          <view 
            v-for="(media, index) in form.detail_medias" 
            :key="index"
            class="media-item"
          >
            <image v-if="media.file_type !== 'video'" :src="media.file_url" class="media-image" mode="aspectFill" />
            <view v-else class="media-video-wrap">
              <video :src="media.file_url" class="media-video" controls :show-center-play-btn="true" object-fit="contain" />
              <view class="media-video-tag">视频</view>
            </view>
            <view class="media-actions">
              <view class="media-btn" @click="editMedia('detail', index)">编辑</view>
              <view class="media-btn delete" @click="removeMedia('detail', index)">删除</view>
            </view>
          </view>
          <view class="add-media" @click="addMedia('detail')">
            <text class="add-icon">+</text>
            <text>添加图片/视频</text>
          </view>
        </view>
      </view>

      <!-- 实拍场景媒体（可上传图片或视频） -->
      <view class="section">
        <view class="section-title">实拍场景媒体</view>
        <view class="media-list">
          <view 
            v-for="(media, index) in form.scene_medias" 
            :key="index"
            class="media-item"
          >
            <image v-if="media.file_type !== 'video'" :src="media.file_url" class="media-image" mode="aspectFill" />
            <view v-else class="media-video-wrap">
              <video :src="media.file_url" class="media-video" controls :show-center-play-btn="true" object-fit="contain" />
              <view class="media-video-tag">视频</view>
            </view>
            <view class="media-actions">
              <view class="media-btn" @click="editMedia('scene', index)">编辑</view>
              <view class="media-btn delete" @click="removeMedia('scene', index)">删除</view>
            </view>
          </view>
          <view class="add-media" @click="addMedia('scene')">
            <text class="add-icon">+</text>
            <text>添加图片/视频</text>
          </view>
        </view>
      </view>

      <!-- 商品规格 -->
      <view class="section">
        <view class="section-title">
          商品规格
          <button class="add-sku-btn" @click="showSkuModal = true">+ 添加规格</button>
        </view>
        <view class="sku-list">
          <view 
            v-for="(sku, index) in skus" 
            :key="sku.id || index"
            class="sku-item"
          >
            <view class="sku-info">
              <text class="sku-name">{{ sku.name }}</text>
              <text class="sku-price">¥{{ sku.price }}</text>
              <text class="sku-stock">库存: {{ sku.stock }}</text>
            </view>
            <view class="sku-actions">
              <view class="sku-btn" @click="editSku(index)">编辑</view>
              <view class="sku-btn delete" @click="removeSku(index)">删除</view>
            </view>
          </view>
          <view v-if="skus.length === 0" class="empty-skus">
            <text>暂无规格，请添加</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="footer-actions">
        <button class="save-btn" @click="handleSave">保存</button>
        <button class="cancel-btn" @click="handleCancel">取消</button>
      </view>
    </scroll-view>

    <!-- SKU编辑弹窗 -->
    <view v-if="showSkuModal" class="modal-overlay" @click="showSkuModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingSkuIndex >= 0 ? '编辑规格' : '添加规格' }}</text>
          <text class="modal-close" @click="showSkuModal = false">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <view class="form-label">规格名称 <text class="required">*</text></view>
            <input 
              class="form-input" 
              v-model="skuForm.name" 
              placeholder="请输入规格名称"
            />
          </view>
          <view class="form-item">
            <view class="form-label">规格图片</view>
            <view class="form-upload small" @click="uploadSkuImage">
              <image 
                v-if="skuForm.image_url" 
                :src="skuForm.image_url" 
                class="uploaded-image"
                mode="aspectFill"
              />
              <view v-else class="upload-placeholder">
                <text class="upload-icon">📷</text>
              </view>
            </view>
          </view>
          <view class="form-item">
            <view class="form-label">价格 <text class="required">*</text></view>
            <input 
              class="form-input" 
              type="digit" 
              v-model="skuForm.price" 
              placeholder="请输入价格"
            />
          </view>
          <view class="form-item">
            <view class="form-label">库存 <text class="required">*</text></view>
            <input 
              class="form-input" 
              type="number" 
              v-model="skuForm.stock" 
              placeholder="请输入库存"
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn" @click="saveSku">保存</button>
          <button class="modal-btn cancel" @click="showSkuModal = false">取消</button>
        </view>
      </view>
    </view>

    <!-- 分类选择弹窗 -->
    <CategoryPicker 
      :show="showCategoryPicker"
      :selectedCategoryId="form.category_categories"
      @update:show="showCategoryPicker = $event"
      @select="onCategorySelect"
    />

    <!-- 媒体编辑弹窗（详细信息/实拍场景：上传图片或视频） -->
    <view v-if="showMediaModal" class="modal-overlay" @click="showMediaModal = false">
      <view class="modal-content media-modal" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingMediaIndex >= 0 ? '编辑媒体' : '添加媒体' }}</text>
          <text class="modal-close" @click="showMediaModal = false">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <view class="form-label">类型</view>
            <picker mode="selector" :range="mediaTypes" :value="mediaForm.typeIndex" @change="onMediaTypeChange">
              <view class="form-picker">{{ mediaTypes[mediaForm.typeIndex] === 'image' ? '图片' : '视频' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <view class="form-label">上传{{ mediaForm.file_type === 'video' ? '视频' : '图片' }}</view>
            <view class="media-upload-area" @click="uploadMediaFile">
              <image v-if="mediaForm.file_url && mediaForm.file_type === 'image'" :src="mediaForm.file_url" class="media-upload-preview" mode="aspectFill" />
              <video v-else-if="mediaForm.file_url && mediaForm.file_type === 'video'" :src="mediaForm.file_url" class="media-upload-video" controls :show-center-play-btn="true" object-fit="contain" />
              <view v-else class="media-upload-placeholder">
                <text class="media-upload-icon">📁</text>
                <text class="media-upload-text">点击上传{{ mediaForm.file_type === 'video' ? '视频' : '图片' }}</text>
              </view>
            </view>
          </view>
          <view class="form-item">
            <view class="form-label">或填写URL（可选）</view>
            <input class="form-input" v-model="mediaForm.file_url" placeholder="上传后自动填充，也可手动填写" />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn" @click="saveMedia">保存</button>
          <button class="modal-btn cancel" @click="showMediaModal = false">取消</button>
        </view>
      </view>
    </view>

    <!-- 进度条遮罩 -->
    <view v-if="isUploading" class="upload-overlay">
      <view class="upload-progress-box">
        <view class="upload-progress-text">正在上传... {{ uploadProgress }}%</view>
        <view class="upload-progress-bar">
          <view class="upload-progress-fill" :style="{ width: uploadProgress + '%' }"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getProductDetail, createProduct, updateProduct, createProductSku, updateProductSku, deleteProductSku } from '@/api/admin/product';
import { getCategoryTree } from '@/api/admin/category';
import { uploadFile } from '@/api/upload';
import CategoryPicker from '@/components/CategoryPicker.vue';

const productId = ref<number | null>(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const form = ref({
  name: '',
  cover_image_url: '',
  description: '',
  video_url: '',
  category_categories: undefined as number | undefined,
  detail_medias: [] as Array<{ file_type: string; file_url: string }>,
  scene_medias: [] as Array<{ file_type: string; file_url: string }>,
  is_shelved: false,
});
const skus = ref<any[]>([]);
const categories = ref<any[]>([]);
const loading = ref(false);
const showCategoryPicker = ref(false);

// SKU编辑相关
const showSkuModal = ref(false);
const editingSkuIndex = ref(-1);
const skuForm = ref({
  name: '',
  image_url: '',
  price: '',
  stock: '',
});

// 媒体编辑相关
const showMediaModal = ref(false);
const editingMediaType = ref<'detail' | 'scene'>('detail');
const editingMediaIndex = ref(-1);
const mediaTypes = ['image', 'video'];
const mediaForm = ref({
  file_type: 'image',
  file_url: '',
  typeIndex: 0,
});

const selectedCategory = computed(() => {
  if (!form.value.category_categories) return null;
  // 从分类树中查找选中的分类（包括子分类）
  const findCategory = (cats: any[]): any => {
    for (const cat of cats) {
      if (cat.id === form.value.category_categories) {
        return cat;
      }
      if (cat.categories && cat.categories.length > 0) {
        const found = findCategory(cat.categories);
        if (found) return found;
      }
    }
    return null;
  };
  return findCategory(categories.value);
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

// 加载商品详情
const loadProductDetail = async () => {
  if (!productId.value) return;
  loading.value = true;
  try {
    const product = await getProductDetail(productId.value);
    if (product) {
      form.value = {
        name: product.name,
        cover_image_url: product.cover_image_url,
        description: product.description || '',
        video_url: product.video_url || '',
        category_categories: product.category_categories || undefined,
        detail_medias: product.detail_medias || [],
        scene_medias: product.scene_medias || [],
        is_shelved: product.is_shelved,
      };
      skus.value = product.product_skus || [];
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

// 上传封面图
const uploadCoverImage = async () => {
  try {
    uni.chooseImage({
      count: 1,
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        try {
          isUploading.value = true;
          uploadProgress.value = 0;
          const url = await uploadFile(tempFilePath, (progress) => {
            uploadProgress.value = progress;
          }, '.jpg');
          form.value.cover_image_url = url;
        } catch (error: any) {
          uni.showToast({
            title: error.message || '上传失败',
            icon: 'none',
          });
        } finally {
          isUploading.value = false;
        }
      },
    });
  } catch (error) {
    console.error('选择图片失败:', error);
  }
};

// 上传SKU图片
const uploadSkuImage = async () => {
  try {
    uni.chooseImage({
      count: 1,
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        try {
          isUploading.value = true;
          uploadProgress.value = 0;
          const url = await uploadFile(tempFilePath, (progress) => {
            uploadProgress.value = progress;
          }, '.jpg');
          skuForm.value.image_url = url;
        } catch (error: any) {
          uni.showToast({
            title: error.message || '上传失败',
            icon: 'none',
          });
        } finally {
          isUploading.value = false;
        }
      },
    });
  } catch (error) {
    console.error('选择图片失败:', error);
  }
};

// 上传商品视频（上传成功后自动同步到 form.video_url）
const uploadProductVideo = async () => {
  try {
    uni.chooseMedia({
      count: 1,
      mediaType: ['video'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        try {
          isUploading.value = true;
          uploadProgress.value = 0;
          const url = await uploadFile(tempFilePath, (progress) => {
            uploadProgress.value = progress;
          }, '.mp4');
          form.value.video_url = url;
          uni.showToast({ title: '视频已上传', icon: 'success' });
        } catch (error: any) {
          uni.showToast({
            title: error.message || '上传失败',
            icon: 'none',
          });
        } finally {
          isUploading.value = false;
        }
      },
    });
  } catch (error) {
    console.error('选择视频失败:', error);
  }
};

// 分类选择
const onCategorySelect = (category: any) => {
  form.value.category_categories = category.id;
};

// 添加媒体
const addMedia = (type: 'detail' | 'scene') => {
  editingMediaType.value = type;
  editingMediaIndex.value = -1;
  mediaForm.value = {
    file_type: 'image',
    file_url: '',
    typeIndex: 0,
  };
  showMediaModal.value = true;
};

// 编辑媒体
const editMedia = (type: 'detail' | 'scene', index: number) => {
  editingMediaType.value = type;
  editingMediaIndex.value = index;
  const media = type === 'detail' ? form.value.detail_medias[index] : form.value.scene_medias[index];
  mediaForm.value = {
    file_type: media.file_type || 'image',
    file_url: media.file_url,
    typeIndex: media.file_type === 'video' ? 1 : 0,
  };
  showMediaModal.value = true;
};

// 删除媒体
const removeMedia = (type: 'detail' | 'scene', index: number) => {
  if (type === 'detail') {
    form.value.detail_medias.splice(index, 1);
  } else {
    form.value.scene_medias.splice(index, 1);
  }
};

// 媒体类型选择（picker 的 e.detail.value 可能是字符串，需转为数字）
const onMediaTypeChange = (e: any) => {
  const index = Number(e.detail.value);
  mediaForm.value.typeIndex = index;
  mediaForm.value.file_type = mediaTypes[index];
};

// 上传媒体文件
const uploadMediaFile = async () => {
  try {
    uni.chooseMedia({
      count: 1,
      mediaType: ['image', 'video'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const fileType = res.tempFiles[0].fileType;
        const ext = fileType === 'video' ? '.mp4' : '.jpg';
        try {
          isUploading.value = true;
          uploadProgress.value = 0;
          const url = await uploadFile(tempFilePath, (progress) => {
            uploadProgress.value = progress;
          }, ext);
          mediaForm.value.file_url = url;
          if (fileType === 'video') {
            mediaForm.value.file_type = 'video';
            mediaForm.value.typeIndex = 1;
          } else {
            mediaForm.value.file_type = 'image';
            mediaForm.value.typeIndex = 0;
          }
        } catch (error: any) {
          uni.showToast({
            title: error.message || '上传失败',
            icon: 'none',
          });
        } finally {
          isUploading.value = false;
        }
      },
    });
  } catch (error) {
    console.error('选择媒体失败:', error);
  }
};

// 保存媒体
const saveMedia = () => {
  if (!mediaForm.value.file_url) {
    uni.showToast({
      title: '请输入媒体URL',
      icon: 'none',
    });
    return;
  }

  const media = {
    file_type: mediaForm.value.file_type,
    file_url: mediaForm.value.file_url,
  };

  if (editingMediaIndex.value >= 0) {
    // 编辑
    if (editingMediaType.value === 'detail') {
      form.value.detail_medias[editingMediaIndex.value] = media;
    } else {
      form.value.scene_medias[editingMediaIndex.value] = media;
    }
  } else {
    // 新增
    if (editingMediaType.value === 'detail') {
      form.value.detail_medias.push(media);
    } else {
      form.value.scene_medias.push(media);
    }
  }

  showMediaModal.value = false;
};

// 添加SKU
const editSku = (index: number) => {
  editingSkuIndex.value = index;
  const sku = skus.value[index];
  skuForm.value = {
    name: sku.name,
    image_url: sku.image_url || '',
    price: String(sku.price),
    stock: String(sku.stock),
  };
  showSkuModal.value = true;
};

// 删除SKU
const removeSku = async (index: number) => {
  const sku = skus.value[index];
  if (sku.id) {
    // 已保存的SKU，需要调用API删除
    try {
      await deleteProductSku(sku.id);
      skus.value.splice(index, 1);
      uni.showToast({
        title: '删除成功',
        icon: 'success',
      });
    } catch (error: any) {
      uni.showToast({
        title: error.message || '删除失败',
        icon: 'none',
      });
    }
  } else {
    // 未保存的SKU，直接删除
    skus.value.splice(index, 1);
  }
};

// 保存SKU
const saveSku = () => {
  if (!skuForm.value.name || !skuForm.value.price || !skuForm.value.stock) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none',
    });
    return;
  }

  const sku = {
    name: skuForm.value.name,
    image_url: skuForm.value.image_url || undefined,
    price: Number(skuForm.value.price),
    stock: Number(skuForm.value.stock),
  };

  if (editingSkuIndex.value >= 0) {
    // 编辑
    skus.value[editingSkuIndex.value] = {
      ...skus.value[editingSkuIndex.value],
      ...sku,
    };
  } else {
    // 新增
    skus.value.push(sku);
  }

  showSkuModal.value = false;
  skuForm.value = {
    name: '',
    image_url: '',
    price: '',
    stock: '',
  };
  editingSkuIndex.value = -1;
};

// 保存商品
const handleSave = async () => {
  if (!form.value.name || !form.value.cover_image_url) {
    uni.showToast({
      title: '请填写商品名称和封面图',
      icon: 'none',
    });
    return;
  }

  if (skus.value.length === 0) {
    uni.showToast({
      title: '请至少添加一个商品规格',
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

  loading.value = true;

  try {
    // 确保 detail_medias 和 scene_medias 是数组格式
    const productData = {
      ...form.value,
      company_companies: companyInfo.value.id,
      detail_medias: form.value.detail_medias || [],
      scene_medias: form.value.scene_medias || [],
    };
    
    // 如果 category_categories 是 undefined，不传递该字段
    if (productData.category_categories === undefined) {
      delete productData.category_categories;
    }

    let savedProductId: number;

    if (productId.value) {
      // 更新商品
      await updateProduct(productId.value, productData);
      savedProductId = productId.value;
    } else {
      // 创建商品
      const result = await createProduct(productData);
      savedProductId = result.id;
    }

    // 保存SKU
    for (const sku of skus.value) {
      if (sku.id) {
        // 更新SKU
        await updateProductSku(sku.id, {
          name: sku.name,
          image_url: sku.image_url,
          price: sku.price,
          stock: sku.stock,
        });
      } else {
        // 创建SKU
        await createProductSku({
          ...sku,
          product_products: savedProductId,
          company_companies: companyInfo.value.id,
        });
      }
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
  } finally {
    loading.value = false;
  }
};

// 取消
const handleCancel = () => {
  uni.navigateBack();
};

onLoad((options) => {
  if (options.id) {
    productId.value = Number(options.id);
  }
  loadCategories();
  if (productId.value) {
    loadProductDetail();
  }
});
</script>

<style scoped>
@import '@/styles/form-inputs.css';

.product-edit-page {
  height: 100vh;
  background: #f5f5f5;
}

.scroll-content {
  height: 100%;
}

.section {
  background: #ffffff;
  margin-bottom: 20rpx;
  padding: 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 16rpx;
  border-left: 8rpx solid #667eea;
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
  gap: 16rpx;
}

.upload-icon {
  font-size: 56rpx;
  color: #cbd5e1;
}

.upload-text {
  font-size: 24rpx;
  color: #94a3b8;
}

.media-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.media-item {
  width: 100%;
  aspect-ratio: 1;
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.media-image {
  width: 100%;
  height: 100%;
}

.media-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 2rpx;
  padding: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.media-btn {
  flex: 1;
  padding: 12rpx 0;
  background: transparent;
  color: #ffffff;
  font-size: 24rpx;
  text-align: center;
}

.media-btn.delete {
  background: rgba(239, 68, 68, 0.8);
}

.add-media {
  width: 100%;
  aspect-ratio: 1;
  border: 2rpx dashed #cbd5e1;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  color: #94a3b8;
  background: #f8fafc;
  transition: all 0.3s;
}

.add-media:active {
  background: #f1f5f9;
  border-color: #667eea;
}

.add-icon {
  font-size: 56rpx;
  font-weight: 300;
}

.add-sku-btn {
  padding: 12rpx 24rpx;
  background: #e0e7ff;
  color: #667eea;
  border-radius: 30rpx;
  font-size: 24rpx;
  border: none;
  font-weight: 500;
}

.add-sku-btn:active {
  opacity: 0.8;
}

.sku-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.sku-item {
  padding: 24rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.sku-item:active {
  background: #f1f5f9;
}

.sku-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.sku-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1e293b;
}

.sku-price {
  font-size: 28rpx;
  color: #ef4444;
  font-weight: 500;
}

.sku-stock {
  font-size: 24rpx;
  color: #64748b;
}

.sku-actions {
  display: flex;
  gap: 16rpx;
}

.sku-btn {
  padding: 10rpx 24rpx;
  background: #ffffff;
  color: #475569;
  border: 1rpx solid #cbd5e1;
  border-radius: 8rpx;
  font-size: 24rpx;
  box-shadow: 0 1rpx 2rpx rgba(0,0,0,0.05);
}

.sku-btn.delete {
  background: #fef2f2;
  color: #ef4444;
  border-color: #fecaca;
}

.empty-skus {
  padding: 60rpx;
  text-align: center;
  color: #94a3b8;
  font-size: 28rpx;
  background: #f8fafc;
  border-radius: 12rpx;
  border: 2rpx dashed #e2e8f0;
}

.footer-actions {
  padding: 30rpx;
  background: #ffffff;
  display: flex;
  gap: 30rpx;
  position: sticky;
  bottom: 0;
  z-index: 99;
  box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.05);
}

.save-btn,
.cancel-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 50rpx;
  font-size: 32rpx;
  border: none;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  box-shadow: 0 8rpx 16rpx rgba(118, 75, 162, 0.2);
}

.cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.2);
  animation: modal-fade-in 0.3s ease;
}

@keyframes modal-fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.modal-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #1e293b;
}

.modal-close {
  font-size: 48rpx;
  color: #94a3b8;
  line-height: 0.8;
  padding: 10rpx;
}

.modal-body {
  padding: 40rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 30rpx 40rpx;
  border-top: 1rpx solid #f1f5f9;
  display: flex;
  gap: 20rpx;
  background: #f8fafc;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  background: #667eea;
  color: #ffffff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  font-weight: 500;
}

.modal-btn.cancel {
  background: #e2e8f0;
  color: #475569;
}

.upload-btn {
  margin-top: 16rpx;
  padding: 16rpx 32rpx;
  background: #eff6ff;
  color: #667eea;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: 1rpx dashed #bfdbfe;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 上传进度遮罩 */
.upload-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-progress-box {
  background: #ffffff;
  padding: 40rpx;
  border-radius: 16rpx;
  width: 80%;
  max-width: 500rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.upload-progress-text {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}

.upload-progress-bar {
  width: 100%;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  background: #667eea;
  transition: width 0.3s ease;
  border-radius: 6rpx;
}
</style>

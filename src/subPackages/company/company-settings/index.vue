<template>
  <view class="company-settings-page">
    <scroll-view scroll-y class="scroll-content">
      <view class="form-section">
        <view class="form-item">
          <view class="form-label">公司名称 <text class="required">*</text></view>
          <input 
            class="form-input" 
            v-model="form.name" 
            placeholder="请输入公司名称"
            maxlength="50"
          />
        </view>

        <view class="form-item">
          <view class="form-label">公司Logo</view>
          <view class="form-upload square" @click="uploadLogo">
            <image 
              v-if="form.logo_url" 
              :src="form.logo_url" 
              class="uploaded-image"
              mode="aspectFill"
            />
            <view v-else class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传Logo</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <view class="form-label">访问密钥</view>
          <input 
            class="form-input" 
            v-model="form.secret" 
            placeholder="访问密钥（创建后不可修改）"
            :disabled="true"
          />
          <view class="form-hint">密钥创建后不可修改</view>
        </view>

        <view class="form-item">
          <view class="form-label">顶部轮播图</view>
          <view class="banner-section">
            <view 
              v-for="(banner, index) in topBanners" 
              :key="index" 
              class="banner-item"
            >
              <image 
                :src="getBannerImage(banner)" 
                class="banner-image"
                mode="aspectFill"
              />
              <view class="banner-actions">
                <text class="banner-action-btn" @click="editTopBanner(index)">编辑</text>
                <text class="banner-action-btn delete" @click="removeTopBanner(index)">删除</text>
              </view>
            </view>
            <view class="add-banner-btn" @click="addTopBanner">
              <text class="add-icon">+</text>
              <text class="add-text">添加轮播图</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <view class="form-label">底部轮播图</view>
          <view class="banner-section">
            <view 
              v-for="(banner, index) in bottomBanners" 
              :key="index" 
              class="banner-item"
            >
              <image 
                :src="getBannerImage(banner)" 
                class="banner-image"
                mode="aspectFill"
              />
              <view class="banner-actions">
                <text class="banner-action-btn" @click="editBottomBanner(index)">编辑</text>
                <text class="banner-action-btn delete" @click="removeBottomBanner(index)">删除</text>
              </view>
            </view>
            <view class="add-banner-btn" @click="addBottomBanner">
              <text class="add-icon">+</text>
              <text class="add-text">添加轮播图</text>
            </view>
          </view>
        </view>
      </view>

      <view class="footer-actions">
        <button class="save-btn" @click="handleSave" :loading="loading">
          {{ loading ? '保存中...' : '保存' }}
        </button>
        <button class="cancel-btn" @click="handleCancel">取消</button>
      </view>
    </scroll-view>

    <!-- 轮播图编辑弹窗 -->
    <view v-if="showBannerModal" class="modal-overlay" @click="closeBannerModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingBannerType === 'top' ? '编辑顶部轮播图' : '编辑底部轮播图' }}</text>
          <text class="modal-close" @click="closeBannerModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <view class="form-label">轮播图</view>
            <view class="form-upload banner" @click="uploadBannerImage">
              <image 
                v-if="editingBanner.file_url" 
                :src="editingBanner.file_url" 
                class="uploaded-image"
                mode="aspectFill"
              />
              <view v-else class="upload-placeholder">
                <text class="upload-icon">📷</text>
                <text class="upload-text">点击上传图片</text>
              </view>
            </view>
          </view>

          <view class="form-item">
            <view class="form-label">标题</view>
            <input 
              class="form-input" 
              v-model="editingBanner.title" 
              placeholder="请输入标题（可选）"
              maxlength="50"
            />
          </view>

          <view class="form-item">
            <view class="form-label">跳转链接</view>
            <input 
              class="form-input" 
              v-model="editingBanner.link" 
              placeholder="请输入跳转链接（可选）"
              maxlength="200"
            />
          </view>

          <view class="form-item">
            <view class="form-label">排序</view>
            <input 
              class="form-input" 
              v-model.number="editingBanner.sort" 
              placeholder="数字越小越靠前"
              type="number"
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn" @click="saveBanner">保存</button>
          <button class="modal-btn cancel" @click="closeBannerModal">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getCompanyDetail, updateCompany } from '@/api/admin/platform';
import { getTopBanners, getBottomBanners } from '@/api/banner/index';
import { uploadFile } from '@/api/upload';
import type { BannerItem } from '@/types/companies';

const companyId = ref<number | null>(null);
const form = ref({
  name: '',
  logo_url: '',
  secret: '',
});
const topBanners = ref<BannerItem[]>([]);
const bottomBanners = ref<BannerItem[]>([]);
const loading = ref(false);

// 轮播图编辑相关
const showBannerModal = ref(false);
const editingBannerType = ref<'top' | 'bottom'>('top');
const editingBannerIndex = ref<number>(-1);
const editingBanner = ref<BannerItem>({
  file_url: '',
  title: '',
  link: '',
  sort: 0,
});

// 获取轮播图图片URL
const getBannerImage = (banner: BannerItem | string): string => {
  if (typeof banner === 'string') {
    return banner;
  }
  return banner.file_url || '/static/default-banner.png';
};

// 上传Logo
const uploadLogo = async () => {
  try {
    uni.chooseImage({
      count: 1,
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        try {
          const url = await uploadFile(tempFilePath, undefined, '.jpg');
          form.value.logo_url = url;
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

// 上传轮播图
const uploadBannerImage = async () => {
  try {
    uni.chooseImage({
      count: 1,
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        try {
          const url = await uploadFile(tempFilePath, undefined, '.jpg');
          editingBanner.value.file_url = url;
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

// 添加顶部轮播图
const addTopBanner = () => {
  editingBannerType.value = 'top';
  editingBannerIndex.value = -1;
  editingBanner.value = {
    file_url: '',
    title: '',
    link: '',
    sort: topBanners.value.length,
  };
  showBannerModal.value = true;
};

// 编辑顶部轮播图
const editTopBanner = (index: number) => {
  editingBannerType.value = 'top';
  editingBannerIndex.value = index;
  editingBanner.value = { ...topBanners.value[index] };
  showBannerModal.value = true;
};

// 删除顶部轮播图
const removeTopBanner = (index: number) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个轮播图吗？',
    success: (res) => {
      if (res.confirm) {
        topBanners.value.splice(index, 1);
      }
    },
  });
};

// 添加底部轮播图
const addBottomBanner = () => {
  editingBannerType.value = 'bottom';
  editingBannerIndex.value = -1;
  editingBanner.value = {
    file_url: '',
    title: '',
    link: '',
    sort: bottomBanners.value.length,
  };
  showBannerModal.value = true;
};

// 编辑底部轮播图
const editBottomBanner = (index: number) => {
  editingBannerType.value = 'bottom';
  editingBannerIndex.value = index;
  editingBanner.value = { ...bottomBanners.value[index] };
  showBannerModal.value = true;
};

// 删除底部轮播图
const removeBottomBanner = (index: number) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个轮播图吗？',
    success: (res) => {
      if (res.confirm) {
        bottomBanners.value.splice(index, 1);
      }
    },
  });
};

// 保存轮播图
const saveBanner = () => {
  if (!editingBanner.value.file_url) {
    uni.showToast({
      title: '请先上传图片',
      icon: 'none',
    });
    return;
  }

  const banner: BannerItem = {
    file_type: 'image',
    file_url: editingBanner.value.file_url,
    title: editingBanner.value.title || undefined,
    link: editingBanner.value.link || undefined,
    sort: editingBanner.value.sort || 0,
  };

  if (editingBannerType.value === 'top') {
    if (editingBannerIndex.value === -1) {
      topBanners.value.push(banner);
    } else {
      topBanners.value[editingBannerIndex.value] = banner;
    }
  } else {
    if (editingBannerIndex.value === -1) {
      bottomBanners.value.push(banner);
    } else {
      bottomBanners.value[editingBannerIndex.value] = banner;
    }
  }

  closeBannerModal();
};

// 关闭轮播图弹窗
const closeBannerModal = () => {
  showBannerModal.value = false;
  editingBanner.value = {
    file_url: '',
    title: '',
    link: '',
    sort: 0,
  };
};

// 加载公司详情
const loadCompanyDetail = async () => {
  if (!companyId.value) return;
  loading.value = true;
  try {
    const company = await getCompanyDetail(companyId.value);
    if (company) {
      form.value = {
        name: company.name,
        logo_url: company.logo_url || '',
        secret: company.secret,
      };
    }

    // 加载轮播图
    const topRes = await getTopBanners(companyId.value);
    if (topRes && topRes.code === 0 && topRes.data) {
      topBanners.value = topRes.data.map((banner: any) => {
        if (typeof banner === 'string') {
          return { file_url: banner, file_type: 'image', sort: 0 };
        }
        return banner;
      });
    }

    const bottomRes = await getBottomBanners(companyId.value);
    if (bottomRes && bottomRes.code === 0 && bottomRes.data) {
      bottomBanners.value = bottomRes.data.map((banner: any) => {
        if (typeof banner === 'string') {
          return { file_url: banner, file_type: 'image', sort: 0 };
        }
        return banner;
      });
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

// 保存公司设置
const handleSave = async () => {
  if (!form.value.name) {
    uni.showToast({
      title: '请填写公司名称',
      icon: 'none',
    });
    return;
  }

  if (!companyId.value) {
    uni.showToast({
      title: '公司ID不存在',
      icon: 'none',
    });
    return;
  }

  loading.value = true;

  try {
    await updateCompany(companyId.value, {
      name: form.value.name,
      logo_url: form.value.logo_url,
      banner_top: topBanners.value,
      banner_bottom: bottomBanners.value,
    });

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

onLoad((options?: { id?: string; companyId?: string }) => {
  const id = options?.id ?? options?.companyId;
  if (id) {
    companyId.value = Number(id);
    loadCompanyDetail();
  }
});
</script>

<style scoped>
@import '@/styles/form-inputs.css';

.company-settings-page {
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

.form-item {
  margin-bottom: 30rpx;
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
  justify-content: center;
  gap: 10rpx;
  height: 100%;
}

.upload-icon {
  font-size: 48rpx;
}

.upload-text {
  font-size: 24rpx;
  color: #999999;
}

.banner-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.banner-item {
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
  border: 2rpx solid #e0e0e0;
}

.banner-image {
  width: 100%;
  height: 300rpx;
}

.banner-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  padding: 20rpx;
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
}

.banner-action-btn {
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #333333;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.banner-action-btn.delete {
  background: rgba(255, 77, 79, 0.9);
  color: #ffffff;
}

.add-banner-btn {
  border: 2rpx dashed #d0d0d0;
  border-radius: 12rpx;
  padding: 60rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  background: #fafafa;
}

.add-icon {
  font-size: 64rpx;
  color: #999999;
}

.add-text {
  font-size: 28rpx;
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

.form-hint {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999999;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 600rpx;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
}

.modal-close {
  font-size: 48rpx;
  color: #999999;
  line-height: 1;
}

.modal-body {
  padding: 30rpx;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 30rpx;
  border-top: 1rpx solid #e0e0e0;
  display: flex;
  gap: 20rpx;
}

.modal-btn {
  flex: 1;
  padding: 20rpx;
  background: #667eea;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
}

.modal-btn.cancel {
  background: #f0f0f0;
  color: #666666;
}
</style>

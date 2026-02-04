<template>
  <view class="company-edit-page">
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
          <view class="form-label">公司介绍</view>
          <textarea 
            class="form-textarea" 
            v-model="form.description" 
            placeholder="用于关于我们、联系我们展示" 
            maxlength="500" 
          />
        </view>
        <view class="form-item">
          <view class="form-label">联系我们二维码</view>
          <view class="form-upload square" @click="uploadContactCode">
            <image v-if="form.contact_code" :src="form.contact_code" class="uploaded-image" mode="aspectFill" />
            <view v-else class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传</text>
            </view>
          </view>
        </view>
        <view class="form-item">
          <view class="form-label">微信二维码</view>
          <view class="form-upload square" @click="uploadWechatCode">
            <image v-if="form.wechat_code" :src="form.wechat_code" class="uploaded-image" mode="aspectFill" />
            <view v-else class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传（订单详情等展示）</text>
            </view>
          </view>
        </view>
        <view class="form-item">
          <view class="form-label">资源库文件</view>
          <view class="resource-file-upload" @click="uploadResourceFile">
            <view v-if="form.resource_file_url" class="resource-file-has">
              <text class="resource-file-icon">📄</text>
              <text class="resource-file-name">{{ resourceFileName }}</text>
              <text class="resource-file-remove" @click.stop="clearResourceFile">删除</text>
            </view>
            <view v-else class="resource-file-placeholder">
              <text class="upload-icon">📤</text>
              <text class="upload-text">点击上传资料文件（PDF、Word等）</text>
            </view>
          </view>
        </view>
      </view>

      <view class="footer-actions">
        <button class="save-btn" @click="handleSave" :loading="loading">
          {{ loading ? '保存中...' : (companyId ? '保存' : '创建公司') }}
        </button>
        <button class="cancel-btn" @click="handleCancel">取消</button>
      </view>
    </scroll-view>

    <!-- 授权管理员弹窗 -->
    <view v-if="showAuthorizeModal" class="modal-overlay" @click="skipAuthorize">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">设置公司管理员</text>
          <text class="modal-close" @click="skipAuthorize">×</text>
        </view>
        <view class="modal-body">
          <!-- 成功提示 -->
          <view class="success-tip">
            <view class="success-icon">✓</view>
            <text class="success-text">公司"{{ form.name }}"创建成功！</text>
          </view>

          <view class="form-item">
            <view class="label">公司名称</view>
            <text class="company-name-display">{{ form.name }}</text>
          </view>

          <view class="form-item">
            <view class="form-label">管理员手机号 <text class="required">*</text></view>
            <input 
              class="form-input" 
              v-model="authorizeForm.mobile" 
              placeholder="请输入管理员手机号"
              maxlength="11"
              type="number"
            />
            <button 
              class="search-btn" 
              @click="searchUserForAuthorize"
              :disabled="!authorizeForm.mobile || authorizeForm.mobile.length !== 11"
            >
              搜索用户
            </button>
          </view>

          <!-- 搜索到的用户信息 -->
          <view v-if="searchedUser" class="searched-user-info">
            <image 
              v-if="searchedUser.avatar_url" 
              :src="searchedUser.avatar_url" 
              class="searched-avatar"
              mode="aspectFill"
            />
            <view v-else class="searched-avatar-placeholder">
              <text>{{ searchedUser.nickname?.[0] || 'U' }}</text>
            </view>
            <view class="searched-details">
              <text class="searched-name">{{ searchedUser.nickname || searchedUser.mobile }}</text>
              <text class="searched-phone">{{ searchedUser.mobile }}</text>
            </view>
          </view>

          <!-- 用户未找到提示 -->
          <view v-if="authorizeForm.mobile.length === 11 && !searchedUser && authorizeForm.mobile" class="user-not-found">
            <text class="not-found-text">未找到该用户，请先让用户在小程序中登录后再授权</text>
          </view>

          <view class="form-hint" style="margin-top: 20rpx;">
            <text>提示：管理员账号可以管理该公司的商品分类、商品和订单</text>
          </view>
        </view>
        <view class="modal-footer">
          <button 
            class="modal-btn" 
            @click="handleAuthorize"
            :disabled="!searchedUser || authorizing"
          >
            {{ authorizing ? '授权中...' : '确认授权' }}
          </button>
          <button class="modal-btn cancel" @click="skipAuthorize">稍后设置</button>
        </view>
      </view>
    </view>
  </view>

  <UploadProgressOverlay :show="uploading" :progress="progress" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getCompanyDetailCached, createCompany, updateCompany, authorizeCompanyAdmin, searchUserByMobileForPlatform, type CompanyInput } from '@/subPackages/admin/api/platform';
import { useImageUploadWithProgress } from '@/utils/useImageUploadWithProgress';
import UploadProgressOverlay from '@/components/UploadProgressOverlay.vue';

const { uploading, progress, chooseAndUploadImage, uploadWithProgress } = useImageUploadWithProgress();

const companyId = ref<number | null>(null);
const form = ref({
  name: '',
  logo_url: '',
  description: '',
  contact_code: '',
  wechat_code: '',
  resource_file_url: '',
});
const loading = ref(false);

// 授权管理员相关
const showAuthorizeModal = ref(false);
const searchedUser = ref<any>(null);
const authorizeForm = ref({
  mobile: '',
});
const authorizing = ref(false);
const createdCompanyId = ref<number | null>(null);

// 上传Logo（带进度）
const uploadLogo = async () => {
  try {
    const url = await chooseAndUploadImage({ ext: '.jpg' });
    form.value.logo_url = url;
  } catch (error: any) {
    if (error?.message && !error.message.includes('取消')) {
      uni.showToast({ title: (error as any)?.message || '上传失败', icon: 'none' });
    }
  }
};

const uploadContactCode = async () => {
  try {
    const url = await chooseAndUploadImage({ ext: '.jpg' });
    form.value.contact_code = url;
  } catch (error: any) {
    if (error?.message && !error.message.includes('取消')) {
      uni.showToast({ title: (error as any)?.message || '上传失败', icon: 'none' });
    }
  }
};

const uploadWechatCode = async () => {
  try {
    const url = await chooseAndUploadImage({ ext: '.jpg' });
    form.value.wechat_code = url;
  } catch (error: any) {
    if (error?.message && !error.message.includes('取消')) {
      uni.showToast({ title: (error as any)?.message || '上传失败', icon: 'none' });
    }
  }
};

// 资源库文件名展示
const resourceFileName = computed(() => {
  const url = form.value.resource_file_url;
  if (!url) return '';
  try {
    const path = url.split('?')[0];
    const name = path.split('/').pop() || '';
    return decodeURIComponent(name) || '已上传文件';
  } catch {
    return '已上传文件';
  }
});

// 上传资源库文件（PDF、Word 等，带进度）
const uploadResourceFile = () => {
  // #ifdef MP-WEIXIN
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
    success: async (res) => {
      const file = res.tempFiles[0];
      if (!file?.path) return;
      const ext = file.name ? (file.name.includes('.') ? '.' + file.name.split('.').pop() : '') : '';
      try {
        const url = await uploadWithProgress(file.path, ext || '.pdf');
        form.value.resource_file_url = url;
        uni.showToast({ title: '上传成功', icon: 'success' });
      } catch (error: any) {
        uni.showToast({ title: (error as any)?.message || '上传失败', icon: 'none' });
      }
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中上传资料文件', icon: 'none' });
  // #endif
};

const clearResourceFile = () => {
  form.value.resource_file_url = '';
};

// 加载公司详情
const loadCompanyDetail = async () => {
  if (!companyId.value) return;
  loading.value = true;
  try {
    const company = await getCompanyDetailCached(companyId.value);
    if (company) {
      form.value = {
        name: company.name,
        logo_url: company.logo_url || '',
        description: company.description || '',
        contact_code: company.contact_code || '',
        wechat_code: company.wechat_code || '',
        resource_file_url: company.resource_file_url || '',
      };
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

// 搜索用户
const searchUserForAuthorize = async () => {
  if (!authorizeForm.value.mobile || authorizeForm.value.mobile.length !== 11) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none',
    });
    return;
  }

  try {
    const user = await searchUserByMobileForPlatform(authorizeForm.value.mobile);
    if (user) {
      searchedUser.value = user;
      uni.showToast({
        title: '找到用户',
        icon: 'success',
        duration: 1500,
      });
    } else {
      searchedUser.value = null;
      uni.showToast({
        title: '未找到该用户，请先让用户在小程序中登录',
        icon: 'none',
        duration: 3000,
      });
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '搜索失败',
      icon: 'none',
    });
    searchedUser.value = null;
  }
};

// 授权管理员
const handleAuthorize = async () => {
  if (!searchedUser.value) {
    uni.showToast({
      title: '请先搜索用户',
      icon: 'none',
    });
    return;
  }

  if (!createdCompanyId.value) {
    return;
  }

  authorizing.value = true;

  try {
    await authorizeCompanyAdmin({
      userId: searchedUser.value.id,
      companyId: createdCompanyId.value,
      canViewPrice: true,
      priceFactor: 1,
    });

    uni.showToast({
      title: '管理员授权成功',
      icon: 'success',
    });

    showAuthorizeModal.value = false;
    
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '授权失败',
      icon: 'none',
    });
  } finally {
    authorizing.value = false;
  }
};

// 跳过授权
const skipAuthorize = () => {
  showAuthorizeModal.value = false;
  uni.navigateBack();
};

// 保存公司
const handleSave = async () => {
  if (!form.value.name) {
    uni.showToast({
      title: '请填写公司名称',
      icon: 'none',
    });
    return;
  }

  loading.value = true;

  const payload: CompanyInput = {
    name: form.value.name,
  };
  if (form.value.logo_url) payload.logo_url = form.value.logo_url;
  if (form.value.description) payload.description = form.value.description;
  if (form.value.contact_code) payload.contact_code = form.value.contact_code;
  if (form.value.wechat_code) payload.wechat_code = form.value.wechat_code;
  if (form.value.resource_file_url) payload.resource_file_url = form.value.resource_file_url;

  try {
    if (companyId.value) {
      // 更新公司
      await updateCompany(companyId.value, payload);
      uni.showToast({
        title: '保存成功',
        icon: 'success',
      });
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else {
      // 创建公司
      const result = await createCompany(payload);
      createdCompanyId.value = result.id;
      
      uni.showToast({
        title: '公司创建成功',
        icon: 'success',
      });

      // 创建成功后，自动弹出授权管理员弹窗
      setTimeout(() => {
        showAuthorizeModal.value = true;
        authorizeForm.value.mobile = '';
        searchedUser.value = null;
      }, 500);
    }
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

onLoad((options?) => {
  if (options?.id) {
    companyId.value = Number(options.id);
    loadCompanyDetail();
  }
});
</script>

<style scoped>
@import '@/styles/form-inputs.css';

.company-edit-page {
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
  gap: 10rpx;
}

.upload-icon {
  font-size: 48rpx;
}

.upload-text {
  font-size: 24rpx;
  color: #999999;
}

.resource-file-upload {
  min-height: 120rpx;
  padding: 24rpx;
  background: #f8fafc;
  border: 2rpx dashed #e2e8f0;
  border-radius: 12rpx;
}

.resource-file-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  min-height: 80rpx;
}

.resource-file-has {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.resource-file-icon {
  font-size: 40rpx;
}

.resource-file-name {
  flex: 1;
  font-size: 28rpx;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-file-remove {
  font-size: 26rpx;
  color: #ef4444;
  padding: 8rpx 16rpx;
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

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.generate-btn {
  padding: 8rpx 16rpx;
  background: #667eea;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 24rpx;
  border: none;
}

.generate-btn::after {
  border: none;
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
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
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
  max-height: 60vh;
  overflow-y: auto;
}

.success-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx;
  background: #f6ffed;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  border-left: 4rpx solid #52c41a;
}

.success-icon {
  width: 40rpx;
  height: 40rpx;
  background: #52c41a;
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
  flex-shrink: 0;
}

.success-text {
  font-size: 28rpx;
  color: #52c41a;
  font-weight: 500;
}

.company-name-display {
  font-size: 28rpx;
  color: #333333;
  padding: 10rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
}

.search-btn {
  margin-top: 10rpx;
  padding: 10rpx 20rpx;
  background: #667eea;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;
}

.search-btn[disabled] {
  background: #cccccc;
  color: #999999;
}

.searched-user-info {
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 16rpx;
}

.searched-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f0f0f0;
}

.searched-avatar-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: bold;
}

.searched-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.searched-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
}

.searched-phone {
  font-size: 24rpx;
  color: #999999;
}

.user-not-found {
  padding: 20rpx;
  background: #fff7e6;
  border-radius: 8rpx;
  margin-top: 16rpx;
}

.not-found-text {
  font-size: 26rpx;
  color: #fa8c16;
  line-height: 1.6;
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

.modal-btn[disabled] {
  background: #cccccc;
  color: #999999;
}

.modal-btn.cancel {
  background: #f0f0f0;
  color: #666666;
}
</style>

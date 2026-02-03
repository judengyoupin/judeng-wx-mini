<template>
  <view class="user-profile-page">
    <view v-if="!user_token" class="need-login">
      <text class="need-login-text">请先登录</text>
      <button class="login-btn" type="button" @click="goToLogin">去登录</button>
    </view>
    <template v-else>
      <view class="profile-form">
        <view class="form-item avatar-item">
          <view class="form-label">头像</view>
          <view class="avatar-row">
            <!-- 微信快捷获取头像：open-type="chooseAvatar" 会调起微信头像选择（含使用微信头像/从相册选） -->
            <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
              <image
                v-if="form.avatar_url"
                class="avatar-preview"
                :src="form.avatar_url"
                mode="aspectFill"
              />
              <view v-else class="avatar-placeholder">
                <text class="avatar-icon">👤</text>
                <text class="avatar-text">点击选择头像</text>
              </view>
            </button>
            <text class="avatar-hint">可使用微信头像或从相册选择</text>
            <text class="avatar-fallback" @click="uploadAvatar">从相册选择</text>
          </view>
        </view>
        <view class="form-item">
          <view class="form-label">昵称</view>
          <!-- type="nickname" 在微信中可获得「使用微信昵称」快捷填写 -->
          <input
            class="form-input"
            type="nickname"
            v-model="form.nickname"
            placeholder="请输入昵称，可点击使用微信昵称"
            maxlength="20"
          />
        </view>
        <view class="form-item">
          <view class="form-label">手机号</view>
          <view class="form-value readonly">{{ form.mobile || '未绑定' }}</view>
        </view>
        <view class="form-item">
          <view class="form-label">个人简介</view>
          <textarea
            class="form-textarea"
            v-model="form.bio"
            placeholder="选填，介绍一下自己"
            maxlength="200"
          />
        </view>
      </view>
      <view class="footer-actions">
        <button class="save-btn" type="button" @click="handleSave">保存</button>
      </view>
    </template>

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
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { userInfo, user_token, updateUserInfo } from '@/store/userStore';
import { getUser, updateUserProfile } from '@/api/user';
import { uploadFile } from '@/api/upload';

const form = reactive<{
  avatar_url: string;
  nickname: string;
  mobile: string;
  bio: string;
}>({
  avatar_url: '',
  nickname: '',
  mobile: '',
  bio: '',
});

const isUploading = ref(false);
const uploadProgress = ref(0);
const saving = ref(false);

function initForm() {
  const u = userInfo.value;
  if (u) {
    form.avatar_url = u.avatar_url || '';
    form.nickname = u.nickname ?? '';
    form.mobile = u.mobile ?? '';
    form.bio = u.bio ?? '';
  }
}

function goToLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

/** 微信 chooseAvatar 回调：拿到临时路径后上传并设置头像 */
async function onChooseAvatar(e: any) {
  const tempPath = e?.detail?.avatarUrl;
  if (!tempPath) return;
  try {
    isUploading.value = true;
    uploadProgress.value = 0;
    const url = await uploadFile(tempPath, (p) => {
      uploadProgress.value = p;
    }, '.jpg');
    form.avatar_url = url;
    uni.showToast({ title: '头像已设置', icon: 'success' });
  } catch (err: any) {
    uni.showToast({
      title: err?.message || '上传失败',
      icon: 'none',
    });
  } finally {
    isUploading.value = false;
  }
}

/** 从相册选择图片上传（非微信或需要从相册选时使用） */
async function uploadAvatar() {
  try {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        try {
          isUploading.value = true;
          uploadProgress.value = 0;
          const url = await uploadFile(tempFilePath, (p) => {
            uploadProgress.value = p;
          }, '.jpg');
          form.avatar_url = url;
          uni.showToast({ title: '头像已上传', icon: 'success' });
        } catch (err: any) {
          uni.showToast({
            title: err?.message || '上传失败',
            icon: 'none',
          });
        } finally {
          isUploading.value = false;
        }
      },
    });
  } catch (e) {
    console.error('选择图片失败', e);
  }
}

async function handleSave() {
  const nickname = (form.nickname || '').trim();
  if (!nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' });
    return;
  }
  const userId = userInfo.value?.id;
  if (!userId) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    const updated = await updateUserProfile(Number(userId), {
      nickname,
      avatar_url: form.avatar_url || undefined,
      bio: (form.bio || '').trim() || undefined,
    });
    updateUserInfo({
      nickname: updated.nickname,
      avatar_url: updated.avatar_url,
      bio: updated.bio,
    });
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 500);
  } catch (err: any) {
    uni.showToast({
      title: err?.message || '保存失败',
      icon: 'none',
    });
  } finally {
    saving.value = false;
  }
}

// 仅 onShow 拉数，避免首次与 onMounted 重复请求
onShow(() => {
  if (user_token.value && userInfo.value?.id) {
    initForm();
    // 可选：从服务端拉取最新资料
    getUser({ userId: Number(userInfo.value.id) })
      .then((u) => {
        form.avatar_url = u.avatar_url || '';
        form.nickname = u.nickname ?? '';
        form.mobile = u.mobile ?? '';
        form.bio = u.bio ?? '';
      })
      .catch(() => {});
  }
});
</script>

<style scoped>
.user-profile-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 140rpx;
}

.need-login {
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}

.need-login-text {
  font-size: 30rpx;
  color: #6b7280;
}

.login-btn {
  width: 240rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 44rpx;
  font-size: 28rpx;
  border: none;
}

.login-btn::after {
  border: none;
}

.profile-form {
  margin: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  padding: 36rpx 32rpx;
  box-shadow: 0 2rpx 20rpx rgba(0, 0, 0, 0.04);
}

.form-item {
  margin-bottom: 36rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
  margin-bottom: 16rpx;
  display: block;
}

.form-input {
  width: 100%;
  min-height: 96rpx;
  padding: 0 28rpx;
  line-height: 96rpx;
  font-size: 30rpx;
  color: #1f2937;
  background: #f8fafc;
  border-radius: 16rpx;
  box-sizing: border-box;
  border: 1rpx solid #e5e7eb;
}

.form-textarea {
  width: 100%;
  min-height: 240rpx;
  padding: 24rpx 28rpx;
  font-size: 30rpx;
  color: #1f2937;
  background: #f8fafc;
  border-radius: 16rpx;
  box-sizing: border-box;
  border: 1rpx solid #e5e7eb;
  line-height: 1.5;
}

.form-value.readonly {
  min-height: 96rpx;
  padding: 0 28rpx;
  display: flex;
  align-items: center;
  font-size: 30rpx;
  color: #6b7280;
  background: #f3f4f6;
  border-radius: 16rpx;
  border: 1rpx solid #e5e7eb;
}

/* 头像区域 */
.avatar-item .form-label {
  margin-bottom: 20rpx;
}

.avatar-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16rpx;
}

.avatar-btn {
  width: 176rpx;
  height: 176rpx;
  border-radius: 50%;
  overflow: hidden;
  padding: 0;
  margin: 0;
  background: #f3f4f6;
  border: 4rpx solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-btn::after {
  border: none;
}

.avatar-preview {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.avatar-icon {
  font-size: 56rpx;
  opacity: 0.6;
}

.avatar-text {
  font-size: 22rpx;
  color: #9ca3af;
}

.avatar-hint {
  font-size: 24rpx;
  color: #9ca3af;
}

.avatar-fallback {
  font-size: 26rpx;
  color: #667eea;
  padding: 8rpx 0;
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.save-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.35);
}

.save-btn::after {
  border: none;
}

.upload-overlay {
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

.upload-progress-box {
  padding: 40rpx;
  background: #fff;
  border-radius: 20rpx;
  min-width: 320rpx;
}

.upload-progress-text {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
  text-align: center;
}

.upload-progress-bar {
  height: 12rpx;
  background: #e5e7eb;
  border-radius: 6rpx;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 6rpx;
  transition: width 0.2s;
}
</style>

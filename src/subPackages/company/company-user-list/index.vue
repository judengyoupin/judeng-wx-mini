<template>
  <view class="company-user-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <button class="add-btn" @click="showAddModal = true">+ 添加用户</button>
    </view>

    <!-- 用户列表 -->
    <view class="user-list">
      <view 
        v-for="user in users" 
        :key="user.id"
        class="user-item"
      >
        <view class="user-info">
          <image 
            v-if="user.user?.avatar_url" 
            :src="user.user.avatar_url" 
            class="user-avatar"
            mode="aspectFill"
          />
          <view v-else class="user-avatar-placeholder">
            <text>{{ user.user?.nickname?.[0] || 'U' }}</text>
          </view>
          <view class="user-details">
            <view class="user-name">{{ user.user?.nickname || user.user?.mobile }}</view>
            <view class="user-meta">
              <text class="user-phone">{{ user.user?.mobile }}</text>
              <text class="user-role" :class="{ 'role-admin': user.role === 'admin' }">
                {{ user.role === 'admin' ? '管理员' : '用户' }}
              </text>
            </view>
            <view class="user-permissions">
              <text class="permission-tag" :class="{ 'tag-enabled': user.can_view_price }">
                {{ user.can_view_price ? '可查看价格' : '不可查看价格' }}
              </text>
              <text class="permission-tag">价格系数: {{ user.price_factor }}</text>
            </view>
          </view>
        </view>
        <view class="user-actions">
          <view class="action-btn" @click="editUser(user)">编辑</view>
          <view class="action-btn delete" @click="handleDelete(user)">删除</view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="users.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无用户</text>
        <button class="empty-btn" @click="showAddModal = true">添加用户</button>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>

    <!-- 添加/编辑用户弹窗 -->
    <view v-if="showAddModal || showEditModal" class="modal-overlay" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ showEditModal ? '编辑用户' : '添加用户' }}</text>
          <text class="modal-close" @click="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <view class="label">手机号 <text class="required">*</text></view>
            <input 
              class="form-input" 
              v-model="userForm.mobile" 
              placeholder="请输入手机号"
              :disabled="showEditModal"
              maxlength="11"
              type="number"
            />
            <button 
              v-if="!showEditModal" 
              class="search-btn" 
              @click="searchUser"
              :disabled="!userForm.mobile || userForm.mobile.length !== 11"
            >
              搜索用户
            </button>
          </view>

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

          <view class="form-item">
            <view class="label">用户角色</view>
            <picker 
              mode="selector" 
              :range="userRoles" 
              :value="userRoleIndex"
              @change="onRoleChange"
            >
              <view class="form-picker">
                {{ userRoles[userRoleIndex] }}
              </view>
            </picker>
          </view>

          <view class="form-item">
            <view class="label">
              <checkbox 
                :checked="userForm.can_view_price" 
                @tap="userForm.can_view_price = !userForm.can_view_price"
              />
              <text style="margin-left: 10rpx;">允许查看价格</text>
            </view>
          </view>

          <view class="form-item">
            <view class="label">价格系数 <text class="required">*</text></view>
            <input 
              class="form-input" 
              type="digit" 
              v-model="userForm.price_factor" 
              placeholder="0-1之间，默认为1"
            />
            <view class="form-hint">价格系数范围：0-1，1表示原价，0.9表示9折</view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn" @click="handleSaveUser">保存</button>
          <button class="modal-btn cancel" @click="closeModal">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getCompanyUserList, searchUserByMobile, addCompanyUser, updateCompanyUser, removeCompanyUser } from '@/api/admin/company-user';

const users = ref<any[]>([]);
const loading = ref(false);

// 超级管理员从公司管理点进来时传入的 companyId
const viewCompanyId = ref<number | null>(null);
const effectiveCompanyId = () => viewCompanyId.value ?? companyInfo.value?.id ?? null;
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);

// 弹窗相关
const showAddModal = ref(false);
const showEditModal = ref(false);
const editingUserId = ref<number | null>(null);
const searchedUser = ref<any>(null);
const userRoles = ['普通用户', '管理员'];
const userRoleIndex = ref(0);
const userForm = ref({
  mobile: '',
  role: 'user' as 'admin' | 'user',
  can_view_price: true,
  price_factor: '1',
});

// 加载用户列表
const loadUsers = async (reset = false) => {
  if (loading.value || (!hasMore.value && !reset)) {
    return;
  }

  if (reset) {
    page.value = 1;
    hasMore.value = true;
  }

  const companyId = effectiveCompanyId();
  if (!companyId) {
    uni.showToast({
      title: '公司信息不存在',
      icon: 'none',
    });
    return;
  }

  loading.value = true;

  try {
    const result = await getCompanyUserList({
      companyId,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });

    if (reset) {
      users.value = [];
    }

    users.value = [...users.value, ...(result.users || [])];

    if (result.total <= users.value.length) {
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

// 搜索用户
const searchUser = async () => {
  if (!userForm.value.mobile || userForm.value.mobile.length !== 11) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none',
    });
    return;
  }

  try {
    const user = await searchUserByMobile(userForm.value.mobile);
    if (user) {
      searchedUser.value = user;
    } else {
      uni.showToast({
        title: '未找到该用户，请先让用户在小程序中登录',
        icon: 'none',
        duration: 3000,
      });
      searchedUser.value = null;
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '搜索失败',
      icon: 'none',
    });
  }
};

// 角色选择（小程序 picker 的 e.detail.value 可能为字符串，需转为数字再比较）
const onRoleChange = (e: any) => {
  const index = Number(e.detail.value);
  userRoleIndex.value = index;
  userForm.value.role = index === 1 ? 'admin' : 'user';
};

// 编辑用户
const editUser = (user: any) => {
  editingUserId.value = user.id;
  searchedUser.value = user.user;
  userForm.value = {
    mobile: user.user.mobile,
    role: user.role,
    can_view_price: user.can_view_price,
    price_factor: String(user.price_factor),
  };
  userRoleIndex.value = user.role === 'admin' ? 1 : 0;
  showEditModal.value = true;
};

// 删除用户
const handleDelete = (user: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除用户"${user.user?.nickname || user.user?.mobile}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await removeCompanyUser(user.id);
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          });
          loadUsers(true);
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

// 保存用户
const handleSaveUser = async () => {
  if (!userForm.value.mobile || userForm.value.mobile.length !== 11) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none',
    });
    return;
  }

  if (!searchedUser.value && !showEditModal) {
    uni.showToast({
      title: '请先搜索用户',
      icon: 'none',
    });
    return;
  }

  const priceFactor = Number(userForm.value.price_factor);
  if (isNaN(priceFactor) || priceFactor < 0 || priceFactor > 1) {
    uni.showToast({
      title: '价格系数必须在0-1之间',
      icon: 'none',
    });
    return;
  }

  const companyId = effectiveCompanyId();
  if (!companyId) {
    uni.showToast({
      title: '公司信息不存在',
      icon: 'none',
    });
    return;
  }

  try {
    const userData = {
      user_users: searchedUser.value.id,
      company_companies: companyId,
      role: userForm.value.role,
      can_view_price: userForm.value.can_view_price,
      price_factor: priceFactor,
    };

    if (showEditModal && editingUserId.value) {
      await updateCompanyUser(editingUserId.value, userData);
    } else {
      await addCompanyUser(userData);
    }

    uni.showToast({
      title: '保存成功',
      icon: 'success',
    });

    closeModal();
    loadUsers(true);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none',
    });
  }
};

// 关闭弹窗
const closeModal = () => {
  showAddModal.value = false;
  showEditModal.value = false;
  editingUserId.value = null;
  searchedUser.value = null;
  userForm.value = {
    mobile: '',
    role: 'user',
    can_view_price: true,
    price_factor: '1',
  };
  userRoleIndex.value = 0;
};

onLoad((options?: { companyId?: string }) => {
  if (options?.companyId) {
    viewCompanyId.value = Number(options.companyId);
  }
});

onShow(() => {
  loadUsers(true);
});

onPullDownRefresh(() => {
  loadUsers(true);
});

onReachBottom(() => {
  loadUsers();
});
</script>

<style scoped>
@import '@/styles/form-inputs.css';
.company-user-list-page {
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

.user-list {
  padding: 20rpx;
}

.user-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.user-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #f0f0f0;
}

.user-avatar-placeholder {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.user-meta {
  display: flex;
  gap: 20rpx;
  font-size: 24rpx;
  color: #999999;
}

.user-role {
  padding: 4rpx 12rpx;
  background: #f0f0f0;
  color: #666666;
  border-radius: 4rpx;
}

.role-admin {
  background: #e6f7ff;
  color: #1890ff;
}

.user-permissions {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.permission-tag {
  padding: 4rpx 12rpx;
  background: #f0f0f0;
  color: #999999;
  border-radius: 4rpx;
  font-size: 22rpx;
}

.tag-enabled {
  background: #f6ffed;
  color: #52c41a;
}

.user-actions {
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
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
}

.required {
  color: #ff6b6b;
}

.input {
  width: 100%;
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
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
  margin-bottom: 20rpx;
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

.picker {
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.form-hint {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #999999;
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

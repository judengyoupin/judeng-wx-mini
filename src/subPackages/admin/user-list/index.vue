<template>
  <view class="user-list-page">
    <!-- 顶部：搜索 + 角色筛选 + 数量 -->
    <view class="header-bar">
      <view class="search-box">
        <input 
          class="search-input" 
          v-model="keyword" 
          placeholder="搜索手机号或昵称"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <text v-if="keyword" class="clear-btn" @click="clearSearch">×</text>
      </view>
      <view class="filter-row">
        <view
          class="filter-tab"
          :class="{ active: roleFilter === '' }"
          @click="setRoleFilter('')"
        >
          全部
        </view>
        <view
          class="filter-tab"
          :class="{ active: roleFilter === 'user' }"
          @click="setRoleFilter('user')"
        >
          普通用户
        </view>
        <view
          class="filter-tab"
          :class="{ active: roleFilter === 'admin' }"
          @click="setRoleFilter('admin')"
        >
          管理员
        </view>
      </view>
      <view class="count-row">
        <text class="count-text">{{ countText }}</text>
      </view>
    </view>

    <!-- 用户列表 -->
    <scroll-view 
      scroll-y 
      class="user-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <view 
        v-for="user in users" 
        :key="user.id"
        class="user-item"
      >
        <view class="user-info">
          <image 
            v-if="user.avatar_url" 
            :src="user.avatar_url" 
            class="user-avatar"
            mode="aspectFill"
          />
          <view v-else class="user-avatar-placeholder">
            <text class="avatar-text">{{ (user.nickname || user.mobile || 'U').charAt(0).toUpperCase() }}</text>
          </view>
          <view class="user-details">
            <view class="user-name-row">
              <text class="user-name">{{ user.nickname || '未设置昵称' }}</text>
              <view class="user-role-badge" :class="{ 'role-admin': user.role === 'admin' }">
                {{ user.role === 'admin' ? '管理员' : '普通用户' }}
              </view>
            </view>
            <text class="user-mobile">{{ user.mobile }}</text>
          </view>
        </view>
        <view class="user-actions">
          <view class="action-btn" @click="editUser(user)">编辑</view>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading && users.length === 0" class="loading-state">
        <text>加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && users.length === 0" class="empty-state">
        <text class="empty-text">暂无用户</text>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading && users.length > 0" class="loading-more">
        <text>加载中...</text>
      </view>

      <!-- 没有更多 -->
      <view v-if="!hasMore && users.length > 0" class="no-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 编辑用户弹窗 -->
    <view v-if="showEditModal" class="modal-overlay" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">编辑用户</text>
          <text class="modal-close" @click="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <view class="form-label">用户信息</view>
            <view class="user-display">
              <image 
                v-if="editingUser?.avatar_url" 
                :src="editingUser.avatar_url" 
                class="display-avatar"
                mode="aspectFill"
              />
              <view v-else class="display-avatar-placeholder">
                <text>{{ (editingUser?.nickname || editingUser?.mobile || 'U').charAt(0).toUpperCase() }}</text>
              </view>
              <view class="display-info">
                <text class="display-name">{{ editingUser?.nickname || '未设置昵称' }}</text>
                <text class="display-mobile">{{ editingUser?.mobile }}</text>
              </view>
            </view>
          </view>

          <view class="form-item">
            <view class="form-label">用户角色</view>
            <view class="role-options">
              <view
                class="role-option"
                :class="{ active: selectedRoleIndex === 0 }"
                @click="selectedRoleIndex = 0"
              >
                普通用户
              </view>
              <view
                class="role-option"
                :class="{ active: selectedRoleIndex === 1 }"
                @click="selectedRoleIndex = 1"
              >
                管理员
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn" @click="handleSave">保存</button>
          <button class="modal-btn cancel" @click="closeModal">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { getUserList, updateUserRole } from '@/subPackages/admin/api/user';

const users = ref<any[]>([]);
const loading = ref(false);
const isRefreshing = ref(false);
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const keyword = ref('');
const roleFilter = ref<'' | 'user' | 'admin'>('');
const totalCount = ref(0);

// 当前筛选下的用户数量文案
const countText = computed(() => {
  const n = totalCount.value;
  if (roleFilter.value === 'user') return `普通用户 共 ${n} 人`;
  if (roleFilter.value === 'admin') return `管理员 共 ${n} 人`;
  return `共 ${n} 人`;
});

// 弹窗相关
const showEditModal = ref(false);
const editingUser = ref<any>(null);
const userRoles = ['普通用户', '管理员'];
const selectedRoleIndex = ref(0);

// 加载用户列表
const loadUsers = async (reset = false) => {
  if (loading.value && !reset) {
    return;
  }

  if (reset) {
    page.value = 1;
    hasMore.value = true;
    users.value = [];
  }

  loading.value = true;

  try {
    const result = await getUserList({
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
      keyword: keyword.value?.trim() || undefined,
      role: roleFilter.value || undefined,
    });

    if (reset) {
      users.value = [];
    }

    users.value = [...users.value, ...(result.users || [])];
    totalCount.value = result.total ?? 0;

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
    isRefreshing.value = false;
    uni.stopPullDownRefresh();
  }
};

// 角色筛选
const setRoleFilter = (role: '' | 'user' | 'admin') => {
  roleFilter.value = role;
  loadUsers(true);
};

// 搜索
const handleSearch = () => {
  loadUsers(true);
};

// 清空搜索
const clearSearch = () => {
  keyword.value = '';
  loadUsers(true);
};

// 加载更多
const loadMore = () => {
  if (!loading.value && hasMore.value) {
    loadUsers();
  }
};

// 下拉刷新
const onRefresh = () => {
  isRefreshing.value = true;
  loadUsers(true);
};

// 编辑用户
const editUser = (user: any) => {
  editingUser.value = user;
  selectedRoleIndex.value = user.role === 'admin' ? 1 : 0;
  showEditModal.value = true;
};

// 保存用户
const handleSave = async () => {
  if (!editingUser.value) {
    return;
  }

  const roleIndex = Number(selectedRoleIndex.value);
  const newRole = roleIndex === 1 ? 'admin' : 'user';

  // 如果角色没有变化，直接关闭
  if (editingUser.value.role === newRole) {
    closeModal();
    return;
  }

  try {
    await updateUserRole(editingUser.value.id, newRole);
    uni.showToast({
      title: '保存成功',
      icon: 'success',
    });
    
    // 更新本地数据
    const userIndex = users.value.findIndex(u => u.id === editingUser.value.id);
    if (userIndex >= 0) {
      users.value[userIndex].role = newRole;
    }
    
    closeModal();
  } catch (error: any) {
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none',
    });
  }
};

// 关闭弹窗
const closeModal = () => {
  showEditModal.value = false;
  editingUser.value = null;
};

onMounted(() => {
  loadUsers(true);
});

onShow(() => {
  // 页面显示时刷新数据
  loadUsers(true);
});
</script>

<style scoped>
.user-list-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.header-bar {
  background: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.filter-row {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.filter-tab {
  padding: 12rpx 24rpx;
  font-size: 26rpx;
  color: #666666;
  background: #f1f5f9;
  border-radius: 8rpx;
}

.filter-tab.active {
  background: #667eea;
  color: #ffffff;
}

.count-row {
  margin-top: 16rpx;
}

.count-text {
  font-size: 26rpx;
  color: #6b7280;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 20rpx 60rpx 20rpx 30rpx;
  background: #f8f8f8;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.clear-btn {
  position: absolute;
  right: 20rpx;
  font-size: 40rpx;
  color: #999999;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-list {
  flex: 1;
  padding: 20rpx;
}

.user-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.user-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.user-avatar,
.user-avatar-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  background: #f0f0f0;
}

.avatar-text {
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

.user-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.user-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
}

.user-role-badge {
  padding: 4rpx 12rpx;
  background: #f0f0f0;
  color: #666666;
  border-radius: 12rpx;
  font-size: 22rpx;
}

.user-role-badge.role-admin {
  background: #e0e7ff;
  color: #667eea;
}

.user-mobile {
  font-size: 26rpx;
  color: #999999;
}

.user-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  background: #667eea;
  color: #ffffff;
  border-radius: 20rpx;
  font-size: 26rpx;
}

.loading-state,
.empty-state {
  padding: 60rpx;
  text-align: center;
  color: #999999;
  font-size: 28rpx;
}

.loading-more,
.no-more {
  padding: 30rpx;
  text-align: center;
  color: #999999;
  font-size: 24rpx;
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
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.2);
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
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 16rpx;
}

.user-display {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background: #f8fafc;
  border-radius: 12rpx;
}

.display-avatar,
.display-avatar-placeholder {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.display-avatar {
  background: #f0f0f0;
}

.display-avatar-placeholder text {
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
}

.display-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.display-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333333;
}

.display-mobile {
  font-size: 26rpx;
  color: #999999;
}

.role-options {
  display: flex;
  gap: 20rpx;
}

.role-option {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  font-size: 28rpx;
  color: #666666;
  background: #f1f5f9;
  border-radius: 12rpx;
  transition: all 0.2s;
}

.role-option.active {
  background: #667eea;
  color: #ffffff;
  font-weight: 500;
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
</style>

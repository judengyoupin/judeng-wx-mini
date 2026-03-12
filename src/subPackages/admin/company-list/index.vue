<template>
  <view class="company-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <button class="add-btn" @click="goToAddCompany">+ 添加公司</button>
    </view>

    <!-- 公司列表（仅此区域滚动） -->
    <scroll-view scroll-y class="company-list-scroll">
      <view class="company-list">
      <view 
        v-for="company in companies" 
        :key="company.id"
        class="company-item"
        @click="goToEditCompany(company.id)"
      >
        <view class="company-info">
          <image 
            v-if="company.logo_url" 
            :src="company.logo_url" 
            class="company-logo"
            mode="aspectFill"
          />
          <view v-else class="company-logo-placeholder">
            <text>{{ company.name?.[0] || 'C' }}</text>
          </view>
          <view class="company-details">
            <view class="company-name">{{ company.name }}</view>
            <view class="company-meta">
              <text class="admin-count">
                管理员: {{ company.company_users?.length || 0 }}人
              </text>
            </view>
            <view class="company-admins">
              <text 
                v-for="(admin, index) in company.company_users" 
                :key="admin.id"
                class="admin-tag"
              >
                {{ admin.user?.nickname || admin.user?.mobile }}
                <text v-if="index < company.company_users.length - 1">、</text>
              </text>
            </view>
          </view>
        </view>
        <view class="company-audit-row">
          <text class="audit-label">核查：</text>
          <view class="audit-btns">
            <view class="audit-btn" @click.stop="goToCompanySettings(company)">设置</view>
            <view class="audit-btn" @click.stop="goToCompanyCategories(company)">分类</view>
            <view class="audit-btn" @click.stop="goToCompanyProducts(company)">商品</view>
            <view class="audit-btn" @click.stop="goToCompanyPackages(company)">套餐</view>
            <view class="audit-btn" @click.stop="goToCompanyUsers(company)">用户</view>
            <view class="audit-btn" @click.stop="goToCompanyOrders(company)">订单</view>
          </view>
        </view>
        <view class="company-actions">
          <view class="action-btn preview" @click.stop="previewCompany(company)">预览</view>
          <view class="action-btn" @click.stop="goToEditCompany(company.id)">编辑</view>
          <view class="action-btn" @click.stop="authorizeAdmin(company)">授权</view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="companies.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无公司</text>
        <button class="empty-btn" @click="goToAddCompany">添加公司</button>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
      </view>
    </scroll-view>

    <!-- 授权管理员弹窗 -->
    <view v-if="showAuthorizeModal" class="modal-overlay" @click="showAuthorizeModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">授权管理员</text>
          <text class="modal-close" @click="showAuthorizeModal = false">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <view class="label">
              <text class="label-icon">🏢</text>
              公司名称
            </view>
            <view class="company-name-display">
              <text class="company-name-text">{{ authorizingCompany?.name }}</text>
            </view>
          </view>
          <view class="form-item">
            <view class="label">
              <text class="label-icon">📱</text>
              手机号 <text class="required">*</text>
            </view>
            <view class="input-wrapper">
              <input 
                class="input" 
                v-model="authorizeForm.mobile" 
                placeholder="请输入11位手机号"
                maxlength="11"
                type="number"
                placeholder-style="color: #c0c0c0;"
                @input="() => { hasSearched.value = false; searchedUser.value = null }"
              />
            </view>
            <button 
              class="search-btn" 
              @click="searchUserForAuthorize"
              :disabled="!authorizeForm.mobile || authorizeForm.mobile.length !== 11"
              :class="{ disabled: !authorizeForm.mobile || authorizeForm.mobile.length !== 11 }"
            >
              <text class="search-icon">🔍</text>
              <text>搜索用户</text>
            </button>
          </view>

          <view v-if="searchedUser" class="searched-user-info">
            <view class="searched-user-header">
              <text class="searched-user-title">找到的用户</text>
            </view>
            <view class="searched-user-content">
              <image 
                v-if="searchedUser.avatar_url" 
                :src="searchedUser.avatar_url" 
                class="searched-avatar"
                mode="aspectFill"
              />
              <view v-else class="searched-avatar-placeholder">
                <text>{{ (searchedUser.nickname || searchedUser.mobile || 'U').charAt(0).toUpperCase() }}</text>
              </view>
              <view class="searched-details">
                <text class="searched-name">{{ searchedUser.nickname || '未设置昵称' }}</text>
                <text class="searched-phone">{{ searchedUser.mobile }}</text>
              </view>
              <view class="searched-check">
                <text class="check-icon">✓</text>
              </view>
            </view>
          </view>

          <view v-if="hasSearched && !searchedUser" class="create-user-tip">
            <text class="create-user-tip-text">该手机号尚未注册</text>
            <text class="create-user-tip-desc">可点击下方「创建并授权」直接创建账号并授权为管理员</text>
          </view>
        </view>
        <view class="modal-footer">
          <button 
            class="modal-btn" 
            @click="handleAuthorize"
            :disabled="!hasSearched || authorizeSubmitting"
          >
            {{ authorizeSubmitting ? '处理中…' : (searchedUser ? '确认授权' : '创建并授权') }}
          </button>
          <button class="modal-btn cancel" @click="showAuthorizeModal = false">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { getCompanyList, authorizeCompanyAdmin, searchUserByMobileForPlatform, createUserByMobile } from '@/subPackages/admin/api/platform';
import { syncCompanyInfo } from '@/api/company/index';

const companies = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);

// 授权相关
const showAuthorizeModal = ref(false);
const authorizingCompany = ref<any>(null);
const searchedUser = ref<any>(null);
const hasSearched = ref(false);
const authorizeSubmitting = ref(false);
const authorizeForm = ref({
  mobile: '',
});

// 加载公司列表
const loadCompanies = async (reset = false) => {
  if (loading.value || (!hasMore.value && !reset)) {
    return;
  }

  if (reset) {
    page.value = 1;
    hasMore.value = true;
  }

  loading.value = true;

  try {
    const result = await getCompanyList({
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });

    if (reset) {
      companies.value = [];
    }

    companies.value = [...companies.value, ...(result.companies || [])];

    if (result.total <= companies.value.length) {
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
    hasSearched.value = true;
    if (user) {
      searchedUser.value = user;
    } else {
      searchedUser.value = null;
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '搜索失败',
      icon: 'none',
    });
  }
};

// 授权管理员
const authorizeAdmin = (company: any) => {
  authorizingCompany.value = company;
  searchedUser.value = null;
  hasSearched.value = false;
  authorizeForm.value.mobile = '';
  showAuthorizeModal.value = true;
};

// 确认授权 / 创建并授权
const handleAuthorize = async () => {
  const mobile = (authorizeForm.value.mobile || '').trim().replace(/\D/g, '');
  if (mobile.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  if (!hasSearched.value) {
    uni.showToast({ title: '请先搜索用户', icon: 'none' });
    return;
  }
  if (!authorizingCompany.value) return;

  authorizeSubmitting.value = true;
  try {
    let userId = searchedUser.value?.id;
    if (!userId) {
      const newUser = await createUserByMobile(mobile);
      if (!newUser?.id) {
        uni.showToast({ title: '创建账号失败', icon: 'none' });
        return;
      }
      userId = newUser.id;
    }

    await authorizeCompanyAdmin({
      userId,
      companyId: authorizingCompany.value.id,
      canViewPrice: true,
      priceFactor: 1,
    });

    uni.showToast({
      title: searchedUser.value ? '授权成功' : '已创建账号并授权',
      icon: 'success',
    });

    showAuthorizeModal.value = false;
    loadCompanies(true);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none',
    });
  } finally {
    authorizeSubmitting.value = false;
  }
};

// 跳转到添加公司
const goToAddCompany = () => {
  uni.navigateTo({
    url: '/subPackages/admin/company-edit/index',
  });
};

// 预览公司（跳转到首页并切换公司）
const previewCompany = async (company: any) => {
  if (!company?.id) {
    return;
  }
  
  try {
    // 同步公司信息
    await syncCompanyInfo(company.id);
    
    // 保存到本地存储
    uni.setStorageSync('companyId', company.id);
    
    // 跳转到首页（首页是 tabBar，使用 switchTab）
    uni.switchTab({
      url: '/pages/index/index',
      success: () => {
        uni.showToast({
          title: `已切换到${company.name}`,
          icon: 'success',
          duration: 2000,
        });
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        uni.showToast({
          title: '跳转失败',
          icon: 'none',
        });
      },
    });
  } catch (error: any) {
    console.error('同步公司信息失败:', error);
    uni.showToast({
      title: error.message || '切换失败',
      icon: 'none',
    });
  }
};

// 跳转到编辑公司
const goToEditCompany = (companyId: number) => {
  uni.navigateTo({
    url: `/subPackages/admin/company-edit/index?id=${companyId}`,
  });
};

// 超级管理员核查：按公司查看（只读，不可操作），带 companyId 与 audit=1
const goToCompanyOrders = (company: any) => {
  if (!company?.id) return;
  uni.navigateTo({
    url: `/subPackages/company/order-list/index?companyId=${company.id}&audit=1`,
  });
};
const goToCompanyProducts = (company: any) => {
  if (!company?.id) return;
  uni.navigateTo({
    url: `/subPackages/company/product-list/index?companyId=${company.id}&audit=1`,
  });
};
const goToCompanyPackages = (company: any) => {
  if (!company?.id) return;
  uni.navigateTo({
    url: `/subPackages/company/package-list/index?companyId=${company.id}&audit=1`,
  });
};
const goToCompanyCategories = (company: any) => {
  if (!company?.id) return;
  uni.navigateTo({
    url: `/subPackages/company/category-list/index?companyId=${company.id}&audit=1`,
  });
};
const goToCompanySettings = (company: any) => {
  if (!company?.id) return;
  uni.navigateTo({
    url: `/subPackages/company/company-settings/index?companyId=${company.id}&audit=1`,
  });
};
const goToCompanyUsers = (company: any) => {
  if (!company?.id) return;
  uni.navigateTo({
    url: `/subPackages/company/company-user-list/index?companyId=${company.id}&audit=1`,
  });
};

onMounted(() => {
  loadCompanies(true);
});

onShow(() => {
  // 页面显示时刷新数据（从编辑页面返回时）
  loadCompanies(true);
});

onPullDownRefresh(() => {
  loadCompanies(true);
});

onReachBottom(() => {
  loadCompanies();
});
</script>

<style scoped>
.company-list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  box-sizing: border-box;
}

.header-bar {
  flex-shrink: 0;
  background: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.company-list-scroll {
  flex: 1;
  height: 0;
  overflow: hidden;
}

.add-btn {
  padding: 10rpx 20rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;
}

.company-list {
  padding: 20rpx;
}

.company-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.company-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.company-logo {
  width: 100rpx;
  height: 100rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}

.company-logo-placeholder {
  width: 100rpx;
  height: 100rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 36rpx;
  font-weight: bold;
}

.company-details {
  flex: 1;
}

.company-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
}

.company-meta {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 8rpx;
}

.company-admins {
  font-size: 24rpx;
  color: #666666;
}

.admin-tag {
  color: #667eea;
}

.company-audit-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.audit-label {
  font-size: 24rpx;
  color: #999;
  flex-shrink: 0;
}

.audit-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.audit-btn {
  padding: 8rpx 16rpx;
  background: #e8f4ff;
  color: #1890ff;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.audit-btn:active {
  opacity: 0.8;
}

.company-actions {
  display: flex;
  gap: 10rpx;
  justify-content: flex-end;
}

.action-btn {
  padding: 8rpx 20rpx;
  background: #f0f0f0;
  color: #333333;
  border-radius: 8rpx;
  font-size: 24rpx;
  transition: all 0.2s;
}

.action-btn:active {
  opacity: 0.8;
  transform: scale(0.95);
}

.action-btn.preview {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  font-weight: 500;
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
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  width: 90%;
  max-width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
  animation: slide-up 0.3s ease;
}

@keyframes slide-up {
  from {
    transform: translateY(50rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 40rpx 40rpx 30rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.modal-close {
  font-size: 48rpx;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.modal-close:active {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 40rpx;
  max-height: 60vh;
  overflow-y: auto;
  background: #ffffff;
}

.form-item {
  margin-bottom: 40rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 28rpx;
  color: #333333;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-weight: 500;
}

.label-icon {
  font-size: 32rpx;
}

.required {
  color: #ff6b6b;
  font-weight: bold;
}

.input-wrapper {
  position: relative;
  margin-bottom: 20rpx;
}

.input {
  width: 100%;
  min-height: 88rpx;
  padding: 28rpx 30rpx;
  background: #f8f9fa;
  border: 2rpx solid #e9ecef;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #333333;
  box-sizing: border-box;
  transition: all 0.3s;
  line-height: 1.5;
}

.input:focus {
  background: #ffffff;
  border-color: #667eea;
  box-shadow: 0 0 0 4rpx rgba(102, 126, 234, 0.1);
}

.search-btn {
  width: 100%;
  padding: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.search-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
}

.search-btn.disabled {
  background: #e9ecef;
  color: #adb5bd;
  box-shadow: none;
}

.search-icon {
  font-size: 32rpx;
}

.company-name-display {
  padding: 24rpx 30rpx;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16rpx;
  border: 2rpx solid #e9ecef;
}

.company-name-text {
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
}

.searched-user-info {
  margin-top: 30rpx;
  background: linear-gradient(135deg, #f0f7ff 0%, #e0e7ff 100%);
  border-radius: 16rpx;
  border: 2rpx solid #c7d2fe;
  overflow: hidden;
}

.searched-user-header {
  padding: 20rpx 24rpx;
  background: rgba(102, 126, 234, 0.1);
  border-bottom: 1rpx solid rgba(102, 126, 234, 0.2);
}

.searched-user-title {
  font-size: 24rpx;
  color: #667eea;
  font-weight: 500;
}

.searched-user-content {
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.searched-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #f0f0f0;
  border: 3rpx solid #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.searched-avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 36rpx;
  font-weight: bold;
  border: 3rpx solid #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.searched-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.searched-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1e293b;
}

.searched-phone {
  font-size: 26rpx;
  color: #64748b;
}

.create-user-tip {
  margin-top: 24rpx;
  padding: 24rpx;
  background: #fff8e6;
  border: 1rpx solid #ffd666;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.create-user-tip-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.create-user-tip-desc {
  font-size: 24rpx;
  color: #666;
}

.searched-check {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(16, 185, 129, 0.3);
}

.check-icon {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: bold;
}

.modal-footer {
  padding: 30rpx 40rpx 40rpx;
  border-top: 1rpx solid #f1f5f9;
  display: flex;
  gap: 20rpx;
  background: #ffffff;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 500;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.modal-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
}

.modal-btn.cancel {
  background: #f1f5f9;
  color: #64748b;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.modal-btn.cancel:active {
  background: #e2e8f0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}
</style>

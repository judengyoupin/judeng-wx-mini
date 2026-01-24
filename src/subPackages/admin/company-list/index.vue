<template>
  <view class="company-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <button class="add-btn" @click="goToAddCompany">+ 添加公司</button>
    </view>

    <!-- 公司列表 -->
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
        <view class="company-actions">
          <view class="action-btn" @click.stop="goToEditCompany(company.id)">编辑</view>
          <view class="action-btn" @click.stop="authorizeAdmin(company)">授权</view>
          <view class="action-btn delete" @click.stop="handleDelete(company)">删除</view>
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

    <!-- 授权管理员弹窗 -->
    <view v-if="showAuthorizeModal" class="modal-overlay" @click="showAuthorizeModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">授权管理员</text>
          <text class="modal-close" @click="showAuthorizeModal = false">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <view class="label">公司名称</view>
            <text class="company-name-display">{{ authorizingCompany?.name }}</text>
          </view>
          <view class="form-item">
            <view class="label">手机号 <text class="required">*</text></view>
            <input 
              class="input" 
              v-model="authorizeForm.mobile" 
              placeholder="请输入用户手机号"
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
        </view>
        <view class="modal-footer">
          <button class="modal-btn" @click="handleAuthorize">确认授权</button>
          <button class="modal-btn cancel" @click="showAuthorizeModal = false">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { getCompanyList, deleteCompany, authorizeCompanyAdmin, searchUserByMobileForPlatform } from '@/api/admin/platform';

const companies = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);

// 授权相关
const showAuthorizeModal = ref(false);
const authorizingCompany = ref<any>(null);
const searchedUser = ref<any>(null);
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

// 授权管理员
const authorizeAdmin = (company: any) => {
  authorizingCompany.value = company;
  searchedUser.value = null;
  authorizeForm.value.mobile = '';
  showAuthorizeModal.value = true;
};

// 确认授权
const handleAuthorize = async () => {
  if (!searchedUser.value) {
    uni.showToast({
      title: '请先搜索用户',
      icon: 'none',
    });
    return;
  }

  if (!authorizingCompany.value) {
    return;
  }

  try {
    await authorizeCompanyAdmin({
      userId: searchedUser.value.id,
      companyId: authorizingCompany.value.id,
      canViewPrice: true,
      priceFactor: 1,
    });

    uni.showToast({
      title: '授权成功',
      icon: 'success',
    });

    showAuthorizeModal.value = false;
    loadCompanies(true);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '授权失败',
      icon: 'none',
    });
  }
};

// 删除公司
const handleDelete = (company: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除公司"${company.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteCompany(company.id);
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          });
          loadCompanies(true);
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

// 跳转到添加公司
const goToAddCompany = () => {
  uni.navigateTo({
    url: '/subPackages/admin/company-edit/index',
  });
};

// 跳转到编辑公司
const goToEditCompany = (companyId: number) => {
  uni.navigateTo({
    url: `/subPackages/admin/company-edit/index?id=${companyId}`,
  });
};

onMounted(() => {
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

.form-item {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 16rpx;
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

.company-name-display {
  font-size: 28rpx;
  color: #333333;
  padding: 10rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
}

.searched-user-info {
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
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

<template>
  <view class="package-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <view class="scope-row">
        <view 
          class="scope-tab" 
          :class="{ active: selectedScope === 'all' }"
          @click="selectScope('all')"
        >
          全部
        </view>
        <view 
          class="scope-tab" 
          :class="{ active: selectedScope === 'mine' }"
          @click="selectScope('mine')"
        >
          只看自己公司
        </view>
      </view>
      <button class="add-btn" @click="goToAddPackage">+ 添加套餐</button>
    </view>

    <!-- 套餐列表 -->
    <view class="package-list">
      <view 
        v-for="pkg in packages" 
        :key="pkg.id"
        class="package-item"
        @click="onPackageClick(pkg)"
      >
        <image 
          class="package-image" 
          :src="pkg.cover_image_url" 
          mode="aspectFill"
        ></image>
        <view class="package-info">
          <view class="package-name">{{ pkg.name }}</view>
          <view class="package-meta">
            <text class="sku-count">{{ pkg.package_product_skus?.length || 0 }}个商品</text>
            <text v-if="isFromDefaultCompany(pkg)" class="tag-system">系统配置</text>
            <text v-if="isFromDefaultCompany(pkg) && isPackageHidden(pkg)" class="tag-hidden">已隐藏</text>
          </view>
          <view v-if="pkg.description" class="package-desc">
            {{ pkg.description }}
          </view>
        </view>
        <view class="package-actions">
          <template v-if="isFromDefaultCompany(pkg)">
            <view v-if="isPackageHidden(pkg)" class="action-btn unhide" @click.stop="handleUnhidePackage(pkg)">取消隐藏</view>
            <view v-else class="action-btn hide" @click.stop="handleHidePackage(pkg)">隐藏</view>
          </template>
          <template v-else>
            <view class="action-btn delete" @click.stop="handleDelete(pkg)">删除</view>
          </template>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="packages.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无套餐</text>
        <button class="empty-btn" @click="goToAddPackage">添加套餐</button>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getPackageList, deletePackage } from '@/api/admin/package';
import { getDefaultCompanyId } from '@/api/config/index';
import { getCompanyDetail, updateCompany } from '@/api/admin/platform';

const packages = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const selectedScope = ref<'all' | 'mine'>('all');
const defaultCompanyId = ref<number | null>(null);
const hiddenPackageIds = ref<number[]>([]);

// 超级管理员从公司管理点进来时传入的 companyId
const viewCompanyId = ref<number | null>(null);
const effectiveCompanyId = () => viewCompanyId.value ?? companyInfo.value?.id ?? null;

function isFromDefaultCompany(pkg: any): boolean {
  const myId = companyInfo.value?.id;
  const defaultId = defaultCompanyId.value;
  return !!(defaultId && myId && defaultId !== myId && pkg._companyId === defaultId);
}

function isPackageHidden(pkg: any): boolean {
  return hiddenPackageIds.value.includes(Number(pkg.id));
}

function selectScope(scope: 'all' | 'mine') {
  selectedScope.value = scope;
  loadPackages(true);
}

function onPackageClick(pkg: any) {
  if (isFromDefaultCompany(pkg)) return;
  goToEditPackage(pkg.id);
}

// 加载套餐列表（全部 = 当前公司 + 系统配置公司；只看自己公司 = 仅当前公司）
const loadPackages = async (reset = false) => {
  if (loading.value || (!hasMore.value && !reset)) {
    return;
  }

  const myId = effectiveCompanyId();
  if (!myId) {
    uni.showToast({ title: '公司信息不存在', icon: 'none' });
    return;
  }

  if (reset) {
    page.value = 1;
    hasMore.value = true;
    defaultCompanyId.value = await getDefaultCompanyId();
    const companyDetail = await getCompanyDetail(myId);
    const hidden = (companyDetail as any)?.hidden_package_ids;
    hiddenPackageIds.value = Array.isArray(hidden) ? hidden.map((id: any) => Number(id)) : [];
  }

  loading.value = true;

  try {
    if (selectedScope.value === 'all' && defaultCompanyId.value && defaultCompanyId.value !== myId) {
      const [myRes, defaultRes] = await Promise.all([
        getPackageList({ companyId: myId, limit: pageSize, offset: reset ? 0 : (page.value - 1) * pageSize }),
        getPackageList({ companyId: defaultCompanyId.value, limit: pageSize, offset: reset ? 0 : (page.value - 1) * pageSize }),
      ]);
      const myList = (myRes.packages || []).map((p: any) => ({ ...p, _companyId: myId }));
      const defaultList = (defaultRes.packages || []).map((p: any) => ({ ...p, _companyId: defaultCompanyId.value }));
      const merged = [...myList, ...defaultList];
      if (reset) packages.value = merged;
      else packages.value = [...packages.value, ...merged];
      hasMore.value = (myRes.packages?.length === pageSize) || (defaultRes.packages?.length === pageSize);
      if (merged.length > 0) page.value++;
    } else {
      const result = await getPackageList({
        companyId: myId,
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
      });
      const list = (result.packages || []).map((p: any) => ({ ...p, _companyId: myId }));
      if (reset) packages.value = list;
      else packages.value = [...packages.value, ...list];
      if (result.total <= packages.value.length) hasMore.value = false;
      else page.value++;
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
};

// 删除套餐
const handleDelete = (pkg: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除套餐"${pkg.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deletePackage(pkg.id);
          uni.showToast({ title: '删除成功', icon: 'success' });
          loadPackages(true);
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      }
    },
  });
};

// 隐藏系统配置公司的套餐
async function handleHidePackage(pkg: any) {
  const myId = companyInfo.value?.id;
  if (!myId) return;
  try {
    const company = await getCompanyDetail(myId) as any;
    const cur = (company?.hidden_package_ids || []).map((id: any) => Number(id));
    if (cur.includes(Number(pkg.id))) {
      uni.showToast({ title: '已隐藏', icon: 'none' });
      return;
    }
    await updateCompany(myId, { hidden_package_ids: [...cur, Number(pkg.id)] });
    uni.showToast({ title: '已加入隐藏名单', icon: 'success' });
    loadPackages(true);
  } catch (error: any) {
    uni.showToast({ title: (error as any)?.message || '操作失败', icon: 'none' });
  }
}

// 取消隐藏系统配置公司的套餐
async function handleUnhidePackage(pkg: any) {
  const myId = companyInfo.value?.id;
  if (!myId) return;
  try {
    const company = await getCompanyDetail(myId) as any;
    const cur = (company?.hidden_package_ids || []).map((id: any) => Number(id));
    const next = cur.filter((id: number) => id !== Number(pkg.id));
    if (next.length === cur.length) {
      uni.showToast({ title: '未在隐藏名单中', icon: 'none' });
      return;
    }
    await updateCompany(myId, { hidden_package_ids: next });
    uni.showToast({ title: '已取消隐藏', icon: 'success' });
    loadPackages(true);
  } catch (error: any) {
    uni.showToast({ title: (error as any)?.message || '操作失败', icon: 'none' });
  }
}

// 跳转到添加套餐
const goToAddPackage = () => {
  uni.navigateTo({
    url: '/subPackages/company/package-edit/index',
  });
};

// 跳转到编辑套餐
const goToEditPackage = (packageId: number) => {
  uni.navigateTo({
    url: `/subPackages/company/package-edit/index?id=${packageId}`,
  });
};

onLoad((options?: { companyId?: string }) => {
  if (options?.companyId) {
    viewCompanyId.value = Number(options.companyId);
  }
});

onShow(() => {
  loadPackages(true);
});

onPullDownRefresh(() => {
  loadPackages(true);
});

onReachBottom(() => {
  loadPackages();
});
</script>

<style scoped>
.package-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-bar {
  background: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.scope-row {
  display: flex;
  gap: 12rpx;
}

.scope-tab {
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  color: #666;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.scope-tab.active {
  background: #e8ebf7;
  color: #667eea;
  font-weight: 500;
}

.add-btn {
  padding: 10rpx 20rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;
}

.package-list {
  padding: 20rpx;
}

.package-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.package-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.package-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.package-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.package-meta {
  font-size: 24rpx;
  color: #999999;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.tag-system {
  font-size: 20rpx;
  padding: 2rpx 8rpx;
  background: #fff7e6;
  color: #d48806;
  border-radius: 4rpx;
}

.tag-hidden {
  font-size: 20rpx;
  color: #999;
  padding: 2rpx 8rpx;
  background: #f5f5f5;
  border-radius: 4rpx;
}

.package-desc {
  font-size: 26rpx;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.package-actions {
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

.action-btn.hide {
  background: #fff7e6;
  color: #d48806;
}

.action-btn.unhide {
  background: #e6f7ff;
  color: #1890ff;
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
</style>

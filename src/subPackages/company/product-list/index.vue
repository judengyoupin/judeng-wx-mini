<template>
  <view class="product-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <view class="header-actions">
        <view class="filter-tabs">
          <view 
            class="tab-item" 
            :class="{ active: currentTab === 'all' }"
            @click="currentTab = 'all'"
          >
            全部
          </view>
          <view 
            class="tab-item" 
            :class="{ active: currentTab === 'shelved' }"
            @click="currentTab = 'shelved'"
          >
            已上架
          </view>
          <view 
            class="tab-item" 
            :class="{ active: currentTab === 'unshelved' }"
            @click="currentTab = 'unshelved'"
          >
            已下架
          </view>
        </view>
        <button class="add-btn" @click="goToAddProduct">+ 添加商品</button>
      </view>
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
        <view 
          class="scope-tab" 
          :class="{ active: selectedScope === 'headquarters' }"
          @click="selectScope('headquarters')"
        >
          只看总部
        </view>
      </view>
      <view class="search-row">
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="搜索商品名称"
          placeholder-class="search-placeholder"
        />
      </view>
    </view>

    <!-- 商品列表（按分类分区，可折叠） -->
    <view class="product-list">
      <template v-for="section in groupedSections" :key="section.categoryName">
        <view 
          class="section-header"
          :class="{ collapsed: isSectionCollapsed(section.categoryName) }"
          @click="toggleSection(section.categoryName)"
        >
          <text class="section-expand-icon">{{ isSectionCollapsed(section.categoryName) ? '▶' : '▼' }}</text>
          <text class="section-title-text">{{ section.categoryName }}</text>
          <text class="section-count">（{{ section.items.length }}）</text>
        </view>
        <view v-show="!isSectionCollapsed(section.categoryName)" class="section-body">
          <view 
            v-for="product in section.items" 
            :key="product.id"
            class="product-item"
          >
          <view class="product-item-main" @click="onProductClick(product)">
            <image 
              class="product-image" 
              :src="product.cover_image_url" 
              mode="aspectFill"
            ></image>
            <view class="product-info">
              <view class="product-name">{{ product.name }}</view>
              <view class="product-meta">
                <text class="sku-count">{{ product.product_skus?.length || 0 }}个规格</text>
                <text class="status" :class="{ 'status-shelved': !product.is_shelved }">
                  {{ product.is_shelved ? '已下架' : '已上架' }}
                </text>
                <text v-if="isFromDefaultCompany(product)" class="tag-system">系统配置</text>
                <text v-if="isFromDefaultCompany(product) && isProductHidden(product)" class="tag-hidden">已隐藏</text>
              </view>
            </view>
            <view class="product-actions">
              <template v-if="isFromDefaultCompany(product)">
                <view v-if="isProductHidden(product)" class="action-btn unhide" @click.stop="handleUnhideProduct(product)">取消隐藏</view>
                <view v-else class="action-btn hide" @click.stop="handleHideProduct(product)">隐藏</view>
              </template>
              <template v-else>
                <view class="action-btn" @click.stop="toggleShelve(product)">
                  {{ product.is_shelved ? '上架' : '下架' }}
                </view>
                <view class="action-btn delete" @click.stop="handleDelete(product)">
                  删除
                </view>
              </template>
            </view>
          </view>
          <view class="item-entry-row">
            <template v-if="!isFromDefaultCompany(product)">
              <text class="entry-link" @click.stop="goToEditProduct(product.id)">编辑</text>
              <text class="entry-divider">|</text>
            </template>
            <text class="entry-link" @click.stop="goToPreviewProduct(product.id)">预览</text>
          </view>
        </view>
        </view>
      </template>

      <!-- 搜索无结果 -->
      <view v-if="products.length > 0 && groupedSections.length === 0 && !loading" class="empty-state">
        <text class="empty-text">未找到匹配「{{ searchKeyword }}」的商品</text>
      </view>
      <!-- 空状态 -->
      <view v-else-if="products.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无商品</text>
        <button class="empty-btn" @click="goToAddProduct">添加商品</button>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getProductList, deleteProduct, updateProduct } from '@/api/admin/product';
import { getDefaultCompanyId } from '@/api/config/index';
import { getCompanyDetail, updateCompany } from '@/api/admin/platform';

const products = ref<any[]>([]);
const loading = ref(false);
const currentTab = ref<'all' | 'shelved' | 'unshelved'>('all');
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const selectedScope = ref<'all' | 'mine' | 'headquarters'>('all');
const defaultCompanyId = ref<number | null>(null);
const hiddenProductIds = ref<number[]>([]);
const searchKeyword = ref('');
const collapsedSections = ref<Set<string>>(new Set());

// 超级管理员从公司管理点进来时传入的 companyId（仅查看，不编辑时用）
const viewCompanyId = ref<number | null>(null);
const effectiveCompanyId = () => viewCompanyId.value ?? companyInfo.value?.id ?? null;

function isFromDefaultCompany(product: any): boolean {
  const myId = companyInfo.value?.id;
  const defaultId = defaultCompanyId.value;
  return !!(defaultId && myId && defaultId !== myId && product._companyId === defaultId);
}

function isProductHidden(product: any): boolean {
  return hiddenProductIds.value.includes(Number(product.id));
}

function selectScope(scope: 'all' | 'mine' | 'headquarters') {
  selectedScope.value = scope;
  loadProducts(true);
}

function onProductClick(product: any) {
  if (isFromDefaultCompany(product)) {
    goToPreviewProduct(product.id);
    return;
  }
  goToEditProduct(product.id);
}

// 根据分类的父子关系拼出完整目录路径（一级/二级/三级）
function getCategoryPath(cat: any): string {
  if (!cat?.name) return '未分类';
  const parts: string[] = [];
  let c: any = cat;
  while (c?.name) {
    parts.unshift(String(c.name).trim());
    c = c.category;
  }
  return parts.length ? parts.join(' / ') : '未分类';
}

// 按关键词过滤（名称、描述）
const filteredProducts = computed(() => {
  const kw = (searchKeyword.value || '').trim().toLowerCase();
  if (!kw) return products.value;
  return products.value.filter((p: any) => {
    const name = (p.name || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    return name.includes(kw) || desc.includes(kw);
  });
});

// 按完整目录路径分区展示：{ categoryName, items }（基于过滤后的列表）
const groupedSections = computed(() => {
  const map = new Map<string, any[]>();
  const noCategoryKey = '未分类';
  for (const p of filteredProducts.value) {
    const path = getCategoryPath(p.category);
    const key = path || noCategoryKey;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  const sections: { categoryName: string; items: any[] }[] = [];
  map.forEach((items, categoryName) => {
    sections.push({ categoryName, items });
  });
  sections.sort((a, b) => (a.categoryName === noCategoryKey ? 1 : b.categoryName === noCategoryKey ? -1 : a.categoryName.localeCompare(b.categoryName)));
  return sections;
});

function isSectionCollapsed(categoryName: string): boolean {
  return collapsedSections.value.has(categoryName);
}

function toggleSection(categoryName: string) {
  const next = new Set(collapsedSections.value);
  if (next.has(categoryName)) next.delete(categoryName);
  else next.add(categoryName);
  collapsedSections.value = next;
}

// 加载商品列表（支持「全部」= 当前公司 + 系统配置公司；「只看自己公司」= 仅当前公司）
const loadProducts = async (reset = false) => {
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
    const hidden = companyDetail?.hidden_product_ids;
    hiddenProductIds.value = Array.isArray(hidden) ? hidden.map((id: any) => Number(id)) : [];
  }

  loading.value = true;

  try {
    if (selectedScope.value === 'headquarters' && defaultCompanyId.value && defaultCompanyId.value !== myId) {
      // 只看总部：仅系统配置公司
      const result = await getProductList({
        companyId: defaultCompanyId.value,
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
      });
      let list = (result.products || []).map((p: any) => ({ ...p, _companyId: defaultCompanyId.value }));
      if (currentTab.value === 'shelved') list = list.filter((p: any) => !p.is_shelved);
      else if (currentTab.value === 'unshelved') list = list.filter((p: any) => p.is_shelved);
      if (reset) products.value = list;
      else products.value = [...products.value, ...list];
      if (result.total <= products.value.length) hasMore.value = false;
      else page.value++;
    } else if (selectedScope.value === 'all' && defaultCompanyId.value && defaultCompanyId.value !== myId) {
      // 全部：拉取当前公司 + 系统配置公司，合并并打标（每边最多 pageSize 条）
      const [myRes, defaultRes] = await Promise.all([
        getProductList({
          companyId: myId,
          limit: pageSize,
          offset: reset ? 0 : (page.value - 1) * pageSize,
        }),
        getProductList({
          companyId: defaultCompanyId.value,
          limit: pageSize,
          offset: reset ? 0 : (page.value - 1) * pageSize,
        }),
      ]);
      const myList = (myRes.products || []).map((p: any) => ({ ...p, _companyId: myId }));
      const defaultList = (defaultRes.products || []).map((p: any) => ({ ...p, _companyId: defaultCompanyId.value }));
      let merged = [...myList, ...defaultList];
      if (currentTab.value === 'shelved') merged = merged.filter((p: any) => !p.is_shelved);
      else if (currentTab.value === 'unshelved') merged = merged.filter((p: any) => p.is_shelved);
      if (reset) products.value = merged;
      else products.value = [...products.value, ...merged];
      hasMore.value = (myRes.products?.length === pageSize) || (defaultRes.products?.length === pageSize);
      if (merged.length > 0) page.value++;
    } else {
      // 只看自己公司：仅当前公司，保持原有分页
      const where: any = {
        companyId: myId,
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
      };
      const result = await getProductList(where);
      let filteredProducts = result.products || [];
      if (currentTab.value === 'shelved') filteredProducts = filteredProducts.filter((p: any) => !p.is_shelved);
      else if (currentTab.value === 'unshelved') filteredProducts = filteredProducts.filter((p: any) => p.is_shelved);
      const tagged = filteredProducts.map((p: any) => ({ ...p, _companyId: myId }));
      if (reset) products.value = tagged;
      else products.value = [...products.value, ...tagged];
      if (result.total <= products.value.length) hasMore.value = false;
      else page.value++;
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
};

// 切换上架/下架
const toggleShelve = async (product: any) => {
  try {
    await updateProduct(product.id, {
      is_shelved: !product.is_shelved,
    });

    uni.showToast({
      title: product.is_shelved ? '已上架' : '已下架',
      icon: 'success',
    });

    // 重新加载列表
    loadProducts(true);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none',
    });
  }
};

// 删除商品
const handleDelete = (product: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除商品"${product.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteProduct(product.id);
          uni.showToast({ title: '删除成功', icon: 'success' });
          loadProducts(true);
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      }
    },
  });
};

// 隐藏系统配置公司的商品（写入当前公司的 hidden_product_ids）
async function handleHideProduct(product: any) {
  const myId = companyInfo.value?.id;
  if (!myId) return;
  try {
    const company = await getCompanyDetail(myId);
    const cur = (company?.hidden_product_ids || []).map((id: any) => Number(id));
    if (cur.includes(Number(product.id))) {
      uni.showToast({ title: '已隐藏', icon: 'none' });
      return;
    }
    await updateCompany(myId, { hidden_product_ids: [...cur, Number(product.id)] });
    uni.showToast({ title: '已加入隐藏名单', icon: 'success' });
    loadProducts(true);
  } catch (error: any) {
    uni.showToast({ title: (error as any)?.message || '操作失败', icon: 'none' });
  }
}

async function handleUnhideProduct(product: any) {
  const myId = companyInfo.value?.id;
  if (!myId) return;
  try {
    const company = await getCompanyDetail(myId);
    const cur = (company?.hidden_product_ids || []).map((id: any) => Number(id));
    const next = cur.filter((id) => id !== Number(product.id));
    if (next.length === cur.length) {
      uni.showToast({ title: '未在隐藏名单中', icon: 'none' });
      return;
    }
    await updateCompany(myId, { hidden_product_ids: next });
    uni.showToast({ title: '已取消隐藏', icon: 'success' });
    loadProducts(true);
  } catch (error: any) {
    uni.showToast({ title: (error as any)?.message || '操作失败', icon: 'none' });
  }
}

// 跳转到添加商品
const goToAddProduct = () => {
  uni.navigateTo({
    url: '/subPackages/company/product-edit/index',
  });
};

// 跳转到编辑商品
const goToEditProduct = (productId: number) => {
  uni.navigateTo({
    url: `/subPackages/company/product-edit/index?id=${productId}`,
  });
};

const goToPreviewProduct = (productId: number) => {
  uni.navigateTo({
    url: `/pages/product-detail/index?id=${productId}`,
  });
};

// 监听tab切换
watch(currentTab, () => {
  loadProducts(true);
});

onLoad((options?: { companyId?: string }) => {
  if (options?.companyId) {
    viewCompanyId.value = Number(options.companyId);
  }
});

onShow(() => {
  loadProducts(true);
});

onPullDownRefresh(() => {
  loadProducts(true);
});

onReachBottom(() => {
  loadProducts();
});
</script>

<style scoped>
.product-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-bar {
  background: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-tabs {
  display: flex;
  gap: 20rpx;
}

.tab-item {
  padding: 10rpx 20rpx;
  font-size: 28rpx;
  color: #666666;
  border-radius: 8rpx;
  transition: all 0.3s;
}

.tab-item.active {
  background: #667eea;
  color: #ffffff;
}

.add-btn {
  padding: 10rpx 20rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 26rpx;
  border: none;
}

.scope-row {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
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

.search-row {
  margin-top: 16rpx;
}

.search-input {
  width: 100%;
  height: 64rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.search-placeholder {
  color: #999;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0 12rpx;
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
}

.section-header:first-child {
  margin-top: 0;
  padding-top: 0;
}

.section-expand-icon {
  font-size: 24rpx;
  color: #666;
  width: 32rpx;
}

.section-title-text {
  flex: 1;
}

.section-count {
  font-size: 24rpx;
  font-weight: 500;
  color: #999;
}

.section-body {
  padding-left: 32rpx;
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

.action-btn.hide {
  background: #fff7e6;
  color: #d48806;
}

.action-btn.unhide {
  background: #e6f7ff;
  color: #1890ff;
}

.product-list {
  padding: 20rpx;
}

.product-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-item-main {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.item-entry-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding-top: 8rpx;
  border-top: 1rpx solid #f0f0f0;
  font-size: 24rpx;
}

.entry-link {
  color: #667eea;
}

.entry-divider {
  color: #ddd;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.product-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  gap: 20rpx;
  font-size: 24rpx;
  color: #999999;
}

.status {
  color: #ff6b6b;
}

.status-shelved {
  color: #51cf66;
}

.product-actions {
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
</style>

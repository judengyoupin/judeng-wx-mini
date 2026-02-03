<template>
  <view class="category-list-page">
    <!-- 顶部操作栏 -->
    <view class="header-bar">
      <view class="filter-row">
        <view class="filter-tabs">
          <view 
            class="filter-tab" 
            :class="{ active: selectedType === null }"
            @click="selectType(null)"
          >
            全部
          </view>
          <view 
            class="filter-tab" 
            :class="{ active: selectedType === 'product' }"
            @click="selectType('product')"
          >
            产品
          </view>
          <view 
            class="filter-tab" 
            :class="{ active: selectedType === 'package' }"
            @click="selectType('package')"
          >
            套餐
          </view>
        </view>
        <view class="scope-tabs">
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
      </view>
      <button class="add-btn" @click="goToAddCategory">+ 添加分类</button>
    </view>

    <!-- 分类树：按层级逐层展开 -->
    <view class="category-tree">
      <view
        v-for="item in flatList"
        :key="item.node.id"
        class="category-row"
        :class="[`depth-${item.depth}`, { 'has-children': hasChildren(item.node) }]"
        :style="{ paddingLeft: (item.depth * 32 + 24) + 'rpx' }"
      >
        <view 
          class="row-inner"
          @click="toggleExpand(item.node)"
        >
          <view class="expand-area">
            <text 
              v-if="hasChildren(item.node)" 
              class="expand-icon"
              :class="{ expanded: item.node.expanded }"
            >
              {{ item.node.expanded ? '▼' : '▶' }}
            </text>
            <text v-else class="expand-placeholder"></text>
          </view>
          <image 
            v-if="item.node.icon_url" 
            :src="item.node.icon_url" 
            class="row-icon"
            mode="aspectFill"
          />
          <view v-else class="row-icon placeholder-icon">
            <text class="placeholder-text">{{ (item.node.name || '')[0] }}</text>
          </view>
          <view class="row-info">
            <text class="row-name">{{ item.node.name }}</text>
            <view class="row-meta">
              <text class="row-type" :class="getTypeClass(item.node.type)">
                {{ getTypeText(item.node.type) }}
              </text>
              <text class="row-level">L{{ item.node.level }}</text>
              <text v-if="isFromDefaultCompany(item.node)" class="row-tag-system">系统配置</text>
              <text v-if="isFromDefaultCompany(item.node) && isCategoryHidden(item.node)" class="row-tag-hidden">已隐藏</text>
            </view>
          </view>
          <view class="row-actions" @click.stop>
            <template v-if="isFromDefaultCompany(item.node)">
              <view v-if="isCategoryHidden(item.node)" class="action-btn unhide" @click="handleUnhideCategory(item.node)">取消隐藏</view>
              <view v-else class="action-btn hide" @click="handleHideCategory(item.node)">隐藏</view>
            </template>
            <template v-else>
              <view class="action-btn" @click="goToEditCategory(item.node)">编辑</view>
              <view class="action-btn delete" @click="handleDelete(item.node)">删除</view>
            </template>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="flatList.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">📁</text>
        <text class="empty-text">暂无分类</text>
        <text class="empty-hint">点击右上角添加分类</text>
        <button class="empty-btn" @click="goToAddCategory">添加分类</button>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getCategoryTree, deleteCategory } from '@/api/admin/category';
import { getDefaultCompanyId } from '@/api/config/index';
import { getCompanyDetail, updateCompany } from '@/api/admin/platform';

const categories = ref<any[]>([]);
const allCategories = ref<any[]>([]);
const loading = ref(false);
const selectedType = ref<'product' | 'package' | null>(null);
const selectedScope = ref<'all' | 'mine'>('all');
const defaultCompanyId = ref<number | null>(null);
/** 当前公司的隐藏分类 id 列表（用于展示已隐藏状态与取消隐藏） */
const hiddenCategoryIds = ref<number[]>([]);

/** 给树节点递归打上 _companyId */
function tagTree(nodes: any[], companyId: number): any[] {
  return nodes.map((node) => ({
    ...node,
    _companyId: companyId,
    categories: node.categories ? tagTree(node.categories, companyId) : [],
  }));
}

/** 是否来自系统配置公司（且当前不是自己公司） */
function isFromDefaultCompany(node: any): boolean {
  const myId = companyInfo.value?.id;
  const defaultId = defaultCompanyId.value;
  return !!(defaultId && myId && defaultId !== myId && node._companyId === defaultId);
}

/** 是否已隐藏（仅对系统配置公司的分类有效） */
function isCategoryHidden(node: any): boolean {
  return hiddenCategoryIds.value.includes(Number(node.id));
}

// 确保每个节点都有 expanded，并只保留当前类型
function ensureExpanded(nodes: any[]): any[] {
  return nodes.map((cat: any) => ({
    ...cat,
    expanded: cat.expanded === true,
    categories: cat.categories ? ensureExpanded(cat.categories) : [],
  }));
}

// 根据展开状态扁平化树为列表（只显示当前展开路径下的节点）
function flattenTree(nodes: any[], depth: number): { node: any; depth: number }[] {
  const result: { node: any; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.expanded && node.categories && node.categories.length > 0) {
      result.push(...flattenTree(node.categories, depth + 1));
    }
  }
  return result;
}

const flatList = computed(() => flattenTree(categories.value, 0));

function hasChildren(node: any): boolean {
  return node.categories && node.categories.length > 0;
}

// 获取分类类型文本
function getTypeText(type: string) {
  return type === 'package' ? '套餐' : '产品';
}

// 获取分类类型样式类
function getTypeClass(type: string) {
  return type === 'package' ? 'type-package' : 'type-product';
}

// 选择类型筛选
function selectType(type: 'product' | 'package' | null) {
  selectedType.value = type;
  filterCategories();
}

// 按范围筛选：只看自己公司时只保留 _companyId === 当前公司 的节点
function filterByScope(cats: any[], myId: number): any[] {
  return cats
    .filter((cat: any) => cat._companyId === myId)
    .map((cat: any) => ({
      ...cat,
      categories: cat.categories ? filterByScope(cat.categories, myId) : [],
    }));
}

// 筛选分类（类型 + 范围）
function filterCategories() {
  let list = allCategories.value;
  const myId = companyInfo.value?.id;
  if (selectedScope.value === 'mine' && myId) {
    list = filterByScope(list, myId);
  }
  if (!selectedType.value) {
    categories.value = list.map((cat: any) => ({
      ...cat,
      expanded: false,
      categories: cat.categories ? ensureExpanded(cat.categories) : [],
    }));
  } else {
    function filterByType(cats: any[]): any[] {
      return cats
        .filter((cat: any) => cat.type === selectedType.value)
        .map((cat: any) => ({
          ...cat,
          expanded: false,
          categories: cat.categories ? filterByType(cat.categories) : [],
        }));
    }
    categories.value = filterByType(list);
  }
}

function selectScope(scope: 'all' | 'mine') {
  selectedScope.value = scope;
  filterCategories();
}

// 加载分类树（当前公司 + 系统配置公司，并打上 _companyId）
async function loadCategories() {
  const myId = companyInfo.value?.id;
  if (!myId) {
    uni.showToast({ title: '公司信息不存在', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    defaultCompanyId.value = await getDefaultCompanyId();
    const [companyDetail, myTree] = await Promise.all([
      getCompanyDetail(myId),
      getCategoryTree(myId),
    ]);
    const hidden = companyDetail?.hidden_category_ids;
    hiddenCategoryIds.value = Array.isArray(hidden) ? hidden.map((id: any) => Number(id)) : [];
    const myTagged = tagTree(Array.isArray(myTree) ? myTree : [], myId);
    if (defaultCompanyId.value && defaultCompanyId.value !== myId) {
      const defaultTree = await getCategoryTree(defaultCompanyId.value);
      const defaultTagged = tagTree(Array.isArray(defaultTree) ? defaultTree : [], defaultCompanyId.value);
      allCategories.value = [...myTagged, ...defaultTagged];
    } else {
      allCategories.value = myTagged;
    }
    filterCategories();
  } catch (error: any) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
}

// 切换展开/收起
function toggleExpand(node: any) {
  if (hasChildren(node)) {
    node.expanded = !node.expanded;
  }
}

function goToAddCategory() {
  uni.navigateTo({ url: '/subPackages/company/category-edit/index' });
}

function goToEditCategory(category: any) {
  uni.navigateTo({ url: `/subPackages/company/category-edit/index?id=${category.id}` });
}

function handleDelete(category: any) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除分类「${category.name}」吗？`,
    success: async (res: any) => {
      if (res.confirm) {
        try {
          await deleteCategory(category.id);
          uni.showToast({ title: '删除成功', icon: 'success' });
          loadCategories();
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      }
    },
  });
}

// 隐藏系统配置公司的分类（写入当前公司的 hidden_category_ids）
async function handleHideCategory(category: any) {
  const myId = companyInfo.value?.id;
  if (!myId) return;
  try {
    const company = await getCompanyDetail(myId);
    const cur = (company?.hidden_category_ids || []).map((id: any) => Number(id));
    if (cur.includes(Number(category.id))) {
      uni.showToast({ title: '已隐藏', icon: 'none' });
      return;
    }
    await updateCompany(myId, { hidden_category_ids: [...cur, Number(category.id)] });
    uni.showToast({ title: '已加入隐藏名单', icon: 'success' });
    loadCategories();
  } catch (error: any) {
    uni.showToast({ title: (error as any)?.message || '操作失败', icon: 'none' });
  }
}

// 取消隐藏系统配置公司的分类
async function handleUnhideCategory(category: any) {
  const myId = companyInfo.value?.id;
  if (!myId) return;
  try {
    const company = await getCompanyDetail(myId);
    const cur = (company?.hidden_category_ids || []).map((id: any) => Number(id));
    const next = cur.filter((id: number) => id !== Number(category.id));
    if (next.length === cur.length) {
      uni.showToast({ title: '未在隐藏名单中', icon: 'none' });
      return;
    }
    await updateCompany(myId, { hidden_category_ids: next });
    uni.showToast({ title: '已取消隐藏', icon: 'success' });
    loadCategories();
  } catch (error: any) {
    uni.showToast({ title: (error as any)?.message || '操作失败', icon: 'none' });
  }
}

onShow(() => {
  loadCategories();
});

onPullDownRefresh(() => {
  loadCategories();
});
</script>

<style scoped>
.category-list-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fc 0%, #eef0f5 100%);
}

/* 顶部栏 */
.header-bar {
  background: #fff;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.filter-row {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.filter-tabs {
  display: flex;
  gap: 12rpx;
}

.scope-tabs {
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

.filter-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #666;
  background: #f0f2f5;
  border-radius: 12rpx;
  transition: all 0.2s;
}

.filter-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-weight: 500;
}

.add-btn {
  padding: 16rpx 28rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 12rpx;
  font-size: 26rpx;
  border: none;
  box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.35);
}

/* 树形列表 */
.category-tree {
  padding: 24rpx;
  padding-bottom: 60rpx;
}

.category-row {
  margin-bottom: 12rpx;
  border-radius: 16rpx;
  overflow: hidden;
  transition: background 0.2s;
}

.category-row .row-inner {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.category-row.has-children .row-inner {
  padding-left: 20rpx;
}

.expand-area {
  width: 44rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-icon {
  font-size: 22rpx;
  color: #999;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  color: #667eea;
}

.expand-placeholder {
  display: inline-block;
  width: 22rpx;
}

.row-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 14rpx;
  flex-shrink: 0;
  margin-right: 20rpx;
  background: #f0f2f5;
}

.placeholder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8ebf7 0%, #e0e4f0 100%);
}

.placeholder-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #667eea;
}

.row-info {
  flex: 1;
  min-width: 0;
}

.row-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8rpx;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.row-type {
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
}

.row-type.type-product {
  background: #e8f4ff;
  color: #1890ff;
}

.row-type.type-package {
  background: #e8f8f0;
  color: #52c41a;
}

.row-level {
  font-size: 22rpx;
  color: #999;
  padding: 2rpx 8rpx;
  background: #f5f5f5;
  border-radius: 4rpx;
}

.row-tag-system {
  font-size: 20rpx;
  color: #999;
  padding: 2rpx 8rpx;
  background: #fff7e6;
  color: #d48806;
  border-radius: 4rpx;
  margin-left: 8rpx;
}

.row-tag-hidden {
  font-size: 20rpx;
  color: #999;
  padding: 2rpx 8rpx;
  background: #f5f5f5;
  border-radius: 4rpx;
  margin-left: 8rpx;
}

.action-btn.hide {
  background: #fff7e6;
  color: #d48806;
}

.action-btn.unhide {
  background: #e6f7ff;
  color: #1890ff;
}

.row-actions {
  display: flex;
  gap: 12rpx;
  flex-shrink: 0;
}

.action-btn {
  padding: 12rpx 20rpx;
  background: #f0f2f5;
  color: #555;
  border-radius: 10rpx;
  font-size: 24rpx;
}

.action-btn.delete {
  background: #fff1f0;
  color: #ff4d4f;
}

/* 不同层级视觉区分 */
.category-row.depth-0 .row-inner {
  border-left: 6rpx solid #667eea;
}

.category-row.depth-1 .row-inner {
  background: #fafbff;
  border-left: 6rpx solid #a5b4fc;
}

.category-row.depth-2 .row-inner {
  background: #f5f7ff;
  border-left: 6rpx solid #c7d2fe;
}

.category-row.depth-3 .row-inner {
  background: #eef1fc;
  border-left: 6rpx solid #e0e7ff;
}

/* 空状态 */
.empty-state {
  padding: 120rpx 40rpx;
  text-align: center;
}

.empty-icon {
  display: block;
  font-size: 80rpx;
  margin-bottom: 24rpx;
  opacity: 0.6;
}

.empty-text {
  display: block;
  font-size: 30rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.empty-hint {
  display: block;
  font-size: 26rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.empty-btn {
  padding: 24rpx 48rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 14rpx;
  font-size: 28rpx;
  border: none;
}

/* 加载中 */
.loading-state {
  padding: 60rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e8e8e8;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

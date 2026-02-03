<template>
  <view class="order-list-page">
    <!-- 统一导航栏（带返回） -->
    <PageNavBar title="我的订单" :show-back="true" @back="goBack" />

    <!-- 未登录 -->
    <view v-if="!user_token" class="need-login">
      <text class="need-login-text">请先登录后查看订单</text>
      <button class="login-btn" type="button" @click="goToLogin">去登录</button>
    </view>

    <template v-else>
      <!-- 订单状态 + 支付状态筛选 -->
      <view class="header-bar">
        <view class="filter-row">
          <text class="filter-label">订单状态</text>
          <view class="filter-tabs">
            <view
              class="tab-item"
              :class="{ active: orderStatusFilter === '' }"
              @click="orderStatusFilter = ''"
            >
              全部
            </view>
            <view
              class="tab-item"
              :class="{ active: orderStatusFilter === 'pending' }"
              @click="orderStatusFilter = 'pending'"
            >
              待确认
            </view>
            <view
              class="tab-item"
              :class="{ active: orderStatusFilter === 'confirmed' }"
              @click="orderStatusFilter = 'confirmed'"
            >
              已确认
            </view>
            <view
              class="tab-item"
              :class="{ active: orderStatusFilter === 'completed' }"
              @click="orderStatusFilter = 'completed'"
            >
              已完成
            </view>
          </view>
        </view>
        <!-- 已完成时不展示支付状态筛选（已完成即已支付） -->
        <view v-if="orderStatusFilter !== 'completed'" class="filter-row">
          <text class="filter-label">支付状态</text>
          <view class="filter-tabs">
            <view
              class="tab-item"
              :class="{ active: paymentStatusFilter === '' }"
              @click="paymentStatusFilter = ''"
            >
              全部
            </view>
            <view
              class="tab-item"
              :class="{ active: paymentStatusFilter === 'pending' }"
              @click="paymentStatusFilter = 'pending'"
            >
              待支付
            </view>
            <view
              class="tab-item"
              :class="{ active: paymentStatusFilter === 'approved' }"
              @click="paymentStatusFilter = 'approved'"
            >
              已支付
            </view>
          </view>
        </view>
      </view>

      <!-- 骨架屏（首屏加载） -->
      <view v-if="loading && orders.length === 0" class="skeleton-area">
        <SkeletonScreen type="list-row" :count="4" />
      </view>

      <!-- 订单列表 -->
      <scroll-view
        v-else
        scroll-y
        class="order-scroll"
        @scrolltolower="loadMore"
        refresher-enabled
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
      >
        <view
          v-for="order in orders"
          :key="order.id"
          class="order-item"
          @click="goToOrderDetail(order.id)"
        >
          <view class="order-header">
            <view class="order-info">
              <text class="order-id">订单号: {{ order.id }}</text>
              <text class="order-status" :class="statusClass(order)">
                {{ orderStatusText(order.order_status) }} / {{ paymentStatusText(order.payment_status) }}
              </text>
            </view>
            <text class="order-time">{{ formatTime(order.created_at) }}</text>
          </view>

          <view class="order-company" v-if="order.company">
            <text class="company-label">公司:</text>
            <text class="company-name">{{ order.company.name }}</text>
          </view>

          <view class="order-footer">
            <view class="order-total">
              <text class="total-label">实付:</text>
              <text class="total-price">¥{{ order.total_amount }}</text>
            </view>
            <view class="order-arrow">›</view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="orders.length === 0 && !loading" class="empty-state">
          <text class="empty-text">暂无订单</text>
        </view>

        <!-- 加载更多中 -->
        <view v-if="loading && orders.length > 0" class="loading-state">
          <text>加载中...</text>
        </view>
        <view v-else-if="orders.length > 0 && !hasMore" class="no-more">
          <text>没有更多了</text>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { onLoad, onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { user_token, userInfo } from '@/store/userStore';
import { getMyOrderList } from '@/api/order/index';
import PageNavBar from '@/components/PageNavBar.vue';
import SkeletonScreen from '@/components/SkeletonScreen.vue';

const orders = ref<any[]>([]);
const loading = ref(false);
const isRefreshing = ref(false);
const searchKeyword = ref('');
const orderStatusFilter = ref('');
const paymentStatusFilter = ref('');
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);

function orderStatusText(s: string) {
  if (s === 'pending') return '待确认';
  if (s === 'confirmed') return '已确认';
  if (s === 'completed') return '已完成';
  return s || '--';
}
function paymentStatusText(s: string) {
  if (s === 'pending') return '待支付';
  if (s === 'approved') return '已支付';
  return s || '--';
}
function statusClass(order: any) {
  const o = order?.order_status;
  const p = order?.payment_status;
  if (o === 'completed' || p === 'approved') return 'status-done';
  if (o === 'pending') return 'status-pending';
  return 'status-confirmed';
}

function formatTime(time: string) {
  if (!time) return '';
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

async function loadOrders(reset = false) {
  if (loading.value || (!hasMore.value && !reset)) return;

  const userId = userInfo.value?.id;
  if (!userId) {
    if (reset) orders.value = [];
    return;
  }

  if (reset) {
    page.value = 1;
    hasMore.value = true;
  }

  loading.value = true;
  if (reset) isRefreshing.value = true;

  try {
    const result = await getMyOrderList({
      userId: Number(userId),
      orderStatus: orderStatusFilter.value || undefined,
      paymentStatus: paymentStatusFilter.value || undefined,
      keyword: searchKeyword.value.trim() || undefined,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });

    if (reset) orders.value = [];

    orders.value = [...orders.value, ...(result.orders || [])];

    if (result.total <= orders.value.length) {
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
}

function goBack() {
  uni.navigateBack();
}

function goToLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

function goToOrderDetail(orderId: number) {
  uni.navigateTo({
    url: `/pages/order-detail/index?id=${orderId}`,
  });
}

function loadMore() {
  loadOrders();
}

function onRefresh() {
  loadOrders(true);
}

function onSearch() {
  loadOrders(true);
}

watch(orderStatusFilter, (v) => {
  if (v === 'completed') paymentStatusFilter.value = '';
  loadOrders(true);
});
watch(paymentStatusFilter, () => {
  loadOrders(true);
});

onShow(() => {
  if (user_token.value && userInfo.value?.id) {
    loadOrders(true);
  }
});

onPullDownRefresh(() => {
  loadOrders(true);
});

onReachBottom(() => {
  loadMore();
});
</script>

<style scoped>
.order-list-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.need-login {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  gap: 32rpx;
}

.need-login-text {
  font-size: 30rpx;
  color: #999;
}

.login-btn {
  width: 240rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;
  border: none;
}

.login-btn::after {
  border: none;
}

.header-bar {
  background: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
  flex-shrink: 0;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.search-input {
  flex: 1;
  height: 64rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #f5f5f5;
  border-radius: 32rpx;
}
.search-placeholder {
  color: #999;
}
.search-btn {
  flex-shrink: 0;
  height: 64rpx;
  padding: 0 28rpx;
  line-height: 64rpx;
  font-size: 28rpx;
  color: #fff;
  background: #667eea;
  border-radius: 32rpx;
  border: none;
}
.search-btn::after {
  border: none;
}

.filter-tabs {
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 20rpx;
}

.tab-item {
  padding: 10rpx 20rpx;
  font-size: 28rpx;
  color: #666;
  border-radius: 8rpx;
}

.tab-item.active {
  background: #667eea;
  color: #fff;
}

.skeleton-area {
  flex: 1;
  min-height: 400rpx;
}

.order-scroll {
  flex: 1;
  height: 0;
}

.order-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 20rpx;
  margin-bottom: 0;
}

.order-item:last-of-type {
  margin-bottom: 20rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eee;
}

.order-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.order-id {
  font-size: 26rpx;
  color: #666;
}

.order-status {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 24rpx;
}

.status-pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-confirmed {
  background: #e6f7ff;
  color: #1890ff;
}

.status-done {
  background: #f6ffed;
  color: #52c41a;
}

.filter-row {
  margin-bottom: 16rpx;
}
.filter-row:last-child {
  margin-bottom: 0;
}
.filter-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
  display: block;
}

.order-time {
  font-size: 24rpx;
  color: #999;
}

.order-company {
  margin-bottom: 16rpx;
  font-size: 26rpx;
  color: #666;
}

.company-label {
  color: #999;
}

.company-name {
  color: #333;
  margin-left: 8rpx;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #eee;
}

.order-total {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 26rpx;
  color: #666;
}

.total-price {
  font-size: 32rpx;
  color: #ff6b6b;
  font-weight: bold;
}

.order-arrow {
  font-size: 36rpx;
  color: #999;
}

.empty-state {
  padding: 100rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.loading-state,
.no-more {
  padding: 40rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
</style>

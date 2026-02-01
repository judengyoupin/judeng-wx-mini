<template>
  <view class="order-list-page">
    <!-- 顶部筛选栏 -->
    <view class="header-bar">
      <view class="filter-tabs">
        <view 
          class="tab-item" 
          :class="{ active: currentStatus === '' }"
          @click="currentStatus = ''"
        >
          全部
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentStatus === 'pending' }"
          @click="currentStatus = 'pending'"
        >
          待确认
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentStatus === 'submitted' }"
          @click="currentStatus = 'submitted'"
        >
          已提交
        </view>
      </view>
    </view>

    <!-- 订单列表 -->
    <view class="order-list">
      <view 
        v-for="order in orders" 
        :key="order.id"
        class="order-item"
        @click="goToOrderDetail(order.id)"
      >
        <view class="order-header">
          <view class="order-info">
            <text class="order-id">订单号: {{ order.id }}</text>
            <text class="order-status" :class="`status-${order.status}`">
              {{ order.status === 'pending' ? '待确认' : '已提交' }}
            </text>
          </view>
          <text class="order-time">{{ formatTime(order.created_at) }}</text>
        </view>
        
        <view class="order-user">
          <text class="user-label">用户:</text>
          <text class="user-name">{{ order.user?.nickname || order.user?.mobile }}</text>
        </view>

        <view class="order-items" v-if="order.order_items && order.order_items.length > 0">
          <view 
            v-for="item in order.order_items" 
            :key="item.id"
            class="order-item-row"
          >
            <image 
              v-if="item.product_sku?.product?.cover_image_url" 
              :src="item.product_sku.product.cover_image_url" 
              class="item-image"
              mode="aspectFill"
            />
            <view class="item-info">
              <text class="item-name">{{ item.product_sku?.product?.name }}</text>
              <text class="item-spec">{{ item.product_sku?.name }}</text>
              <text class="item-quantity">x{{ item.quantity }}</text>
            </view>
            <text class="item-price">¥{{ item.price }}</text>
          </view>
        </view>
        <view class="order-items-placeholder" v-else>
          <text>（暂无法显示商品详情）</text>
        </view>

        <view class="order-footer">
          <view class="order-total">
            <text class="total-label">总价:</text>
            <text class="total-price">¥{{ order.total_amount }}</text>
          </view>
          <view class="order-actions">
            <button 
              v-if="order.status === 'pending'"
              class="action-btn confirm" 
              @click.stop="confirmOrder(order)"
            >
              确认订单
            </button>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="orders.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无订单</text>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { companyInfo } from '@/store/userStore';
import { getOrderList, updateOrderStatus } from '@/api/admin/order';

const orders = ref<any[]>([]);
const loading = ref(false);
const currentStatus = ref('');
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '';
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

// 加载订单列表
const loadOrders = async (reset = false) => {
  if (loading.value || (!hasMore.value && !reset)) {
    return;
  }

  if (reset) {
    page.value = 1;
    hasMore.value = true;
  }

  if (!companyInfo.value?.id) {
    uni.showToast({
      title: '公司信息不存在',
      icon: 'none',
    });
    return;
  }

  loading.value = true;

  try {
    const result = await getOrderList({
      companyId: companyInfo.value.id,
      status: currentStatus.value || undefined,
      limit: pageSize,
      offset: (page.value - 1) * pageSize,
    });

    if (reset) {
      orders.value = [];
    }

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
    uni.stopPullDownRefresh();
  }
};

// 确认订单
const confirmOrder = async (order: any) => {
  uni.showModal({
    title: '确认订单',
    content: '确定要确认这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(order.id, 'submitted');
          uni.showToast({
            title: '订单已确认',
            icon: 'success',
          });
          loadOrders(true);
        } catch (error: any) {
          uni.showToast({
            title: error.message || '操作失败',
            icon: 'none',
          });
        }
      }
    },
  });
};

// 跳转到订单详情
const goToOrderDetail = (orderId: number) => {
  uni.navigateTo({
    url: `/subPackages/admin/order-detail/index?id=${orderId}`,
  });
};

// 监听状态切换
watch(currentStatus, () => {
  loadOrders(true);
});

onMounted(() => {
  loadOrders(true);
});

onShow(() => {
  // 页面显示时刷新数据（从其他页面返回时）
  loadOrders(true);
});

onPullDownRefresh(() => {
  loadOrders(true);
});

onReachBottom(() => {
  loadOrders();
});
</script>

<style scoped>
.order-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header-bar {
  background: #ffffff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #e0e0e0;
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

.order-list {
  padding: 20rpx;
}

.order-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.order-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.order-id {
  font-size: 26rpx;
  color: #666666;
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

.status-submitted {
  background: #f6ffed;
  color: #52c41a;
}

.order-time {
  font-size: 24rpx;
  color: #999999;
}

.order-user {
  margin-bottom: 16rpx;
  font-size: 26rpx;
  color: #666666;
}

.user-label {
  color: #999999;
}

.user-name {
  color: #333333;
  margin-left: 8rpx;
}

.order-items {
  margin-bottom: 16rpx;
}

.order-item-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-item-row:last-child {
  border-bottom: none;
}

.item-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.item-name {
  font-size: 26rpx;
  color: #333333;
}

.item-spec {
  font-size: 24rpx;
  color: #999999;
}

.item-quantity {
  font-size: 24rpx;
  color: #666666;
}

.item-price {
  font-size: 26rpx;
  color: #ff6b6b;
  font-weight: bold;
}

.order-items-placeholder {
  padding: 20rpx;
  text-align: center;
  color: #999;
  font-size: 24rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #e0e0e0;
}

.order-total {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 26rpx;
  color: #666666;
}

.total-price {
  font-size: 32rpx;
  color: #ff6b6b;
  font-weight: bold;
}

.order-actions {
  display: flex;
  gap: 10rpx;
}

.action-btn {
  padding: 10rpx 20rpx;
  background: #667eea;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 24rpx;
  border: none;
}

.action-btn.confirm {
  background: #52c41a;
}

.empty-state {
  padding: 100rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.loading-state {
  padding: 40rpx 0;
  text-align: center;
  color: #999999;
  font-size: 28rpx;
}
</style>

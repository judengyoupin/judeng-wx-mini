<template>
  <view class="order-detail-page">
    <scroll-view scroll-y class="scroll-content">
      <!-- 订单信息 -->
      <view class="section">
        <view class="section-title">订单信息</view>
        <view class="info-row">
          <text class="label">订单号:</text>
          <text class="value">{{ order.id }}</text>
        </view>
        <view class="info-row">
          <text class="label">订单状态:</text>
          <text class="value status" :class="`status-${order.status}`">
            {{ order.status === 'pending' ? '待确认' : '已提交' }}
          </text>
        </view>
        <view class="info-row">
          <text class="label">下单时间:</text>
          <text class="value">{{ formatTime(order.created_at) }}</text>
        </view>
        <view class="info-row">
          <text class="label">商品总价:</text>
          <text class="value">¥{{ order.total_price }}</text>
        </view>
        <view class="info-row">
          <text class="label">价格系数:</text>
          <text class="value">{{ order.price_factor }}</text>
        </view>
        <view class="info-row">
          <text class="label">订单总价:</text>
          <text class="value total-price">¥{{ order.total_amount }}</text>
        </view>
        <view v-if="order.remark" class="info-row">
          <text class="label">备注:</text>
          <text class="value">{{ order.remark }}</text>
        </view>
      </view>

      <!-- 用户信息 -->
      <view class="section">
        <view class="section-title">用户信息</view>
        <view class="user-info">
          <image 
            v-if="order.user?.avatar_url" 
            :src="order.user.avatar_url" 
            class="user-avatar"
            mode="aspectFill"
          />
          <view v-else class="user-avatar-placeholder">
            <text>{{ order.user?.nickname?.[0] || 'U' }}</text>
          </view>
          <view class="user-details">
            <text class="user-name">{{ order.user?.nickname || '未设置昵称' }}</text>
            <text class="user-phone">{{ order.user?.mobile }}</text>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="section">
        <view class="section-title">商品列表</view>
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
            <text class="item-spec">规格: {{ item.product_sku?.name }}</text>
            <text class="item-quantity">数量: x{{ item.quantity }}</text>
            <text class="item-price">单价: ¥{{ item.price }}</text>
            <text v-if="item.remark" class="item-remark">备注: {{ item.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view v-if="order.status === 'pending'" class="footer-actions">
        <button class="confirm-btn" @click="confirmOrder">确认订单</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getOrderDetail, updateOrderStatus } from '@/api/admin/order';

const orderId = ref<number | null>(null);
const order = ref<any>({
  id: null,
  status: '',
  total_price: 0,
  total_amount: 0,
  price_factor: 1,
  remark: '',
  created_at: '',
  user: {},
  order_items: [],
});
const loading = ref(false);

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '';
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 加载订单详情
const loadOrderDetail = async () => {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const result = await getOrderDetail(orderId.value);
    if (result) {
      order.value = result;
    }
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

// 确认订单
const confirmOrder = () => {
  uni.showModal({
    title: '确认订单',
    content: '确定要确认这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(order.value.id, 'submitted');
          uni.showToast({
            title: '订单已确认',
            icon: 'success',
          });
          order.value.status = 'submitted';
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

onLoad((options) => {
  if (options.id) {
    orderId.value = Number(options.id);
    loadOrderDetail();
  }
});
</script>

<style scoped>
.order-detail-page {
  height: 100vh;
  background: #f5f5f5;
}

.scroll-content {
  height: 100%;
}

.section {
  background: #ffffff;
  margin: 20rpx;
  padding: 30rpx;
  border-radius: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  margin-bottom: 16rpx;
}

.label {
  font-size: 28rpx;
  color: #666666;
  width: 160rpx;
}

.value {
  font-size: 28rpx;
  color: #333333;
  flex: 1;
}

.status {
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

.total-price {
  font-size: 32rpx;
  color: #ff6b6b;
  font-weight: bold;
}

.user-info {
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
  font-size: 36rpx;
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

.user-phone {
  font-size: 26rpx;
  color: #999999;
}

.order-item-row {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-item-row:last-child {
  border-bottom: none;
}

.item-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.item-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333333;
}

.item-spec,
.item-quantity,
.item-price {
  font-size: 26rpx;
  color: #666666;
}

.item-remark {
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

.footer-actions {
  padding: 30rpx;
  background: #ffffff;
}

.confirm-btn {
  width: 100%;
  padding: 24rpx;
  background: #52c41a;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 32rpx;
  border: none;
}
</style>

<template>
  <view class="order-detail-page">
    <view v-if="loading" class="skeleton-area">
      <SkeletonScreen type="detail" />
    </view>
    <view v-else-if="!order" class="empty-state">
      <view class="empty-icon">📋</view>
      <text class="empty-text">订单不存在或已失效</text>
    </view>
    <scroll-view v-else scroll-y class="scroll-content">
      <!-- 顶部状态卡片 -->
      <view class="top-status-card" :class="statusCardClass">
        <view class="status-badge">{{ orderStatusText }}</view>
        <view class="top-company" v-if="order.company?.name">{{ order.company.name }}</view>
        <view class="top-id">订单号 {{ order.id }}</view>
      </view>

      <!-- 订单信息 -->
      <view class="section card">
        <view class="section-head">
          <text class="section-dot"></text>
          <text class="section-title">订单信息</text>
        </view>
        <view class="order-meta">
          <text class="order-id">订单号</text>
          <text class="order-id-num">{{ order.id }}</text>
        </view>
        <view class="order-amount-row">
          <text class="amount-label">订单金额</text>
          <text class="amount">¥{{ order.total_amount }}</text>
        </view>
        <view v-if="order.remark" class="order-remark">
          <text class="remark-label">订单备注</text>
          <text class="remark-text">{{ order.remark }}</text>
        </view>
      </view>

      <!-- 下单用户（昵称 + 手机号，可拨打） -->
      <view class="section card" v-if="order.user">
        <view class="section-head">
          <text class="section-dot"></text>
          <text class="section-title">下单用户</text>
        </view>
        <view class="user-block">
          <text class="user-nickname">{{ order.user.nickname || '--' }}</text>
          <view v-if="order.user.mobile" class="phone-row" @click="callPhone(order.user.mobile)">
            <text class="phone-label">手机号</text>
            <text class="phone-num">{{ order.user.mobile }}</text>
            <text class="phone-call-hint">点击拨打</text>
          </view>
        </view>
      </view>

      <!-- 收货信息（收货人手机号可拨打） -->
      <view class="section card">
        <view class="section-head">
          <text class="section-dot"></text>
          <text class="section-title">收货信息</text>
        </view>
        <view class="receiver-block">
          <view class="receiver-line">
            <text class="receiver-name">{{ order.receiver_name }}</text>
            <view v-if="order.receiver_phone" class="phone-row" @click="callPhone(order.receiver_phone)">
              <text class="receiver-phone">{{ order.receiver_phone }}</text>
              <text class="phone-call-hint">点击拨打</text>
            </view>
            <text v-else class="receiver-phone">--</text>
          </view>
          <text class="address">{{ order.receiver_address }}</text>
        </view>
      </view>

      <!-- 商品清单 -->
      <view class="section card" v-if="order.order_items?.length">
        <view class="section-head">
          <text class="section-dot"></text>
          <text class="section-title">商品清单</text>
        </view>
        <view v-for="(item, idx) in order.order_items" :key="item.id" class="order-item-row" :class="{ 'last-item': idx === order.order_items.length - 1 }">
          <image v-if="item.product_image_url" :src="item.product_image_url" class="item-img" mode="aspectFill" />
          <view class="item-img-placeholder" v-else></view>
          <view class="item-info">
            <text class="item-name">{{ item.product_name }}</text>
            <view class="item-meta">
              <text class="item-price">¥{{ item.product_price }}</text>
              <text class="item-qty">× {{ item.quantity }}</text>
            </view>
            <text v-if="item.remark" class="item-remark">备注：{{ item.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 未付款时展示公司联系方式 -->
      <view class="section card wechat-section" v-if="isUnpaid && companyWechatCode">
        <view class="wechat-title">联系公司付款</view>
        <text class="wechat-desc">订单未付款，请添加公司微信沟通付款事宜</text>
        <view class="wechat-qr-wrap">
          <image :src="companyWechatCode" class="wechat-qr" mode="aspectFit" />
        </view>
      </view>

      <view class="footer-spacer"></view>
      <view class="footer-actions">
        <button class="share-btn" open-type="share">分享订单</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { getOrderDetailById } from '@/api/order/index';
import SkeletonScreen from '@/components/SkeletonScreen.vue';

const orderId = ref<number | null>(null);
const order = ref<any>(null);
const loading = ref(true);

const orderStatusText = computed(() => {
  const s = order.value?.order_status;
  if (s === 'pending') return '待确认';
  if (s === 'confirmed') return '已确认';
  if (s === 'completed') return '已完成';
  return s || '--';
});

/** 顶部状态卡片样式类（按订单状态区分颜色） */
const statusCardClass = computed(() => {
  const s = order.value?.order_status;
  if (s === 'pending') return 'status-pending';
  if (s === 'confirmed') return 'status-confirmed';
  if (s === 'completed') return 'status-completed';
  return '';
});

const companyWechatCode = computed(() => order.value?.company?.wechat_code || null);

/** 未付款状态：展示联系公司付款 */
const isUnpaid = computed(
  () => order.value?.payment_status === 'pending' || order.value?.order_status === 'pending'
);

/** 快捷拨打 */
function callPhone(phone: string) {
  const num = String(phone || '').trim();
  if (!num) return;
  uni.makePhoneCall({ phoneNumber: num });
}

onLoad((options?: { id?: string }) => {
  if (options?.id) orderId.value = Number(options.id);
});

onMounted(async () => {
  if (!orderId.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    order.value = await getOrderDetailById(orderId.value);
  } catch (e) {
    order.value = null;
  } finally {
    loading.value = false;
  }
});

onShareAppMessage(() => ({
  title: `订单 ${orderId.value} - ${order.value?.company?.name || '订单详情'}`,
  path: `/pages/order-detail/index?id=${orderId.value}`,
}));

onShareTimeline(() => ({
  title: `订单 ${orderId.value} - ${order.value?.company?.name || '订单详情'}`,
  query: `id=${orderId.value}`,
}));
</script>

<style scoped>
.order-detail-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 140rpx;
}

.skeleton-area {
  min-height: 60vh;
  padding: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 24rpx;
}

.empty-icon {
  font-size: 80rpx;
  opacity: 0.5;
}

.empty-text {
  color: #999;
  font-size: 28rpx;
}

.scroll-content {
  padding: 24rpx;
  padding-top: 16rpx;
}

/* 顶部状态卡片 */
.top-status-card {
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 24rpx;
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}

.top-status-card.status-pending {
  background: linear-gradient(135deg, #fa8c16 0%, #f59e0b 100%);
}

.top-status-card.status-confirmed {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.top-status-card.status-completed {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.status-badge {
  font-size: 36rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
  margin-bottom: 12rpx;
}

.top-company {
  font-size: 26rpx;
  opacity: 0.9;
  margin-bottom: 6rpx;
}

.top-id {
  font-size: 24rpx;
  opacity: 0.8;
}

/* 通用卡片与区块标题 */
.section.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.section-head {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #667eea;
  margin-right: 12rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

/* 订单信息 */
.order-meta {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.order-id {
  font-size: 26rpx;
  color: #6b7280;
}

.order-id-num {
  font-size: 26rpx;
  color: #374151;
  font-weight: 500;
}

.order-amount-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.amount-label {
  font-size: 26rpx;
  color: #6b7280;
}

.amount {
  font-size: 38rpx;
  font-weight: 600;
  color: #e11d48;
  letter-spacing: 1rpx;
}

.order-remark {
  padding-top: 16rpx;
  border-top: 1rpx solid #f3f4f6;
}

.remark-label {
  font-size: 24rpx;
  color: #9ca3af;
  display: block;
  margin-bottom: 8rpx;
}

.remark-text {
  font-size: 28rpx;
  color: #374151;
  line-height: 1.5;
}

/* 下单用户 */
.user-block {
  padding-left: 4rpx;
}

.user-nickname {
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2937;
  display: block;
  margin-bottom: 12rpx;
}

.phone-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 16rpx;
  margin-top: 8rpx;
  border-radius: 12rpx;
  background: #f8fafc;
}

.receiver-line .phone-row {
  margin-top: 0;
  margin-left: 12rpx;
}

.phone-label {
  font-size: 26rpx;
  color: #6b7280;
}

.phone-num,
.phone-row .receiver-phone {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
}

.phone-call-hint {
  font-size: 24rpx;
  color: #667eea;
  margin-left: auto;
}

/* 收货信息 */
.receiver-block {
  padding-left: 4rpx;
}

.receiver-line {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.receiver-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #1f2937;
}

.receiver-line > .receiver-phone {
  font-size: 26rpx;
  color: #6b7280;
}

.address {
  display: block;
  font-size: 28rpx;
  color: #4b5563;
  line-height: 1.5;
}

/* 商品清单 */
.order-item-row {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f3f4f6;
}

.order-item-row.last-item {
  border-bottom: none;
  padding-bottom: 0;
}

.item-img,
.item-img-placeholder {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  background: #f9fafb;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
  line-height: 1.4;
}

.item-meta {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-bottom: 6rpx;
}

.item-price {
  font-size: 28rpx;
  color: #e11d48;
  font-weight: 600;
}

.item-qty {
  font-size: 26rpx;
  color: #6b7280;
}

.item-remark {
  font-size: 24rpx;
  color: #9ca3af;
  display: block;
}

/* 联系公司付款 */
.wechat-section {
  text-align: center;
  border: 2rpx dashed #e5e7eb;
  background: #fafbfc;
}

.wechat-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12rpx;
}

.wechat-desc {
  font-size: 26rpx;
  color: #6b7280;
  display: block;
  margin-bottom: 28rpx;
  line-height: 1.5;
}

.wechat-qr-wrap {
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  display: inline-block;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.wechat-qr {
  width: 320rpx;
  height: 320rpx;
  display: block;
}

.footer-spacer {
  height: 40rpx;
}

.footer-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #e5e7eb;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.share-btn {
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 16rpx;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.35);
}

.share-btn::after {
  border: none;
}
</style>

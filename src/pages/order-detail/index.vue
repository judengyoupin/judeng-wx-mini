<template>
  <view class="order-detail-page">
    <view v-if="loading" class="skeleton-area">
      <SkeletonScreen type="detail" />
    </view>
    <view v-else-if="!order" class="empty-state">
      <view class="empty-icon">📋</view>
      <text class="empty-text">订单不存在或已失效</text>
    </view>
    <scroll-view v-else scroll-y class="scroll-view-wrap">
      <view class="scroll-content">
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
        <view class="order-meta">
          <text class="order-id">支付状态</text>
          <text class="order-id-num">{{ paymentStatusText }}</text>
        </view>
        <view class="order-amount-row">
          <text class="amount-label">总价</text>
          <text v-if="canViewPrice" class="amount">¥{{ order.total_price }}</text>
          <text v-else class="amount amount-hidden">--</text>
        </view>
        <view class="order-amount-row">
          <text class="amount-label">总金额</text>
          <text v-if="canViewPrice" class="amount">¥{{ order.total_amount }}</text>
          <text v-else class="amount amount-hidden">--</text>
        </view>
        <view class="order-amount-row order-amount-row--actual">
          <text class="amount-label">实收</text>
          <text class="amount">¥{{ order.actual_amount != null ? order.actual_amount : '--' }}</text>
          <text
            v-if="isAdminView && order.order_status !== 'completed'"
            class="amount-edit-link"
            @click.stop="openEditActualModal"
          >修改</text>
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

      <!-- 管理员视角：下单用户是否可看价、订单价格系数（便于报价） -->
      <view class="section card admin-price-info" v-if="isAdminView">
        <view class="section-head">
          <text class="section-dot"></text>
          <text class="section-title">报价参考</text>
        </view>
        <view class="admin-info-rows">
          <view class="admin-info-row">
            <text class="admin-info-label">下单用户是否可看价</text>
            <text class="admin-info-value">{{ orderUserCanViewPrice === true ? '是' : orderUserCanViewPrice === false ? '否' : '--' }}</text>
          </view>
          <view class="admin-info-row">
            <text class="admin-info-label">订单价格系数</text>
            <text class="admin-info-value">{{ orderPriceFactor != null ? String(orderPriceFactor) : '--' }}</text>
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
        <view
          v-for="(item, idx) in order.order_items"
          :key="item.id"
          class="order-item-row order-item-row--clickable"
          :class="{ 'last-item': idx === order.order_items.length - 1 }"
          hover-class="order-item-row--hover"
          @click="goToProductDetail(item)"
        >
          <image v-if="item.product_image_url" :src="item.product_image_url" class="item-img" mode="aspectFill" />
          <view class="item-img-placeholder" v-else></view>
          <view class="item-info">
            <text class="item-name">{{ item.product_name }}</text>
            <view class="item-meta">
              <text v-if="canViewPrice" class="item-price">¥{{ item.product_price }}</text>
              <text v-else class="item-price item-price-hidden">--</text>
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
      </view>
      <view class="footer-actions" :class="{ 'footer-actions-admin': isAdminView }">
        <template v-if="isAdminView">
          <button
            v-if="order.order_status === 'pending'"
            class="action-btn confirm"
            :disabled="actionLoading"
            @click="confirmOrder"
          >
            {{ actionLoading ? '处理中...' : '确认订单' }}
          </button>
          <button
            v-if="order.payment_status === 'pending'"
            class="action-btn approve"
            :disabled="actionLoading"
            @click="approvePayment"
          >
            {{ actionLoading ? '处理中...' : '确认收款' }}
          </button>
          <button
            v-if="order.payment_status === 'approved' && order.order_status === 'confirmed'"
            class="action-btn archive"
            :disabled="actionLoading"
            @click="archiveOrder"
          >
            {{ actionLoading ? '处理中...' : '归档' }}
          </button>
        </template>
        <button v-if="!isAdminView || !showAnyAdminAction" class="share-btn" open-type="share">分享订单</button>
      </view>
    </scroll-view>

    <!-- 确认收款弹窗：设置实际收款金额 -->
    <view v-if="showApproveModal" class="approve-modal-mask" @click.stop="closeApproveModal">
      <view class="approve-modal" @click.stop>
        <view class="approve-modal-title">确认收款</view>
        <view class="approve-modal-row">
          <text class="approve-modal-label">订单金额</text>
          <text class="approve-modal-value">¥{{ order?.total_amount ?? '--' }}</text>
        </view>
        <view class="approve-modal-row">
          <text class="approve-modal-label">实际收款金额</text>
          <input
            class="approve-modal-input"
            type="digit"
            placeholder="请输入实际收款金额"
            :value="approveActualAmount"
            @input="onApproveAmountInput"
          />
        </view>
        <view class="approve-modal-btns">
          <button class="approve-modal-btn cancel" @click="closeApproveModal">取消</button>
          <button class="approve-modal-btn confirm" :disabled="!approveAmountValid" @click="submitApprovePayment">确定</button>
        </view>
      </view>
    </view>

    <!-- 修改实际收款金额弹窗（管理员、订单未完成时） -->
    <view v-if="showEditActualModal" class="approve-modal-mask" @click.stop="closeEditActualModal">
      <view class="approve-modal" @click.stop>
        <view class="approve-modal-title">修改实际收款金额</view>
        <view class="approve-modal-row">
          <text class="approve-modal-label">订单金额</text>
          <text class="approve-modal-value">¥{{ order?.total_amount ?? '--' }}</text>
        </view>
        <view class="approve-modal-row">
          <text class="approve-modal-label">实际收款金额</text>
          <input
            class="approve-modal-input"
            type="digit"
            placeholder="请输入实际收款金额"
            :value="editActualAmount"
            @input="onEditActualAmountInput"
          />
        </view>
        <view class="approve-modal-btns">
          <button class="approve-modal-btn cancel" @click="closeEditActualModal">取消</button>
          <button class="approve-modal-btn confirm" :disabled="!editActualAmountValid" @click="submitEditActualAmount">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { getOrderDetailById, getOrderUserCompanyInfo, confirmOrder as apiConfirmOrder, approvePayment as apiApprovePayment, completeOrder as apiCompleteOrder, updateOrderActualAmount } from '@/api/order/index';
import { getCompanyUserRoleCached, isCompanyAdmin } from '@/utils/auth';
import SkeletonScreen from '@/components/SkeletonScreen.vue';

const orderId = ref<number | null>(null);
const order = ref<any>(null);
const loading = ref(true);
const canViewPrice = ref(false);
const isAdminView = ref(false);
const orderUserCanViewPrice = ref<boolean | null>(null);
const orderPriceFactor = ref<number | null>(null);
const actionLoading = ref(false);
const showApproveModal = ref(false);
const approveActualAmount = ref('');
const showEditActualModal = ref(false);
const editActualAmount = ref('');

const orderStatusText = computed(() => {
  const s = order.value?.order_status;
  if (s === 'pending') return '待确认';
  if (s === 'confirmed') return '已确认';
  if (s === 'completed') return '已完成';
  return s || '--';
});

const paymentStatusText = computed(() => {
  const p = order.value?.payment_status;
  if (p === 'pending') return '待支付';
  if (p === 'approved') return '已支付';
  return p || '--';
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

/** 实际收款金额是否有效（数字且 >= 0） */
const approveAmountValid = computed(() => {
  const v = parseFloat(approveActualAmount.value);
  return !Number.isNaN(v) && v >= 0;
});

const editActualAmountValid = computed(() => {
  const v = parseFloat(editActualAmount.value);
  return !Number.isNaN(v) && v >= 0;
});

/** 管理员视角下是否有任一操作按钮（无则显示分享订单），与公司端订单列表逻辑一致 */
const showAnyAdminAction = computed(() => {
  const o = order.value;
  if (!o) return false;
  return (
    o.order_status === 'pending' ||
    o.payment_status === 'pending' ||
    (o.payment_status === 'approved' && o.order_status === 'confirmed')
  );
});

/** 快捷拨打 */
function callPhone(phone: string) {
  const num = String(phone || '').trim();
  if (!num) return;
  uni.makePhoneCall({ phoneNumber: num });
}

function goToProductDetail(item: any) {
  const productId = item?.product_sku?.product_products ?? item?.product_sku_product_skus;
  if (productId != null) {
    uni.navigateTo({ url: `/pages/product-detail/index?id=${productId}` });
  }
}

onLoad((options?: { id?: string }) => {
  if (options?.id) orderId.value = Number(options.id);
});

async function loadOrderUserPriceInfo() {
  const o = order.value;
  if (!o?.user?.id || !o?.company?.id) return;
  try {
    const info = await getOrderUserCompanyInfo(Number(o.user.id), Number(o.company.id));
    orderUserCanViewPrice.value = info?.can_view_price ?? null;
    orderPriceFactor.value = info?.price_factor ?? (o.price_factor != null ? Number(o.price_factor) : null);
  } catch {
    orderUserCanViewPrice.value = null;
    orderPriceFactor.value = order.value?.price_factor != null ? Number(order.value.price_factor) : null;
  }
}

onMounted(async () => {
  if (!orderId.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const [orderRes, roleInfo] = await Promise.all([
      getOrderDetailById(orderId.value),
      getCompanyUserRoleCached().then((r) => r ?? null),
    ]);
    order.value = orderRes;
    const companyId = orderRes?.company?.id;
    const admin = companyId ? await isCompanyAdmin(Number(companyId)) : false;
    isAdminView.value = !!admin;
    canViewPrice.value = admin || (roleInfo?.canViewPrice ?? false);
    if (isAdminView.value) {
      await loadOrderUserPriceInfo();
      if (orderPriceFactor.value == null && order.value?.price_factor != null) {
        orderPriceFactor.value = Number(order.value.price_factor);
      }
    }
  } catch (e) {
    order.value = null;
  } finally {
    loading.value = false;
  }
});

async function confirmOrder() {
  if (!orderId.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await apiConfirmOrder(orderId.value);
    uni.showToast({ title: '订单已确认', icon: 'success' });
    const res = await getOrderDetailById(orderId.value);
    order.value = res;
    await loadOrderUserPriceInfo();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  } finally {
    actionLoading.value = false;
  }
}

function openApproveModal() {
  const total = order.value?.total_amount;
  approveActualAmount.value = total != null ? String(total) : '';
  showApproveModal.value = true;
}

function closeApproveModal() {
  showApproveModal.value = false;
  approveActualAmount.value = '';
}

function openEditActualModal() {
  const o = order.value;
  editActualAmount.value = o?.actual_amount != null ? String(o.actual_amount) : (o?.total_amount != null ? String(o.total_amount) : '');
  showEditActualModal.value = true;
}

function closeEditActualModal() {
  showEditActualModal.value = false;
  editActualAmount.value = '';
}

function onEditActualAmountInput(e: any) {
  const val = (e.detail?.value ?? '') as string;
  const filtered = val.replace(/[^\d.]/g, '').replace(/^(\d*\.)(\d*)\./g, '$1$2');
  editActualAmount.value = filtered;
}

async function submitEditActualAmount() {
  if (!orderId.value || actionLoading.value) return;
  const v = parseFloat(editActualAmount.value);
  if (Number.isNaN(v) || v < 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }
  closeEditActualModal();
  actionLoading.value = true;
  try {
    await updateOrderActualAmount(orderId.value, v);
    uni.showToast({ title: '已更新', icon: 'success' });
    const res = await getOrderDetailById(orderId.value);
    order.value = res;
    await loadOrderUserPriceInfo();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  } finally {
    actionLoading.value = false;
  }
}

function onApproveAmountInput(e: any) {
  const val = (e.detail?.value ?? '') as string;
  const filtered = val.replace(/[^\d.]/g, '').replace(/^(\d*\.)(\d*)\./g, '$1$2');
  approveActualAmount.value = filtered;
}

async function submitApprovePayment() {
  if (!orderId.value || actionLoading.value) return;
  const v = parseFloat(approveActualAmount.value);
  if (Number.isNaN(v) || v < 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }
  closeApproveModal();
  actionLoading.value = true;
  try {
    await apiApprovePayment(orderId.value, false, v);
    uni.showToast({ title: '已确认收款', icon: 'success' });
    const res = await getOrderDetailById(orderId.value);
    order.value = res;
    await loadOrderUserPriceInfo();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  } finally {
    actionLoading.value = false;
  }
}

async function approvePayment() {
  if (!orderId.value || actionLoading.value) return;
  openApproveModal();
}

async function archiveOrder() {
  if (!orderId.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await apiCompleteOrder(orderId.value);
    uni.showToast({ title: '已归档', icon: 'success' });
    const res = await getOrderDetailById(orderId.value);
    order.value = res;
    await loadOrderUserPriceInfo();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
  } finally {
    actionLoading.value = false;
  }
}

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

.scroll-view-wrap {
  box-sizing: border-box;
}

.scroll-content {
  width: 100%;
  max-width: 718rpx;
  margin: 0 auto;
  padding: 16rpx;
  padding-top: 16rpx;
  box-sizing: border-box;
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

.order-amount-row--actual {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.order-amount-row--actual .amount {
  flex: 1;
}

.amount-edit-link {
  font-size: 26rpx;
  color: #1890ff;
  padding: 8rpx 16rpx;
  margin-left: auto;
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

.order-item-row--clickable {
  cursor: pointer;
}

.order-item-row--hover {
  background: #f8fafc;
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

/* 管理员报价参考 */
.admin-price-info .admin-info-rows {
  padding-left: 4rpx;
}

.admin-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f3f4f6;
}

.admin-info-row:last-child {
  border-bottom: none;
}

.admin-info-label {
  font-size: 26rpx;
  color: #6b7280;
}

.admin-info-value {
  font-size: 28rpx;
  color: #1f2937;
  font-weight: 500;
}

/* 管理员操作区 */
.footer-actions-admin {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.footer-actions-admin .action-btn {
  flex: 1;
  min-width: 180rpx;
  height: 92rpx;
  line-height: 92rpx;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 16rpx;
  border: none;
}

.footer-actions-admin .action-btn::after {
  border: none;
}

.footer-actions-admin .action-btn.confirm {
  background: #52c41a;
  color: #fff;
}

.footer-actions-admin .action-btn.approve {
  background: #1890ff;
  color: #fff;
}

.footer-actions-admin .action-btn.archive {
  background: #52c41a;
  color: #fff;
}

.footer-actions-admin .action-btn[disabled] {
  opacity: 0.7;
}

/* 确认收款弹窗 */
.approve-modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.approve-modal {
  width: 100%;
  max-width: 560rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
}

.approve-modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 32rpx;
  text-align: center;
}

.approve-modal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.approve-modal-label {
  font-size: 28rpx;
  color: #6b7280;
}

.approve-modal-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.approve-modal-input {
  flex: 1;
  margin-left: 24rpx;
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  text-align: right;
}

.approve-modal-btns {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}

.approve-modal-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  border-radius: 16rpx;
  border: none;
}

.approve-modal-btn::after {
  border: none;
}

.approve-modal-btn.cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.approve-modal-btn.confirm {
  background: #1890ff;
  color: #fff;
}

.approve-modal-btn.confirm[disabled] {
  opacity: 0.6;
}
</style>

<template>
  <view class="order-page">
    <PageNavBar title="确认订单" :show-back="true" @back="goBack" />

    <view v-if="loading && !orderItems.length" class="skeleton-area">
      <SkeletonScreen type="list-row" :count="3" />
    </view>

    <template v-else-if="orderItems.length > 0">
      <!-- 收货地址 -->
      <view class="section address-section" @click="chooseAddress">
        <view v-if="selectedAddress" class="address-content">
          <view class="address-row">
            <text class="receiver-name">{{ selectedAddress.receiver_name }}</text>
            <text class="receiver-phone">{{ selectedAddress.receiver_phone }}</text>
          </view>
          <text class="receiver-address">{{ selectedAddress.receiver_address }}</text>
        </view>
        <view v-else class="address-placeholder">
          <text class="placeholder-text">请选择收货地址</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <!-- 商品清单（每项可填子订单备注） -->
      <view class="section goods-section">
        <view class="section-title">商品清单</view>
        <view v-for="item in orderItems" :key="item.id" class="goods-item-wrap">
          <view class="goods-item">
            <image
              class="goods-image"
              :src="item.product_sku?.product?.cover_image_url || item.product_sku?.image_url || '/static/default.png'"
              mode="aspectFill"
            />
            <view class="goods-info">
              <view class="goods-name">{{ item.product_sku?.product?.name || '商品' }}</view>
              <view class="goods-spec">{{ item.product_sku?.name || '规格' }}</view>
              <view class="goods-row">
                <text class="goods-price">¥{{ formatPrice((item.product_sku?.price || 0) * priceFactor) }}</text>
                <text class="goods-quantity">x{{ item.quantity }}</text>
              </view>
            </view>
          </view>
          <input
            class="item-remark-input"
            v-model="itemRemarks[item.id]"
            placeholder="选填：该规格的备注"
            placeholder-class="item-remark-placeholder"
            maxlength="100"
          />
        </view>
      </view>

      <!-- 备注 -->
      <view class="section remark-section">
        <view class="remark-label">订单备注</view>
        <input
          class="remark-input"
          v-model="remark"
          placeholder="选填，如配送时间等"
          placeholder-class="remark-placeholder"
        />
      </view>

      <!-- 底部合计与提交 -->
      <view class="footer-bar">
        <view class="footer-total">
          <text class="total-label">合计：</text>
          <text class="total-price">¥{{ formatPrice(totalAmount) }}</text>
        </view>
        <button
          class="submit-btn"
          :class="{ disabled: !selectedAddress || submitting }"
          :loading="submitting"
          @click="submitOrder"
        >
          {{ submitting ? '提交中...' : '提交订单' }}
        </button>
      </view>
    </template>

    <view v-else class="empty-wrap">
      <text class="empty-text">暂无商品，请返回购物车选择</text>
      <button class="back-btn" @click="goBack">返回购物车</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import PageNavBar from '@/components/PageNavBar.vue';
import SkeletonScreen from '@/components/SkeletonScreen.vue';
import { userInfo, user_token, companyInfo } from '@/store/userStore';
import { getCartList, deleteCartItems } from '@/api/cart/index';
import { getAddressList, type AddressItem } from '@/api/address/index';
import { createOrder } from '@/api/order/index';
import { getCompanyUserRole } from '@/utils/auth';

const cartIds = ref<number[]>([]);
const orderItems = ref<any[]>([]);
const loading = ref(true);
const priceFactor = ref(1);
const addressList = ref<AddressItem[]>([]);
const selectedAddress = ref<AddressItem | null>(null);
const remark = ref('');
const submitting = ref(false);
/** 每个购物车项 id -> 该项的子订单备注 */
const itemRemarks = ref<Record<number, string>>({});

const totalAmount = computed(() => {
  return orderItems.value.reduce((sum, item) => {
    const base = item.product_sku?.price || 0;
    return sum + base * priceFactor.value * item.quantity;
  }, 0);
});

const totalPriceRaw = computed(() => {
  return orderItems.value.reduce((sum, item) => {
    const base = item.product_sku?.price || 0;
    return sum + base * item.quantity;
  }, 0);
});

function formatPrice(p: number) {
  return Number(p).toFixed(2);
}

function goBack() {
  uni.navigateBack();
}

async function loadPriceFactor() {
  if (!user_token.value || !userInfo.value?.id) return;
  try {
    const roleInfo = await getCompanyUserRole();
    priceFactor.value = roleInfo?.priceFactor ?? 1;
  } catch {
    priceFactor.value = 1;
  }
}

async function loadCartAndFilter() {
  if (!user_token.value || !userInfo.value?.id || !companyInfo.value?.id) {
    orderItems.value = [];
    return;
  }
  loading.value = true;
  try {
    await loadPriceFactor();
    const list = await getCartList();
    const idSet = new Set(cartIds.value);
    orderItems.value = list.filter((item: any) => idSet.has(item.id));
    const next: Record<number, string> = {};
    orderItems.value.forEach((item: any) => {
      next[item.id] = itemRemarks.value[item.id] ?? '';
    });
    itemRemarks.value = next;
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' });
    orderItems.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadAddressList() {
  const userId = userInfo.value?.id;
  if (!userId || !user_token.value) return;
  const prevSelectedId = selectedAddress.value?.id;
  try {
    addressList.value = await getAddressList(userId);
    // 从地址列表返回时保留已选地址；仅在没有选中或选中项已不在列表中时用默认/第一项
    const stillInList = prevSelectedId && addressList.value.some((a) => a.id === prevSelectedId);
    if (stillInList) {
      selectedAddress.value = addressList.value.find((a) => a.id === prevSelectedId) || selectedAddress.value;
    } else {
      const defaultAddr = addressList.value.find((a) => a.is_default);
      selectedAddress.value = defaultAddr || addressList.value[0] || null;
    }
  } catch {
    addressList.value = [];
    if (!prevSelectedId) selectedAddress.value = null;
  }
}

function chooseAddress() {
  uni.navigateTo({ url: '/pages/address-list/index?select=1' });
}

async function submitOrder() {
  if (!selectedAddress.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' });
    return;
  }
  if (orderItems.value.length === 0) {
    uni.showToast({ title: '商品列表为空', icon: 'none' });
    return;
  }
  const userId = userInfo.value?.id;
  const companyId = companyInfo.value?.id;
  if (!userId || !companyId) {
    uni.showToast({ title: '请先登录并选择公司', icon: 'none' });
    return;
  }

  // 提交前校验库存，不足时提示并阻止提交
  for (const item of orderItems.value) {
    const stock = Number(item.product_sku?.stock ?? 0);
    const need = Number(item.quantity ?? 0);
    if (need > 0 && stock < need) {
      const name = item.product_sku?.product?.name || item.product_sku?.name || '商品';
      const spec = item.product_sku?.name ? `（${item.product_sku.name}）` : '';
      uni.showToast({
        title: `${name}${spec} 库存不足，当前库存 ${stock}`,
        icon: 'none',
        duration: 2500,
      });
      return;
    }
  }

  submitting.value = true;
  try {
    const items = orderItems.value.map((item) => ({
      product_sku_product_skus: item.product_sku.id,
      product_name: item.product_sku?.product?.name || item.product_sku?.name || '商品',
      product_image_url: item.product_sku?.image_url || item.product_sku?.product?.cover_image_url || null,
      product_price: Number(item.product_sku?.price || 0),
      quantity: item.quantity,
      remark: (itemRemarks.value[item.id] || '').trim() || null,
    }));

    const totalPrice = totalPriceRaw.value;
    const totalAmountVal = totalPrice * priceFactor.value;

    const order = await createOrder({
      userId,
      companyId,
      receiver_name: selectedAddress.value.receiver_name,
      receiver_phone: selectedAddress.value.receiver_phone,
      receiver_address: selectedAddress.value.receiver_address,
      receiver_province: selectedAddress.value.receiver_province ?? null,
      receiver_city: selectedAddress.value.receiver_city ?? null,
      receiver_district: selectedAddress.value.receiver_district ?? null,
      price_factor: priceFactor.value,
      total_price: totalPrice,
      total_amount: totalAmountVal,
      remark: remark.value.trim() || null,
      items,
    });

    if (order?.id) {
      try {
        await deleteCartItems(cartIds.value);
      } catch (_) {}
      uni.redirectTo({
        url: `/pages/order-success/index?orderId=${order.id}`,
      });
    } else {
      uni.showToast({ title: '提交失败', icon: 'none' });
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

onLoad((options: any) => {
  const ids = options?.cartIds;
  if (ids && typeof ids === 'string') {
    cartIds.value = ids.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n) && n > 0);
  } else {
    cartIds.value = [];
  }
});

onMounted(async () => {
  await loadAddressList();
  await loadCartAndFilter();
});

onShow(() => {
  loadAddressList();
});

function onAddressSelected(addr: AddressItem) {
  selectedAddress.value = addr;
}

defineExpose({ onAddressSelected });
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 140rpx;
}

.skeleton-area {
  padding: 20rpx;
}

.empty-wrap {
  padding: 80rpx 40rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.empty-text {
  display: block;
  margin-bottom: 32rpx;
}

.back-btn {
  padding: 16rpx 48rpx;
  background: #667eea;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.section {
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}

.address-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.address-content {
  flex: 1;
  min-width: 0;
}

.address-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.receiver-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.receiver-phone {
  font-size: 28rpx;
  color: #666;
}

.receiver-address {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.address-placeholder .placeholder-text {
  font-size: 28rpx;
  color: #999;
}

.arrow {
  font-size: 36rpx;
  color: #999;
  margin-left: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.goods-item-wrap {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.goods-item-wrap:last-child {
  border-bottom: none;
}

.goods-item {
  display: flex;
  gap: 20rpx;
}

.item-remark-input {
  margin-top: 16rpx;
  width: 100%;
  height: 64rpx;
  padding: 0 20rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
}

.item-remark-placeholder {
  color: #999;
}

.goods-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
  flex-shrink: 0;
}

.goods-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.goods-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-spec {
  font-size: 24rpx;
  color: #999;
}

.goods-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goods-price {
  font-size: 30rpx;
  font-weight: 600;
  color: #ff6b6b;
}

.goods-quantity {
  font-size: 26rpx;
  color: #666;
}

.remark-section {
  margin-top: 20rpx;
}

.remark-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.remark-input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.remark-placeholder {
  color: #999;
}

.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-total {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 28rpx;
  color: #666;
}

.total-price {
  font-size: 36rpx;
  font-weight: 700;
  color: #ff6b6b;
}

.submit-btn {
  padding: 24rpx 48rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 40rpx;
  font-size: 30rpx;
  border: none;
}

.submit-btn.disabled {
  background: #ccc;
  color: #fff;
}
</style>

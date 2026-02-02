<template>
  <view class="package-detail-page">
    <!-- 统一导航栏（含状态栏高度） -->
    <PageNavBar :title="navTitle" :show-back="true" @back="goBack" />

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>

    <!-- 套餐详情 -->
    <scroll-view v-else scroll-y class="scroll-content">
      <!-- 套餐封面 -->
      <image
        class="package-cover"
        :src="packageDetail?.cover_image_url || '/static/default.png'"
        mode="aspectFill"
      ></image>

      <!-- 套餐信息 -->
      <view class="package-info-section">
        <view class="package-name">{{ packageDetail?.name || '' }}</view>
        <view v-if="packageDetail?.description" class="package-description">
          {{ packageDetail.description }}
        </view>
      </view>

      <!-- 包含商品 -->
      <view class="products-section">
        <view class="section-title">包含商品</view>
        <view
          v-for="(item, index) in packageDetail?.package_product_skus || []"
          :key="item.id || index"
          class="product-item"
          @click="goToProductDetail(item.product_sku?.product?.id)"
        >
          <image
            class="product-image"
            :src="item.product_sku?.image_url || item.product_sku?.product?.cover_image_url || '/static/default.png'"
            mode="aspectFill"
          ></image>
          <view class="product-info">
            <view class="product-name">{{ item.product_sku?.product?.name || '商品' }}</view>
            <view class="product-spec">{{ item.product_sku?.name || '规格' }}</view>
            <view class="product-price-row">
              <text class="product-price">¥{{ formatPrice((item.product_sku?.price || 0) * priceFactor) }}</text>
              <text class="product-quantity">×{{ item.quantity }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="footer-placeholder"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer-bar">
      <view class="total-price">
        <text class="total-label">套餐总价：</text>
        <text class="total-amount">¥{{ formatPrice(totalPackagePrice) }}</text>
      </view>
      <button class="add-to-cart-btn" @click="handleAddToCart">加入购物车</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getPackageDetail } from '@/api/package/index';
import { addToCart } from '@/api/cart/index';
import { user_token, userInfo, companyInfo } from '@/store/userStore';
import { getCompanyUserRole } from '@/utils/auth';

const packageId = ref<number | null>(null);
const packageDetail = ref<any>(null);
const loading = ref(false);
const priceFactor = ref(1); // 价格系数，默认为1

// 计算套餐总价（应用价格系数）
const navTitle = computed(() => {
  const name = companyInfo.value?.name;
  return name ? `${name} - 套餐详情` : '套餐详情';
});

const totalPackagePrice = computed(() => {
  if (!packageDetail.value?.package_product_skus) {
    return 0;
  }
  return packageDetail.value.package_product_skus.reduce((sum: number, item: any) => {
    const basePrice = item.product_sku?.price || 0;
    return sum + basePrice * priceFactor.value * item.quantity;
  }, 0);
});

// 加载价格系数
const loadPriceFactor = async () => {
  if (!user_token.value || !userInfo.value?.id) {
    priceFactor.value = 1;
    return;
  }

  try {
    const roleInfo = await getCompanyUserRole();
    if (roleInfo) {
      priceFactor.value = roleInfo.priceFactor || 1;
    } else {
      priceFactor.value = 1;
    }
  } catch (error) {
    console.error('加载价格系数失败:', error);
    priceFactor.value = 1;
  }
};

// 加载套餐详情
const loadPackageDetail = async () => {
  if (!packageId.value) return;

  loading.value = true;

  try {
    // 先加载价格系数
    await loadPriceFactor();
    
    const detail = await getPackageDetail(packageId.value);
    packageDetail.value = detail;
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

// 加入购物车
const handleAddToCart = async () => {
  if (!user_token.value) {
    uni.showToast({
      title: '请先登录',
      icon: 'none',
    });
    setTimeout(() => {
      uni.navigateTo({
        url: '/pages/login/index',
      });
    }, 1500);
    return;
  }

  if (!packageDetail.value?.package_product_skus || packageDetail.value.package_product_skus.length === 0) {
    uni.showToast({
      title: '套餐暂无商品',
      icon: 'none',
    });
    return;
  }

  try {
    // 将套餐中的所有SKU加入购物车
    const promises = packageDetail.value.package_product_skus.map((item: any) => {
      return addToCart({
        skuId: item.product_sku.id,
        quantity: item.quantity,
      });
    });

    await Promise.all(promises);

    uni.showToast({
      title: '已加入购物车',
      icon: 'success',
    });
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加入购物车失败',
      icon: 'none',
    });
  }
};

// 跳转到商品详情
const goToProductDetail = (productId?: number) => {
  if (productId) {
    uni.navigateTo({
      url: `/pages/product-detail/index?id=${productId}`,
    });
  }
};

// 返回
const goBack = () => {
  uni.navigateBack();
};

// 格式化价格
// 注意：根据schema，price字段是numeric类型，存储的是实际价格（不是分）
const formatPrice = (price: number) => {
  return Number(price).toFixed(2);
};

onLoad((options) => {
  if (options.id) {
    packageId.value = Number(options.id);
    loadPackageDetail();
  }
});
</script>

<style scoped>
.package-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 内容区高度：扣除底部占位，导航栏由 PageNavBar 占位 */
.scroll-content {
  height: calc(100vh - 120rpx);
  min-height: 0;
}

.loading-container {
  padding: 200rpx 0;
  text-align: center;
  color: #999999;
  font-size: 28rpx;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.package-cover {
  width: 100%;
  height: 500rpx;
  background: #f0f0f0;
}

.package-info-section {
  background: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.package-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
}

.package-description {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}

.products-section {
  background: #ffffff;
  padding: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 24rpx;
}

.product-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.product-item:last-child {
  border-bottom: none;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
  margin-bottom: 8rpx;
}

.product-spec {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 12rpx;
}

.product-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.product-quantity {
  font-size: 24rpx;
  color: #999999;
}

.footer-placeholder {
  height: 120rpx;
}

.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background: #ffffff;
  border-top: 1rpx solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  z-index: 1000;
}

.total-price {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 28rpx;
  color: #666666;
}

.total-amount {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.add-to-cart-btn {
  padding: 20rpx 40rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 50rpx;
  font-size: 28rpx;
  border: none;
}
</style>

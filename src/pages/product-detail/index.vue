<template>
  <view class="product-detail-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-back" @click="goBack">‹</view>
        <view class="navbar-title">商品详情</view>
        <view class="navbar-right"></view>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>

    <!-- 商品详情 -->
    <scroll-view v-else-if="productDetail" scroll-y class="scroll-content">
      <!-- 商品轮播图 -->
      <view class="swiper-section">
        <swiper
          class="product-swiper"
          circular
          :indicator-dots="true"
          :autoplay="true"
          :interval="3000"
          :duration="500"
          indicator-color="rgba(255, 255, 255, 0.3)"
          indicator-active-color="#ffffff"
        >
          <!-- 封面图 -->
          <swiper-item v-if="productDetail.cover_image_url">
            <image
              class="swiper-image"
              :src="productDetail.cover_image_url"
              mode="aspectFill"
              @click="previewImages([productDetail.cover_image_url], 0)"
            ></image>
          </swiper-item>
          <!-- 详细信息媒体 -->
          <swiper-item
            v-for="(media, index) in detailImages"
            :key="`detail-${index}`"
          >
            <image
              class="swiper-image"
              :src="media.file_url"
              mode="aspectFill"
              @click="previewImages(detailImageUrls, index + (productDetail.cover_image_url ? 1 : 0))"
            ></image>
          </swiper-item>
        </swiper>
      </view>

      <!-- 商品基本信息 -->
      <view class="product-info-section">
        <view class="product-name">{{ productDetail.name }}</view>
        <view v-if="canViewPrice && minPrice" class="product-price">
          <text class="price-label">价格：</text>
          <text class="price-value">¥{{ formatPrice(minPrice) }}</text>
          <text v-if="hasMultiplePrices" class="price-range">起</text>
        </view>
        <view v-else-if="!user_token" class="price-tip">
          <text>登录后查看价格</text>
        </view>
        <view v-else class="price-tip">
          <text>请联系管理员授权查看价格</text>
        </view>
      </view>

      <!-- 商品介绍 -->
      <view v-if="productDetail.description" class="description-section">
        <view class="section-title">商品介绍</view>
        <view class="description-content">
          <rich-text :nodes="productDetail.description"></rich-text>
        </view>
      </view>

      <!-- 商品视频 -->
      <view v-if="productDetail.video_url" class="video-section">
        <view class="section-title">商品视频</view>
        <video
          class="product-video"
          :src="productDetail.video_url"
          controls
          :show-center-play-btn="true"
        ></video>
      </view>

      <!-- 规格选择 -->
      <view v-if="skus.length > 0" class="sku-section">
        <view class="section-title">选择规格</view>
        <view class="sku-list">
          <view
            v-for="(sku, index) in skus"
            :key="sku.id"
            class="sku-item"
            :class="{ selected: selectedSkuIds.includes(sku.id), disabled: sku.stock <= 0 }"
            @click="toggleSku(sku)"
          >
            <view class="sku-checkbox" :class="{ checked: selectedSkuIds.includes(sku.id) }">
              <text v-if="selectedSkuIds.includes(sku.id)">✓</text>
            </view>
            <image
              v-if="sku.image_url"
              class="sku-image"
              :src="sku.image_url"
              mode="aspectFill"
            ></image>
            <view class="sku-info">
              <view class="sku-name">{{ sku.name }}</view>
              <view class="sku-meta">
                <text v-if="canViewPrice" class="sku-price">¥{{ formatPrice(sku.price) }}</text>
                <text class="sku-stock" :class="{ 'stock-zero': sku.stock <= 0 }">
                  {{ sku.stock > 0 ? `库存: ${sku.stock}` : '缺货' }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 详细信息媒体 -->
      <view v-if="detailImages.length > 0" class="detail-media-section">
        <view class="section-title">详细信息</view>
        <view class="detail-images">
          <image
            v-for="(media, index) in detailImages"
            :key="`detail-img-${index}`"
            class="detail-image"
            :src="media.file_url"
            mode="widthFix"
            @click="previewImages(detailImageUrls, index)"
          ></image>
        </view>
      </view>

      <!-- 实拍场景媒体 -->
      <view v-if="sceneImages.length > 0" class="scene-media-section">
        <view class="section-title">实拍场景</view>
        <view class="scene-images">
          <image
            v-for="(media, index) in sceneImages"
            :key="`scene-img-${index}`"
            class="scene-image"
            :src="media.file_url"
            mode="aspectFill"
            @click="previewImages(sceneImageUrls, index)"
          ></image>
        </view>
      </view>

      <!-- 底部占位 -->
      <view class="footer-placeholder"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="footer-bar">
      <view class="footer-left">
        <view class="icon-btn" @click="goHome">
          <text class="icon-text">🏠</text>
          <text class="icon-label">首页</text>
        </view>
        <view class="icon-btn" @click="goCart">
          <text class="icon-text">🛒</text>
          <text class="icon-label">购物车</text>
        </view>
      </view>
      <button
        class="add-to-cart-btn"
        :class="{ disabled: selectedSkuIds.length === 0 || !canAddToCart }"
        @click="handleAddToCart"
      >
        {{ selectedSkuIds.length > 0 ? `加入购物车(${selectedSkuIds.length})` : '选择规格' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getProductDetail } from '@/api/product/index';
import { addToCart } from '@/api/cart/index';
import { user_token, userInfo, companyInfo } from '@/store/userStore';
import { isCompanyUser } from '@/utils/auth';

const productId = ref<number | null>(null);
const productDetail = ref<any>(null);
const loading = ref(false);
const selectedSkuIds = ref<number[]>([]);

// 计算属性
const skus = computed(() => {
  return productDetail.value?.product_skus || [];
});

const detailImages = computed(() => {
  if (!productDetail.value?.detail_medias) return [];
  return productDetail.value.detail_medias.filter((m: any) => m.file_type === 'image');
});

const sceneImages = computed(() => {
  if (!productDetail.value?.scene_medias) return [];
  return productDetail.value.scene_medias.filter((m: any) => m.file_type === 'image');
});

const detailImageUrls = computed(() => {
  const urls: string[] = [];
  if (productDetail.value?.cover_image_url) {
    urls.push(productDetail.value.cover_image_url);
  }
  detailImages.value.forEach((img: any) => {
    if (img.file_url) urls.push(img.file_url);
  });
  return urls;
});

const sceneImageUrls = computed(() => {
  return sceneImages.value.map((img: any) => img.file_url).filter(Boolean);
});

const minPrice = computed(() => {
  if (!skus.value.length) return null;
  const prices = skus.value.map((sku: any) => sku.price || 0).filter(p => p > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
});

const hasMultiplePrices = computed(() => {
  if (!skus.value.length) return false;
  const prices = skus.value.map((sku: any) => sku.price || 0).filter(p => p > 0);
  return new Set(prices).size > 1;
});

const canViewPrice = ref(false);
const canAddToCart = ref(false);

// 检查权限
const checkPermissions = async () => {
  if (!user_token.value || !userInfo.value?.id) {
    canViewPrice.value = false;
    canAddToCart.value = false;
    return;
  }

  try {
    const isUser = await isCompanyUser();
    canViewPrice.value = isUser;
    canAddToCart.value = isUser;
  } catch (error) {
    console.error('检查权限失败:', error);
    canViewPrice.value = false;
    canAddToCart.value = false;
  }
};

// 加载商品详情
const loadProductDetail = async () => {
  if (!productId.value) return;

  loading.value = true;

  try {
    const detail = await getProductDetail(productId.value);
    productDetail.value = detail;
    
    // 检查权限
    await checkPermissions();
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加载失败',
      icon: 'none',
    });
  } finally {
    loading.value = false;
  }
};

// 切换SKU选择
const toggleSku = (sku: any) => {
  if (sku.stock <= 0) {
    uni.showToast({
      title: '该规格缺货',
      icon: 'none',
    });
    return;
  }

  const index = selectedSkuIds.value.indexOf(sku.id);
  if (index >= 0) {
    selectedSkuIds.value.splice(index, 1);
  } else {
    selectedSkuIds.value.push(sku.id);
  }
};

// 加入购物车
const handleAddToCart = async () => {
  if (selectedSkuIds.value.length === 0) {
    uni.showToast({
      title: '请选择规格',
      icon: 'none',
    });
    return;
  }

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

  if (!canAddToCart.value) {
    uni.showToast({
      title: '请联系管理员授权',
      icon: 'none',
    });
    return;
  }

  try {
    // 将选中的SKU加入购物车
    const promises = selectedSkuIds.value.map(skuId => {
      return addToCart({
        skuId,
        quantity: 1,
      });
    });

    await Promise.all(promises);

    uni.showToast({
      title: '已加入购物车',
      icon: 'success',
    });

    // 清空选择
    selectedSkuIds.value = [];
  } catch (error: any) {
    uni.showToast({
      title: error.message || '加入购物车失败',
      icon: 'none',
    });
  }
};

// 预览图片
const previewImages = (urls: string[], current: number) => {
  if (!urls || urls.length === 0) return;
  uni.previewImage({
    urls,
    current: current >= 0 ? current : 0,
    loop: true,
    indicator: 'number',
  });
};

// 返回
const goBack = () => {
  uni.navigateBack();
};

// 去首页
const goHome = () => {
  uni.switchTab({
    url: '/pages/index/index',
  });
};

// 去购物车
const goCart = () => {
  uni.switchTab({
    url: '/pages/cart/index',
  });
};

// 格式化价格
const formatPrice = (price: number) => {
  return Number(price).toFixed(2);
};

onLoad((options) => {
  if (options.id) {
    productId.value = Number(options.id);
    loadProductDetail();
  }
});
</script>

<style scoped>
.product-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  background: #ffffff;
  z-index: 1000;
  border-bottom: 1rpx solid #e0e0e0;
}

.navbar-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  padding-top: var(--status-bar-height, 0);
}

.navbar-back {
  font-size: 48rpx;
  color: #333333;
  width: 60rpx;
  text-align: left;
}

.navbar-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  flex: 1;
  text-align: center;
}

.navbar-right {
  width: 60rpx;
}

.scroll-content {
  margin-top: 88rpx;
  height: calc(100vh - 88rpx - 120rpx);
}

.loading-container {
  margin-top: 88rpx;
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

.swiper-section {
  background: #ffffff;
  margin-bottom: 20rpx;
}

.product-swiper {
  width: 100%;
  height: 750rpx;
}

.swiper-image {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
}

.product-info-section {
  background: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.product-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 20rpx;
  line-height: 1.5;
}

.product-price {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.price-label {
  font-size: 28rpx;
  color: #666666;
}

.price-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.price-range {
  font-size: 24rpx;
  color: #999999;
}

.price-tip {
  padding: 20rpx;
  background: #fff7e6;
  border-radius: 8rpx;
  text-align: center;
  font-size: 28rpx;
  color: #fa8c16;
}

.description-section,
.video-section,
.sku-section,
.detail-media-section,
.scene-media-section {
  background: #ffffff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.description-content {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.8;
}

.product-video {
  width: 100%;
  height: 400rpx;
  border-radius: 12rpx;
}

.sku-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.sku-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}

.sku-item.selected {
  border-color: #667eea;
  background: #f0f4ff;
}

.sku-item.disabled {
  opacity: 0.5;
}

.sku-checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d0d0d0;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  flex-shrink: 0;
  transition: all 0.3s;
}

.sku-checkbox.checked {
  background: #667eea;
  border-color: #667eea;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: bold;
}

.sku-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.sku-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.sku-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

.sku-meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.sku-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.sku-stock {
  font-size: 24rpx;
  color: #999999;
}

.sku-stock.stock-zero {
  color: #ff6b6b;
}

.detail-images,
.scene-images {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.detail-image {
  width: 100%;
  border-radius: 12rpx;
}

.scene-images {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.scene-image {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
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

.footer-left {
  display: flex;
  gap: 40rpx;
}

.icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.icon-text {
  font-size: 40rpx;
}

.icon-label {
  font-size: 20rpx;
  color: #666666;
}

.add-to-cart-btn {
  flex: 1;
  margin-left: 40rpx;
  padding: 24rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 50rpx;
  font-size: 28rpx;
  border: none;
}

.add-to-cart-btn.disabled {
  background: #cccccc;
  color: #999999;
}
</style>

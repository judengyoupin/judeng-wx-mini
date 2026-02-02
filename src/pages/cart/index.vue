<template>
  <view class="cart-page">
    <!-- 统一导航栏（含状态栏高度） -->
    <PageNavBar title="购物车">
      <template #right>
        <text v-if="cartItems.length > 0" class="manage-btn" @click="toggleManageMode">
          {{ isManageMode ? '完成' : '管理' }}
        </text>
      </template>
    </PageNavBar>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>

    <!-- 未登录提示 -->
    <view v-else-if="!user_token" class="empty-state">
      <text class="empty-text">请先登录</text>
      <button class="login-btn" @click="goToLogin">去登录</button>
    </view>

    <!-- 购物车列表 -->
    <view v-else-if="cartItems.length > 0" class="cart-content">
      <scroll-view scroll-y class="cart-list">
        <view
          v-for="(item, index) in cartItems"
          :key="item.id"
          class="cart-item"
        >
          <!-- 选中框 -->
          <view class="checkbox-wrapper" @click="toggleSelect(index)">
            <view class="checkbox" :class="{ checked: item.selected }">
              <text v-if="item.selected">✓</text>
            </view>
          </view>

          <!-- 商品信息 -->
          <image
            class="item-image"
            :src="item.product_sku?.product?.cover_image_url || item.product_sku?.image_url || '/static/default.png'"
            mode="aspectFill"
            @click="goToProductDetail(item.product_sku?.product?.id)"
          ></image>

          <view class="item-info">
            <view class="item-name" @click="goToProductDetail(item.product_sku?.product?.id)">
              {{ item.product_sku?.product?.name || '商品' }}
            </view>
            <view class="item-spec">{{ item.product_sku?.name || '规格' }}</view>
            <view class="item-price-row">
              <text class="item-price">¥{{ formatPrice((item.product_sku?.price || 0) * priceFactor) }}</text>
              <view class="quantity-control">
                <view
                  class="quantity-btn"
                  @click.stop="decreaseQuantity(index)"
                  :class="{ disabled: item.quantity <= 1 }"
                >
                  -
                </view>
                <text class="quantity-text">{{ item.quantity }}</text>
                <view
                  class="quantity-btn"
                  @click.stop="increaseQuantity(index)"
                  :class="{ disabled: item.quantity >= (item.product_sku?.stock || 0) }"
                >
                  +
                </view>
              </view>
            </view>
          </view>

          <!-- 删除按钮（管理模式） -->
          <view v-if="isManageMode" class="delete-btn" @click="deleteItem(index)">
            <text>删除</text>
          </view>
        </view>
      </scroll-view>

      <!-- 底部结算栏 -->
      <view class="cart-footer">
        <view class="footer-left">
          <view class="checkbox-wrapper" @click="toggleSelectAll">
            <view class="checkbox" :class="{ checked: isAllSelected }">
              <text v-if="isAllSelected">✓</text>
            </view>
            <text class="select-all-text">全选</text>
          </view>
          <view class="total-info">
            <text class="total-label">合计：</text>
            <text class="total-price">¥{{ formatPrice(totalPrice) }}</text>
          </view>
        </view>
        <button
          class="checkout-btn"
          :class="{ disabled: selectedCount === 0 }"
          @click="handleCheckout"
        >
          结算({{ selectedCount }})
        </button>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车是空的</text>
      <button class="go-shopping-btn" @click="goShopping">去逛逛</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { user_token, userInfo, companyInfo } from '@/store/userStore';
import { getCompanyUserRole } from '@/utils/auth';
import PageNavBar from '@/components/PageNavBar.vue';
import {
  getCartList,
  updateCartQuantity,
  toggleCartSelected,
  deleteCartItem,
} from '@/api/cart/index';

const cartItems = ref<any[]>([]);
const loading = ref(false);
const isManageMode = ref(false);
const priceFactor = ref(1); // 价格系数，默认为1

// 计算属性
const selectedCount = computed(() => {
  return cartItems.value.filter(item => item.selected).length;
});

const isAllSelected = computed(() => {
  return cartItems.value.length > 0 && cartItems.value.every(item => item.selected);
});

// 计算总价（应用价格系数）
const totalPrice = computed(() => {
  return cartItems.value
    .filter(item => item.selected)
    .reduce((sum, item) => {
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

// 加载购物车
const loadCart = async () => {
  if (!user_token.value) {
    cartItems.value = [];
    return;
  }

  loading.value = true;

  try {
    // 先加载价格系数
    await loadPriceFactor();
    
    const items = await getCartList();
    cartItems.value = items.map((item: any) => ({
      ...item,
      selected: item.selected || false,
    }));
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

// 切换管理模式
const toggleManageMode = () => {
  isManageMode.value = !isManageMode.value;
  if (!isManageMode.value) {
    // 退出管理模式时，重置选中状态
    cartItems.value.forEach(item => {
      item.selected = false;
    });
  }
};

// 切换选中状态
const toggleSelect = async (index: number) => {
  const item = cartItems.value[index];
  const newSelected = !item.selected;
  
  try {
    await toggleCartSelected(item.id, newSelected);
    item.selected = newSelected;
  } catch (error: any) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none',
    });
  }
};

// 全选/取消全选
const toggleSelectAll = async () => {
  const newSelected = !isAllSelected.value;
  
  try {
    await Promise.all(
      cartItems.value.map(item => toggleCartSelected(item.id, newSelected))
    );
    cartItems.value.forEach(item => {
      item.selected = newSelected;
    });
  } catch (error: any) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none',
    });
  }
};

// 增加数量
const increaseQuantity = async (index: number) => {
  const item = cartItems.value[index];
  const stock = item.product_sku?.stock || 0;
  
  if (item.quantity >= stock) {
    uni.showToast({
      title: '库存不足',
      icon: 'none',
    });
    return;
  }

  try {
    await updateCartQuantity(item.id, item.quantity + 1);
    item.quantity++;
  } catch (error: any) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none',
    });
  }
};

// 减少数量
const decreaseQuantity = async (index: number) => {
  const item = cartItems.value[index];
  
  if (item.quantity <= 1) {
    return;
  }

  try {
    await updateCartQuantity(item.id, item.quantity - 1);
    item.quantity--;
  } catch (error: any) {
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none',
    });
  }
};

// 删除商品
const deleteItem = async (index: number) => {
  const item = cartItems.value[index];
  
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteCartItem(item.id);
          cartItems.value.splice(index, 1);
          uni.showToast({
            title: '删除成功',
            icon: 'success',
          });
        } catch (error: any) {
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none',
          });
        }
      }
    },
  });
};

// 结算
const handleCheckout = () => {
  if (selectedCount.value === 0) {
    uni.showToast({
      title: '请选择要结算的商品',
      icon: 'none',
    });
    return;
  }

  const selectedItems = cartItems.value.filter(item => item.selected);
  const itemIds = selectedItems.map(item => item.id);
  
  uni.navigateTo({
    url: `/pages/order/index?cartIds=${itemIds.join(',')}`,
  });
};

// 跳转到商品详情
const goToProductDetail = (productId?: number) => {
  if (productId) {
    uni.navigateTo({
      url: `/pages/product-detail/index?id=${productId}`,
    });
  }
};

// 去登录
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index',
  });
};

// 去逛逛
const goShopping = () => {
  uni.switchTab({
    url: '/pages/index/index',
  });
};

// 格式化价格
// 注意：根据schema，price字段是numeric类型，存储的是实际价格（不是分）
const formatPrice = (price: number) => {
  return Number(price).toFixed(2);
};

onMounted(() => {
  loadCart();
});

onShow(() => {
  loadCart();
});

onPullDownRefresh(() => {
  loadCart();
});
</script>

<style scoped>
.cart-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.manage-btn {
  font-size: 28rpx;
  color: #667eea;
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

.cart-content {
  height: calc(100vh - 120rpx);
  display: flex;
  flex-direction: column;
}

.cart-list {
  flex: 1;
  overflow-y: auto;
}

.cart-item {
  background: #ffffff;
  margin: 20rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d0d0d0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  transition: all 0.3s;
}

.checkbox.checked {
  background: #667eea;
  border-color: #667eea;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: bold;
}

.item-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.item-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-spec {
  font-size: 24rpx;
  color: #999999;
}

.item-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}

.item-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 8rpx;
}

.quantity-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 8rpx;
  font-size: 32rpx;
  color: #333333;
  font-weight: bold;
}

.quantity-btn.disabled {
  color: #cccccc;
  background: #f5f5f5;
}

.quantity-text {
  min-width: 60rpx;
  text-align: center;
  font-size: 28rpx;
  color: #333333;
}

.delete-btn {
  padding: 16rpx 24rpx;
  background: #ff6b6b;
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.cart-footer {
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
  align-items: center;
  gap: 20rpx;
}

.select-all-text {
  font-size: 28rpx;
  color: #333333;
}

.total-info {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.total-label {
  font-size: 28rpx;
  color: #666666;
}

.total-price {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.checkout-btn {
  padding: 20rpx 40rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 50rpx;
  font-size: 28rpx;
  border: none;
}

.checkout-btn.disabled {
  background: #cccccc;
  color: #999999;
}

.empty-state {
  padding: 200rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
}

.empty-icon {
  font-size: 120rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.login-btn,
.go-shopping-btn {
  padding: 20rpx 60rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 50rpx;
  font-size: 28rpx;
  border: none;
}
</style>

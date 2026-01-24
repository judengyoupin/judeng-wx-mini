<template>
  <view class="order-list-page">
    <view class="placeholder">订单列表页面开发中...</view>
  </view>
</template>

<script setup lang="ts">
import { onPullDownRefresh } from '@dcloudio/uni-app';

onPullDownRefresh(() => {
  setTimeout(() => {
    uni.stopPullDownRefresh();
  }, 1000);
});
</script>

<style scoped>
.order-list-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.placeholder {
  font-size: 32rpx;
  color: #999999;
}
</style>

<template>
  <view class="resource-list">
    <view v-for="item in resourceList" :key="item.id" class="resource-item">
      <view class="resource-title">{{ item.name }}</view>
      <view class="resource-desc">{{ item.description }}</view>
      <view class="resource-time">创建时间：{{ item.created_at }}</view>
    </view>
    <view v-if="resourceList.length === 0" class="empty">暂无资源</view>
  </view>
</template>

<script lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getResourceList} from "./api";
import type { Resources } from "@/types/graphql";

export default {
  setup() {
    const resourceList = ref<Resources[]>([]);
    onLoad(async () => {
      resourceList.value = await getResourceList();
    });
    return { resourceList };
  }
};
</script>

<style>
.resource-list {
  padding: 32rpx;
}
.resource-item {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx #eee;
}
.resource-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.resource-desc {
  margin-top: 8rpx;
  color: #666;
  font-size: 28rpx;
}
.resource-time {
  margin-top: 8rpx;
  color: #999;
  font-size: 24rpx;
}
.empty {
  text-align: center;
  color: #bbb;
  margin-top: 80rpx;
  font-size: 28rpx;
}
</style>

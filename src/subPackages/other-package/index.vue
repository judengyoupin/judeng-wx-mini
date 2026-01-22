<template>
  <view class="container">
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else>
      <view v-for="user in users" :key="user.id" class="user-item">
        <text class="user-name">{{ user.nickname || "未命名" }}</text>
        <text v-if="user.bio" class="user-bio">{{ user.bio }}</text>
      </view>
      <view v-if="users.length === 0" class="empty">暂无数据</view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { get_user_list } from "./api";
import type { Users } from "@/types/graphql";

export default {
  setup() {
    const users = ref<Users[]>([]);
    const loading = ref(false);

    onLoad(async () => {
      loading.value = true;
      try {
        users.value = await get_user_list({ limit: 20 });
      } catch (error) {
        console.error("获取用户列表失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    });

    return { users, loading };
  },
};
</script>

<style>
.container {
  padding: 32rpx;
}

.loading {
  text-align: center;
  padding: 40rpx;
  color: #999;
}

.user-item {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx #eee;
}

.user-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.user-bio {
  margin-top: 8rpx;
  color: #666;
  font-size: 28rpx;
  display: block;
}

.empty {
  text-align: center;
  color: #bbb;
  margin-top: 80rpx;
  font-size: 28rpx;
}
</style>

<template>
  <view class="content">
    <image class="logo" src="/static/logo.png" />
    <view class="text-area">
      <text class="title">你好，{{ user?.nickname || "" }}==={{ resource?.name }}</text>
      <view v-if="user?.bio" class="bio">{{ user.bio }}</view>
      <button @click="handleClick">点击</button>
    </view>
  </view>
</template>

<script lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getUser } from "@/api/user";
import { getResource } from "@/api/resource";
import type { Users, Resources } from "@/types/graphql";

export default {
  setup() {
    const user = ref<Users | null>(null);
    const resource = ref<Resources | null>(null);
    onLoad(async () => {
      user.value = await getUser({}).then((res) => {
        return res;
      });
      resource.value = await getResource({
        category: "resource",
        name: "resource",
      }).then((res) => {
        return res;
      });
    });
    const handleClick = () => {
      uni.navigateTo({
        url: "/subPackages/resource/index",
      });
    };
    return { user, resource, handleClick };
  },
};
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo {
  height: 200rpx;
  width: 200rpx;
  margin-top: 200rpx;
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 50rpx;
}

.text-area {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.title {
  font-size: 36rpx;
  color: #8f8f94;
}

.bio {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #666;
}
</style>

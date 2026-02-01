<template>
  <view class="container">
    <!-- 自定义顶部导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-title">{{ companyInfo?.name || "聚灯优品" }}</view>
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="page-title"></view>

    <!-- 搜索框 -->
    <view class="search-box">
      <view class="search-input">
        <image
          class="search-icon"
          src="/static/index/srch.png"
          mode="aspectFit"
        ></image>
        <input
          type="text"
          confirm-type="search"
          v-model="searchKeyword"
          placeholder="请输入商品名称"
          @confirm="onSearchConfirm"
        />
      </view>
    </view>

    <!-- 骨架屏 - 在加载中显示 -->
    <view v-if="loading" class="skeleton-container">
      <!-- 顶部轮播图骨架 -->
      <view class="skeleton-banner"></view>

      <!-- 分类骨架 - 第一组 -->
      <view class="skeleton-section">
        <view class="skeleton-title"></view>
        <view class="skeleton-category-grid">
          <view
            v-for="i in 10"
            :key="`cat1-${i}`"
            class="skeleton-category-item"
          >
            <view class="skeleton-category-icon"></view>
            <view class="skeleton-category-name"></view>
          </view>
        </view>
      </view>

      <!-- 分类骨架 - 第二组 -->
      <view class="skeleton-section">
        <view class="skeleton-title"></view>
        <view class="skeleton-category-grid">
          <view
            v-for="i in 10"
            :key="`cat2-${i}`"
            class="skeleton-category-item"
          >
            <view class="skeleton-category-icon"></view>
            <view class="skeleton-category-name"></view>
          </view>
        </view>
      </view>

      <!-- 底部轮播图骨架 -->
      <view class="skeleton-banner"></view>
    </view>

    <!-- 实际内容 - 只在非加载状态显示 -->
    <view v-else>
      <!-- 顶部轮播图 -->
      <view class="banner-container" v-show="hasBanners(topBanners)">
        <swiper
          class="banner-swiper"
          circular
          autoplay
          interval="3000"
          duration="500"
          indicator-dots
          indicator-active-color="#007aff"
        >
          <swiper-item
            v-for="(banner, index) in topBanners"
            :key="index"
            @tap="handleBannerClick(banner)"
          >
            <image
              class="banner-image"
              :src="getBannerImage(banner) + '?x-oss-process=image/format,webp'"
              mode="aspectFill"
            ></image>
          </swiper-item>
        </swiper>
      </view>

      <!-- 无数据提示 -->
      <view v-show="isEmpty(categoryList)" class="empty-container">
        <view class="empty-data">暂无分类数据</view>
      </view>

      <!-- 分类数据 -->
      <view v-show="!isEmpty(categoryList)">
        <!-- 遍历所有主分类 -->
        <view
          v-for="(mainCategory, mainIndex) in categoryList"
          :key="mainIndex"
          class="section"
        >
          <!-- 主分类名称 -->
          <view class="title">{{ mainCategory.name }}</view>

          <!-- 子分类网格 -->
          <view class="category-grid" v-show="hasChildren(mainCategory)">
            <view
              v-for="(subCategory, subIndex) in mainCategory.children"
              :key="subIndex"
              class="category-item"
              @tap="handleCategoryClick(subCategory, mainCategory)"
            >
              <view class="category-icon-wrapper">
                <image
                  class="category-icon"
                  :src="
                    getCategoryImage(subCategory) +
                    '?x-oss-process=image/format,webp'
                  "
                  mode="aspectFit"
                ></image>
              </view>
              <text class="category-name">{{ subCategory.name }}</text>
            </view>
          </view>

          <!-- 高端定制区域下方的底部轮播图 -->
          <view
            class="banner-container bottom-banner"
            v-show="isLastCategory(mainIndex) && hasBanners(bottomBanners)"
          >
            <swiper
              class="banner-swiper"
              circular
              autoplay
              interval="4000"
              duration="500"
              indicator-dots
              indicator-active-color="#007aff"
            >
              <swiper-item
                v-for="(banner, index) in bottomBanners"
                :key="index"
                @tap="handleBannerClick(banner)"
              >
                <image
                  class="banner-image"
                  :src="
                    getBannerImage(banner) + '?x-oss-process=image/format,webp'
                  "
                  mode="aspectFill"
                ></image>
              </swiper-item>
            </swiper>
          </view>
        </view>
      </view>
    </view>

    <!-- 中央加载指示器 -->
    <view v-if="loading" class="center-loading">
      <view class="center-loading-icon"></view>
      <text class="center-loading-text">加载中...</text>
    </view>
  </view>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ref, onMounted } from "vue";
import { getCategoryTree } from "@/api/category/index";
import { getTopBanners, getBottomBanners } from "@/api/banner/index";
import { userInfo, user_token, companyInfo } from "@/store/userStore";
import { onLoad, onShow, onShareAppMessage } from "@dcloudio/uni-app";

export default defineComponent({
  setup() {
    // 定义数据
    const categoryList = ref([]);
    const loading = ref(true);
    const topBanners = ref([]);
    const bottomBanners = ref([]);
    const searchKeyword = ref("");

    // 搜索确认处理
    const onSearchConfirm = () => {
      const trimmedKeyword = searchKeyword.value.trim();
      if (trimmedKeyword) {
        console.log("搜索关键词:", trimmedKeyword);

        uni.navigateTo({
          url: `/pages/product/index?keyword=${encodeURIComponent(
            trimmedKeyword
          )}`,
          success: () => {
            // 跳转成功后清空搜索框
            searchKeyword.value = "";
          },
          fail: (err) => {
            console.error("页面跳转失败:", err);
            uni.showToast({
              title: "页面跳转失败，请重试",
              icon: "none",
            });
          },
        });
      } else {
        uni.showToast({
          title: "请输入搜索关键词",
          icon: "none",
        });
      }
    };

    // 获取分类数据
    const fetchCategories = async () => {
      loading.value = true;

      try {
        const res = await getCategoryTree(companyInfo?.value?.id || null);

        if (res && res.code === 0 && res.data) {
          categoryList.value = res.data;
          console.log("获取分类数据成功:", res.data);
        } else {
          console.error("获取分类数据失败:", res?.message || "未知错误");
          uni.showToast({
            title: res?.message || "获取分类数据失败",
            icon: "none",
          });
        }
      } catch (error) {
        console.error("获取分类数据失败:", error);
        uni.showToast({
          title: "获取分类数据失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    };

    // 获取顶部轮播图
    const fetchTopBanners = async () => {
      try {
        const res = await getTopBanners(companyInfo?.value?.id || null);
        if (res && res.code === 0 && res.data) {
          // 对轮播图进行排序
          const sortedBanners = [...res.data].sort((a, b) => {
            const sortA = typeof a === "object" ? a.sort ?? 999 : 999;
            const sortB = typeof b === "object" ? b.sort ?? 999 : 999;
            return sortA - sortB;
          });
          topBanners.value = sortedBanners;
        }
      } catch (error) {
        console.error("获取顶部轮播图失败:", error);
      }
    };

    // 获取底部轮播图
    const fetchBottomBanners = async () => {
      try {
        const res = await getBottomBanners(companyInfo?.value?.id || null);
        if (res && res.code === 0 && res.data) {
          // 对轮播图进行排序
          const sortedBanners = [...res.data].sort((a, b) => {
            const sortA = typeof a === "object" ? a.sort ?? 999 : 999;
            const sortB = typeof b === "object" ? b.sort ?? 999 : 999;
            return sortA - sortB;
          });
          bottomBanners.value = sortedBanners;
        }
      } catch (error) {
        console.error("获取底部轮播图失败:", error);
      }
    };

    // 获取分类图片
    const getCategoryImage = (category: any) => {
      if (!category) return "/static/default.png";

      if (category.img && category.img.url) {
        return category.img.url;
      }

      if (category.icon) {
        return category.icon;
      }

      if (category.image) {
        return category.image;
      }

      return "/static/default.png";
    };

    // 获取轮播图图片
    const getBannerImage = (banner: any) => {
      if (!banner) return "/static/default-banner.png";

      // banner 可能是字符串（兼容旧数据），也可能是对象
      if (typeof banner === "string") {
        return banner;
      }

      // 使用 file_url 字段
      if (banner.file_url) {
        return banner.file_url;
      }

      return "/static/default-banner.png";
    };

    // 检查是否有轮播图
    const hasBanners = (banners: any[]) => {
      return banners && banners.length > 0;
    };

    // 检查分类列表是否为空
    const isEmpty = (list: any[]) => {
      return !list || list.length === 0;
    };

    // 检查分类是否有子分类
    const hasChildren = (category: any) => {
      return category.children && category.children.length > 0;
    };

    // 检查是否是最后一个分类
    const isLastCategory = (index: number) => {
      return index === categoryList.value.length - 1;
    };

    // 轮播图点击处理函数
    const handleBannerClick = (banner: any) => {
      if (!banner) return;

      // 如果是字符串格式（旧数据），不处理跳转
      if (typeof banner === "string") {
        return;
      }

      // 如果有 link 字段，进行跳转
      if (banner.link) {
        const link = banner.link;
        
        // 判断是内部路径还是外部链接
        if (link.startsWith("http://") || link.startsWith("https://")) {
          // 外部链接，使用 web-view 或复制链接
          uni.showToast({
            title: "外部链接",
            icon: "none",
          });
          // 可以在这里添加打开外部链接的逻辑
        } else {
          // 内部路径，使用 navigateTo 或 switchTab
          if (link.startsWith("/pages/")) {
            // 判断是否是 tabBar 页面
            const tabBarPages = [
              "/pages/index/index",
              "/pages/package/index",
              "/pages/cart/index",
              "/pages/mine/index",
            ];
            
            if (tabBarPages.includes(link)) {
              uni.switchTab({
                url: link,
              });
            } else {
              uni.navigateTo({
                url: link,
                fail: (err) => {
                  console.error("跳转失败:", err);
                  uni.showToast({
                    title: "页面不存在",
                    icon: "none",
                  });
                },
              });
            }
          } else {
            // 相对路径，添加 /pages 前缀
            uni.navigateTo({
              url: `/pages${link}`,
              fail: (err) => {
                console.error("跳转失败:", err);
              },
            });
          }
        }
      }
    };

    // 分类点击处理函数
    // 根据 ui_style 字段决定跳转行为
    const handleCategoryClick = (category: any, mainCategory: any) => {
      console.log('分类点击事件触发:', category);
      console.log('分类完整数据:', JSON.stringify(category, null, 2));
      
      if (!category) {
        console.error('分类数据为空');
        uni.showToast({
          title: '分类数据错误',
          icon: 'none',
        });
        return;
      }

      if (!category.id) {
        console.error('分类ID为空:', category);
        uni.showToast({
          title: '分类ID错误',
          icon: 'none',
        });
        return;
      }

      const categoryId = category.id;
      const categoryName = category.name || '';

      // 如果 ui_style 是 "products" 或 skip 为 true，直接跳转到商品列表页面
      if (category.skip === true || category.ui_style === "products" || category.route_ui_style === "products") {
        console.log('跳转到商品列表页，分类ID:', categoryId);
        const url = `/pages/product/index?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`;
        console.log('跳转URL:', url);
        
        uni.navigateTo({
          url: url,
          success: () => {
            console.log('跳转成功');
          },
          fail: (err) => {
            console.error('跳转失败:', err);
            uni.showToast({
              title: '页面跳转失败: ' + (err.errMsg || '未知错误'),
              icon: 'none',
              duration: 3000,
            });
          },
        });
        return;
      }

      // 否则检查是否有子分类
      if (category.children && category.children.length > 0) {
        // 有子分类，跳转到分类筛选页面
        console.log('跳转到分类筛选页，分类ID:', categoryId);
        const url = `/pages/category-filter/index?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`;
        console.log('跳转URL:', url);
        
        uni.navigateTo({
          url: url,
          success: () => {
            console.log('跳转成功');
          },
          fail: (err) => {
            console.error('跳转失败:', err);
            uni.showToast({
              title: '页面跳转失败: ' + (err.errMsg || '未知错误'),
              icon: 'none',
              duration: 3000,
            });
          },
        });
      } else {
        // 没有子分类，直接跳转到商品列表
        console.log('跳转到商品列表页（无子分类），分类ID:', categoryId);
        const url = `/pages/product/index?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`;
        console.log('跳转URL:', url);
        
        uni.navigateTo({
          url: url,
          success: () => {
            console.log('跳转成功');
          },
          fail: (err) => {
            console.error('跳转失败:', err);
            uni.showToast({
              title: '页面跳转失败: ' + (err.errMsg || '未知错误'),
              icon: 'none',
              duration: 3000,
            });
          },
        });
      }
    };

    // 页面加载时处理
    onLoad((options: any) => {
      // 如果 URL 中有 companyId 参数，更新存储
      if (options?.companyId) {
        uni.setStorageSync("companyId", options.companyId);
        // 重新同步公司信息
        import("@/api/company/index").then(({ syncCompanyInfo }) => {
          syncCompanyInfo(options.companyId).then(() => {
            // 重新加载数据
            fetchCategories();
            fetchTopBanners();
            fetchBottomBanners();
          }).catch((err) => {
            console.error("同步公司信息失败:", err);
          });
        });
      }
    });

    // 修改 onMounted 逻辑
    onMounted(async () => {
      // 等待一下确保 companyInfo 已初始化
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      await Promise.all([
        fetchCategories(),
        fetchTopBanners(),
        fetchBottomBanners(),
      ]);
    });

    // 页面显示时刷新数据
    onShow(async () => {
      // 等待一下确保 companyInfo 已初始化
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      await Promise.all([
        fetchCategories(),
        fetchTopBanners(),
        fetchBottomBanners(),
      ]);
    });

    return {
      categoryList,
      loading,
      topBanners,
      bottomBanners,
      getCategoryImage,
      getBannerImage,
      handleCategoryClick,
      handleBannerClick,
      hasBanners,
      isEmpty,
      hasChildren,
      companyInfo,
      isLastCategory,
      userInfo,
      searchKeyword,
      onSearchConfirm,
    };
  },
  onShareAppMessage(res) {
    console.log(res);

    const storageCompanyId = uni.getStorageSync("companyId");
    // 优先使用：用户公司ID > 存储的公司ID > 默认值545（兜底）
    const queryCompanyId =
      userInfo?.value?.manager?.company?.id || storageCompanyId || 545;
    return {
      title: `${companyInfo?.value?.name || "聚灯优品"}`,
      path: `/pages/index/index?companyId=${queryCompanyId}`,
      imageUrl: "",
    };
  },
});
</script>

<style scoped>
.container {
  position: relative;
  min-height: 100vh;
  background-color: #ffffff;
}

.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: #ffffff;
  z-index: 100;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
}

.navbar-content {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 140rpx;
  padding: 23rpx 0 30rpx;
}

.navbar-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.page-title {
  height: 188rpx;
}

/* 搜索框样式 */
.search-box {
  padding: 15rpx 30rpx;
  background-color: #ffffff;
}

.search-input {
  display: flex;
  align-items: center;
  background-color: #f0f0f0;
  border-radius: 40rpx;
  padding: 10rpx 30rpx;
}

.search-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 10rpx;
}

/* 轮播图样式 */
.banner-container {
  margin: 10rpx 30rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.bottom-banner {
  margin-top: 30rpx;
  padding-bottom: 30rpx;
}

.banner-swiper {
  height: 240rpx;
  width: 100%;
}

.banner-image {
  width: 100%;
  height: 100%;
}

/* 分类区域 */
.section {
  margin-bottom: 30rpx;
}

.title {
  text-align: center;
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin: 30rpx 0 15rpx;
}

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 10rpx 20rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
  cursor: pointer;
  position: relative;
  z-index: 1;
  -webkit-tap-highlight-color: transparent;
  padding: 10rpx;
  box-sizing: border-box;
  width: 100%;
  touch-action: manipulation;
}

.category-item:active {
  opacity: 0.7;
  transform: scale(0.95);
}

.category-icon-wrapper {
  width: 85rpx;
  height: 85rpx;
  background-color: rgba(212, 240, 235, 0.6);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10rpx;
}

.category-icon {
  width: 55rpx;
  height: 55rpx;
}

.category-name {
  font-size: 24rpx;
  color: #333;
  text-align: center;
}

/* 加载和空数据状态 */
.loading-container,
.empty-container {
  padding: 40rpx;
  text-align: center;
  margin: 0 20rpx;
}

.loading,
.empty-data {
  color: #999;
  font-size: 28rpx;
}

/* 骨架屏样式 */
.skeleton-container {
  padding: 0 30rpx;
}

.skeleton-banner {
  height: 260rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12rpx;
  margin: 20rpx 0 30rpx 0;
}

.skeleton-section {
  margin-bottom: 30rpx;
}

.skeleton-title {
  width: 200rpx;
  height: 34rpx;
  margin: 40rpx auto 20rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
}

.skeleton-category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  padding: 10rpx 0;
}

.skeleton-category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
}

.skeleton-category-icon {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 50%;
  margin-bottom: 10rpx;
}

.skeleton-category-name {
  width: 80rpx;
  height: 24rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4rpx;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

/* 中央加载指示器 */
.center-loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.6);
  padding: 30rpx;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 999;
}

.center-loading-icon {
  width: 60rpx;
  height: 60rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  border-top: 3rpx solid #ffffff;
  border-radius: 50%;
  animation: loading-rotate 1s linear infinite;
  margin-bottom: 15rpx;
}

.center-loading-text {
  color: #ffffff;
  font-size: 28rpx;
}

@keyframes loading-rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>

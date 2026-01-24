<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { syncCompanyInfo } from "@/api/company/index";
import { getDefaultCompanyId } from "@/api/config/index";
import { companyInfo, restoreUserFromStorage, user_token } from "@/store/userStore";
import { getUserManagedCompanyId } from "@/utils/company";

onLaunch(async (options) => {
  console.log("App Launch", options);

  // 1. 首先恢复用户登录状态
  const isLoggedIn = restoreUserFromStorage();
  console.log("恢复登录状态:", isLoggedIn ? "已登录" : "未登录");

  // 2. 获取公司ID
  const companyId = options?.query?.companyId;
  if (companyId) {
    uni.setStorageSync("companyId", companyId);
  }

  // 3. 从存储中获取公司ID
  let storageCompanyId = uni.getStorageSync("companyId");
  
  // 4. 如果用户已登录且是公司管理员，优先使用管理的公司ID
  if (isLoggedIn && user_token.value) {
    try {
      const managedCompanyId = await getUserManagedCompanyId();
      if (managedCompanyId) {
        storageCompanyId = managedCompanyId;
        uni.setStorageSync("companyId", managedCompanyId);
        console.log("使用公司管理员管理的公司ID:", managedCompanyId);
      }
    } catch (error) {
      console.error("获取公司管理员公司ID失败:", error);
    }
  }
  
  // 5. 如果没有存储的公司ID，则从配置表获取默认值
  let defaultCompanyId: number;
  if (storageCompanyId) {
    defaultCompanyId = storageCompanyId;
  } else {
    // 从 configs 表获取默认公司ID
    const configCompanyId = await getDefaultCompanyId();
    if (configCompanyId) {
      defaultCompanyId = configCompanyId;
      // 将配置的默认值保存到存储中
      uni.setStorageSync("companyId", configCompanyId);
    } else {
      // 如果配置表中也没有，使用硬编码的默认值 545（作为兜底）
      defaultCompanyId = 545;
      console.warn("未找到默认公司ID配置，使用硬编码默认值: 545");
    }
  }

  // 6. 同步公司信息
  try {
    await syncCompanyInfo(defaultCompanyId);
    console.log("公司信息同步成功:", companyInfo.value);
  } catch (error) {
    console.error("同步公司信息失败:", error);
  }
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>
<style>
</style>

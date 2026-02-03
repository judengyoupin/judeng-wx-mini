<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { syncCompanyInfo } from "@/api/company/index";
import { getDefaultCompanyId } from "@/api/config/index";
import {
  companyInfo,
  restoreUserFromStorage,
  user_token,
  setDefaultCompanyIdCache,
} from "@/store/userStore";
import { getUserManagedCompanyId } from "@/utils/company";

/** 定期刷新：重新拉取默认公司 ID 并更新缓存 */
async function refreshDefaultCompanyIdCache() {
  try {
    const id = await getDefaultCompanyId();
    setDefaultCompanyIdCache(id);
  } catch (_) {}
}

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

  // 3. 从存储中获取公司ID（优先使用本地存储，记住上次进入的公司）
  let storageCompanyId = uni.getStorageSync("companyId");
  
  // 4. 如果用户已登录且是公司管理员，优先使用管理的公司ID（但不会覆盖已存储的公司ID）
  if (isLoggedIn && user_token.value && !storageCompanyId) {
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
  
  // 5. 确定最终使用的公司ID：优先使用存储的公司ID，如果没有则使用默认值
  let finalCompanyId: number | null = null;
  if (storageCompanyId) {
    finalCompanyId = Number(storageCompanyId);
    console.log("使用本地存储的公司ID:", finalCompanyId);
    // 同时把配置里的默认公司 ID 拉取并缓存（供各页 getDefaultCompanyIdCached 使用）
    await refreshDefaultCompanyIdCache();
  } else {
    const configCompanyId = await getDefaultCompanyId();
    if (configCompanyId) {
      finalCompanyId = configCompanyId;
      uni.setStorageSync("companyId", configCompanyId);
      setDefaultCompanyIdCache(configCompanyId);
      console.log("使用配置的默认公司ID:", finalCompanyId);
    } else {
      console.warn("未找到默认公司ID配置，无法初始化公司信息");
    }
  }

  if (!finalCompanyId) {
    console.warn("无法确定公司ID，跳过公司信息同步");
    return;
  }

  // 6. 同步公司信息
  try {
    await syncCompanyInfo(finalCompanyId);
    console.log("公司信息同步成功:", companyInfo.value);
  } catch (error) {
    console.error("同步公司信息失败:", error);
  }
});

onShow(() => {
  console.log("App Show");
  // 定期重新获取默认公司 ID 缓存（避免配置在后台被改后长期不更新）
  refreshDefaultCompanyIdCache();
});

onHide(() => {
  console.log("App Hide");
});
</script>
<style>
</style>

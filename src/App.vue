<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { syncCompanyInfo } from "@/api/company/index";
import { getDefaultCompanyIdCached } from "@/api/config/index";
import {
  companyInfo,
  restoreUserFromStorage,
  user_token,
  getDefaultCompanyIdFromStorage,
  ensureUserInfoCached,
} from "@/store/userStore";
import { getCompanyUserRoleCached } from "@/utils/auth";

/** 时序 1：确定当前公司 ID（本地 → 分享链接 → 系统配置），并确保默认公司 ID 存本地 */

onLaunch(async (options) => {
  console.log("App Launch", options);

  // 1. 恢复用户登录状态（token、userId、userInfo 存本地，此处恢复）
  const isLoggedIn = restoreUserFromStorage();
  console.log("恢复登录状态:", isLoggedIn ? "已登录" : "未登录");

  // 2. 分享链接带 companyId：直接存本地，作为当前公司
  const linkCompanyId = options?.query?.companyId;
  if (linkCompanyId) {
    uni.setStorageSync("companyId", linkCompanyId);
  }

  // 3. 当前公司 ID：优先本地
  let currentCompanyId: string | number | null = uni.getStorageSync("companyId");

  // 4. 本地没有当前公司 ID：用系统配置的默认公司 ID（优先读本地 defaultCompanyId，没有再请求 config）
  if (!currentCompanyId) {
    const defaultId = getDefaultCompanyIdFromStorage() ?? (await getDefaultCompanyIdCached());
    if (defaultId != null) {
      currentCompanyId = defaultId;
      uni.setStorageSync("companyId", defaultId);
      console.log("使用系统默认公司ID:", defaultId);
    }
  }

  const finalCompanyId = currentCompanyId != null ? Number(currentCompanyId) : null;
  if (finalCompanyId == null || Number.isNaN(finalCompanyId)) {
    console.warn("无法确定公司ID，跳过公司信息同步");
    return;
  }

  // 5. 公司完整配置：有缓存直接用，否则拉取并写缓存（5 分钟）
  try {
    await syncCompanyInfo(finalCompanyId);
    console.log("公司信息同步成功:", companyInfo.value);
  } catch (error) {
    console.error("同步公司信息失败:", error);
  }

  // 6. 已登录时预拉 userInfo、company_users 并缓存，各页（我的、购物车等）不再重复请求
  if (isLoggedIn && user_token.value) {
    try {
      await ensureUserInfoCached();
      await getCompanyUserRoleCached();
    } catch (e) {
      console.error("预拉用户/角色失败:", e);
    }
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

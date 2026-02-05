<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { syncCompanyInfo } from "@/api/company/index";
import { getDefaultCompanyIdCached } from "@/api/config/index";
import {
  companyInfo,
  userInfo,
  restoreUserFromStorage,
  user_token,
  getDefaultCompanyIdFromStorage,
  ensureUserInfoCached,
} from "@/store/userStore";
import { addCompanyUserAsNormal, getCompanyUserDefaults } from "@/api/company-user";
import { isCompanyUser, getCompanyUserRoleCached, clearCompanyUserRoleCache } from "@/utils/auth";
import { setAppReady } from "@/utils/appReady";

/** 全局请求就绪后再允许页面请求：onLaunch 内完成公司 ID、公司信息、用户信息等后再 setAppReady，页面请求前 await whenAppReady() */

/** 同步指定公司并刷新用户/角色（含自动注册为公司普通用户），onLaunch 与 onShow 切公司时复用 */
async function applyCompanyAndRefreshUserRole(companyId: number) {
  try {
    await syncCompanyInfo(companyId, true);
    console.log("公司信息同步成功:", companyInfo.value);
  } catch (error) {
    console.error("同步公司信息失败:", error);
  }
  if (user_token.value) {
    try {
      await ensureUserInfoCached(true);
      const userId = Number(userInfo.value?.id ?? 0);
        if (userId && companyId) {
          const already = await isCompanyUser(companyId);
          if (!already) {
            try {
              const defaults = await getCompanyUserDefaults(companyId);
              await addCompanyUserAsNormal(userId, companyId, {
                can_view_price: defaults.can_view_price,
                price_factor: defaults.price_factor,
              });
              clearCompanyUserRoleCache();
              console.log("已自动注册为当前公司普通用户");
            } catch (err) {
              console.warn("自动注册公司用户失败（可能已存在）:", err);
            }
          }
        }
      await getCompanyUserRoleCached(undefined, true);
    } catch (e) {
      console.error("预拉用户/角色失败:", e);
    }
  }
}

onLaunch(async (options) => {
  console.log("App Launch", options);
  try {
    // 1. 恢复用户登录状态（token、userId、userInfo 存本地，此处恢复）
    restoreUserFromStorage();

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

    await applyCompanyAndRefreshUserRole(finalCompanyId);
  } finally {
    setAppReady();
  }
});

/** 从后台/分享链接进入时：若本次进入的 query 带 companyId 且与当前公司不同，则切换公司并同步（onLaunch 不会再次执行） */
onShow(() => {
  try {
    const enterOptions = (uni as any).getEnterOptionsSync?.();
    console.log("enterOptions", enterOptions);
    const linkCompanyId = enterOptions?.query?.companyId;
    if (!linkCompanyId) return;
    const newId = Number(linkCompanyId);
    if (Number.isNaN(newId)) return;
    const currentId = Number(uni.getStorageSync("companyId") || companyInfo?.value?.id || 0);
    if (currentId === newId) return;
    uni.setStorageSync("companyId", linkCompanyId);
    console.log("从链接切换公司:", currentId, "->", newId);
    applyCompanyAndRefreshUserRole(newId);
  } catch (_) {
    console.error("从链接切换公司失败:", _);
  }
});

onHide(() => {
  console.log("App Hide");
});
</script>
<style>
</style>

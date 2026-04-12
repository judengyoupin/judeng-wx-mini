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
import { ensureWxSilentAuth } from "@/utils/wxSilentAuth";
import { getCompanyUserRoleCached, clearCompanyUserRoleCache } from "@/utils/auth";
import { setAppReady } from "@/utils/appReady";
import { parseMiniProgramScene } from "@/utils/sceneParams";

/** 本地已持久化的公司 ID（有效正整数才算「有本地公司」） */
function readValidCompanyIdFromStorage(): number | null {
  try {
    const raw = uni.getStorageSync("companyId");
    if (raw === "" || raw == null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * 从启动/入口参数解析 companyId（query 或小程序码自带的 query.scene）
 * 注意：App.onLaunch 顶层的 options.scene 是微信「场景值」整数（如 1047），不是小程序码的自定义 scene 字符串。
 * 自定义 scene 在 options.query.scene 中（与页面 onLoad 的 options.scene 一致）。
 */
function extractCompanyIdFromEntryOptions(options: Record<string, unknown> | null | undefined): number | null {
  if (!options) return null;
  const q = options.query as Record<string, string | undefined> | undefined;
  if (q?.companyId != null && q.companyId !== "") {
    const n = Number(q.companyId);
    if (Number.isInteger(n) && n > 0) return n;
  }
  const sceneFromQuery = q?.scene;
  if (sceneFromQuery != null && sceneFromQuery !== "") {
    const params = parseMiniProgramScene(sceneFromQuery);
    if (params?.has("companyId")) {
      const n = Number(params.get("companyId"));
      if (Number.isInteger(n) && n > 0) return n;
    }
  }
  return null;
}

/**
 * 解析当前应使用的公司 ID，优先级：
 * 1. 本地 storage（用户在「切换公司」等写入的）
 * 2. 若本地没有：入口链接上的 companyId（分享 / 外链场景）
 * 3. 若仍没有：系统配置的默认公司（最低优先级）
 */
async function resolveInitialCompanyId(launchOptions: Record<string, unknown> | null | undefined): Promise<number | null> {
  const fromLocal = readValidCompanyIdFromStorage();
  if (fromLocal != null) {
    return fromLocal;
  }

  const fromLink = extractCompanyIdFromEntryOptions(launchOptions ?? undefined);
  if (fromLink != null) {
    uni.setStorageSync("companyId", String(fromLink));
    console.log("无本地公司，使用启动入口链接中的 companyId:", fromLink);
    return fromLink;
  }

  const defaultRaw = getDefaultCompanyIdFromStorage() ?? (await getDefaultCompanyIdCached());
  if (defaultRaw == null) return null;
  const defaultNum = Number(defaultRaw);
  if (!Number.isInteger(defaultNum) || defaultNum <= 0) return null;
  uni.setStorageSync("companyId", String(defaultNum));
  console.log("无本地与链接公司，使用系统默认公司 ID:", defaultNum);
  return defaultNum;
}

/** 全局请求就绪后再允许页面请求：onLaunch 内完成公司 ID、公司信息、用户信息等后再 setAppReady，页面请求前 await whenAppReady() */

/** 同步指定公司并刷新用户/角色；公司成员仅能通过管理员添加，不在此自动写入 company_users */
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
      await getCompanyUserRoleCached(undefined, true);
    } catch (e) {
      console.error("预拉用户/角色失败:", e);
    }
  }
}

onLaunch(async (options) => {
  console.log("App Launch", options);
  try {
    restoreUserFromStorage();
    await ensureWxSilentAuth();

    const finalCompanyId = await resolveInitialCompanyId(options as unknown as Record<string, unknown>);
    if (finalCompanyId == null) {
      console.warn("无法确定公司ID，跳过公司信息同步");
      return;
    }

    await applyCompanyAndRefreshUserRole(finalCompanyId);
  } finally {
    setAppReady();
  }
});

/**
 * 非冷启动入口（如从分享卡进入）：仅当本地尚无公司时，才用本次进入链接里的 companyId（不覆盖用户已选公司）
 */
onShow(() => {
  void (async () => {
    try {
      await ensureWxSilentAuth();
      if (readValidCompanyIdFromStorage() != null) {
        return;
      }
      const enterOptions = (uni as any).getEnterOptionsSync?.() as Record<string, unknown> | undefined;
      const fromLink = extractCompanyIdFromEntryOptions(enterOptions);
      if (fromLink == null) return;
      uni.setStorageSync("companyId", String(fromLink));
      console.log("本地无公司，使用本次进入链接中的 companyId:", fromLink);
      void applyCompanyAndRefreshUserRole(fromLink);
    } catch (e) {
      console.error("onShow 解析入口公司失败:", e);
    }
  })();
});

onHide(() => {
  console.log("App Hide");
});
</script>
<style>
</style>

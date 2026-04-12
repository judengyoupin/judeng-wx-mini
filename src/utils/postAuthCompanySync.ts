import { syncCompanyInfo } from '@/api/company/index';
import { getUserJoinedCompanies } from '@/utils/company';
import { clearCompanyUserRoleCache, refreshManagedCompanyAfterLogin } from '@/utils/auth';

function readStoredCompanyId(): number | null {
  try {
    const raw = uni.getStorageSync('companyId');
    if (raw === '' || raw == null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * 手机号/密码登录成功并已 setUserContext 后调用：
 * - 平台管理员：优先写入其作为「公司管理员」的公司；否则保留本地 companyId 并同步
 * - 普通用户：本地 companyId 若在已加入列表中则沿用，否则切换到已加入列表中的公司（首条）
 */
export async function syncCompanyContextAfterAuthLogin(user: {
  id?: number;
  role?: string;
}): Promise<void> {
  clearCompanyUserRoleCache();

  if (user.role === 'admin') {
    const managedId = await refreshManagedCompanyAfterLogin();
    if (managedId != null) {
      await syncCompanyInfo(managedId, true);
      return;
    }
    const local = readStoredCompanyId();
    if (local != null) {
      await syncCompanyInfo(local, true);
    }
    return;
  }

  const joined = await getUserJoinedCompanies();
  if (joined.length === 0) {
    throw new Error('您的账号尚未加入任何公司，请联系管理员添加后再登录。');
  }

  const local = readStoredCompanyId();
  const idSet = new Set(joined.map((j) => j.id));
  const targetId = local != null && idSet.has(local) ? local : joined[0].id;

  if (local == null || !idSet.has(local)) {
    uni.setStorageSync('companyId', String(targetId));
  }

  await syncCompanyInfo(targetId, true);
}

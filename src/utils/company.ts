import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import { userInfo } from '@/store/userStore';

/**
 * 获取用户管理的公司 ID 请使用 @/utils/auth 的 refreshManagedCompanyAfterLogin，
 * 登录后强制刷新角色缓存即可拿到 managedCompany 并写入公司上下文，无需单独请求。
 */

/**
 * 获取用户所属的公司ID列表（包括管理员和普通用户）
 */
export async function getUserCompanyIds(): Promise<number[]> {
  if (!userInfo.value?.id) {
    return [];
  }

  try {
    const query = `
      query GetUserCompanies($userId: bigint!) {
        company_users(
          where: {
            user_users: { _eq: $userId }
          }
        ) {
          company {
            id
          }
        }
      }
    `;

    const result = await client.execute({
      query,
      variables: { userId: Number(userInfo.value.id) },
    });

    if (result?.company_users) {
      return result.company_users
        .map((cu: any) => cu.company?.id)
        .filter((id: any) => id != null);
    }

    return [];
  } catch (error) {
    console.error('获取用户公司列表失败:', error);
    return [];
  }
}

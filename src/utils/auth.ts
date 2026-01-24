import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import { userInfo, companyInfo } from '@/store/userStore';

/**
 * 检查用户是否是平台管理员
 */
export async function isPlatformAdmin(): Promise<boolean> {
  if (!userInfo.value?.id) {
    return false;
  }

  try {
    const query = `
      query CheckPlatformAdmin($userId: bigint!) {
        users_by_pk(id: $userId) {
          id
          role
        }
      }
    `;

    const result = await client.execute({
      query,
      variables: { userId: Number(userInfo.value.id) },
    });

    return result?.users_by_pk?.role === 'admin';
  } catch (error) {
    console.error('检查平台管理员失败:', error);
    return false;
  }
}

/**
 * 检查用户是否是公司管理员
 * @param companyId 公司ID，如果不传则使用当前公司ID
 */
export async function isCompanyAdmin(companyId?: number): Promise<boolean> {
  if (!userInfo.value?.id) {
    return false;
  }

  const targetCompanyId = companyId || companyInfo.value?.id;
  if (!targetCompanyId) {
    return false;
  }

  try {
    const query = `
      query CheckCompanyAdmin($userId: bigint!, $companyId: bigint!) {
        company_users(
          where: {
            user_users: { _eq: $userId }
            company_companies: { _eq: $companyId }
            role: { _eq: "admin" }
          }
          limit: 1
        ) {
          id
        }
      }
    `;

    const result = await client.execute({
      query,
      variables: {
        userId: Number(userInfo.value.id),
        companyId: Number(targetCompanyId),
      },
    });

    return (result?.company_users?.length || 0) > 0;
  } catch (error) {
    console.error('检查公司管理员失败:', error);
    return false;
  }
}

/**
 * 检查用户是否是公司用户（包括管理员和普通用户）
 * @param companyId 公司ID，如果不传则使用当前公司ID
 */
export async function isCompanyUser(companyId?: number): Promise<boolean> {
  if (!userInfo.value?.id) {
    return false;
  }

  const targetCompanyId = companyId || companyInfo.value?.id;
  if (!targetCompanyId) {
    return false;
  }

  try {
    const query = `
      query CheckCompanyUser($userId: bigint!, $companyId: bigint!) {
        company_users(
          where: {
            user_users: { _eq: $userId }
            company_companies: { _eq: $companyId }
          }
          limit: 1
        ) {
          id
        }
      }
    `;

    const result = await client.execute({
      query,
      variables: {
        userId: Number(userInfo.value.id),
        companyId: Number(targetCompanyId),
      },
    });

    return (result?.company_users?.length || 0) > 0;
  } catch (error) {
    console.error('检查公司用户失败:', error);
    return false;
  }
}

/**
 * 获取用户在公司中的角色信息
 * @param companyId 公司ID，如果不传则使用当前公司ID
 */
export async function getCompanyUserRole(companyId?: number): Promise<{
  isAdmin: boolean;
  canViewPrice: boolean;
  priceFactor: number;
} | null> {
  if (!userInfo.value?.id) {
    return null;
  }

  const targetCompanyId = companyId || companyInfo.value?.id;
  if (!targetCompanyId) {
    return null;
  }

  try {
    const query = `
      query GetCompanyUserRole($userId: bigint!, $companyId: bigint!) {
        company_users(
          where: {
            user_users: { _eq: $userId }
            company_companies: { _eq: $companyId }
          }
          limit: 1
        ) {
          id
          role
          can_view_price
          price_factor
        }
      }
    `;

    const result = await client.execute({
      query,
      variables: {
        userId: Number(userInfo.value.id),
        companyId: Number(targetCompanyId),
      },
    });

    if (!result?.company_users || result.company_users.length === 0) {
      return null;
    }

    const companyUser = result.company_users[0];
    return {
      isAdmin: companyUser.role === 'admin',
      canViewPrice: companyUser.can_view_price,
      priceFactor: Number(companyUser.price_factor),
    };
  } catch (error) {
    console.error('获取公司用户角色失败:', error);
    return null;
  }
}

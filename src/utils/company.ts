import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import { userInfo } from '@/store/userStore';
import { setCompanyContext } from '@/store/userStore';

/**
 * 获取用户管理的公司ID（如果是公司管理员）
 */
export async function getUserManagedCompanyId(): Promise<number | null> {
  if (!userInfo.value?.id) {
    return null;
  }

  try {
    const query = `
      query GetUserManagedCompany($userId: bigint!) {
        company_users(
          where: {
            user_users: { _eq: $userId }
            role: { _eq: "admin" }
          }
          limit: 1
        ) {
          id
          company {
            id
            name
            logo_url
          }
        }
      }
    `;

    const result = await client.execute({
      query,
      variables: { userId: Number(userInfo.value.id) },
    });

    if (result?.company_users && result.company_users.length > 0) {
      const companyUser = result.company_users[0];
      const company = companyUser.company;
      
      // 设置公司信息到全局状态
      setCompanyContext({
        id: company.id,
        name: company.name,
        logo_url: company.logo_url,
      });

      return company.id;
    }

    return null;
  } catch (error) {
    console.error('获取用户管理的公司失败:', error);
    return null;
  }
}

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

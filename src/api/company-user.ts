/**
 * 主包内公司用户相关 API（供 App.vue 等主包逻辑使用，避免引用分包导致运行时 module not defined）
 * 仅包含「自动注册为公司普通用户」所需的最小能力。
 */
import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

/**
 * 将用户添加为指定公司的普通用户（不展示价格、系数 1）
 * 若已存在 (user, company) 会报错，调用方需先 isCompanyUser 判断
 */
export async function addCompanyUserAsNormal(
  userId: number,
  companyId: number
): Promise<{ id: number } | null> {
  const mutation = `
    mutation AddCompanyUserAsNormal($user: company_users_insert_input!) {
      insert_company_users_one(object: $user) {
        id
      }
    }
  `;
  const result = await client.execute({
    query: mutation,
    variables: {
      user: {
        user_users: userId,
        company_companies: companyId,
        role: 'user',
        can_view_price: false,
        price_factor: 1,
      },
    },
  });
  return result?.insert_company_users_one ?? null;
}

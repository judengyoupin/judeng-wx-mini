import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

export interface CompanyUserInput {
  user_users: number;
  company_companies: number;
  role: 'admin' | 'user';
  can_view_price: boolean;
  price_factor: number;
}

/**
 * 获取公司用户列表，支持按角色筛选
 */
export async function getCompanyUserList(params: {
  companyId: number;
  limit?: number;
  offset?: number;
  role?: 'admin' | 'user';
}) {
  const role = params.role === 'admin' || params.role === 'user' ? params.role : undefined;
  const hasRole = !!role;
  const whereBody = hasRole
    ? `{ _and: [ { company_companies: { _eq: $companyId } }, { role: { _eq: $role } } ] }`
    : '{ company_companies: { _eq: $companyId } }';
  const varDecls = ['$companyId: bigint!', '$limit: Int', '$offset: Int'];
  if (hasRole) varDecls.push('$role: String!');

  const query = `
    query GetCompanyUserList(${varDecls.join(', ')}) {
      company_users(
        where: ${whereBody}
        limit: $limit
        offset: $offset
        order_by: { created_at: desc }
      ) {
        id
        role
        can_view_price
        price_factor
        created_at
        user {
          id
          mobile
          nickname
          avatar_url
        }
      }
      company_users_aggregate(where: ${whereBody}) {
        aggregate {
          count
        }
      }
    }
  `;

  const variables: any = {
    companyId: params.companyId,
    limit: params.limit || 20,
    offset: params.offset || 0,
  };
  if (hasRole) variables.role = role;

  const result = await client.execute({
    query,
    variables,
  });

  return {
    users: result?.company_users || [],
    total: result?.company_users_aggregate?.aggregate?.count || 0,
  };
}

/**
 * 根据手机号创建默认账号（仅 mobile + role: user，用于「先创建再添加至公司」）
 */
export async function createUserByMobile(mobile: string) {
  const mutation = `
    mutation CreateUserByMobile($mobile: String!) {
      insert_users_one(
        object: {
          mobile: $mobile
          role: "user"
        }
      ) {
        id
        mobile
        nickname
        avatar_url
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { mobile: String(mobile).trim() },
  });

  return result?.insert_users_one || null;
}

/**
 * 根据手机号搜索用户
 */
export async function searchUserByMobile(mobile: string) {
  const query = `
    query SearchUserByMobile($mobile: String!) {
      users(
        where: { mobile: { _eq: $mobile } }
        limit: 1
      ) {
        id
        mobile
        nickname
        avatar_url
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { mobile },
  });

  return result?.users?.[0] || null;
}

/**
 * 添加公司用户
 */
export async function addCompanyUser(user: CompanyUserInput) {
  const mutation = `
    mutation AddCompanyUser($user: company_users_insert_input!) {
      insert_company_users_one(object: $user) {
        id
        role
        can_view_price
        price_factor
        user {
          id
          mobile
          nickname
        }
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { user },
  });

  return result?.insert_company_users_one;
}

/**
 * 更新公司用户
 */
export async function updateCompanyUser(
  userId: number,
  updates: Partial<CompanyUserInput>
) {
  const mutation = `
    mutation UpdateCompanyUser(
      $userId: bigint!
      $updates: company_users_set_input!
    ) {
      update_company_users_by_pk(
        pk_columns: { id: $userId }
        _set: $updates
      ) {
        id
        role
        can_view_price
        price_factor
        updated_at
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      userId,
      updates,
    },
  });

  return result?.update_company_users_by_pk;
}

/**
 * 删除公司用户
 */
export async function removeCompanyUser(userId: number) {
  const mutation = `
    mutation RemoveCompanyUser($userId: bigint!) {
      delete_company_users_by_pk(id: $userId) {
        id
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { userId },
  });

  return result?.delete_company_users_by_pk;
}

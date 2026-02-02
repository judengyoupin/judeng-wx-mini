import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

/**
 * 获取用户列表（平台管理员）
 */
export async function getUserList(params: {
  limit?: number;
  offset?: number;
  keyword?: string;
}) {
  const hasKeyword = params.keyword && params.keyword.trim();
  
  // 根据是否有关键词构建不同的查询
  const query = hasKeyword
    ? `
      query GetUserList($limit: Int, $offset: Int, $keyword: String!) {
        users(
          where: { 
            _or: [
              { mobile: { _ilike: $keyword } },
              { nickname: { _ilike: $keyword } }
            ]
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          mobile
          nickname
          avatar_url
          role
          created_at
        }
        users_aggregate(
          where: { 
            _or: [
              { mobile: { _ilike: $keyword } },
              { nickname: { _ilike: $keyword } }
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `
    : `
      query GetUserList($limit: Int, $offset: Int) {
        users(
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          mobile
          nickname
          avatar_url
          role
          created_at
        }
        users_aggregate {
          aggregate {
            count
          }
        }
      }
    `;

  const variables: any = {
    limit: params.limit || 20,
    offset: params.offset || 0,
  };

  if (hasKeyword) {
    variables.keyword = `%${params.keyword!.trim()}%`;
  }

  const result = await client.execute({
    query,
    variables,
  });

  return {
    users: result?.users || [],
    total: result?.users_aggregate?.aggregate?.count || 0,
  };
}

/**
 * 更新用户角色
 */
export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const mutation = `
    mutation UpdateUserRole($userId: bigint!, $role: String!) {
      update_users_by_pk(
        pk_columns: { id: $userId }
        _set: { role: $role }
      ) {
        id
        role
        updated_at
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      userId,
      role,
    },
  });

  return result?.update_users_by_pk;
}

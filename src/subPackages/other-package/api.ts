import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Users } from "@/types/graphql";

/**
 * 获取用户列表示例
 * 优先使用 execute 方法执行 GraphQL 查询
 * @param args 查询参数
 * @returns 用户列表
 */
export const get_user_list = async (args: {
  limit?: number;
  offset?: number;
} = {}): Promise<Users[]> => {
  const query = `
    query GetUserList($limit: Int, $offset: Int) {
      users(limit: $limit, offset: $offset, order_by: { created_at: desc }) {
        id
        nickname
        bio
        mobile
        created_at
      }
    }
  `;

  const result = await client.execute<{ users: Users[] }>({
    query,
    variables: {
      limit: args.limit || 10,
      offset: args.offset || 0,
    },
  });

  return result.users;
};

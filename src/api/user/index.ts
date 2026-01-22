import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Users } from "@/types/graphql";

/**
 * 获取用户
 * 优先使用 execute 方法执行 GraphQL 查询
 * @param params 获取用户参数
 * @param params.userId 用户ID
 * @returns 用户
 */
export const getUser = async ({
  userId = 3,
}: {
  userId?: number;
}): Promise<Users> => {
  const query = `
    query GetUser($userId: bigint!) {
      users_by_pk(id: $userId) {
        id
        nickname
        bio
        mobile
      }
    }
  `;

  const result = await client.execute<{ users_by_pk: Users | null }>({
    query,
    variables: { userId },
  });

  if (!result.users_by_pk) {
    throw new Error("User not found");
  }

  return result.users_by_pk;
};

/**
 * 获取用户列表
 * 优先使用 execute 方法执行 GraphQL 查询
 * @param args 查询参数
 * @param args.limit 限制数量
 * @param args.offset 偏移量
 * @returns 用户列表
 */
export const getUserList = async (args: {
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

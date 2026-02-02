import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Users } from "@/types/graphql";
import { projectConfig } from "@/project-config";

/**
 * 密码登录
 * @param params 登录参数
 * @param params.mobile 手机号
 * @param params.password 密码
 * @returns 用户信息和token
 */
export const passwordLogin = async (params: {
  mobile: string;
  password: string;
}): Promise<{ userId: number; token: string; user: any }> => {
  const response = await uni.request({
    url: `${projectConfig.apiBaseUrl}/api/auth/password-login`,
    method: 'POST',
    data: {
      mobile: params.mobile,
      password: params.password,
    },
    header: {
      'Content-Type': 'application/json',
    },
  });

  if (response.statusCode !== 200 || !response.data) {
    throw new Error(response.data?.error || '登录失败');
  }

  if (response.data.error) {
    throw new Error(response.data.error);
  }

  return response.data;
};

/**
 * 微信授权登录（手机号授权）
 * @param params 登录参数
 * @param params.code 微信授权code
 * @param params.codeSource 授权来源（phone表示手机号授权）
 * @returns 用户信息和token
 */
export const wechatLogin = async (params: {
  code: string;
  codeSource: string;
}): Promise<{ userId: number; token: string; user: any }> => {
  const response = await uni.request({
    url: `${projectConfig.apiBaseUrl}/api/auth/phone-login`,
    method: 'POST',
    data: {
      code: params.code,
      codeSource: params.codeSource,
    },
    header: {
      'Content-Type': 'application/json',
    },
  });

  if (response.statusCode !== 200 || !response.data) {
    throw new Error(response.data?.error || '登录失败');
  }

  if (response.data.error) {
    throw new Error(response.data.error);
  }

  return response.data;
};

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
        avatar_url
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

/** 更新个人资料可写字段 */
export type UpdateProfileInput = {
  nickname?: string;
  avatar_url?: string;
  bio?: string;
};

/**
 * 更新当前用户资料（昵称、头像、简介）
 * @param userId 当前用户 ID
 * @param data 要更新的字段
 * @returns 更新后的用户
 */
export const updateUserProfile = async (
  userId: number,
  data: UpdateProfileInput
): Promise<Users> => {
  const mutation = `
    mutation UpdateUserProfile($userId: bigint!, $set: users_set_input!) {
      update_users_by_pk(pk_columns: { id: $userId }, _set: $set) {
        id
        nickname
        bio
        mobile
        avatar_url
      }
    }
  `;
  const result = await client.execute<{ update_users_by_pk: Users | null }>({
    query: mutation,
    variables: {
      userId,
      set: data,
    },
  });
  if (!result.update_users_by_pk) {
    throw new Error("更新失败");
  }
  return result.update_users_by_pk;
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

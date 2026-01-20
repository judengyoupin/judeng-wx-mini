import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import { Users } from "@/types/graphql";
import cacheStore from "@/config-lib/cache-store/cache-store";

/**
 * 获取用户
 * @param params 获取用户参数
 * @param params.userId 用户ID
 * @returns 用户
 */
export const getUser = cacheStore.cache(async ({
  userId = "3",
}: {
  userId?: string;
}): Promise<Users> => {
  const user = await client.data<Users>({
    table: "users",
    args: {
      where: {
        id: {
          _eq: userId,
        },
      },
    },
    data_fields: ["id", "nickname", "bio", "mobile"],
  });
  if (!user) {
    throw new Error("User not found");
  }
    return user;
  },
  {
    duration: 1000 * 60 * 5,
    useCache: true,
    forceRefresh: false,
  }
);

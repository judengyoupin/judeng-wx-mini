import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Resources } from "@/types/graphql";
import cacheStore from "@/config-lib/cache-store/cache-store";
export type { Resources };

/**
 * 获取资源列表（自动缓存，参数敏感）
 * @param args 查询参数（可选）
 * @returns 资源列表
 */
export const getResourceList = cacheStore.cache(
  async (args: Record<string, any> = {}): Promise<Resources[]> => {
    return await client.datas<Resources>({
      table: "resources",
      args,
      datas_fields: ["id", "name", "description", "created_at", "updated_at"],
    });
  },
  {
    duration: 1000 * 60 * 60 * 24, // 缓存24小时
    useCache: true,
    forceRefresh: false,
  }
);
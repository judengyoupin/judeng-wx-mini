import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { BannerArray } from "@/types/companies";

/**
 * 获取顶部轮播图
 * 从 companies 表的 banner_top 字段获取
 * 
 * 业务逻辑：
 * - banner_top 是存储在 companies 表中的 JSON 数组字段
 * - 每个元素可以是 URL 字符串或包含图片信息的对象
 * - 返回的数据会经过类型验证和标准化处理
 */
export async function getTopBanners(companyId?: number | null) {
  try {
    if (!companyId) {
      return {
        code: 0,
        data: [] as BannerArray,
        message: "获取顶部轮播图成功",
      };
    }

    const query = `
      query GetTopBanners($companyId: bigint!) {
        companies_by_pk(id: $companyId) {
          banner_top
        }
      }
    `;

    const result = await client.execute<{ companies_by_pk: { banner_top: BannerArray | null } | null }>({
      query,
      variables: { companyId },
    });

    if (!result.companies_by_pk || !result.companies_by_pk.banner_top) {
      return {
        code: 0,
        data: [] as BannerArray,
        message: "获取顶部轮播图成功",
      };
    }

    // banner_top 是 jsonb 数组，需要解析
    const banners: BannerArray = Array.isArray(result.companies_by_pk.banner_top)
      ? result.companies_by_pk.banner_top
      : [];

    return {
      code: 0,
      data: banners,
      message: "获取顶部轮播图成功",
    };
  } catch (error: any) {
    console.error("获取顶部轮播图失败:", error);
    return {
      code: -1,
      data: [] as BannerArray,
      message: "获取顶部轮播图失败: " + (error.message || JSON.stringify(error)),
    };
  }
}

/**
 * 获取底部轮播图
 * 从 companies 表的 banner_bottom 字段获取
 * 
 * 业务逻辑：
 * - banner_bottom 是存储在 companies 表中的 JSON 数组字段
 * - 通常显示在首页分类列表的底部
 * - 数据格式与 banner_top 相同
 */
export async function getBottomBanners(companyId?: number | null) {
  try {
    if (!companyId) {
      return {
        code: 0,
        data: [] as BannerArray,
        message: "获取底部轮播图成功",
      };
    }

    const query = `
      query GetBottomBanners($companyId: bigint!) {
        companies_by_pk(id: $companyId) {
          banner_bottom
        }
      }
    `;

    const result = await client.execute<{ companies_by_pk: { banner_bottom: BannerArray | null } | null }>({
      query,
      variables: { companyId },
    });

    if (!result.companies_by_pk || !result.companies_by_pk.banner_bottom) {
      return {
        code: 0,
        data: [] as BannerArray,
        message: "获取底部轮播图成功",
      };
    }

    // banner_bottom 是 jsonb 数组，需要解析
    const banners: BannerArray = Array.isArray(result.companies_by_pk.banner_bottom)
      ? result.companies_by_pk.banner_bottom
      : [];

    return {
      code: 0,
      data: banners,
      message: "获取底部轮播图成功",
    };
  } catch (error: any) {
    console.error("获取底部轮播图失败:", error);
    return {
      code: -1,
      data: [] as BannerArray,
      message: "获取底部轮播图失败: " + (error.message || JSON.stringify(error)),
    };
  }
}

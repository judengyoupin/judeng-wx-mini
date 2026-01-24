import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";

/**
 * 获取分类树（包含子分类）
 * 基于新的 GraphQL schema
 */
export async function getCategoryTree(companyId?: number | null) {
  try {
    // 构建查询条件
    const whereConditions: string[] = [
      '{ parent_categories: { _is_null: true } }',
      '{ is_deleted: { _eq: false } }', // 排除已删除的分类
    ];

    if (companyId) {
      whereConditions.push(`{ company_companies: { _eq: $companyId } }`);
    }

    // 获取父分类（level = 0 或 parent_categories 为 null）
    // 根据是否有 companyId 动态构建查询
    const parentQuery = companyId
      ? `
        query GetParentCategories($companyId: bigint!) {
          categories(
            where: {
              _and: [
                ${whereConditions.join(',\n                ')}
              ]
            }
            order_by: { sort_order: asc }
          ) {
            id
            name
            sort_order
            route_ui_style
            icon_url
            parent_categories
            level
          }
        }
      `
      : `
        query GetParentCategories {
          categories(
            where: {
              _and: [
                ${whereConditions.join(',\n                ')}
              ]
            }
            order_by: { sort_order: asc }
          ) {
            id
            name
            sort_order
            route_ui_style
            icon_url
            parent_categories
            level
          }
        }
      `;

    const parentResult = await client.execute<{ categories: any[] }>({
      query: parentQuery,
      variables: companyId ? { companyId } : {},
    });

    if (!parentResult.categories || parentResult.categories.length === 0) {
      return {
        code: 0,
        data: [],
        message: "获取分类成功",
      };
    }

    // 获取所有子分类
    const parentIds = parentResult.categories.map((cat) => cat.id);
    
    let childrenResult = { categories: [] };
    if (parentIds.length > 0) {
      const childrenWhereConditions = [
        '{ parent_categories: { _in: $parentIds } }',
        '{ is_deleted: { _eq: false } }',
      ];

      if (companyId) {
        childrenWhereConditions.push(`{ company_companies: { _eq: $companyId } }`);
      }

      // 根据是否有 companyId 动态构建查询
      const childrenQuery = companyId
        ? `
          query GetChildrenCategories($parentIds: [bigint!]!, $companyId: bigint!) {
            categories(
              where: {
                _and: [
                  ${childrenWhereConditions.join(',\n                  ')}
                ]
              }
              order_by: { sort_order: asc }
            ) {
              id
              name
              sort_order
              route_ui_style
              icon_url
              parent_categories
              level
            }
          }
        `
        : `
          query GetChildrenCategories($parentIds: [bigint!]!) {
            categories(
              where: {
                _and: [
                  ${childrenWhereConditions.join(',\n                  ')}
                ]
              }
              order_by: { sort_order: asc }
            ) {
              id
              name
              sort_order
              route_ui_style
              icon_url
              parent_categories
              level
            }
          }
        `;

      childrenResult = await client.execute<{ categories: any[] }>({
        query: childrenQuery,
        variables: companyId ? { parentIds, companyId } : { parentIds },
      });
    }

    // 组合数据，保持新 schema 的字段结构，只做必要的 UI 适配
    const categoryList = parentResult.categories.map((parent) => ({
      id: parent.id,
      name: parent.name,
      sort_order: parent.sort_order,
      route_ui_style: parent.route_ui_style,
      ui_style: parent.route_ui_style, // 兼容旧字段名
      icon_url: parent.icon_url,
      // UI 需要的字段（兼容前端使用）
      skip: parent.route_ui_style === "products", // 如果 route_ui_style 是 products，则直接跳转到商品列表
      img: parent.icon_url ? { url: parent.icon_url } : null,
      icon: parent.icon_url,
      image: parent.icon_url,
      children: (childrenResult.categories || []).filter(
        (child) => child.parent_categories === parent.id
      ).map((child) => ({
        id: child.id,
        name: child.name,
        sort_order: child.sort_order,
        route_ui_style: child.route_ui_style,
        ui_style: child.route_ui_style, // 兼容旧字段名
        icon_url: child.icon_url,
        parent_categories: child.parent_categories,
        // UI 需要的字段
        skip: child.route_ui_style === "products",
        img: child.icon_url ? { url: child.icon_url } : null,
        icon: child.icon_url,
        image: child.icon_url,
      })),
    }));

    return {
      code: 0,
      data: categoryList,
      message: "获取分类成功",
    };
  } catch (error: any) {
    console.error("获取分类失败:", error);
    return {
      code: -1,
      data: [],
      message: "获取分类失败: " + (error.message || JSON.stringify(error)),
    };
  }
}
